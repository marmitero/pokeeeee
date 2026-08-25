import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { computeDelugeStats, getPokemonSpecies } from "@/lib/pokedex";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId,
      pokedexId,
      variant = "Normal",
      level = 7,
      ballUsed = "pokeballs",
    } = body;

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)));

    if (!userRows.length) {
      return NextResponse.json({ error: "Treinador não encontrado" }, { status: 404 });
    }

    const u = userRows[0];
    const species = getPokemonSpecies(Number(pokedexId));
    const stats = computeDelugeStats(species, level, "Normal");

    // Deduct ball
    const ballField =
      ballUsed === "masterballs"
        ? "masterballs"
        : ballUsed === "ultraballs"
        ? "ultraballs"
        : ballUsed === "greatballs"
        ? "greatballs"
        : "pokeballs";

    const currentCount = u[ballField as keyof typeof u] as number;
    const newCount = Math.max(0, currentCount - 1);

    // Count current party slots
    const partyPokemon = await db
      .select()
      .from(userPokemon)
      .where(and(eq(userPokemon.userId, u.id), isNotNull(userPokemon.partySlot)));

    const partyCount = partyPokemon.length;
    const newPartySlot = partyCount < 6 ? partyCount + 1 : null;

    await db.insert(userPokemon).values({
      userId: u.id,
      pokedexId: species.id,
      name: species.name,
      variant,
      isPremiumSkin: false, // wild catches are always normal skin
      level,
      xp: level * 100,
      xpToNextLevel: (level + 1) * 120,
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

    await db
      .update(users)
      .set({ [ballField]: newCount })
      .where(eq(users.id, u.id));

    const updatedUser = await db.select().from(users).where(eq(users.id, u.id));
    const updatedParty = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, u.id));

    return NextResponse.json({ user: updatedUser[0], party: updatedParty });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao capturar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
