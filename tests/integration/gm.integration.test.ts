import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { userBadges, userPokemon, users } from "@/db/schema";
import {
  computeDelugeStats,
  getPokemonSpecies,
  moveSlots,
  movesAtLevel,
} from "@/lib/pokedex";
import { xpToNextLevel } from "@/lib/engine/xp";

/**
 * Ferramentas GM do painel admin — o caminho completo, pela rota real.
 *
 * O teste unitário (`src/lib/gm.test.ts`) prova a transformação pura
 * (stats/learnset/evolução). Aqui o contrato de ponta a ponta:
 *  - só `admin` usa (player e moderator recebem 403);
 *  - o alvo é sempre um usuário por username (404 se não existir);
 *  - o que o GM aplica no banco é idêntico ao que o motor de batalha faria
 *    (mesma espécie final, mesmos golpes do learnset, HP cheio);
 *  - respostas nunca vazam `passwordHash`.
 */

const PASSWORD = "senhaSegura123";

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string, starterId = 4) {
  const c = client();
  const r = await c.call("/api/auth", {
    body: { action: "register", username, password: PASSWORD, starterId },
  });
  expect(r.status, `registro de ${username} falhou: ${JSON.stringify(r.body)}`).toBe(200);
  return c;
}

async function promote(username: string, role: "moderator" | "admin") {
  // Mesma técnica do teste de segurança: o bootstrap do admin em produção é
  // manual; aqui o papel é dado direto no banco para isolar a rota.
  await db.update(users).set({ role }).where(eq(users.username, username));
}

async function userRow(username: string) {
  const [row] = await db.select().from(users).where(eq(users.username, username));
  return row;
}

async function team(username: string) {
  const user = await userRow(username);
  return db.select().from(userPokemon).where(eq(userPokemon.userId, user.id));
}

const movesOf = (row: { move1: string; move2: string; move3: string; move4: string }) => ({
  move1: row.move1,
  move2: row.move2,
  move3: row.move3,
  move4: row.move4,
});

// O cliente de teste tipa `body` como `never`; cada teste declara o shape
// que espera da resposta GM (o mesmo contrato que a rota documenta).
interface GivePokemonBody {
  pokemon: { partySlot: number | null };
  placement: string;
  evolvedFrom: string | null;
}
interface SetLevelBody {
  updated: Array<{
    id: number;
    name: string;
    evolved: { fromName: string; toName: string } | null;
    newMoves: string[];
  }>;
}
interface BadgeBody { badges: number }
interface ListBody {
  user: { username: string };
  pokemon: Array<{ id: number }>;
}
interface MapsBody { maps: unknown[] }

describe("autorização das ferramentas GM", () => {
  it("player e moderator recebem 403; admin aplica", async () => {
    const target = await register("gm-alvo-1");
    await register("gm-admin-1");
    const admin = client();
    await admin.call("/api/auth", {
      body: { action: "login", username: "gm-admin-1", password: PASSWORD },
    });
    await promote("gm-admin-1", "admin");

    const body = { action: "gm_give_money", username: "gm-alvo-1", amount: 100 };

    const asPlayer = await target.call("/api/admin", { body });
    expect(asPlayer.status).toBe(403);

    await promote("gm-alvo-1", "moderator");
    const asMod = await target.call("/api/admin", { body });
    expect(asMod.status).toBe(403);

    const asAdmin = await admin.call("/api/admin", { body });
    expect(asAdmin.status).toBe(200);
    expect((await userRow("gm-alvo-1")).money).toBe(3100);
  });

  it("alvo inexistente devolve 404, não 500", async () => {
    await register("gm-admin-2");
    const admin = client();
    await admin.call("/api/auth", {
      body: { action: "login", username: "gm-admin-2", password: PASSWORD },
    });
    await promote("gm-admin-2", "admin");

    const r = await admin.call("/api/admin", {
      body: { action: "gm_heal", username: "nao-existe-1" },
    });
    expect(r.status).toBe(404);
  });
});

