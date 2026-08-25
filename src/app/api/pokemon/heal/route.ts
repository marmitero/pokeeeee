import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId, currentMapId, playerX, playerY } = await req.json();

    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, Number(userId)));

    for (const poke of party) {
      await db
        .update(userPokemon)
        .set({ hp: poke.maxHp })
        .where(eq(userPokemon.id, poke.id));
    }

    if (currentMapId !== undefined && playerX !== undefined && playerY !== undefined) {
      await db
        .update(users)
        .set({
          currentMapId: Number(currentMapId),
          playerX: Number(playerX),
          playerY: Number(playerY),
          lastOnlineAt: new Date(),
        })
        .where(eq(users.id, Number(userId)));
    }

    const updatedParty = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, Number(userId)));

    return NextResponse.json({
      party: updatedParty,
      message: "Toda a sua equipe foi curada 100% no Centro Pokémon!",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao curar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
