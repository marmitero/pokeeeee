import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { userPokemon, users } from "@/db/schema";
import { computeDelugeStats, getPokemonSpecies, moveSlots, movesAtLevel } from "@/lib/pokedex";

/**
 * Status de batalha (Fase 8.4) — o contrato de ponta a ponta, pela rota real.
 *
 * Os testes unitários de `engine/status` e `engine/turn` provam as regras
 * puras (Gen III). O que falta provar aqui:
 *  - um golpe de Status **aplica** o status pelo motor autoritativo e o
 *    estado da batalha o expõe (`opponent.status`);
 *  - o status do Pokémon do jogador **persiste** em `user_pokemon.status`
 *    depois do turno e é limpo pelo Centro Pokémon e pelo item certo;
 *  - `use_item` fora de batalha recusa item errado / sem status, e a coluna
 *    de inventário só é debitada quando o item age;
 *  - `use_item` em batalha (ação nova) cura e **consome o turno**;
 *  - a loja vende os itens de cura (categoria `potion`, preços da Gen III).
 *
 * Determinismo: o inicial vira um Pikachu nv 60 (Onda Trovão tem precisão
 * 100 e a tabela do mapa 1 só tem Grama/Fogo/Água/Normal — nenhum Terra ou
 * Elétrico, logo a paralisia é garantida no 1º golpe, a menos que o Pikachu
 * seja adormecido antes... impossível: nenhum selvagem do mapa 1 tem golpe
 * de sono no nível 3–8).
 */

const MAP_ID = 1;
const TALL_GRASS = { x: 3, y: 9 };

interface BattleBody {
  battle: {
    id: number;
    status: string;
    state: {
      turn: number;
      log: string[];
      player: { hp: number; maxHp: number; status: string; statusTurns: number; moves: { name: string; category: string }[] };
      opponent: { hp: number; maxHp: number; status: string; types: string[] };
    };
  };
  user: Record<string, number>;
}

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  const { c } = await registerVerified(username);
  return c;
}

async function userRow(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user;
}

async function starterRow(username: string) {
  const user = await userRow(username);
  const [row] = await db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
  return row;
}

/** Inicial → Pikachu nv `level`, HP cheio, golpes do learnset (inclui Onda Trovão desde o nv 10). */
async function makePikachu(username: string, level = 60) {
  const row = await starterRow(username);
  const species = getPokemonSpecies(25);
  const stats = computeDelugeStats(species, level, "Normal");
  await db
    .update(userPokemon)
    .set({
      pokedexId: 25,
      name: species.name,
      level,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: stats.defense,
      spAttack: stats.spAttack,
      spDefense: stats.spDefense,
      speed: stats.speed,
      status: "NONE",
      statusTurns: 0,
      ...moveSlots([...movesAtLevel(species, 9), species.learnset.find((e) => e.move.name === "Onda Trovão")!.move].slice(-4)),
    })
    .where(eq(userPokemon.id, row.id));
  return row.id;
}

async function startWild(c: ReturnType<typeof client>) {
  const r = await c.call("/api/battle", {
    body: { action: "start_wild", mapId: MAP_ID, playerX: TALL_GRASS.x, playerY: TALL_GRASS.y },
  });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body as BattleBody;
}

function moveIndex(b: BattleBody, name: string): number {
  const i = b.battle.state.player.moves.findIndex((m) => m.name === name);
  expect(i, `golpe ${name} deveria estar nos 4 slots`).toBeGreaterThanOrEqual(0);
  return i;
}

