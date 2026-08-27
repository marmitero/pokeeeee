import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ROLE_LEVEL, sessions, toRole, users } from "@/db/schema";
import type { Role } from "@/db/schema";
import { forbidden, unauthorized } from "./api";
import { assertSameOrigin } from "./csrf";

/**
 * Sessões baseadas em cookie `httpOnly`.
 *
 * Substitui o modelo anterior (token no `localStorage` + `userId` no corpo
 * de toda request), que era a causa da V2 da auditoria: qualquer cliente
 * podia se passar por qualquer usuário apenas trocando um número.
 *
 * Decisões:
 *  - O cookie é `httpOnly` → inacessível a JavaScript, o que neutraliza
 *    roubo de sessão via XSS.
 *  - O **token bruto nunca é gravado no banco**: guarda-se o SHA-256 dele.
 *    Um vazamento do banco não entrega sessões utilizáveis.
 *  - `userId` agora é sempre derivado da sessão, nunca aceito do corpo.
 */

export const SESSION_COOKIE = "deluge_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const MAX_AGE_S = Math.floor(TTL_MS / 1000);

export type SessionUser = typeof users.$inferSelect;

// ─── Token ────────────────────────────────────────────────────────────────

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ─── Persistência ─────────────────────────────────────────────────────────

/**
 * Limpa sessões que não servem mais. Roda a cada login para a tabela não
 * crescer para sempre.
 *
 * Remove:
 *  1. sessões **vencidas**;
 *  2. sessões em **formato legado** — anteriores à Fase 1, cujo token era um
 *     UUID cru em vez de SHA-256. Elas já não são autenticáveis (a leitura
 *     sempre compara o hash), mas continuariam na tabela por até 30 dias.
 */
export async function purgeExpiredSessions(): Promise<void> {
  await db
    .delete(sessions)
    .where(
      sql`${sessions.expiresAt} < ${new Date()} OR ${sessions.token} !~ '^[0-9a-f]{64}$'`
    );
}

/**
 * Cria uma sessão nova e devolve o token BRUTO (para ir no cookie).
 * Cada login gera um token novo — o anterior continua válido até expirar,
 * permitindo múltiplos dispositivos.
 */
export async function createSession(userId: number): Promise<string> {
  await purgeExpiredSessions();

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await db.insert(sessions).values({
    userId,
    token: hashSessionToken(token),
    expiresAt,
  });

  return token;
}

/** Revoga todas as sessões de um usuário (usado em "sair de todos os dispositivos"). */
export async function revokeUserSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// ─── Leitura ──────────────────────────────────────────────────────────────

export function readSessionToken(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key !== SESSION_COOKIE) continue;
    const value = part.slice(eqIdx + 1).trim();
    return value ? decodeURIComponent(value) : null;
  }
  return null;
}

/** Resolve o usuário dono da sessão, ou `null` se não houver sessão válida. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = readSessionToken(req);
  if (!token) return null;

  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, hashSessionToken(token)))
    .limit(1);

  if (rows.length === 0) return null;
  if (new Date(rows[0].expiresAt).getTime() < Date.now()) return null;

  return rows[0].user;
}

/**
 * Gate de autorização. Lança `ApiError(401)` se não houver sessão válida.
 * É o ponto único por onde toda rota autenticada passa.
 */
export async function requireUser(req: Request): Promise<SessionUser> {
  // Como o cookie pode rodar com SameSite=None (necessário no iframe do
  // preview), a proteção CSRF é refeita aqui validando o Origin.
  assertSameOrigin(req);

  const user = await getSessionUser(req);
  if (!user) {
    throw unauthorized("Sessão inválida ou expirada. Faça login novamente.");
  }
  return user;
}

/**
 * Gate de papel. Exige sessão válida **e** papel igual ou superior a `min`.
 *
 * A comparação é por nível (`ROLE_LEVEL`), então pedir `"moderator"` também
 * aceita `"admin"`. Um papel desconhecido vindo do banco é tratado como
 * `"player"` — sempre falha para o lado mais restritivo.
 */
export async function requireRole(
  req: Request,
  min: Role
): Promise<SessionUser> {
  const user = await requireUser(req);
  const level = ROLE_LEVEL[toRole(user.role)];

  if (level < ROLE_LEVEL[min]) {
    throw forbidden(
      `Esta ação exige papel "${min}" ou superior. O seu é "${toRole(user.role)}".`
    );
  }

  return user;
}

/** Apaga a sessão atual do banco (logout de verdade). */
export async function destroySession(req: Request): Promise<void> {
  const token = readSessionToken(req);
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.token, hashSessionToken(token)));
}

// ─── Cookies ──────────────────────────────────────────────────────────────

/**
 * Atributos do cookie de sessão.
 *
 * `COOKIE_SAME_SITE` controla o `SameSite`:
 *
 *  - `lax` (padrão) — correto para acesso direto ao site. **Não funciona
 *    dentro de iframe cross-site**, porque o navegador não envia cookies
 *    `Lax` em contexto de terceiro.
 *  - `none` — necessário para o preview embutido em iframe. Exige `Secure`,
 *    e por desligar a proteção CSRF do navegador vem acompanhado da validação
 *    de `Origin` em `src/lib/csrf.ts`.
 *
 * Esse foi exatamente o bug que fazia login "funcionar" e toda request
 * seguinte devolver 401 no preview: o cookie era emitido com `Lax`, o iframe
 * não o reenviava, e a interface continuava logada só pelo estado em memória.
 */
function sameSite(): "Lax" | "None" {
  return process.env.COOKIE_SAME_SITE?.toLowerCase() === "none" ? "None" : "Lax";
}

function cookieAttributes(maxAge: number): string {
  const attrs = ["Path=/", "HttpOnly", `SameSite=${sameSite()}`, `Max-Age=${maxAge}`];

  // `SameSite=None` só é aceito pelo navegador junto com `Secure`.
  // Em produção `Secure` é sempre ligado.
  if (sameSite() === "None" || process.env.NODE_ENV === "production") {
    attrs.push("Secure");
  }

  return attrs.join("; ");
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(MAX_AGE_S)}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`;
}

export function withSessionCookie(res: NextResponse, token: string): NextResponse {
  res.headers.append("Set-Cookie", sessionCookie(token));
  return res;
}

export function withClearedSessionCookie(res: NextResponse): NextResponse {
  res.headers.append("Set-Cookie", clearedSessionCookie());
  return res;
}
