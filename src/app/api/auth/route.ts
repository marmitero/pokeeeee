import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userPokemon, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeDelugeStats, getPokemonSpecies } from "@/lib/pokedex";
import { ensureDefaultMapsSeeded } from "@/lib/seed-maps";
import { randomUUID } from "crypto";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Only the 3 classic starters are allowed at registration
const ALLOWED_STARTER_IDS = [1, 4, 7]; // Bulbasaur, Charmander, Squirtle

export async function POST(req: Request) {
  try {
    await ensureDefaultMapsSeeded();
    const body = await req.json();
    const { action, username, password, starterId, avatarSprite } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (action === "register") {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, username.trim()));
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "Este nome de treinador já está registrado." },
          { status: 409 }
        );
      }

      const safeStarterId = ALLOWED_STARTER_IDS.includes(Number(starterId))
        ? Number(starterId)
        : 4;

      const [newUser] = await db
        .insert(users)
        .values({
          username: username.trim(),
          email: `${username.trim().toLowerCase()}@delugerpg.net`,
          passwordHash: password,
          avatarSprite: avatarSprite || "red",
          money: 3000,
          pokeballs: 10,
          greatballs: 5,
          ultraballs: 2,
          masterballs: 0,
          potions: 3,
          superPotions: 1,
          maxPotions: 0,
          revives: 1,
          currentMapId: 1,
          playerX: 8,
          playerY: 12,
        })
        .returning();

      const species = getPokemonSpecies(safeStarterId);
      // Starters always start as Normal variant (not premium)
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

      // Create session
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await db.insert(sessions).values({ userId: newUser.id, token, expiresAt });

      const party = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, newUser.id));

      return NextResponse.json({ user: newUser, party, token });
    }

    if (action === "login") {
      const found = await db
        .select()
        .from(users)
        .where(eq(users.username, username.trim()));
      if (found.length === 0 || found[0].passwordHash !== password) {
        return NextResponse.json(
          { error: "Treinador não encontrado ou senha inválida." },
          { status: 401 }
        );
      }
      const u = found[0];

      // Update lastOnlineAt
      await db
        .update(users)
        .set({ lastOnlineAt: new Date() })
        .where(eq(users.id, u.id));

      // Create new session
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await db.insert(sessions).values({ userId: u.id, token, expiresAt });

      const party = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, u.id));

      return NextResponse.json({ user: u, party, token });
    }

    if (action === "resume") {
      // Resume session from stored token
      const { token } = body;
      if (!token) return NextResponse.json({ error: "Token ausente" }, { status: 401 });

      const sess = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token));

      if (!sess.length || new Date(sess[0].expiresAt) < new Date()) {
        return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
      }

      const u = await db
        .select()
        .from(users)
        .where(eq(users.id, sess[0].userId));
      if (!u.length) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

      const party = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, u[0].id));

      return NextResponse.json({ user: u[0], party, token });
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro no servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
