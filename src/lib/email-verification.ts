import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationCodes } from "@/db/schema";
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MS,
  RESEND_INTERVAL_MS,
  generateVerificationCode,
  hashVerificationCode,
} from "./verification-email";

/**
 * Ciclo de vida do código de confirmação de e-mail (cadastro, 2026-09-06) —
 * a metade que toca o banco. A parte pura (geração, hash, e-mail HTML)
 * vive em `verification-email.ts`, que não importa `@/db` de propósito
 * (unit tests rodam no CI sem banco).
 *
 * Regras:
 *  - 6 dígitos, aleatório via `crypto.randomInt` (não `Math.random`);
 *  - gravado **somente como SHA-256** (mesma convenção dos tokens de sessão);
 *  - expira em 10 min; 5 tentativas de verificação; 60 s entre reenvios
 *    (por cima do rate limit por IP da rota de auth);
 *  - uma linha por e-mail: reenvio substitui o código anterior.
 */

// Reexporta a parte pura para quem importa daqui (rota, testes).
export {
  CODE_TTL_MS,
  CODE_MAX_ATTEMPTS,
  RESEND_INTERVAL_MS,
  generateVerificationCode,
  hashVerificationCode,
  buildVerificationEmailHtml,
  sendVerificationEmail,
} from "./verification-email";

/** Cria (ou substitui) o código do e-mail. Devolve o código em texto puro. */
export async function issueVerificationCode(email: string, userId: number): Promise<string> {
  const code = generateVerificationCode();
  const now = new Date();

  await db
    .delete(emailVerificationCodes)
    .where(eq(emailVerificationCodes.email, email));

  await db.insert(emailVerificationCodes).values({
    email,
    userId,
    codeHash: hashVerificationCode(code),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    attempts: 0,
    lastSentAt: now,
  });

  return code;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "max_attempts" | "wrong" };

/**
 * Confere o código digitado. As três falhas têm respostas diferentes na rota
 * (400 genérico vs 429 "peça um novo código"), mas nenhuma revela o estado
 * exato além do necessário.
 */
export async function verifyEmailCode(email: string, code: string): Promise<VerifyResult> {
  const rows = await db
    .select()
    .from(emailVerificationCodes)
    .where(
      and(
        eq(emailVerificationCodes.email, email),
        gt(emailVerificationCodes.expiresAt, new Date())
      )
    );

  if (rows.length === 0) return { ok: false, reason: "not_found" };
  const row = rows[0];

  if (row.attempts >= CODE_MAX_ATTEMPTS) {
    return { ok: false, reason: "max_attempts" };
  }

  if (row.codeHash === hashVerificationCode(code)) return { ok: true };

  await db
    .update(emailVerificationCodes)
    .set({ attempts: row.attempts + 1 })
    .where(eq(emailVerificationCodes.id, row.id));

  return { ok: false, reason: "wrong" };
}

export async function discardVerificationCode(email: string): Promise<void> {
  await db
    .delete(emailVerificationCodes)
    .where(eq(emailVerificationCodes.email, email));
}

export type ResendCheck = { ok: true } | { ok: false; retryInSeconds: number };

export async function resendAllowed(email: string): Promise<ResendCheck> {
  const rows = await db
    .select()
    .from(emailVerificationCodes)
    .where(eq(emailVerificationCodes.email, email));

  if (rows.length === 0) return { ok: true };
  const waitMs = rows[0].lastSentAt.getTime() + RESEND_INTERVAL_MS - Date.now();
  return waitMs > 0 ? { ok: false, retryInSeconds: Math.ceil(waitMs / 1000) } : { ok: true };
}