describe("gm_give_money e gm_give_item", () => {
  async function adminClient(username = "gm-cash-admin") {
    await register(username);
    const c = client();
    await c.call("/api/auth", {
      body: { action: "login", username, password: PASSWORD },
    });
    await promote(username, "admin");
    return c;
  }

  it("credita dinheiro ao alvo", async () => {
    await register("gm-cash-alvo");
    const admin = await adminClient("gm-cash-admin-1");

    const r = await admin.call("/api/admin", {
      body: { action: "gm_give_money", username: "gm-cash-alvo", amount: 777 },
    });
    expect(r.status).toBe(200);
    expect((await userRow("gm-cash-alvo")).money).toBe(3000 + 777);
  });

  it("credita item e limita a quantidade por comando", async () => {
    await register("gm-item-alvo");
    const admin = await adminClient("gm-item-admin");

    const ok = await admin.call("/api/admin", {
      body: { action: "gm_give_item", username: "gm-item-alvo", item: "potions", quantity: 500 },
    });
    expect(ok.status).toBe(200);
    expect((await userRow("gm-item-alvo")).potions).toBe(3 + 500);

    const tooMany = await admin.call("/api/admin", {
      body: { action: "gm_give_item", username: "gm-item-alvo", item: "potions", quantity: 1000 },
    });
    expect(tooMany.status).toBe(400);

    const badItem = await admin.call("/api/admin", {
      body: { action: "gm_give_item", username: "gm-item-alvo", item: "diamante", quantity: 1 },
    });
    expect(badItem.status).toBe(400);
  });
});

describe("gm_give_pokemon", () => {
  async function adminClient(username = "gm-poke-admin") {
    await register(username);
    const c = client();
    await c.call("/api/auth", {
      body: { action: "login", username, password: PASSWORD },
    });
    await promote(username, "admin");
    return c;
  }

  it("Charmander pedido no nível 20 chega como Charmeleon no slot 2, HP cheio", async () => {
    await register("gm-poke-alvo-1"); // inicial Charmander no slot 1
    const admin = await adminClient("gm-poke-admin-1");

    const r = await admin.call("/api/admin", {
      body: { action: "gm_give_pokemon", username: "gm-poke-alvo-1", pokedexId: 4, level: 20 },
    });
    expect(r.status).toBe(200);
    expect((r.body as GivePokemonBody).placement).toBe("time (slot 2)");
    expect((r.body as GivePokemonBody).evolvedFrom).toBe("Charmander");

    const rows = await team("gm-poke-alvo-1");
    const given = rows.find((p) => p.partySlot === 2);
    expect(given).toBeDefined();
    expect(given!.pokedexId).toBe(5);
    expect(given!.name).toBe("Charmeleon");
    expect(given!.level).toBe(20);

    const expectedStats = computeDelugeStats(getPokemonSpecies(5), 20, "Normal");
    expect(given!.hp).toBe(expectedStats.maxHp);
    expect(given!.maxHp).toBe(expectedStats.maxHp);
    expect(movesOf(given!)).toEqual(moveSlots(movesAtLevel(getPokemonSpecies(5), 20)));
  });

  it("time cheio (6 slots) vai para o PC Box", async () => {
    await register("gm-poke-alvo-2");
    const admin = await adminClient("gm-poke-admin-2");

    for (let i = 0; i < 5; i++) {
      const r = await admin.call("/api/admin", {
        body: { action: "gm_give_pokemon", username: "gm-poke-alvo-2", pokedexId: 25, level: 5 },
      });
      expect(r.status).toBe(200);
    }
    const r6 = await admin.call("/api/admin", {
      body: { action: "gm_give_pokemon", username: "gm-poke-alvo-2", pokedexId: 130, level: 10 },
    });
    expect(r6.status).toBe(200);
    expect((r6.body as GivePokemonBody).placement).toBe("PC Box");
    expect((r6.body as GivePokemonBody).pokemon.partySlot).toBeNull();

    const rows = await team("gm-poke-alvo-2");
    expect(rows).toHaveLength(7);
    expect(rows.filter((p) => p.partySlot !== null)).toHaveLength(6);
  });

  it("espécie fora da Pokédex devolve 400 sem criar linha", async () => {
    await register("gm-poke-alvo-3");
    const admin = await adminClient("gm-poke-admin-3");

    const r = await admin.call("/api/admin", {
      body: { action: "gm_give_pokemon", username: "gm-poke-alvo-3", pokedexId: 999, level: 5 },
    });
    expect(r.status).toBe(400);
    expect(await team("gm-poke-alvo-3")).toHaveLength(1); // só o inicial
  });
});

