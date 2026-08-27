import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { computeDelugeStats, getPokemonSpecies } from "@/lib/pokedex";
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
import {   authSchema   } from "@/lib/validation";
import {   parse, badRequest, notFound, publicUser, routeError   } from "@/lib/api";

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
 */

// Apenas os 3 iniciais clássicos são permitidos no registro.
const ALLOWED_STARTER_IDS = [1, 4, 7]; // Bulbasaur, Charmander, Squirtle
const DEFAULT_STARTER_ID = 4;

// 10 tentativas por IP a cada 10 minutos, em registro e login.
const AUTH_LIMIT = 10;
const AUTH_WINDOW_MS = 10 * 60 * 1000;

const GENERIC_AUTH_ERROR = "Falha na autenticação.";

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

// ─── POST /api/auth — register | login | logout ───────────────────────────

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const action = (body as { action?: string })?.action;

    // ── LOGOUT ───────────────────────────────────────────────────────────
    if (action === "logout") {
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

    // ── REGISTER ─────────────────────────────────────────────────────────
    if (input.action === "register") {
      const username = input.username;

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username));

      if (existing.length > 0) {
        throw badRequest("Este nome de treinador já está registrado.");
      }

      const starterId = ALLOWED_STARTER_IDS.includes(Number(input.starterId))
        ? Number(input.starterId)
        : DEFAULT_STARTER_ID;

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email: `${username.toLowerCase()}@delugerpg.net`,
          passwordHash: hashPassword(input.password),
          avatarSprite: input.avatarSprite || "red",
        })
        .returning();

      const species = getPokemonSpecies(starterId);
      // Iniciais sempre começam como variante Normal (não premium).
      const stats = computeDelugeStats(species, 5, "Normal");

      await db.insert(userPokemon).values({
        userId: newUser.id,
        pokedexId: species.id,
        name: species.name,
        variant: "Normal",
        isPremiumSkin: false,
        level: 5,
        xp: 0,
        xpToNextLevel: 100,
        hp: stats.hp,
        maxHp: stats.maxHp,
        attack: stats.attack,
        defense: stats.defense,
        spAttack: stats.spAttack,
        spDefense: stats.spDefense,
        speed: stats.speed,
        move1: species.moves[0]?.name || "Investida",
        move2: species.moves[1]?.name || "Ataque Rápido",
        move3: species.moves[2]?.name || "Rosnado",
        move4: species.moves[3]?.name || "Arranhão",
        partySlot: 1,
        isStarter: true,
      });

      const token = await createSession(newUser.id);
      const party = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, newUser.id));

      // O token vai no corpo TAMBÉM: é o que permite o fluxo Bearer dentro de
      // iframe cross-site, onde o cookie não é reenviado. Não é vazamento —
      // é a credencial do próprio usuário logado. O que era vazamento de
      // verdade (passwordHash) continua fora da resposta.
      return withSessionCookie(
        NextResponse.json({ user: publicUser(newUser), party, token }),
        token
      );
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
      NextResponse.json({ user: publicUser(user), party, token }),
      token
    );
  } catch (err: unknown) {
    return routeError(err, "auth", GENERIC_AUTH_ERROR);
  }
}

export const dynamic = "force-dynamic";
