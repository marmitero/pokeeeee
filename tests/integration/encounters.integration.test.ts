import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { gameMaps } from "@/db/schema";
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