describe("gm_set_level", () => {
  async function adminClient(username = "gm-level-admin") {
    await register(username);
    const c = client();
    await c.call("/api/auth", {
      body: { action: "login", username, password: PASSWORD },
    });
    await promote(username, "admin");
    return c;
  }

  it("salta a cadeia evolutiva inteira e persiste como a batalha persistiria", async () => {
    await register("gm-level-alvo-1"); // Charmander no slot 1
    const admin = await adminClient("gm-level-admin-1");
    const starter = (await team("gm-level-alvo-1"))[0];

    const r = await admin.call("/api/admin", {
      body: { action: "gm_set_level", username: "gm-level-alvo-1", pokemonId: starter.id, level: 40 },
    });
    expect(r.status).toBe(200);
    expect((r.body as SetLevelBody).updated).toHaveLength(1);
    expect((r.body as SetLevelBody).updated[0].evolved).toEqual({
      fromName: "Charmander",
      toName: "Charizard",
    });

    const after = (await team("gm-level-alvo-1"))[0];
    expect(after.pokedexId).toBe(6); // 4 → 5 → 6 num salto só
    expect(after.name).toBe("Charizard");
    expect(after.level).toBe(40);
    expect(after.xp).toBe(0);
    expect(after.xpToNextLevel).toBe(xpToNextLevel(40));

    const expectedStats = computeDelugeStats(getPokemonSpecies(6), 40, "Normal");
    expect(after.hp).toBe(expectedStats.maxHp);
    expect(movesOf(after)).toEqual(moveSlots(movesAtLevel(getPokemonSpecies(6), 40)));
  });

  it("sem pokemonId nivela todo o time (time + PC Box)", async () => {
    await register("gm-level-alvo-2");
    const admin = await adminClient("gm-level-admin-2");

    await admin.call("/api/admin", {
      body: { action: "gm_give_pokemon", username: "gm-level-alvo-2", pokedexId: 25, level: 5 },
    });
    const r = await admin.call("/api/admin", {
      body: { action: "gm_set_level", username: "gm-level-alvo-2", level: 50 },
    });
    expect(r.status).toBe(200);
    expect((r.body as SetLevelBody).updated).toHaveLength(2);

    const rows = await team("gm-level-alvo-2");
    expect(rows.every((p) => p.level === 50)).toBe(true);
  });

  it("id de Pokémon de outro treinador devolve 404", async () => {
    await register("gm-level-a");
    await register("gm-level-b");
    const admin = await adminClient("gm-level-admin-3");
    const starterA = (await team("gm-level-a"))[0];

    const r = await admin.call("/api/admin", {
      body: { action: "gm_set_level", username: "gm-level-b", pokemonId: starterA.id, level: 20 },
    });
    expect(r.status).toBe(404);
    expect((await team("gm-level-b"))[0].level).toBe(5); // nada mudou
  });

  it("alvo sem Pokémon devolve 400", async () => {
    // Treinador que devolveu o único Pokémon não pode ser nivelado.
    await register("gm-level-vazio");
    const admin = await adminClient("gm-level-admin-4");
    const row = (await team("gm-level-vazio"))[0];
    await db.delete(userPokemon).where(eq(userPokemon.id, row.id));

    const r = await admin.call("/api/admin", {
      body: { action: "gm_set_level", username: "gm-level-vazio", level: 10 },
    });
    expect(r.status).toBe(400);
  });
});