describe("Fase 8.4 — golpe de Status aplica pelo motor do servidor", () => {
  it("Onda Trovão paralisa o selvagem; a etiqueta aparece no estado e a captura ganha bônus", async () => {
    const c = await register("status-onda");
    await makePikachu("status-onda");

    const start = await startWild(c);
    expect(start.battle.state.opponent.status).toBe("NONE");
    expect(start.battle.state.opponent.types).not.toContain("Ground");

    const r = await c.call("/api/battle", {
      body: { action: "attack", battleId: start.battle.id, moveIndex: moveIndex(start, "Onda Trovão") },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const b = r.body as BattleBody;

    // Golpe de Status não causa dano; o log narra a paralisia; o estado guarda.
    const log = b.battle.state.log;
    const i = log.findIndex((l) => /usou Onda Trovão!/.test(l));
    expect(i).toBeGreaterThanOrEqual(0);
    // A linha seguinte ao golpe é a paralisia — sem "Causou N de dano" entre elas.
    expect(log[i + 1]).toMatch(/está paralisado! Talvez não consiga se mover!/);
    expect(b.battle.state.opponent.status).toBe("PAR");
    expect(b.battle.state.opponent.hp).toBe(b.battle.state.opponent.maxHp);

    // Segundo Onda Trovão: "já está paralisado" — nada muda.
    const r2 = await c.call("/api/battle", {
      body: { action: "attack", battleId: b.battle.id, moveIndex: moveIndex(b, "Onda Trovão") },
    });
    expect(r2.status).toBe(200);
    const b2 = r2.body as BattleBody;
    if (b2.battle.status === "ACTIVE") {
      expect(b2.battle.state.log.join("\n")).toMatch(/já está paralisado!/);
      expect(b2.battle.state.opponent.status).toBe("PAR");
    }
  });
});

describe("Fase 8.4 — persistência e cura do status do jogador", () => {
  it("status gravado no banco persiste até Centro Pokémon (heal) limpar", async () => {
    const c = await register("status-persist");
    const pokeId = await makePikachu("status-persist");

    // Simula um Pokémon que saiu envenenado de uma batalha anterior.
    await db.update(userPokemon).set({ status: "PSN" }).where(eq(userPokemon.id, pokeId));

    // A batalha nova carrega o status persistido…
    const start = await startWild(c);
    expect(start.battle.state.player.status).toBe("PSN");

    // …e o veneno corre no fim do turno (1/8 do HP máximo, mínimo 1).
    const hpBefore = start.battle.state.player.hp;
    const r = await c.call("/api/battle", {
      body: { action: "attack", battleId: start.battle.id, moveIndex: moveIndex(start, "Onda Trovão") },
    });
    expect(r.status).toBe(200);
    const b = r.body as BattleBody;
    expect(b.battle.state.log.join("\n")).toMatch(/sofre com o veneno!/);
    expect(b.battle.state.player.hp).toBeLessThan(hpBefore);

    // Persistiu na linha (e continua PSN — sem cura).
    const rowAfter = await starterRow("status-persist");
    expect(rowAfter.status).toBe("PSN");
    expect(rowAfter.hp).toBe(b.battle.state.player.hp);

    // Foge, cura no Centro Pokémon: HP cheio E status limpo.
    await c.call("/api/battle", { body: { action: "flee", battleId: b.battle.id } });
    const heal = await c.call("/api/pokemon/heal", { body: {} });
    expect(heal.status).toBe(200);
    const rowHealed = await starterRow("status-persist");
    expect(rowHealed.status).toBe("NONE");
    expect(rowHealed.statusTurns).toBe(0);
    expect(rowHealed.hp).toBe(rowHealed.maxHp);
  });

  it("use_item fora de batalha: item errado recusa (sem débito), item certo cura e debita 1", async () => {
    const c = await register("status-itens");
    const pokeId = await makePikachu("status-itens");
    const me = await userRow("status-itens");

    await db.update(users).set({ antidotes: 2, burnHeals: 1, fullHeals: 1 }).where(eq(users.id, me.id));

    // Sem status: qualquer cura é recusada.
    const none = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: pokeId, item: "antidote" },
    });
    expect(none.status).toBe(400);
    expect((none.body as { error: string }).error).toMatch(/não tem nenhum problema de status/);

    await db.update(userPokemon).set({ status: "BRN" }).where(eq(userPokemon.id, pokeId));

    // Antídoto não cura queimadura: recusa e NÃO debita.
    const wrong = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: pokeId, item: "antidote" },
    });
    expect(wrong.status).toBe(400);
    expect((wrong.body as { error: string }).error).toMatch(/Antídoto não cura queimadura!/);
    expect((await userRow("status-itens")).antidotes).toBe(2);

    // Anti-Queimadura cura, debita 1 e a resposta traz o time atualizado.
    const right = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: pokeId, item: "burnHeal" },
    });
    expect(right.status, JSON.stringify(right.body)).toBe(200);
    const body = right.body as { message: string; user: Record<string, number>; party: { id: number; status: string }[] };
    expect(body.message).toMatch(/se curou de queimadura/);
    expect(body.user.burnHeals).toBe(0);
    expect(body.party.find((p) => p.id === pokeId)!.status).toBe("NONE");

    // Sem estoque: recusa.
    await db.update(userPokemon).set({ status: "BRN" }).where(eq(userPokemon.id, pokeId));
    const empty = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: pokeId, item: "burnHeal" },
    });
    expect(empty.status).toBe(400);

    // Cura Total cura qualquer um.
    const full = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: pokeId, item: "fullHeal" },
    });
    expect(full.status).toBe(200);
    expect((await starterRow("status-itens")).status).toBe("NONE");

    // Item fora do enum → 400 do Zod.
    const bogus = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: pokeId, item: "elixir" },
    });
    expect(bogus.status).toBe(400);
  });

  it("use_item em batalha cura o status, consome o turno e debita o inventário", async () => {
    const c = await register("status-batalha");
    const pokeId = await makePikachu("status-batalha");
    const me = await userRow("status-batalha");
    await db.update(users).set({ paralyzeHeals: 1, potions: 1 }).where(eq(users.id, me.id));
    await db.update(userPokemon).set({ status: "PAR" }).where(eq(userPokemon.id, pokeId));

    const start = await startWild(c);
    expect(start.battle.state.player.status).toBe("PAR");
    const turnBefore = start.battle.state.turn;

    // Poção com HP cheio: recusa antes de debitar e sem gastar turno.
    const fullHp = await c.call("/api/battle", {
      body: { action: "use_item", battleId: start.battle.id, item: "potion" },
    });
    expect(fullHp.status).toBe(400);
    expect((await userRow("status-batalha")).potions).toBe(1);

    // Anti-Paralisia: cura, o log narra, o turno avança (o selvagem agiu).
    const r = await c.call("/api/battle", {
      body: { action: "use_item", battleId: start.battle.id, item: "paralyzeHeal" },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const b = r.body as BattleBody;
    expect(b.battle.state.log.join("\n")).toMatch(/Você usou Anti-Paralisia! Pikachu se curou de paralisia!/);
    expect(b.battle.state.player.status).toBe("NONE");
    expect(b.battle.state.turn).toBe(turnBefore + 1);
    expect(b.user.paralyzeHeals).toBe(0);
    // O oponente agiu depois do item (log tem "usou" do selvagem OU ele estava impedido).
    expect(b.battle.state.log.slice(-3).join("\n")).toMatch(/usou|dormindo|congelado|paralisado/);

    // Persistiu limpo.
    expect((await starterRow("status-batalha")).status).toBe("NONE");

    // Item que não teria efeito agora: 400, sem débito (estoque já era 0 → também 400).
    const again = await c.call("/api/battle", {
      body: { action: "use_item", battleId: start.battle.id, item: "paralyzeHeal" },
    });
    expect(again.status).toBe(400);

    // Item fora do enum de batalha (Reviver não é permitido em batalha).
    const revive = await c.call("/api/battle", {
      body: { action: "use_item", battleId: start.battle.id, item: "revive" },
    });
    expect(revive.status).toBe(400);
  });
});

