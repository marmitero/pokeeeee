import type { WildEncounterEntry } from "@/db/schema";
import { getPokemonSpecies } from "./pokedex";
import type { TileId } from "./tiles";
import type { Rect, WorldEncounterRow } from "./world-layout";
import {
  descriptionFor,
  GYM_ACE_MIN_MAP,
  LEGENDARY_MIN_MAP,
  WORLD_LEGENDARIES,
  WORLD_MAP_COUNT,
  WORLD_MAP_LAYOUT,
} from "./world-layout";
import { WORLD_ENCOUNTERS } from "./world-encounters";

/**
 * O mundo padrão do jogo (Fase 7.1 — Etapa B: 40 mapas).
 *
 * Este módulo é a **renderização**, não a autoria. Nenhum número de conteúdo é
 * digitado aqui; os dados vivem em dois lugares:
 *
 * - `world-layout.ts` — os 40 mapas (identidade, bioma, grade, Centro Pokémon,
 *   banda de nível) e as listas travadas por contrato (mapa 1, lendários, ases
 *   de ginásio);
 * - `world-encounters.ts` — **artefato gerado** por `world-distribute.ts` com
 *   `[id, peso, nv mín, nv máx, água]` de cada uma das 649 espécies.
 *
 * Fluxo (contrato da Etapa B): `default-world.ts` → `npm run world:seed` →
 * `npm run world:export` → `content/world/maps/*.json` versionados → testes →
 * PR → ativação do mundo. Editar tabela de encontro à mão é sempre um erro:
 * regere com `npm run world:distribute -- --write`.
 *
 * Decisões de conteúdo:
 * - O **mapa 1 é intocável** (contrato da 6.2-C): grade, NPCs, portais e as
 *   cinco entradas com os níveis originais (`map1Table` abaixo é verbatim).
 * - Mapas 2 e 3 preservam grade, lojas e ginásios; o **elenco** é o da
 *   redistribuição, e as bandas subiram de "+4 por mapa em 20 mapas" para uma
 *   escada contínua de 3→100 em 40 mapas.
 * - Lendários: nunca antes do mapa `LEGENDARY_MIN_MAP` (10) e sempre com peso
 *   pequeno; os mapas marcados `legendaryHaven` no layout concentram os míticos.
 * - Centro Pokémon é **tile** (`center`), não entidade nova: aparece nos mapas
 *   com `center` no layout. Trecho longo sem curar é dificuldade de propósito.
 * - Cada espécie aparece em exatamente **um** mapa e nenhum evoluído mora em
 *   mapa anterior ao da própria pré-evolução (guardas de
 *   `world-expansion.test.ts`).
 * - Nenhum NPC de loja nos mapas novos: sem item novo nesta etapa, `shops/`
 *   fica intacto e loja fantasma violaria o contrato.
 */

export interface DefaultPortalSpec {
  id: string;
  sourceX: number;
  sourceY: number;
  targetSlug: string;
  targetMapName: string;
  targetX: number;
  targetY: number;
  label: string;
}

export interface DefaultNpcSpec {
  id: string;
  x: number;
  y: number;
  type: "shop" | "gym" | "healer" | "boss";
  name: string;
  shopId?: number;
  gymId?: number;
  dialog: string;
}

export interface DefaultMapData {
  order: number;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  width: number;
  height: number;
  tileGrid: TileId[][];
  encounterTable: WildEncounterEntry[];
  portals: DefaultPortalSpec[];
  npcs: DefaultNpcSpec[];
}

// Reexportos: quem consumia estas constantes por aqui não precisa conhecer o
// módulo novo, e a fonte de verdade continua sendo `world-layout.ts`.
export { WORLD_BANDS, type Rect, type WorldMapLayout } from "./world-layout";
export { GYM_ACE_MIN_MAP, LEGENDARY_MIN_MAP };
export const DEFAULT_LEGENDARIES: ReadonlySet<number> = WORLD_LEGENDARIES;

