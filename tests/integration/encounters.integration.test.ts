import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { gameMaps, users } from "@/db/schema";
import type { CollisionOverride } from "@/db/schema";

/**
 * Encontros selvagens e as camadas do mapa (Fase 6.2-A).
 *
 * O teste unitário de `map-rules` já prova a regra pura. O que falta provar
 * aqui é que a **rota** usa essa regra e lê as colunas novas do banco — que é
 * onde o editor vai gravar. Sem isto, dava para pintar a água como andável e
 * o servidor continuar recusando o encontro aquático, que era exatamente a
 * queixa original.
 *
 * O mapa 1 do seed tem: matinho em (2..6, 8..13), lago em (12..14, 2..5) e
 * grama comum no resto.
 */

const MAP_ID = 1;
const GRASS_TILE = { x: 1, y: 1 }; // grama comum: andável, sem encontro
const TALL_GRASS = { x: 3, y: 9 }; // matinho: encontro no modo legado
const WATER = { x: 13, y: 3 }; // lago: bloqueado por padrão

beforeEach(async () => {
  await resetRateLimits();
  // Cada teste começa do mapa legado (camadas vazias = default da migration).
  await db
    .update(gameMaps)
    .set({ encounterGrid: [], collisionGrid: [], encounterRate: 22 })
    .where(eq(gameMaps.id, MAP_ID));
});

async function register(username: string) {
  const c = client();
  const r = await c.call("/api/auth", {
    body: { action: "register", username, password: "senhaSegura123", starterId: 4 },
  });
  expect(r.status, `registro falhou: ${JSON.stringify(r.body)}`).toBe(200);
  return c;
}

async function startWild(c: ReturnType<typeof client>, at: { x: number; y: number }) {
  return c.call("/api/battle", {
    body: { action: "start_wild", mapId: MAP_ID, playerX: at.x, playerY: at.y },
  });
}

/** Grade `16×16` do mapa 1 preenchida com um valor só. */
function grid16<T>(value: T): T[][] {
  return Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => value));
}

let seq = 0;
const nextUser = () => `enc${Date.now()}${seq++}`;

describe("Encontros — modo legado (mapa sem camadas pintadas)", () => {
  it("gera batalha no matinho", async () => {
    const c = await register(nextUser());
    const r = await startWild(c, TALL_GRASS);

    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const battle = (r.body as { battle: { kind: string; status: string } }).battle;
    expect(battle.kind).toBe("wild");
    expect(battle.status).toBe("ACTIVE");
  });

  it("recusa na grama comum, que não é área de caça", async () => {
    const c = await register(nextUser());
    const r = await startWild(c, GRASS_TILE);

    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toContain("encontros");
  });

  it("recusa na água, onde o jogador nem poderia estar", async () => {
    const c = await register(nextUser());
    const r = await startWild(c, WATER);

    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toContain("tile");
  });

  it("recusa coordenada fora do mapa", async () => {
    const c = await register(nextUser());
    const r = await startWild(c, { x: 99, y: 99 });

    expect(r.status).toBe(400);
  });
});

describe("Encontros — camada de colisão", () => {
  it("libera o encontro aquático quando a água é pintada como andável", async () => {
    const collisionGrid = grid16<CollisionOverride>(null);
    collisionGrid[WATER.y][WATER.x] = "walkable";
    const encounterGrid = grid16(false);
    encounterGrid[WATER.y][WATER.x] = true;

    await db.update(gameMaps).set({ collisionGrid, encounterGrid }).where(eq(gameMaps.id, MAP_ID));

    const c = await register(nextUser());
    const r = await startWild(c, WATER);

    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((r.body as { battle: { kind: string } }).battle.kind).toBe("wild");
  });

  it("bloqueia um matinho marcado como intransponível", async () => {
    const collisionGrid = grid16<CollisionOverride>(null);
    collisionGrid[TALL_GRASS.y][TALL_GRASS.x] = "blocked";
    await db.update(gameMaps).set({ collisionGrid }).where(eq(gameMaps.id, MAP_ID));

    const c = await register(nextUser());
    const r = await startWild(c, TALL_GRASS);

    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toContain("Não dá para estar");
  });
});

describe("Encontros — camada de área de caça", () => {
  it("faz a grama comum gerar encontro quando pintada", async () => {
    const encounterGrid = grid16(false);
    encounterGrid[GRASS_TILE.y][GRASS_TILE.x] = true;
    await db.update(gameMaps).set({ encounterGrid }).where(eq(gameMaps.id, MAP_ID));

    const c = await register(nextUser());
    const r = await startWild(c, GRASS_TILE);

    expect(r.status, JSON.stringify(r.body)).toBe(200);
  });

  it("desliga o matinho que ficou de fora da área pintada", async () => {
    const encounterGrid = grid16(false);
    encounterGrid[GRASS_TILE.y][GRASS_TILE.x] = true;
    await db.update(gameMaps).set({ encounterGrid }).where(eq(gameMaps.id, MAP_ID));

    const c = await register(nextUser());
    const r = await startWild(c, TALL_GRASS);

    // Com a camada em uso, quem manda é a pintura — não o tipo de tile.
    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toContain("encontros");
  });
});

