import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { computeDelugeStats, getPokemonSpecies } from "@/lib/pokedex";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { catchSchema } from "@/lib/validation";
import type { BALL_VALUES } from "@/lib/validation";
import { parse, badRequest, routeError, publicUser } from "@/lib/api";

/**
 * Captura de Pokémon.
 *
 * Fase 1 — o que mudou:
 *  - `userId` vem da **sessão**, não do corpo (V2).
 *  - A bola é **verificada e debitada atomicamente** antes de gravar o
 *    Pokémon. Antes o Pokémon era inserido e só depois a bola era
 *    decrementada com `Math.max(0, n-1)` — dava para capturar sem possuir
 *    nenhuma bola (V4).
 *  - `level` limitado a 1–100 e `variant` restrito ao enum (V4).
 *  - Débito + inserção dentro de uma transação.
 *
 * ⚠️ Ainda pendente (Fase 2): a **rolagem de captura** continua não existindo
 * — `catchRate` segue sem ser lido e a captura sempre succeeds. E os status
 * ainda são calculados como variante "Normal" (bug B4).
 */

const BALL_LABEL: Record<(typeof BALL_VALUES)[number], string> = {
  pokeballs: "Pokébolas",
  greatballs: "Great Balls",
  ultraballs: "Ultra Balls",
  masterballs: "Master Balls",
};

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    enforceRateLimit(req, "catch", 30, 60_000);

    const input = parse(catchSchema, await req.json().catch(() => ({})));
    const ball = input.ballUsed;

    if (user[ball] <= 0) {
      throw badRequest(`Você não possui ${BALL_LABEL[ball]}.`);
    }

    const species = getPokemonSpecies(input.pokedexId);

    // TODO(Fase 2): usar `input.variant` aqui. Manter "Normal" preserva o
    // comportamento atual (bug B4) até o motor de jogo ir para o servidor.
    const stats = computeDelugeStats(species, input.level, "Normal");

    await db.transaction(async (tx) => {
      // Débito condicional: se outra request já gastou a última bola,
      // nenhuma linha é atualizada e a captura é abortada.
      const deducted = await tx
        .update(users)
        .set({ [ball]: sql`${users[ball]} - 1` })
        .where(and(eq(users.id, user.id), sql`${users[ball]} > 0`))
        .returning({ id: users.id });

      if (deducted.length === 0) {
        throw badRequest(`Você não possui ${BALL_LABEL[ball]}.`);
      }

      const party = await tx
        .select({ id: userPokemon.id })
        .from(userPokemon)
        .where(
          and(eq(userPokemon.userId, user.id), isNotNull(userPokemon.partySlot))
        );

      const newPartySlot = party.length < 6 ? party.length + 1 : null;

      await tx.insert(userPokemon).values({
        userId: user.id,
        pokedexId: species.id,
        name: species.name,
        variant: input.variant,
        isPremiumSkin: false,
        level: input.level,
        xp: input.level * 100,
        xpToNextLevel: (input.level + 1) * 120,
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
        partySlot: newPartySlot,
        isStarter: false,
      });
    });

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, user.id));

    return NextResponse.json({ user: publicUser(updatedUser), party });
  } catch (err: unknown) {
    return routeError(err, "pokemon:catch", "Erro ao capturar o Pokémon.");
  }
}

export const dynamic = "force-dynamic";