describe("gm_heal e gm_teleport", () => {
  async function adminClient(username = "gm-move-admin") {
    await register(username);
    const c = client();
    await c.call("/api/auth", {
      body: { action: "login", username, password: PASSWORD },
    });
    await promote(username, "admin");
    return c;
  }

  it("gm_heal restaura HP do time + PC Box", async () => {
    await register("gm-heal-alvo");
    const admin = await adminClient("gm-heal-admin");
    const row = (await team("gm-heal-alvo"))[0];
    await db.update(userPokemon).set({ hp: 1 }).where(eq(userPokemon.id, row.id));

    const r = await admin.call("/api/admin", {
      body: { action: "gm_heal", username: "gm-heal-alvo" },
    });
    expect(r.status).toBe(200);
    const after = (await team("gm-heal-alvo"))[0];
    expect(after.hp).toBe(after.maxHp);
  });

  it("gm_teleport move o alvo para o centro do mapa; fora da grade é 400", async () => {
    await register("gm-tp-alvo");
    const admin = await adminClient("gm-tp-admin");

    // Garante que os mapas padrão existem no banco de teste (16×16).
    const maps = await admin.call("/api/maps");
    expect(maps.status).toBe(200);
    expect((maps.body as MapsBody).maps.length).toBeGreaterThanOrEqual(3);

    const toCenter = await admin.call("/api/admin", {
      body: { action: "gm_teleport", username: "gm-tp-alvo", mapId: 2 },
    });
    expect(toCenter.status).toBe(200);
    let user = await userRow("gm-tp-alvo");
    expect(user.currentMapId).toBe(2);
    expect(user.playerX).toBe(8);
    expect(user.playerY).toBe(8);

    const toPoint = await admin.call("/api/admin", {
      body: { action: "gm_teleport", username: "gm-tp-alvo", mapId: 3, x: 5, y: 6 },
    });
    expect(toPoint.status).toBe(200);
    user = await userRow("gm-tp-alvo");
    expect(user.currentMapId).toBe(3);
    expect(user.playerX).toBe(5);
    expect(user.playerY).toBe(6);

    const outOfBounds = await admin.call("/api/admin", {
      body: { action: "gm_teleport", username: "gm-tp-alvo", mapId: 3, x: 20 },
    });
    expect(outOfBounds.status).toBe(400);

    const noMap = await admin.call("/api/admin", {
      body: { action: "gm_teleport", username: "gm-tp-alvo", mapId: 99 },
    });
    expect(noMap.status).toBe(404);
  });
});

describe("gm_give_badge e gm_list", () => {
  async function adminClient(username = "gm-badge-admin") {
    await register(username);
    const c = client();
    await c.call("/api/auth", {
      body: { action: "login", username, password: PASSWORD },
    });
    await promote(username, "admin");
    return c;
  }

  it("concede a insígnia uma vez (idempotente) e desconhecido é 404", async () => {
    await register("gm-badge-alvo");
    const admin = await adminClient("gm-badge-admin");

    const first = await admin.call("/api/admin", {
      body: { action: "gm_give_badge", username: "gm-badge-alvo", gymLeaderId: 1 },
    });
    expect(first.status).toBe(200);
    expect((first.body as BadgeBody).badges).toBe(1);

    const again = await admin.call("/api/admin", {
      body: { action: "gm_give_badge", username: "gm-badge-alvo", gymLeaderId: 1 },
    });
    expect(again.status).toBe(200);
    expect((again.body as BadgeBody).badges).toBe(1); // não duplica

    const user = await userRow("gm-badge-alvo");
    const badges = await db.select().from(userBadges).where(eq(userBadges.userId, user.id));
    expect(badges).toHaveLength(1);
    expect(badges[0].badgeName.length).toBeGreaterThan(0);

    const noGym = await admin.call("/api/admin", {
      body: { action: "gm_give_badge", username: "gm-badge-alvo", gymLeaderId: 999 },
    });
    expect(noGym.status).toBe(404);
  });

  it("gm_list devolve user público (sem passwordHash) e o time inteiro", async () => {
    await register("gm-list-alvo");
    const admin = await adminClient("gm-list-admin");

    const r = await admin.call("/api/admin", {
      body: { action: "gm_list", username: "gm-list-alvo" },
    });
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toContain("passwordHash");
    expect((r.body as ListBody).user.username).toBe("gm-list-alvo");
    expect((r.body as ListBody).pokemon).toHaveLength(1);
    expect((r.body as ListBody).pokemon[0].id).toBeGreaterThan(0);
  });
});
