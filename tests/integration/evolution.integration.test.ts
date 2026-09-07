import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { userPokemon, users } from "@/db/schema";
import { xpToNextLevel } from "@/lib/engine/xp";
import { typeMultiplier } from "@/lib/engine/types";
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
 * gatilho de nível **evolui dentro da batalha** (log visível) e o
 * `pokedexId`/`name` novos **persistem** no banco — sem endpoint de "evoluir"
 * que o cliente possa chamar.
 *
 * Cuidado com flakiness: o selvagem é sorteado (espécie 3–8, variante qualquer)
 * e a tabela do mapa 1 contém o Squirtle, que hard-counter o Charmander — por
 * design. Por isso o helper escolhe o golpe pela matchup e desiste (foge +
 * cura + tenta de novo) quando a vida vai mal, em vez de apostar num sorteio
 * bom. Foi exatamente um Squirtle sorteado que derrubou este arquivo no CI
 * na primeira versão.
 */

const MAP_ID = 1;
const TALL_GRASS = { x: 3, y: 9 };

interface BattleBody {
  battle: {
    id: number;
    status: string;
    state: {
      log: string[];
      player: {
        hp: number;
        maxHp: number;
        types: string[];
        moves: { type: string; power: number; accuracy: number }[];
      };
      opponent: { types: string[] };
    };
  };
}

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  // Cadastro completo (e-mail + código de confirmação via devCode).
  const { c } = await registerVerified(username);
  return c;
}

async function starterRow(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  const [row] = await db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
  return row;
}

/**
 * Deixa o inicial como se ele tivesse chegado àquele nível por batalhas
 * reais: espécie definida, status recalculados, HP cheio e golpes do
 * learnset. Sem isto a linha fica com o HP do nível 5 e o Pokémon perde para
 * um selvagem qualquer.
 */
