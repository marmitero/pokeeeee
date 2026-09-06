import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { userPokemon, users } from "@/db/schema";
import { xpToNextLevel } from "@/lib/engine/xp";
import {
  computeDelugeStats,
  getPokemonSpecies,
  moveSlots,
  movesAtLevel,
} from "@/lib/pokedex";

/**
 * Evolução por nível (Fase 6.3) — o caminho completo, pela rota real.
 *
 * O teste unitário de `engine/evolution` já prova a transformação pura. O que
 * falta provar aqui é o contrato de ponta a ponta: a vitória que cruza o
 * gatilho de nível **evolui dentro da batalha** (log visível), e o
 * `pokedexId`/`name` novos **persistem** no banco — sem endpoint de "evoluir"
 * que o cliente possa chamar.
 *
 * Cenário: Charmander nível 15 com XP a um passo do 16 vence um selvagem do
 * mapa 1 (ganho mínimo medido: 16 XP) → cruza 16 → Charmeleon.
 */

const MAP_ID = 1;
const TALL_GRASS = { x: 3, y: 9 };

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  const c = client();
  const r = await c.call("/api/auth", {
    body: { action: "register", username, password: "senhaSegura123", starterId: 4 },
  });
  expect(r.status, `registro falhou: ${JSON.stringify(r.body)}`).toBe(200);
  return c;
}

async function starterRow(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  const [row] = await db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
  return row;
}

/**
 * Sobe o inicial para `level` com tudo que uma batalha real teria gravado:
 * status recalculados, HP cheio e golpes do learnset. Sem isto a linha fica
 * com o HP do nível 5 e o Pokémon perde para um selvagem qualquer.
 */
async function setStarterLevel(username: string, level: number, xp: number) {
  const row = await starterRow(username);
  const species = getPokemonSpecies(row.pokedexId);
  const stats = computeDelugeStats(species, level, "Normal");
  await db
    .update(userPokemon)
    .set({
      level,
      xp,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: stats.defense,
      spAttack: stats.spAttack,
      spDefense: stats.spDefense,
      speed: stats.speed,
      ...moveSlots(movesAtLevel(species, level)),
    })
    .where(eq(userPokemon.id, row.id));
}

/** Vence a batalha selvagem atual atacando com a Brasa (slot sempre presente). */
async function winCurrentBattle(c: ReturnType<typeof client>, battleId: number) {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const r = await c.call("/api/battle", {
      body: { action: "attack", battleId, moveIndex: 1 },
    });
    expect(r.status).toBe(200);
    const battle = (r.body as { battle?: { status?: string } }).battle;
    if (battle?.status !== "ACTIVE") return r.body as Record<string, unknown>;
  }
  throw new Error("batalha não terminou em 30 turnos");
}

describe("evolução na vitória (6.3)", () => {
  it("Charmander que cruza o nível 16 numa vitória vira Charmeleon e persiste", async () => {
    const username = "evo-ash-1";
    const c = await register(username);

    // Nível 15, a um passo do 16: qualquer vitória garante o cruzamento.
    await setStarterLevel(username, 15, xpToNextLevel(15) - 10);

    const start = await c.call("/api/battle", {
      body: { action: "start_wild", mapId: MAP_ID, playerX: TALL_GRASS.x, playerY: TALL_GRASS.y },
    });
    expect(start.status).toBe(200);
    const battleId = (start.body as { battle: { id: number } }).battle.id;

    const final = await winCurrentBattle(c, battleId);
    const state = (
      final as { battle: { status: string; state: { log: string[] } } }
    ).battle.state;

    expect((final as { battle: { status: string } }).battle.status).toBe("WON");
    expect(state.log.join(" ")).toContain("evoluiu para Charmeleon");

    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(5);
    expect(depois.name).toBe("Charmeleon");
    expect(depois.level).toBe(16);
    expect(depois.hp).toBeGreaterThan(0);
    expect(depois.hp).toBeLessThanOrEqual(depois.maxHp);
    expect(depois.move1.length).toBeGreaterThan(0);
  });

  it("vitória fora do gatilho não evolui ninguém", async () => {
    const username = "evo-ash-2";
    const c = await register(username);

    // Nível 10, a um passo do 11: muito abaixo do gatilho 16.
    await setStarterLevel(username, 10, xpToNextLevel(10) - 5);

    const start = await c.call("/api/battle", {
      body: { action: "start_wild", mapId: MAP_ID, playerX: TALL_GRASS.x, playerY: TALL_GRASS.y },
    });
    expect(start.status).toBe(200);
    const battleId = (start.body as { battle: { id: number } }).battle.id;

    const final = await winCurrentBattle(c, battleId);
    const log = (final as { battle: { state: { log: string[] } } }).battle.state.log.join(" ");

    expect(log).not.toContain("evoluiu para");
    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(4); // continua Charmander
    expect(depois.level).toBe(11);
  });

  it("catch-up: Pokémon que já está acima do gatilho evolui no próximo level up", async () => {
    // Pokémon de produção que cruzaram o nível 16 antes da 6.3 existir não
    // ficariam presos: o gatilho é "nível ≥ limiar", não "acabou de cruzar".
    // O próximo level up traz o estágio certo para o nível atual — sem
    // script de backfill.
    const username = "evo-ash-3";
    const c = await register(username);

    await setStarterLevel(username, 16, xpToNextLevel(16) - 5);

    const start = await c.call("/api/battle", {
      body: { action: "start_wild", mapId: MAP_ID, playerX: TALL_GRASS.x, playerY: TALL_GRASS.y },
    });
    expect(start.status).toBe(200);
    const battleId = (start.body as { battle: { id: number } }).battle.id;

    const final = await winCurrentBattle(c, battleId);
    const state = (final as { battle: { state: { log: string[] } } }).battle.state;

    expect(state.log.join(" ")).toContain("evoluiu para Charmeleon");
    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(5);
    expect(depois.level).toBe(17);
  });
});