/**
 * Cidades da Etapa C: a cada 5 mapas (5→40), uma cidade com loja, ginásio e
 * cura. `gymId`/`shopId` acompanham a ordem de criação dos seeds
 * (`seed-gym.ts`/`seed-shop.ts`): loja 4 e ginásio 4 no mapa 5, e assim por
 * diante. Os nomes de ginásio repetem o `name` do seed (fonte da verdade do
 * time é `GYM_TEAMS`).
 */
/**
 * Arenas Boss da Etapa C (8.3): uma no Santuário Celeste (meio da jornada),
 * outra na Coroa do Mundo (fim). Cada uma tem seu lendário semanal.
 */
export const BOSS_NPCS: Readonly<Record<number, { x: number; y: number; name: string; dialog: string }>> = {
  20: {
    x: 9, y: 8, name: "Arena Boss do Santuário",
    dialog: "Um lendário desce à arena toda semana… poucos saem de pé!",
  },
  40: {
    x: 6, y: 8, name: "Arena Boss da Coroa",
    dialog: "A arena final! O lendário mais temido do mundo te espera!",
  },
};

export const CITY_NPCS: Readonly<Record<number, {
  shopId: number; gymId: number;
  shopName: string; shopDialog: string;
  gymName: string; gymDialog: string;
}>> = {
  5: {
    shopId: 4, gymId: 4,
    shopName: "Loja do Litoral", shopDialog: "Artigos de praia e suprimentos para a jornada!",
    gymName: "Coralina", gymDialog: "Sou Coralina! O mar me ensinou paciência — e a afogar a pressa dos desafiantes!",
  },
  10: {
    shopId: 5, gymId: 5,
    shopName: "Loja Glacial", shopDialog: "Estoque reforçado contra o frio — e contra treinadores despreparados!",
    gymName: "Glacio", gymDialog: "Sou Glacio. Aqui o frio separa os treinadores dos turistas.",
  },
  15: {
    shopId: 6, gymId: 6,
    shopName: "Loja Abissal", shopDialog: "Suprimentos das profundezas. Desça preparado!",
    gymName: "Nerissa", gymDialog: "Sou Nerissa, voz da fossa. Poucos voltam com uma insígnia.",
  },
  20: {
    shopId: 7, gymId: 7,
    shopName: "Loja do Santuário", shopDialog: "Itens abençoados pelos dragões do templo!",
    gymName: "Ventus", gymDialog: "Sou Ventus, guardião do Santuário. Mostre suas asas!",
  },
  25: {
    shopId: 8, gymId: 8,
    shopName: "Loja da Forja", shopDialog: "Equipamento forjado a fogo alto. Aguenta o tranco!",
    gymName: "Ferrao", gymDialog: "Sou Ferrao! Esta forja molda aço e treinadores!",
  },
  30: {
    shopId: 9, gymId: 9,
    shopName: "Loja do Recife", shopDialog: "O melhor estoque dos sete mares — Masterballs à vista!",
    gymName: "Tormenta", gymDialog: "Sou Tormenta, capitão deste recife! Segure-se!",
  },
  35: {
    shopId: 10, gymId: 10,
    shopName: "Loja do Farol", shopDialog: "A última loja antes do fim do mundo. Abasteça-se!",
    gymName: "Nocturna", gymDialog: "Sou Nocturna, a luz que guia e assombra.",
  },
  40: {
    shopId: 11, gymId: 11,
    shopName: "Loja da Coroa", shopDialog: "O estoque mais raro do mundo, digno de um Soberano!",
    gymName: "Magnus", gymDialog: "Sou Magnus, Soberano da Coroa do Mundo. Prove que merece o topo!",
  },
};

/**
 * Linha gerada → entrada de `encounterTable`. `água = 1` só aparece nos mapas
 * com `waterRects` e libera o tile `water` além da grama alta.
 */
function rowToEntry(row: WorldEncounterRow): WildEncounterEntry {
  const [pokedexId, weight, minLevel, maxLevel, water] = row;
  return {
    pokedexId,
    name: getPokemonSpecies(pokedexId).name,
    weight,
    minLevel,
    maxLevel,
    tileTypes: water === 1 ? ["tall_grass", "water"] : ["tall_grass"],
  };
}