async function setStarter(
  username: string,
  speciesId: number,
  level: number,
  xp: number
) {
  const row = await starterRow(username);
  const species = getPokemonSpecies(speciesId);
  const stats = computeDelugeStats(species, level, "Normal");
  await db
    .update(userPokemon)
    .set({
      pokedexId: speciesId,
      name: species.name,
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

/** O golpe com melhor expectativa de dano contra o oponente desta batalha. */
function bestMoveIndex(battle: BattleBody["battle"]): number {
  const { player } = battle.state;
  let best = 0;
  let bestScore = -1;

  player.moves.forEach((move, index) => {
    const stab = player.types.includes(move.type) ? 1.5 : 1;
    const mult = typeMultiplier(move.type, battle.state.opponent.types);
    const score = move.power * (move.accuracy / 100) * stab * mult;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });

  return best;
}

/**
 * Vence UMA batalha selvagem, fugindo (e se curando) quando a matchup aperta.
 * Só retorna com status `WON` — vitória de verdade, decidida pelo servidor.
 */
async function winOneWildBattle(c: ReturnType<typeof client>): Promise<BattleBody> {
  let lastLog = "não houve batalha";

  for (let attempt = 0; attempt < 8; attempt++) {
    await c.call("/api/pokemon/heal", { body: {} }); // HP cheio a cada tentativa

    const start = await c.call("/api/battle", {
      body: {
        action: "start_wild",
        mapId: MAP_ID,
        playerX: TALL_GRASS.x,
        playerY: TALL_GRASS.y,
      },
    });
    expect(start.status).toBe(200);
    const battle = (start.body as BattleBody).battle;
    const moveIndex = bestMoveIndex(battle);

    let won: BattleBody | null = null;
    let fled = false;

    for (let turn = 0; turn < 20; turn++) {
      const r = await c.call("/api/battle", {
        body: { action: "attack", battleId: battle.id, moveIndex },
      });
      expect(r.status).toBe(200);
      const body = r.body as BattleBody;
      lastLog = body.battle.state.log.join(" ");

      if (body.battle.status === "WON") {
        won = body;
        break;
      }
      if (body.battle.status !== "ACTIVE") break; // LOST: cura e tenta de novo

      // Matchup apertada (ex.: Squirtle contra o Charmander): foge com vida
      // para tentar um sorteio melhor, em vez de entregar a derrota.
      const { hp, maxHp } = body.battle.state.player;
      if (hp < maxHp * 0.4) {
        await c.call("/api/battle", {
          body: { action: "flee", battleId: battle.id },
        });
        fled = true;
        break;
      }
    }

    if (won) return won;
    if (!fled) continue;
  }

  throw new Error(`não venceu nenhuma batalha em 8 tentativas; último log: ${lastLog}`);
}

describe("evolução na vitória (6.3)", () => {
  it("Charmander que cruza o nível 16 numa vitória vira Charmeleon e persiste", async () => {
    const username = "evo-ash-1";
    const c = await register(username);

    // Nível 15, a 10 XP do 16: qualquer vitória (ganho mínimo medido: 16 XP)
    // cruza o gatilho.
    await setStarter(username, 4, 15, xpToNextLevel(15) - 10);

    const final = await winOneWildBattle(c);
    const log = final.battle.state.log.join(" ");

    expect(log).toContain("subiu para o nível 16");
    expect(log).toContain("evoluiu para Charmeleon");

    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(5);
    expect(depois.name).toBe("Charmeleon");
    expect(depois.level).toBe(16);
    expect(depois.hp).toBeGreaterThan(0);
    expect(depois.hp).toBeLessThanOrEqual(depois.maxHp);
    expect(depois.move1.length).toBeGreaterThan(0);
  });

  it("espécie sem linha evolutiva sobe de nível sem evoluir", async () => {
    const username = "evo-ash-2";
    const c = await register(username);

    // Ditto lvl 30 não tem para onde evoluir e, 22 níveis acima do selvagem
    // mais forte do mapa 1, não perde a batalha. (Pikachu não serve mais
    // para este caso: desde a 6.4-B a pedra de Trovão é caminho próprio.)
    await setStarter(username, 132, 30, xpToNextLevel(30) - 5);

    const final = await winOneWildBattle(c);
    const log = final.battle.state.log.join(" ");

    expect(log).not.toContain("evoluiu para");
    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(132);
    expect(depois.name).toBe("Ditto");
    expect(depois.level).toBe(31);
  });

  it("catch-up: Pokémon que já está acima do gatilho evolui no próximo level up", async () => {
    // Pokémon de produção que cruzaram o nível 16 antes da 6.3 existir não
    // ficariam presos: o gatilho é "nível ≥ limiar", não "acabou de cruzar".
    // O próximo level up traz o estágio certo para o nível atual — sem
    // script de backfill.
    const username = "evo-ash-3";
    const c = await register(username);

    await setStarter(username, 4, 16, xpToNextLevel(16) - 5);

    const final = await winOneWildBattle(c);
    const log = final.battle.state.log.join(" ");

    expect(log).toContain("evoluiu para Charmeleon");
    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(5);
    expect(depois.level).toBe(17);
  });
});

describe("evolução por item (6.4-B)", () => {
  it("Pikachu + Pedra de Trovão via /api/pokemon/manage consome e persiste", async () => {
    const username = "evo-stone-1";
    const { c } = await registerVerified(username);
    await setStarter(username, 25, 5, 0); // Pikachu vem dos 3 iniciais do catálogo

    const [user] = await db.select().from(users).where(eq(users.username, username));
    const [poke] = await db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
    await db.update(users).set({ thunderStone: 1 }).where(eq(users.id, user.id));

    const r = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: poke.id, item: "thunderStone" },
    });

    expect(r.status).toBe(200);
    const body = r.body as {
      user: { thunderStone: number };
      party: Array<{ id: number; pokedexId: number; name: string; move1: string }>;
      message: string;
    };
    expect(body.user.thunderStone).toBe(0);
    expect(body.message).toContain("evoluiu para Raichu");
    expect(body.party.find((p) => p.id === poke.id)?.pokedexId).toBe(26);
    expect(body.party.find((p) => p.id === poke.id)?.name).toBe("Raichu");
    expect(body.party.find((p) => p.id === poke.id)?.move1.length).toBeGreaterThan(0);

    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(26);
    expect(depois.name).toBe("Raichu");
    expect(depois.level).toBe(5); // evolução fora de batalha não muda nível
  });

  it("item que não evolui a espécie devolve 400 e NÃO consome", async () => {
    const username = "evo-stone-2";
    const { c } = await registerVerified(username);
    await setStarter(username, 25, 5, 0); // Pikachu

    const [user] = await db.select().from(users).where(eq(users.username, username));
    const [poke] = await db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
    await db.update(users).set({ sunStone: 2 }).where(eq(users.id, user.id));

    const mal = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: poke.id, item: "sunStone" },
    });
    expect(mal.status).toBe(400);
    expect((mal.body as { error?: string }).error).toContain("não evolui");

    const [depoisUser] = await db.select().from(users).where(eq(users.id, user.id));
    expect(depoisUser.sunStone).toBe(2); // não consumiu
    const [depois] = await db.select().from(userPokemon).where(eq(userPokemon.id, poke.id));
    expect(depois.pokedexId).toBe(25);
  });
});

