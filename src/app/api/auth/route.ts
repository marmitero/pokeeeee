import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import {
  computeDelugeStats,
  getPokemonSpecies,
  moveSlots,
  movesAtLevel,
} from "@/lib/pokedex";
import { STARTER_LEVEL, xpToNextLevel } from "@/lib/engine/xp";
import { ensureDefaultMapsSeeded } from "@/lib/seed-maps";
import {
  hashPassword,
  isLegacyPlaintext,
  verifyPassword,
} from "@/lib/password";
import {
  createSession,
  destroySession,
  getSessionUser,
  revokeUserSessions,
  withClearedSessionCookie,
  withSessionCookie,
} from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";
import { authSchema } from "@/lib/validation";
import { ApiError, parse, badRequest, publicUser, routeError, tooManyRequests } from "@/lib/api";
import { mailerConfigured } from "@/lib/mailer";
import {
  CODE_MAX_ATTEMPTS,
  discardVerificationCode,
  issueVerificationCode,
  resendAllowed,
  sendVerificationEmail,
  verifyEmailCode,
} from "@/lib/email-verification";

/**
 * Autenticação.
 *
 * Fase 1 — mudanças em relação ao original:
 *  - Senha guardada com **scrypt**, nunca em texto puro (V1).
 *  - `passwordHash` **não** sai mais nas respostas (V1).
 *  - Sessão em cookie `httpOnly`; o token não circula mais pelo corpo (V2).
 *  - `GET /me` substitui o `action: "resume"` com token no body.
 *  - `POST logout` revoga a sessão no banco (antes só apagava o localStorage).
 *  - Rate limiting por IP em registro/login (V1).
 *  - Erro interno vai para o log, cliente recebe mensagem genérica (V8).
 *
 * Confirmação de e-mail (2026-09-06):
 *  - O jogador cadastra **seu próprio e-mail** (antes era um placeholder
 *    derivado do username). A conta fica vinculada a ele.
 *  - O cadastro cria o usuário **não verificado** e envia um código de 6
 *    dígitos para o e-mail; `verify_email` confirma e já faz o login.
 *  - Login de conta não confirmada → 403 com orientação (o cliente abre a
 *    tela de verificação).
 *  - Sem SMTP configurado: dev/teste devolve o código em `devCode`;
 *    produção devolve 503 (melhor bloquear que criar conta sem a trava).
 *  - Contas criadas antes da confirmação foram grandfatheradas
 *    (migration 0006) e continuam logando normalmente.
 */

// Apenas os 3 iniciais clássicos são permitidos no registro.
const ALLOWED_STARTER_IDS = [1, 4, 7]; // Bulbasaur, Charmander, Squirtle
const DEFAULT_STARTER_ID = 4;

// 10 tentativas por IP a cada 10 minutos, em registro/login.
const AUTH_LIMIT = 10;
const AUTH_WINDOW_MS = 10 * 60 * 1000;

const GENERIC_AUTH_ERROR = "Falha na autenticação.";

const GENERIC_SERVER_ERROR =
  "Erro interno ao processar a solicitação. Tente novamente em instantes.";

const MAILER_UNAVAILABLE =
  "Confirmação por e-mail indisponível no momento. Tente mais tarde.";

// ─── GET /api/auth — sessão atual ─────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return withClearedSessionCookie(
        NextResponse.json({ error: "Não autenticado." }, { status: 401 })
      );
    }

    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, user.id));

    return NextResponse.json({ user: publicUser(user), party });
  } catch (err: unknown) {
    return routeError(err, "auth:me", "Não foi possível restaurar a sessão.");
  }
}

/**
 * Bearer token na resposta: produção usa apenas cookie httpOnly; o token
 * no corpo existe só em dev/teste (ou com opt-in explícito).
 */
function bearerTokenOrUndefined(token: string): string | undefined {
  return process.env.NODE_ENV !== "production" ||
    process.env.SESSION_BEARER_ENABLED === "true"
    ? token
    : undefined;
}

/**
 * Emissa + entrega do código de confirmação.
 *
 * - SMTP configurado → envia de verdade (falha de transporte: 503 em
 *   produção; em dev cai no fallback `devCode` para não travar o fluxo).
 * - Sem SMTP + dev/teste → código sai no log e na resposta `devCode`.
 * - Sem SMTP + produção → 503: cadastro sem confirmação não é permitido.
 */
async function issueAndDeliverCode(
  email: string,
  username: string,
  userId: number
): Promise<{ devCode?: string }> {
  const code = await issueVerificationCode(email, userId);
  return deliverCode(email, username, code);
}