function buildEncounterTable(order: number): WildEncounterEntry[] {
  const rows = WORLD_ENCOUNTERS[order] ?? [];
  if (rows.length === 0) throw new Error(`mapa ${order} sem tabela de encontros gerada`);
  const soma = rows.reduce((acc, r) => acc + r[1], 0);
  if (soma !== 100) throw new Error(`pesos do mapa ${order} somam ${soma}, não 100`);
  return rows.map(rowToEntry);
}

/**
 * Tabela do mapa 1, VERBATIM da semente original (contrato da 6.2-C):
 * iniciais nv 3–8, Pikachu 4–9, Eevee 4–10. A regra de faixas não se aplica.
 */
function map1Table(): WildEncounterEntry[] {
  return [
    { pokedexId: 1, name: getPokemonSpecies(1).name, weight: 22, minLevel: 3, maxLevel: 8, tileTypes: ["tall_grass"] },
    { pokedexId: 4, name: getPokemonSpecies(4).name, weight: 22, minLevel: 3, maxLevel: 8, tileTypes: ["tall_grass"] },
    { pokedexId: 7, name: getPokemonSpecies(7).name, weight: 22, minLevel: 3, maxLevel: 8, tileTypes: ["tall_grass", "water"] },
    { pokedexId: 25, name: getPokemonSpecies(25).name, weight: 18, minLevel: 4, maxLevel: 9, tileTypes: ["tall_grass"] },
    { pokedexId: 133, name: getPokemonSpecies(133).name, weight: 16, minLevel: 4, maxLevel: 10, tileTypes: ["tall_grass"] },
  ];
}

// ── Grades temáticas (16×16, índice [y][x]) ──────────────────────────────────
// `Rect` vem de `world-layout.ts` — é o mesmo tipo que o layout usa.

function emptyGrid(fill: TileId): TileId[][] {
  return Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => fill));
}

function fillRect(g: TileId[][], [x1, y1, x2, y2]: Rect, tile: TileId, onlyOn?: TileId) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (onlyOn !== undefined && g[y][x] !== onlyOn) continue;
      g[y][x] = tile;
    }
  }
}

/**
 * Grade temática: borda de árvores com portais nas colunas 7/8 (norte/sul),
 * trilha em cruz, retângulos de grama alta, água e decoração. A grama alta só
 * substitui o chão do tema — nunca trilha, água ou borda.
 */
function themedGrid(opts: {
  ground: TileId;
  grassRects: readonly Rect[];
  waterRects?: readonly Rect[];
  flowers?: readonly (readonly [number, number])[];
  center?: readonly [number, number];
  northExit: boolean;
  southExit: boolean;
}): TileId[][] {
  const g = emptyGrid(opts.ground);

  for (let x = 0; x < 16; x++) {
    g[0][x] = opts.northExit && (x === 7 || x === 8) ? "portal" : "tree";
    g[15][x] = opts.southExit && (x === 7 || x === 8) ? "portal" : "tree";
  }
  for (let y = 1; y < 15; y++) {
    g[y][0] = "tree";
    g[y][15] = "tree";
  }
  // Trilha em cruz (norte–sul e leste–oeste), como os mapas originais.
  for (let y = 1; y < 15; y++) {
    g[y][7] = "stone";
    g[y][8] = "stone";
  }
  for (let x = 1; x < 15; x++) {
    if (g[7][x] === opts.ground) g[7][x] = "stone";
    if (g[8][x] === opts.ground) g[8][x] = "stone";
  }

  for (const rect of opts.waterRects ?? []) fillRect(g, rect, "water", opts.ground);
  for (const rect of opts.grassRects) fillRect(g, rect, "tall_grass", opts.ground);
  for (const [x, y] of opts.flowers ?? []) {
    if (g[y][x] === opts.ground) g[y][x] = "flower";
  }
  if (opts.center) {
    const [cx, cy] = opts.center;
    g[cy][cx] = "center";
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const x = cx + dx, y = cy + dy;
      if (g[y]?.[x] === opts.ground || g[y]?.[x] === "tall_grass") g[y][x] = "stone";
    }
  }
  return g;
}