/**
 * Itens de evolução de Sinnoh (Fase 6.4-D) — ponta a ponta pelas rotas reais.
 *
 * Prova o que a migration 0008 + `INVENTORY_KEYS` + loja + `/api/pokemon/manage`
 * têm que entregar juntos: o item novo é vendido pela loja 3 (coluna nova
 * creditada), aparece no usuário devolvido pela API e evolui a linha certa
 * (Rhydon + Protetor → Rhyperior), sendo consumido em transação.
 */
describe("itens de evolução de Sinnoh (6.4-D)", () => {
  it("a loja 3 vende os 7 itens novos e a compra credita a coluna nova", async () => {
    const username = "sinnoh-shop-1";
    const { c } = await registerVerified(username);

    const lista = await c.call("/api/shop?shopId=3", { method: "GET" });
    expect(lista.status).toBe(200);
    const items = (lista.body as { items: Array<{ id: number; itemKey: string; buyPrice: number }> }).items;
    const chaves = items.map((i) => i.itemKey);
    for (const key of ["protector", "electirizer", "magmarizer", "razorClaw", "razorFang", "dubiousDisc", "reaperCloth"]) {
      expect(chaves, `loja 3 sem ${key}`).toContain(key);
    }

    const protetor = items.find((i) => i.itemKey === "protector")!;
    const [antes] = await db.select().from(users).where(eq(users.username, username));
    await db.update(users).set({ money: protetor.buyPrice + 100 }).where(eq(users.id, antes.id));

    const compra = await c.call("/api/shop", {
      body: { action: "buy", itemId: protetor.id, quantity: 1 },
    });
    expect(compra.status).toBe(200);
    const body = compra.body as { user: { protector: number; money: number } };
    expect(body.user.protector).toBe(1);
    expect(body.user.money).toBe(100);

    const [depois] = await db.select().from(users).where(eq(users.id, antes.id));
    expect(depois.protector).toBe(1);
  });

  it("Rhydon + Protetor via /api/pokemon/manage vira Rhyperior e consome o item", async () => {
    const username = "sinnoh-evo-1";
    const { c } = await registerVerified(username);
    await setStarter(username, 112, 50, 0); // Rhydon

    const [user] = await db.select().from(users).where(eq(users.username, username));
    const [poke] = await db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
    await db.update(users).set({ protector: 1 }).where(eq(users.id, user.id));

    const r = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: poke.id, item: "protector" },
    });
    expect(r.status).toBe(200);
    const body = r.body as {
      user: { protector: number };
      party: Array<{ id: number; pokedexId: number; name: string; types?: string[] }>;
      message: string;
    };
    expect(body.user.protector).toBe(0);
    expect(body.message).toContain("evoluiu para Rhyperior");
    expect(body.party.find((p) => p.id === poke.id)?.pokedexId).toBe(464);

    const depois = await starterRow(username);
    expect(depois.pokedexId).toBe(464);
    expect(depois.name).toBe("Rhyperior");
    expect(depois.level).toBe(50);

    // Segundo uso sem item → 400, e nada muda.
    const semItem = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: poke.id, item: "protector" },
    });
    expect(semItem.status).toBe(400);
  });

  it("item de Sinnoh na espécie errada devolve 400 e NÃO consome (Pikachu + Eletrizador)", async () => {
    const username = "sinnoh-evo-2";
    const { c } = await registerVerified(username);
    await setStarter(username, 25, 5, 0);

    const [user] = await db.select().from(users).where(eq(users.username, username));
    const [poke] = await db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
    await db.update(users).set({ electirizer: 1 }).where(eq(users.id, user.id));

    const mal = await c.call("/api/pokemon/manage", {
      body: { action: "use_item", pokemonId: poke.id, item: "electirizer" },
    });
    expect(mal.status).toBe(400);
    expect((mal.body as { error?: string }).error).toContain("não evolui");

    const [depoisUser] = await db.select().from(users).where(eq(users.id, user.id));
    expect(depoisUser.electirizer).toBe(1);
  });
});