/** Entrega (e-mail real ou `devCode`) de um código já gravado. */
async function deliverCode(
  email: string,
  username: string,
  code: string
): Promise<{ devCode?: string }> {
  if (!mailerConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth] código de confirmação (dev) para ${email}: ${code}`);
      return { devCode: code };
    }
    throw new ApiError(503, MAILER_UNAVAILABLE);
  }

  try {
    await sendVerificationEmail(email, username, code);
    return {};
  } catch (err: unknown) {
    console.error("[auth] falha ao enviar e-mail de confirmação", err);
    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth] fallback dev: código para ${email}: ${code}`);
      return { devCode: code };
    }
    throw new ApiError(503, MAILER_UNAVAILABLE);
  }
}

// ─── POST /api/auth — register | verify_email | resend_code | login | logout ─

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const action = (body as { action?: string })?.action;

    // ── LOGOUT ───────────────────────────────────────────────────────────
    if (action === "logout") {
      assertSameOrigin(req);
      const user = await getSessionUser(req);

      // `?all=1` derruba todos os dispositivos; senão só a sessão atual.
      const url = new URL(req.url);
      if (user && url.searchParams.get("all") === "1") {
        await revokeUserSessions(user.id);
      } else {
        await destroySession(req);
      }

      return withClearedSessionCookie(NextResponse.json({ ok: true }));
    }

    const input = parse(authSchema, body);
    await enforceRateLimit(req, "auth", AUTH_LIMIT, AUTH_WINDOW_MS, input.action);

    await ensureDefaultMapsSeeded();

    // ── REGISTER ────────────────────────────────────────────────────────
    if (input.action === "register") {
      const username = input.username;
      const email = input.email; // já lowercased/trimmed pelo schema

      const existingUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      const existingEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      // Conta PENDENTE (cadastro feito, e-mail nunca confirmado) com o mesmo
      // usuário + e-mail + senha: não é "duplicada" — é o mesmo jogador
      // tentando de novo (ex.: o e-mail não chegou, ou o cadastro anterior
      // falhou depois de criar a conta). Só reenvia o código. A senha é
      // exigida para ninguém "sequestrar" um cadastro pendente alheio.
      const pending = existingUsername[0];
      if (
        pending &&
        !pending.emailVerified &&
        pending.email === email &&
        existingEmail[0]?.id === pending.id &&
        verifyPassword(input.password, pending.passwordHash)
      ) {
        const check = await resendAllowed(email);
        if (!check.ok) {
          throw tooManyRequests(
            `Sua conta já existe e aguarda confirmação. Aguarde ${check.retryInSeconds}s para pedir um novo código.`
          );
        }
        const { devCode } = await issueAndDeliverCode(email, username, pending.id);
        return NextResponse.json({
          user: publicUser(pending),
          verified: false,
          devCode,
          message: `Sua conta já existia e aguardava confirmação. Novo código enviado para ${email}.`,
        });
      }

      if (existingUsername.length > 0) {
        throw badRequest("Este nome de treinador já está registrado.");
      }
      if (existingEmail.length > 0) {
        throw badRequest(
          "Este e-mail já está vinculado a outra conta. Tente entrar com ele."
        );
      }

      const starterId = ALLOWED_STARTER_IDS.includes(Number(input.starterId))
        ? Number(input.starterId)
        : DEFAULT_STARTER_ID;

      const species = getPokemonSpecies(starterId);
      // Iniciais sempre começam como variante Normal (não premium).
      const stats = computeDelugeStats(species, STARTER_LEVEL, "Normal");
      // Fase 6.1: golpes do nível inicial (poder 30–55), não o conjunto de fim
      // de jogo. Era daqui que saía o inicial nível 5 com Lança-Chamas.
      const starterMoves = movesAtLevel(species, STARTER_LEVEL);

      // Conta nasce **não verificada**: só loga depois do código do e-mail.
      // Tudo numa transação: usuário + inicial + código gravados juntos ou
      // nada. Antes (incidente de produção, 2026-09-06) a falha ao gravar o
      // código deixava uma conta "presa" sem código e sem como confirmar.
      // O envio do e-mail fica FORA da transação (rede lenta não segura lock).
      const { newUser, code } = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({
            username,
            email,
            passwordHash: hashPassword(input.password),
            avatarSprite: input.avatarSprite || "red",
          })
          .returning();

        await tx.insert(userPokemon).values({
          userId: created.id,
          pokedexId: species.id,
          name: species.name,
          variant: "Normal",
          isPremiumSkin: false,
          level: STARTER_LEVEL,
          xp: 0,
          xpToNextLevel: xpToNextLevel(STARTER_LEVEL),
          hp: stats.hp,
          maxHp: stats.maxHp,
          attack: stats.attack,
          defense: stats.defense,
          spAttack: stats.spAttack,
          spDefense: stats.spDefense,
          speed: stats.speed,
          ...moveSlots(starterMoves),
          partySlot: 1,
          isStarter: true,
        });

        const issued = await issueVerificationCode(email, created.id, tx);
        return { newUser: created, code: issued };
      });

      const { devCode } = await deliverCode(email, username, code);

      // Sem sessão: a jornada começa em `verify_email`, que confirma e
      // já faz o login (cookie + bearer, quando aplicável).
      return NextResponse.json({
        user: publicUser(newUser),
        verified: false,
        devCode,
        message: `Código enviado para ${email}. Confira a sua caixa de entrada!`,
      });
    }

    // ── VERIFY_EMAIL ─────────────────────────────────────────────────────
    if (input.action === "verify_email") {
      const { email, code } = input;

      const result = await verifyEmailCode(email, code);
      if (!result.ok) {
        if (result.reason === "max_attempts") {
          throw tooManyRequests(
            `Muitas tentativas erradas (${CODE_MAX_ATTEMPTS}). Peça um novo código.`
          );
        }
        // "wrong" e "not_found" (código inexistente/expirado) ganham a mesma
        // resposta: não revela qual das duas foi.
        throw badRequest(
          "Código inválido ou expirado. Confira os 6 dígitos ou peça um novo código."
        );
      }

      // O usuário que confirmou este e-mail (se existir) — e só ele.
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      const user = rows[0];
      if (!user || user.emailVerified) {
        // E-mail sem conta, ou já confirmado: mesma resposta genérica.
        throw badRequest(
          "Código inválido ou expirado. Confira os 6 dígitos ou peça um novo código."
        );
      }

      await db
        .update(users)
        .set({ emailVerified: true, lastOnlineAt: new Date() })
        .where(eq(users.id, user.id));
      await discardVerificationCode(email);

      // Confirmação = login: sessão nova imediatamente.
      const token = await createSession(user.id);
      const party = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, user.id));

      return withSessionCookie(
        NextResponse.json({
          user: publicUser(user),
          party,
          verified: true,
          token: bearerTokenOrUndefined(token),
          message: "E-mail confirmado! Bem-vindo ao Catchbound!",
        }),
        token
      );
    }

    // ── RESEND_CODE ──────────────────────────────────────────────────────
    if (input.action === "resend_code") {
      const { email } = input;

      const check = await resendAllowed(email);
      if (!check.ok) {
        throw tooManyRequests(
          `Aguarde ${check.retryInSeconds}s para pedir um novo código.`
        );
      }

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      const user = rows[0];

      // Sem conta (ou já confirmada): resposta genérica — nunca diz qual
      // foi o caso. Nada é enviado.
      if (!user || user.emailVerified) {
        return NextResponse.json({
          ok: true,
          message: "Se este e-mail estiver registrado, um novo código foi enviado.",
        });
      }

      const { devCode } = await issueAndDeliverCode(email, user.username, user.id);

      return NextResponse.json({
        ok: true,
        devCode,
        message: "Novo código enviado. O código antigo deixou de valer.",
      });
    }

    // ── LOGIN ────────────────────────────────────────────────────────────
    const found = await db
      .select()
      .from(users)
      .where(eq(users.username, input.username));

    if (found.length === 0) {
      // Mensagem idêntica à de senha errada: não revela se a conta existe.
      throw badRequest(GENERIC_AUTH_ERROR);
    }

    const user = found[0];
    const stored = user.passwordHash;

    let passwordOk = verifyPassword(input.password, stored);

    // Migração transparente: contas criadas antes da Fase 1 tinham a senha
    // em texto puro. Confere no igual e já re-hash com scrypt.
    if (!passwordOk && isLegacyPlaintext(stored)) {
      passwordOk = stored === input.password;
      if (passwordOk) {
        await db
          .update(users)
          .set({ passwordHash: hashPassword(input.password) })
          .where(eq(users.id, user.id));
        console.info(`[auth] senha legada migrada para scrypt (user ${user.id})`);
      }
    }

    if (!passwordOk) {
      throw badRequest(GENERIC_AUTH_ERROR);
    }

    // Conta ainda não confirmou o e-mail → bloqueia o login e orienta o
    // cliente a abrir a verificação (o AuthModal trata o 403).
    if (!user.emailVerified) {
      throw new ApiError(
        403,
        "Sua conta ainda não confirmou o e-mail. Digite o código de 6 dígitos que enviamos para você."
      );
    }

    const token = await createSession(user.id);

    await db
      .update(users)
      .set({ lastOnlineAt: new Date() })
      .where(eq(users.id, user.id));

    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, user.id));

    return withSessionCookie(
      NextResponse.json({ user: publicUser(user), party, token: bearerTokenOrUndefined(token) }),
      token
    );
  } catch (err: unknown) {
    // Erro inesperado (banco, permissão, etc.) NÃO pode virar "Falha na
    // autenticação" — essa é a mensagem de usuário/senha errados e esconde
    // incidentes de infraestrutura (2026-09-06: RLS sem policy em produção
    // apareceu para o jogador como falha de login). O detalhe vai ao log.
    return routeError(err, "auth", GENERIC_SERVER_ERROR);
  }
}

export const dynamic = "force-dynamic";