/**
 * Fase 6.2-B — o editor grava as camadas pela rota de mapas.
 *
 * O editor é uma tela; o que dá para afirmar em teste automatizado é o
 * contrato que ela usa: `PUT /api/maps/:id` persiste as três colunas novas,
 * aceita `[]` para voltar ao modo legado e recusa camada incoerente. Sem isto,
 * um erro de payload no editor só apareceria em produção.
 */
describe("PUT /api/maps/:id — camadas gravadas pelo editor", () => {
  async function admin() {
    const c = client();
    const username = nextUser();
    const r = await c.call("/api/auth", {
      body: { action: "register", username, password: "senhaSegura123", starterId: 4 },
    });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    await db.update(users).set({ role: "admin" }).where(eq(users.username, username));
    return c;
  }

  async function readMap() {
    const [row] = await db.select().from(gameMaps).where(eq(gameMaps.id, MAP_ID));
    return row;
  }

  it("persiste área de caça, colisão e taxa de encontro", async () => {
    const c = await admin();
    const encounterGrid = grid16(false);
    encounterGrid[WATER.y][WATER.x] = true;
    const collisionGrid = grid16<CollisionOverride>(null);
    collisionGrid[WATER.y][WATER.x] = "walkable";

    const r = await c.call(`/api/maps/${MAP_ID}`, {
      method: "PUT",
      body: { encounterGrid, collisionGrid, encounterRate: 35 },
    });

    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const row = await readMap();
    expect(row.encounterRate).toBe(35);
    expect((row.encounterGrid as boolean[][])[WATER.y][WATER.x]).toBe(true);
    expect((row.collisionGrid as CollisionOverride[][])[WATER.y][WATER.x]).toBe("walkable");

    // E a regra passa a valer de imediato para o jogador.
    const jogador = await register(nextUser());
    expect((await startWild(jogador, WATER)).status).toBe(200);
  });

  it("aceita [] para desligar as camadas e voltar ao legado", async () => {
    const c = await admin();
    const encounterGrid = grid16(false);
    encounterGrid[GRASS_TILE.y][GRASS_TILE.x] = true;
    await c.call(`/api/maps/${MAP_ID}`, { method: "PUT", body: { encounterGrid } });

    const r = await c.call(`/api/maps/${MAP_ID}`, {
      method: "PUT",
      body: { encounterGrid: [], collisionGrid: [] },
    });

    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const row = await readMap();
    expect(row.encounterGrid).toEqual([]);

    // Legado de volta: matinho gera, grama comum não.
    const jogador = await register(nextUser());
    expect((await startWild(jogador, TALL_GRASS)).status).toBe(200);
    expect((await startWild(jogador, GRASS_TILE)).status).toBe(400);
  });

  it("recusa camada com dimensão diferente do mapa", async () => {
    const c = await admin();
    const r = await c.call(`/api/maps/${MAP_ID}`, {
      method: "PUT",
      body: { encounterGrid: [[true, false]] },
    });

    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toContain("altura 16");
    expect((await readMap()).encounterGrid).toEqual([]); // nada gravado pela metade
  });

  it("recusa área pintada em mapa sem nenhuma espécie", async () => {
    const c = await admin();
    const encounterGrid = grid16(false);
    encounterGrid[GRASS_TILE.y][GRASS_TILE.x] = true;

    const r = await c.call(`/api/maps/${MAP_ID}`, {
      method: "PUT",
      body: { encounterGrid, encounterTable: [] },
    });

    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toContain("nenhuma espécie");
  });

  it("recusa faixa de nível invertida e taxa fora de 0-100", async () => {
    const c = await admin();

    const faixa = await c.call(`/api/maps/${MAP_ID}`, {
      method: "PUT",
      body: {
        encounterTable: [
          { pokedexId: 1, name: "Bulbasaur", weight: 20, minLevel: 9, maxLevel: 3, tileTypes: [] },
        ],
      },
    });
    expect(faixa.status).toBe(400);

    const taxa = await c.call(`/api/maps/${MAP_ID}`, {
      method: "PUT",
      body: { encounterRate: 150 },
    });
    expect(taxa.status).toBe(400);
  });

  it("continua exigindo papel admin para gravar camadas", async () => {
    const c = await register(nextUser()); // jogador comum
    const r = await c.call(`/api/maps/${MAP_ID}`, {
      method: "PUT",
      body: { encounterRate: 90 },
    });

    expect([401, 403]).toContain(r.status);
    expect((await readMap()).encounterRate).toBe(22);
  });
});