describe("Fase 8.4 — loja vende as curas de status", () => {
  it("loja 1 tem Antídoto (100) e Anti-Paralisia (200); comprar credita a coluna nova", async () => {
    const c = await register("status-loja");
    const r = await c.call("/api/shop?shopId=1");
    expect(r.status).toBe(200);
    const items = (r.body as { items: { id: number; itemKey: string; buyPrice: number; sellPrice: number; category: string }[] }).items;
    const antidote = items.find((i) => i.itemKey === "antidotes")!;
    const parlyz = items.find((i) => i.itemKey === "paralyzeHeals");
    expect(antidote).toMatchObject({ buyPrice: 100, sellPrice: 50, category: "potion" });
    expect(parlyz).toMatchObject({ buyPrice: 200, category: "potion" });
    // Restaurador Total (3000) só nas lojas finais.
    expect(items.some((i) => i.itemKey === "fullRestores")).toBe(false);

    const buy = await c.call("/api/shop", {
      body: { action: "buy", itemId: antidote.id, quantity: 3 },
    });
    expect(buy.status, JSON.stringify(buy.body)).toBe(200);
    expect((await userRow("status-loja")).antidotes).toBe(3);
    expect((buy.body as { user: { money: number } }).user.money).toBe(3000 - 300);

    // Recompra pela metade, como as poções.
    const sell = await c.call("/api/shop", {
      body: { action: "sell", itemId: antidote.id, quantity: 1 },
    });
    expect(sell.status, JSON.stringify(sell.body)).toBe(200);
    expect((sell.body as { user: { antidotes: number; money: number } }).user).toMatchObject({ antidotes: 2, money: 2750 });

    const r11 = await c.call("/api/shop?shopId=11");
    const items11 = (r11.body as { items: { itemKey: string; buyPrice: number }[] }).items;
    expect(items11.find((i) => i.itemKey === "fullRestores")?.buyPrice).toBe(3000);
  });
});
