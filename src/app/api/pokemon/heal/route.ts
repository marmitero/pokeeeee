import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { healSchema } from "@/lib/validation";
import { parse, routeError } from "@/lib/api";

/**
 * Centro Pokémon — cura toda a equipe e salva a posição.
 *
 * Fase 1 — o que mudou:
 *  - `userId` vem da **sessão**, não do corpo (V2).
 *  - Posição validada (inteiro, 0–63) antes de gravar.
 *  - A cura virou **um único UPDATE** (`hp = max_hp`) em vez de um UPDATE
 *    por Pokémon.
 */

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const input = parse(healSchema, await req.json().catch(() => ({})));

    await db
      .update(userPokemon)
      .set({ hp: sql`${userPokemon.maxHp}` })
      .where(eq(userPokemon.userId, user.id));

    const { currentMapId, playerX, playerY } = input;
    if (
      currentMapId !== undefined &&
      playerX !== undefined &&
      playerY !== undefined
    ) {
      await db
        .update(users)
        .set({
          currentMapId,
          playerX,
          playerY,
          lastOnlineAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, user.id));

    return NextResponse.json({
      party,
      message: "Toda a sua equipe foi curada 100% no Centro Pokémon!",
    });
  } catch (err: unknown) {
    return routeError(err, "pokemon:heal", "Erro ao curar a equipe.");
  }
}

export const dynamic = "force-dynamic";