// ── Mapas originais 1–3 (grades verbatim da semente original) ────────────────

function originalGrids() {
  // MAPA 1: Vale Pallet & Rota 101 (intocado — contrato da 6.2-C)
  const map1 = emptyGrid("grass");
  for (let x = 0; x < 16; x++) {
    if (x !== 7 && x !== 8) { map1[0][x] = "tree"; map1[15][x] = "tree"; }
  }
  for (let y = 0; y < 16; y++) { map1[y][0] = "tree"; map1[y][15] = "tree"; }
  for (let y = 0; y < 15; y++) { map1[y][7] = "stone"; map1[y][8] = "stone"; }
  map1[0][7] = "portal"; map1[0][8] = "portal";
  map1[4][4] = "center"; map1[4][3] = "stone";
  map1[3][4] = "flower"; map1[5][4] = "flower";
  map1[4][11] = "stone"; map1[3][11] = "stone";
  map1[7][2] = "stone"; map1[7][3] = "stone";
  for (let y = 2; y <= 5; y++) for (let x = 12; x <= 14; x++) map1[y][x] = "water";
  for (let y = 8; y <= 13; y++) {
    for (let x = 2; x <= 6; x++) map1[y][x] = "tall_grass";
    for (let x = 10; x <= 13; x++) map1[y][x] = "tall_grass";
  }

  // MAPA 2: Floresta Sombria de Viridian (grade original; elenco novo)
  const map2 = emptyGrid("grass");
  for (let x = 0; x < 16; x++) {
    map2[0][x] = "tree";
    if (x !== 7 && x !== 8) map2[15][x] = "tree";
  }
  for (let y = 0; y < 16; y++) {
    map2[y][0] = "tree";
    if (y !== 7 && y !== 8) map2[y][15] = "tree";
  }
  map2[15][7] = "portal"; map2[15][8] = "portal";
  map2[7][15] = "portal"; map2[8][15] = "portal";
  for (let y = 1; y < 15; y++) { map2[y][7] = "stone"; map2[y][8] = "stone"; }
  for (let x = 8; x < 15; x++) { map2[7][x] = "stone"; map2[8][x] = "stone"; }
  // (portais das bordas preservados: a trilha não pinta a linha/coluna deles)
  map2[6][6] = "center";
  map2[3][11] = "stone"; map2[3][12] = "stone";
  map2[11][3] = "stone";
  for (let y = 2; y <= 13; y++) {
    for (let x = 2; x <= 5; x++) map2[y][x] = "tall_grass";
    for (let x = 10; x <= 13; x++) {
      if (y !== 7 && y !== 8 && y !== 3) map2[y][x] = "tall_grass";
    }
  }

  // MAPA 3: Pico Celeste (grade original + saída norte p/ cadeia até o 40)
  const map3 = emptyGrid("stone");
  for (let x = 0; x < 16; x++) { map3[0][x] = "tree"; map3[15][x] = "tree"; }
  for (let y = 0; y < 16; y++) {
    if (y !== 7 && y !== 8) map3[y][0] = "tree";
    map3[y][15] = "tree";
  }
  map3[7][0] = "portal"; map3[8][0] = "portal";
  map3[0][7] = "portal"; map3[0][8] = "portal"; // (novo: norte → Mapa 4)
  map3[7][8] = "center";
  map3[3][7] = "stone"; map3[3][8] = "stone";
  map3[12][8] = "stone";
  for (let y = 3; y <= 12; y++) {
    for (let x = 4; x <= 12; x++) {
      if (map3[y][x] !== "center" && !(y === 3 && (x === 7 || x === 8)) && !(y === 12 && x === 8))
        map3[y][x] = "tall_grass";
    }
  }

  return { map1, map2, map3 };
}

