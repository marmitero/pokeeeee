import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bossFights, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { bossClaimSchema, bossQuerySchema, INVENTORY_KEYS } from "@/lib/validation";
import { badRequest, parse, publicUser, routeError } from "@/lib/api";
import {
  BOSS_DAILY_ATTEMPTS,
  bossFor,
  dayIdOf,
  weekIdOf,
  type BossArena,
} from "@/lib/boss-rotation";
import { getPokemonSpecies } from "@/lib/pokedex";

/**
 * Arena Boss (Etapa C, 8.3).
 *
 * GET: o estado da arena para o jogador — boss da semana (espécie/nível),
 * tentativas restantes hoje, vitória da semana e retirada da pedra.
 * POST `claim_stone`: retira 1 pedra de evolução à escolha (prêmio por
 * vencer o boss da semana naquela arena).
 *
 * A batalha em si roda em `/api/battle` (`start_boss` + `attack`), que
 * aplica os limites diário/semanal no servidor.
 */

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { arenaMapId } = parse(
      bossQuerySchema,
      Object.fromEntries(new URL(req.url).searchParams)
    );

    const now = new Date();
    const weekId = weekIdOf(now);
    const day = dayIdOf(now);
    const boss = bossFor(arenaMapId as BossArena, now);
    const species = getPokemonSpecies(boss.pokedexId);

    const fights = await db
      .select()
      .from(bossFights)
      .where(
        and(
          eq(bossFights.userId, user.id),
          eq(bossFights.arenaMapId, arenaMapId),
          eq(bossFights.weekId, weekId)
        )
      );

    const won = fights.find((f) => f.status === "WON") ?? null;
    const attemptsToday = fights.filter((f) => f.day === day).length;

    return NextResponse.json({
      arenaMapId,
      weekId,
      boss: {
        pokedexId: boss.pokedexId,
        name: species.name,
        level: boss.level,
        types: species.types,
      },
      attemptsLeft: Math.max(0, BOSS_DAILY_ATTEMPTS - attemptsToday),
      wonThisWeek: won !== null,
      stoneClaimed: won?.stoneClaimed ?? false,
      legendaryGranted: won?.legendaryGranted ?? false,
    });
  } catch (err: unknown) {
    return routeError(err, "boss:status", "Erro ao carregar a Arena Boss.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "boss", 30, 60_000);

    const input = parse(bossClaimSchema, await req.json().catch(() => ({})));
    const weekId = weekIdOf(new Date());

    if (!INVENTORY_KEYS.includes(input.item)) {
      throw badRequest("Item inválido.");
    }
    const column = input.item;

    const win = await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(bossFights)
        .where(
          and(
            eq(bossFights.userId, user.id),
            eq(bossFights.arenaMapId, input.arenaMapId),
            eq(bossFights.weekId, weekId),
            eq(bossFights.status, "WON")
          )
        )
        .for("update")
        .limit(1);

      const fight = rows[0];
      if (!fight) {
        throw badRequest("Vença o lendário desta semana para retirar uma pedra.");
      }
      if (fight.stoneClaimed) {
        throw badRequest("Você já retirou a pedra desta semana nesta arena.");
      }

      await tx
        .update(bossFights)
        .set({ stoneClaimed: true, updatedAt: new Date() })
        .where(eq(bossFights.id, fight.id));
      const [updated] = await tx
        .update(users)
        .set({ [column]: sql`${users[column]} + 1` })
        .where(eq(users.id, user.id))
        .returning();
      return updated!;
    });

    return NextResponse.json({
      user: publicUser(win),
      message: "Pedra retirada! Use-a no Pokémon Box para evoluir.",
    });
  } catch (err: unknown) {
    return routeError(err, "boss:claim", "Erro ao retirar a pedra.");
  }
}

export const dynamic = "force-dynamic";