/**
 * Os 40 mapas, em ordem de jornada. Mapas 1–3 verbatim da semente original
 * (grade, NPCs, portais); 4–40 saem do `world-layout.ts` (tema, grade, Centro
 * Pokémon) e da tabela gerada.
 */
export function buildDefaultMaps(): DefaultMapData[] {
  const { map1, map2, map3 } = originalGrids();
  const legacyGrids: Record<number, TileId[][]> = { 1: map1, 2: map2, 3: map3 };

  const maps: DefaultMapData[] = WORLD_MAP_LAYOUT.map((layout) => ({
    order: layout.order,
    slug: layout.slug,
    name: layout.name,
    shortName: layout.shortName,
    description: descriptionFor(layout),
    width: 16,
    height: 16,
    tileGrid: layout.legacyGrid
      ? legacyGrids[layout.order]!
      : themedGrid({
          ground: layout.ground ?? "grass",
          grassRects: layout.grassRects ?? [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
          waterRects: layout.waterRects,
          flowers: layout.flowers,
          center: layout.center,
          northExit: layout.order < WORLD_MAP_COUNT,
          southExit: layout.order !== 1,
        }),
    encounterTable: layout.order === 1 ? map1Table() : buildEncounterTable(layout.order),
    portals: [], // preenchido pela cadeia abaixo
    npcs: [],
  }));

  // ── Portais e NPCs dos três mapas originais (contrato 6.2-C / 6.4-A) ──────
  const [m1, m2, m3] = maps;
  m1!.portals.push(
    { id: "p1-north-1", sourceX: 7, sourceY: 0, targetSlug: m2!.slug, targetMapName: m2!.shortName, targetX: 7, targetY: 14, label: `Norte → ${m2!.shortName}` },
    { id: "p1-north-2", sourceX: 8, sourceY: 0, targetSlug: m2!.slug, targetMapName: m2!.shortName, targetX: 8, targetY: 14, label: `Norte → ${m2!.shortName}` },
  );
  m1!.npcs.push(
    { id: "shop-pallet", x: 2, y: 7, type: "shop", name: "Loja Pallet", shopId: 1, dialog: "Bem-vindo! Temos itens básicos para sua jornada!" },
    { id: "gym-brock", x: 11, y: 4, type: "gym", name: "Brock", gymId: 1, dialog: "Sou Brock! Líder do Ginásio Pewter! Você tem coragem para me enfrentar?" },
  );
  m2!.portals.push(
    { id: "p2-south-1", sourceX: 7, sourceY: 15, targetSlug: m1!.slug, targetMapName: m1!.shortName, targetX: 7, targetY: 1, label: `Sul → ${m1!.shortName}` },
    { id: "p2-south-2", sourceX: 8, sourceY: 15, targetSlug: m1!.slug, targetMapName: m1!.shortName, targetX: 8, targetY: 1, label: `Sul → ${m1!.shortName}` },
    { id: "p2-east-1", sourceX: 15, sourceY: 7, targetSlug: m3!.slug, targetMapName: m3!.shortName, targetX: 1, targetY: 7, label: `Leste → ${m3!.shortName}` },
    { id: "p2-east-2", sourceX: 15, sourceY: 8, targetSlug: m3!.slug, targetMapName: m3!.shortName, targetX: 1, targetY: 8, label: `Leste → ${m3!.shortName}` },
  );
  m2!.npcs.push(
    { id: "shop-viridian", x: 3, y: 11, type: "shop", name: "Loja da Floresta", shopId: 2, dialog: "Estoque intermediário para Treinadores que chegam longe!" },
    { id: "gym-misty", x: 11, y: 3, type: "gym", name: "Misty", gymId: 2, dialog: "Sou Misty! A Garota Sereia! Prepare-se para se afogar!" },
  );
  m3!.portals.push(
    { id: "p3-west-1", sourceX: 0, sourceY: 7, targetSlug: m2!.slug, targetMapName: m2!.shortName, targetX: 14, targetY: 7, label: `Oeste → ${m2!.shortName}` },
    { id: "p3-west-2", sourceX: 0, sourceY: 8, targetSlug: m2!.slug, targetMapName: m2!.shortName, targetX: 14, targetY: 8, label: `Oeste → ${m2!.shortName}` },
  );
  m3!.npcs.push(
    { id: "shop-peak", x: 8, y: 12, type: "shop", name: "Loja do Pico", shopId: 3, dialog: "Items raros para os mais fortes Treinadores do mundo!" },
    { id: "gym-lance", x: 7, y: 3, type: "gym", name: "Lance", gymId: 3, dialog: "Lance, Mestre dos Dragões! Ninguém passou por mim ainda!" },
  );

  // ── Etapa C (8.1/8.2): NPCs das cidades (mapas 5→40 de 5 em 5) ─────────────
  // Cada cidade tem loja + ginásio + curandeira. Posições na trilha de pedra
  // central (sempre ocupável): loja (6,7), ginásio (9,7), cura (6,8) — no
  // mapa 40 o Centro Pokémon ocupa o (6,7), então a loja vai para (5,7) e a
  // cura para (9,8). Verificado contra `waterRects`/centros de cada cidade.
  for (const m of maps) {
    const city = CITY_NPCS[m.order];
    if (!city) continue;
    const shopX = m.order === 40 ? 5 : 6;
    const healerX = m.order === 40 ? 9 : 6;
    const healerY = m.order === 40 ? 8 : 8;
    m.npcs.push(
      { id: `shop-${m.slug}`, x: shopX, y: 7, type: "shop", name: city.shopName, shopId: city.shopId, dialog: city.shopDialog },
      { id: `gym-${m.slug}`, x: 9, y: 7, type: "gym", name: city.gymName, gymId: city.gymId, dialog: city.gymDialog },
      { id: `healer-${m.slug}`, x: healerX, y: healerY, type: "healer", name: `Curandeira de ${m.shortName}`, dialog: "Sua equipe foi curada! Volte sempre!" },
    );
  }

  // ── Etapa C (8.3): Arenas Boss (mapas 20 e 40) ─────────────────────────────
  // O lendário semanal é calculado em runtime (`bossFor`); o NPC é só a porta
  // de entrada. Posições na trilha de pedra: (9,8) no 20, (6,8) no 40.
  for (const m of maps) {
    const boss = BOSS_NPCS[m.order];
    if (!boss) continue;
    m.npcs.push(
      { id: `boss-${m.slug}`, x: boss.x, y: boss.y, type: "boss", name: boss.name, dialog: boss.dialog },
    );
  }

  // ── Cadeia de portais 3→4→…→40 (norte) e volta (sul) ──────────────────────
  // Os tiles 7/8 são espelhados: entrar em qualquer um dos dois cai no tile
  // correspondente do vizinho, e a volta é sempre simétrica. Assim o grafo do
  // mundo continua uma trilha navegável a partir do mapa 1.
  for (let i = 2; i < maps.length - 1; i++) {
    const from = maps[i]!;
    const to = maps[i + 1]!;
    from.portals.push(
      { id: `p${from.order}-north-1`, sourceX: 7, sourceY: 0, targetSlug: to.slug, targetMapName: to.shortName, targetX: 7, targetY: 14, label: `Norte → ${to.shortName}` },
      { id: `p${from.order}-north-2`, sourceX: 8, sourceY: 0, targetSlug: to.slug, targetMapName: to.shortName, targetX: 8, targetY: 14, label: `Norte → ${to.shortName}` },
    );
    to.portals.push(
      { id: `p${to.order}-south-1`, sourceX: 7, sourceY: 15, targetSlug: from.slug, targetMapName: from.shortName, targetX: 7, targetY: 1, label: `Sul → ${from.shortName}` },
      { id: `p${to.order}-south-2`, sourceX: 8, sourceY: 15, targetSlug: from.slug, targetMapName: from.shortName, targetX: 8, targetY: 1, label: `Sul → ${from.shortName}` },
    );
  }

  return maps;
}
