import type { WildEncounterEntry } from "@/db/schema";
import { getPokemonSpecies } from "./pokedex";
import type { TileId } from "./tiles";

/**
 * O mundo padrão do jogo (Fase 6.4-A — expansão até o mapa 20).
 *
 * Pedido do mantenedor: gerar mapas até o 20 seguindo o conceito dos três
 * primeiros, com **temas/-regiões** para que os encontros de cada tipo fiquem
 * coesos por mapa, e distribuir as 156 espécies de forma **balanceada e
 * separada**: formas básicas/comuns nos mapas iniciais, evoluídos/raros e
 * faixas de nível altas nos mapas avançados.
 *
 * Este módulo é PURO (sem banco): produz os dados que dois consumidores usam:
 * - `src/lib/seed-maps.ts` — semeia um banco vazio (fluxo de CI/integração);
 * - `scripts/world-seed.mts` — aplica de forma idempotente num banco que já
 *   tem os 3 mapas antigos (fluxo de dev/produção), seguido de `world:export`
 *   para versionar em `content/world/` (MUNDO-COMO-CODIGO).
 *
 * Decisões de conteúdo registradas aqui:
 * - O **mapa 1 é intocável** (contrato da 6.2-C: iniciais nv 3–8, Pikachu
 *   4–9, Eevee 4–10, ginásio do Brock 12/14).
 * - Os mapas 2 e 3 **trocaram de elenco** (eram da época de 25 espécies:
 *   Gengar/Lucario/Rayquaza commons em mapa 2–3). Agora seguem a progressão:
 *   floresta de insetos/plantas e colinas rochosas. Ginásios (Misty 18/21,
 *   Lance 38/45), lojas e portais originais permanecem; o mapa 3 ganhou a
 *   saída norte que inicia a cadeia até o mapa 20.
 * - Mapas 4–20: um tema por mapa, corredor de portais norte/sul, Centro
 *   Pokémon apenas nos mapas 4, 8, 13, 16 e 20 (trecho longo sem curar é
 *   dificuldade de propósito — o jogo não deve facilitar).
 * - Faixas de nível sobem +4 por mapa com sobreposição de +4/+2: 8–16, 14–24,
 *   18–28 … 78–90, 82–95. Dentro da faixa, o peso decide o quão alto o bicho
 *   aparece (comum no andar de baixo, raro/lendário no topo).
 * - Cada espécie aparece em **exatamente um** mapa (guardado por teste) e
 *   nenhuma evolução aparece em mapa ANTERIOR ao da sua forma anterior
 *   (também guardado por teste).
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
  type: "shop" | "gym";
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

// ── Faixa de nível por mapa ─────────────────────────────────────────────────
export const WORLD_BANDS: Record<number, [number, number]> = {
  1: [3, 10], 2: [8, 16], 3: [14, 24], 4: [18, 28], 5: [22, 32],
  6: [26, 36], 7: [30, 40], 8: [34, 44], 9: [38, 48], 10: [42, 52],
  11: [46, 56], 12: [50, 60], 13: [54, 64], 14: [58, 68], 15: [62, 72],
  16: [66, 76], 17: [70, 80], 18: [74, 84], 19: [78, 90], 20: [82, 95],
};

const LEGENDARIES = new Set([144, 145, 146, 150, 151, 384]);

/** Espécies que também podem aparecer andando na borda d'água dos mapas aquáticos. */
const AQUATIC = new Set([
  54, 55, 60, 61, 62, 72, 73, 79, 80, 86, 87, 90, 91, 98, 99, 116, 117,
  118, 119, 120, 121, 129, 130, 131, 134,
]);

/** Regra de nível dentro da faixa do mapa, a partir do peso (raridade). */
function levelsFor(weight: number, legendary: boolean, band: [number, number]): [number, number] {
  const [lo, hi] = band;
  if (legendary) return [Math.max(lo, hi - 8), hi];
  if (weight >= 14) return [lo, hi - 3]; // comum: anda na base da faixa
  if (weight >= 9) return [lo + 2, hi - 1]; // incomum
  if (weight >= 5) return [lo + 4, hi]; // raro: só no topo
  return [lo + 6, hi]; // muito raro
}

type EncSpec = [id: number, weight: number];

function buildEncounterTable(order: number, specs: EncSpec[]): WildEncounterEntry[] {
  const band = WORLD_BANDS[order];
  const watery = [5, 10, 15].includes(order);
  return specs.map(([pokedexId, weight]) => {
    const legendary = LEGENDARIES.has(pokedexId);
    const [minLevel, maxLevel] = levelsFor(weight, legendary, band);
    return {
      pokedexId,
      name: getPokemonSpecies(pokedexId).name,
      weight,
      minLevel,
      maxLevel,
      tileTypes: watery && AQUATIC.has(pokedexId)
        ? ["tall_grass", "water"]
        : ["tall_grass"],
    };
  });
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
type Rect = [number, number, number, number]; // x1, y1, x2, y2

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
 * Grade temática dos mapas 4–20: borda de árvores com portais nas colunas
 * 7/8 (norte/sul), trilha em cruz, retângulos de grama alta, água e decoração.
 * A grama alta só substitui o chão do tema — nunca trilha, água ou borda.
 */
function themedGrid(opts: {
  ground: TileId;
  grassRects: Rect[];
  waterRects?: Rect[];
  flowers?: Array<[number, number]>;
  center?: [number, number];
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

  // MAPA 3: Pico Celeste (grade original + saída norte p/ cadeia até o 20)
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
 * Elenco por mapa: [pokedexId, peso]. Peso soma 100 em todos os mapas.
 * O mapa 1 NÃO está aqui: é contrato fixo da 6.2-C (`map1Table`).
 */
const ENCOUNTERS: Record<number, EncSpec[]> = {
  2: [[10, 10], [13, 10], [11, 6], [14, 6], [16, 13], [21, 8], [19, 11], [43, 12], [69, 12], [46, 6], [48, 6]],
  3: [[74, 17], [50, 12], [27, 10], [66, 10], [56, 10], [29, 9], [32, 9], [30, 5], [33, 5], [95, 5], [104, 4], [111, 4]],
  4: [[41, 24], [42, 8], [35, 10], [63, 10], [23, 16], [39, 10], [102, 10], [113, 2], [108, 10]],
  5: [[129, 14], [118, 11], [72, 11], [98, 11], [116, 11], [120, 9], [54, 9], [79, 9], [90, 5], [60, 10]],
  6: [[88, 18], [109, 18], [92, 12], [49, 8], [44, 12], [2, 8], [114, 12], [61, 12]],
  7: [[81, 20], [82, 12], [100, 20], [101, 12], [26, 8], [135, 6], [125, 8], [137, 14]],
  8: [[28, 14], [51, 14], [105, 10], [24, 10], [75, 16], [115, 12], [128, 12], [127, 12]],
  9: [[77, 18], [58, 18], [37, 14], [17, 12], [22, 10], [84, 10], [83, 6], [143, 12]],
  10: [[86, 16], [87, 14], [91, 10], [124, 14], [131, 8], [144, 2], [55, 12], [80, 12], [8, 12]],
  11: [[93, 24], [97, 22], [96, 18], [122, 16], [64, 20]],
  12: [[5, 24], [38, 14], [59, 14], [78, 16], [126, 16], [136, 12], [146, 4]],
  13: [[197, 11], [53, 12], [52, 8], [20, 14], [57, 14], [106, 8], [107, 8], [448, 11], [67, 6], [68, 8]],
  14: [[36, 18], [40, 18], [282, 16], [45, 14], [70, 12], [103, 12], [3, 10]],
  15: [[73, 14], [99, 14], [117, 14], [119, 14], [121, 12], [134, 12], [62, 8], [9, 12]],
  16: [[138, 14], [139, 10], [140, 14], [141, 10], [142, 16], [76, 12], [34, 12], [31, 12]],
  17: [[12, 16], [15, 16], [47, 16], [71, 16], [123, 18], [147, 18]],
  18: [[18, 26], [85, 22], [6, 28], [130, 24]],
  19: [[150, 10], [132, 10], [94, 18], [65, 16], [112, 18], [208, 16], [89, 6], [110, 6]],
  20: [[149, 30], [148, 34], [384, 16], [145, 12], [151, 8]],
};

/** Os 20 mapas, em ordem de jornada. Grades dos mapas 4–20 são temáticas. */
export function buildDefaultMaps(): DefaultMapData[] {
  const { map1, map2, map3 } = originalGrids();

  const maps: DefaultMapData[] = [
    {
      order: 1, slug: "vale-pallet", name: "Mapa 1: Vale Pallet", shortName: "Vale Pallet",
      description: "Lar dos primeiros treinadores. Ginásio do Brock (Pedra) e Loja básica.",
      width: 16, height: 16, tileGrid: map1,
      encounterTable: map1Table(),
      portals: [
        { id: "p1-north-1", sourceX: 7, sourceY: 0, targetSlug: "floresta-viridian", targetMapName: "Floresta de Viridian", targetX: 7, targetY: 14, label: "Norte → Floresta de Viridian" },
        { id: "p1-north-2", sourceX: 8, sourceY: 0, targetSlug: "floresta-viridian", targetMapName: "Floresta de Viridian", targetX: 8, targetY: 14, label: "Norte → Floresta de Viridian" },
      ],
      npcs: [
        { id: "shop-pallet", x: 2, y: 7, type: "shop", name: "Loja Pallet", shopId: 1, dialog: "Bem-vindo! Temos itens básicos para sua jornada!" },
        { id: "gym-brock", x: 11, y: 4, type: "gym", name: "Brock", gymId: 1, dialog: "Sou Brock! Líder do Ginásio Pewter! Você tem coragem para me enfrentar?" },
      ],
    },
    {
      order: 2, slug: "floresta-viridian", name: "Mapa 2: Floresta de Viridian", shortName: "Floresta de Viridian",
      description: "Mata fechada de insetos e plantas selvagens (nv 8–16). Ginásio da Misty (Água) e Loja intermediária.",
      width: 16, height: 16, tileGrid: map2,
      encounterTable: buildEncounterTable(2, ENCOUNTERS[2]),
      portals: [
        { id: "p2-south-1", sourceX: 7, sourceY: 15, targetSlug: "vale-pallet", targetMapName: "Vale Pallet", targetX: 7, targetY: 1, label: "Sul → Vale Pallet" },
        { id: "p2-south-2", sourceX: 8, sourceY: 15, targetSlug: "vale-pallet", targetMapName: "Vale Pallet", targetX: 8, targetY: 1, label: "Sul → Vale Pallet" },
        { id: "p2-east-1", sourceX: 15, sourceY: 7, targetSlug: "pico-celeste", targetMapName: "Pico Celeste", targetX: 1, targetY: 7, label: "Leste → Pico Celeste" },
        { id: "p2-east-2", sourceX: 15, sourceY: 8, targetSlug: "pico-celeste", targetMapName: "Pico Celeste", targetX: 1, targetY: 8, label: "Leste → Pico Celeste" },
      ],
      npcs: [
        { id: "shop-viridian", x: 3, y: 11, type: "shop", name: "Loja da Floresta", shopId: 2, dialog: "Estoque intermediário para Treinadores que chegam longe!" },
        { id: "gym-misty", x: 11, y: 3, type: "gym", name: "Misty", gymId: 2, dialog: "Sou Misty! A Garota Sereia! Prepare-se para se afogar!" },
      ],
    },
    {
      order: 3, slug: "pico-celeste", name: "Mapa 3: Pico Celeste", shortName: "Pico Celeste",
      description: "Colinas rochosas na subida da montanha (nv 14–24). Ginásio do Lance (Dragão); ao norte começa a longa jornada até o mapa 20.",
      width: 16, height: 16, tileGrid: map3,
      encounterTable: buildEncounterTable(3, ENCOUNTERS[3]),
      portals: [
        { id: "p3-west-1", sourceX: 0, sourceY: 7, targetSlug: "floresta-viridian", targetMapName: "Floresta de Viridian", targetX: 14, targetY: 7, label: "Oeste → Floresta de Viridian" },
        { id: "p3-west-2", sourceX: 0, sourceY: 8, targetSlug: "floresta-viridian", targetMapName: "Floresta de Viridian", targetX: 14, targetY: 8, label: "Oeste → Floresta de Viridian" },
        // norte → Mapa 4 entra pela cadeia abaixo (ids p3-north-1/2)
      ],
      npcs: [
        { id: "shop-peak", x: 8, y: 12, type: "shop", name: "Loja do Pico", shopId: 3, dialog: "Items raros para os mais fortes Treinadores do mundo!" },
        { id: "gym-lance", x: 7, y: 3, type: "gym", name: "Lance", gymId: 3, dialog: "Lance, Mestre dos Dragões! Ninguém passou por mim ainda!" },
      ],
    },
  ];

  // ── Mapas 4–20: definições temáticas ──────────────────────────────────────
  const themes: Array<{
    slug: string; name: string; shortName: string; description: string;
    ground: TileId; grassRects: Rect[]; waterRects?: Rect[];
    flowers?: Array<[number, number]>; center?: [number, number];
  }> = [
    {
      slug: "caverna-monte-lua", name: "Mapa 4: Caverna do Monte Lua", shortName: "Caverna do Monte Lua",
      description: "Túneis úmidos de pedra (nv 18–28). Zubat e Clefairy por todo lado; Chansey é raríssima. Centro Pokémon disponível.",
      ground: "stone",
      grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 5, 13], [9, 9, 13, 13]],
      center: [6, 10],
    },
    {
      slug: "litoral-vermilion", name: "Mapa 5: Litoral de Vermilion", shortName: "Litoral de Vermilion",
      description: "Praia e mar raso (nv 22–32). Pequenos aquáticos na água e na restinga; Shellder é o achado raro.",
      ground: "sand",
      grassRects: [[2, 8, 6, 13], [10, 8, 13, 13]],
      waterRects: [[10, 1, 14, 6], [1, 1, 5, 4]],
    },
    {
      slug: "pantano-venenoso", name: "Mapa 6: Pântano Venenoso", shortName: "Pântano Venenoso",
      description: "Lama tóxica e névoa (nv 26–36). Grimer, Koffing e Gastly; Ivysaur medra no lodo.",
      ground: "grass",
      grassRects: [[2, 2, 6, 6], [9, 3, 13, 6], [3, 9, 12, 13]],
      waterRects: [[9, 9, 13, 13]],
    },
    {
      slug: "usina-volt", name: "Mapa 7: Usina de Volt", shortName: "Usina de Volt",
      description: "Geradores zumbindo (nv 30–40). Magnemite e Voltorb sobrecarregam os corredores; Jolteon é raríssimo.",
      ground: "stone",
      grassRects: [[2, 2, 5, 6], [10, 2, 13, 6], [2, 9, 13, 13]],
    },
    {
      slug: "deserto-das-ruinas", name: "Mapa 8: Deserto das Ruínas", shortName: "Deserto das Ruínas",
      description: "Dunas e ruínas enterradas (nv 34–44). Fósseis vivos, Graveler e Kangaskhan; Centro Pokémon no oásis.",
      ground: "sand",
      grassRects: [[1, 2, 5, 7], [10, 2, 14, 7], [4, 10, 11, 13]],
      center: [6, 10],
    },
    {
      slug: "planicies-douradas", name: "Mapa 9: Planícies Douradas", shortName: "Planícies Douradas",
      description: "Campos abertos de vento e pólen (nv 38–48). Cães e cavalos de fogo correm soltos; Snorlalx bloqueia a trilha.",
      ground: "grass",
      grassRects: [[2, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
      flowers: [[3, 7], [12, 8], [6, 3]],
    },
    {
      slug: "ilhas-glaciais", name: "Mapa 10: Ilhas Glaciais", shortName: "Ilhas Glaciais",
      description: "Canais congelados (nv 42–52). Seel e Jynx nas margens; Lapras é raro e Articuno, lendário.",
      ground: "grass",
      grassRects: [[2, 5, 6, 10], [9, 5, 13, 10]],
      waterRects: [[1, 1, 14, 3], [1, 12, 14, 14]],
    },
    {
      slug: "torre-dos-espiritos", name: "Mapa 11: Torre dos Espíritos", shortName: "Torre dos Espíritos",
      description: "Andares silenciosos entre velas (nv 46–56). Haunter flanqueia; Hypno e Kadabra vigiam os corredores.",
      ground: "stone",
      grassRects: [[2, 2, 6, 5], [9, 2, 13, 5], [2, 9, 6, 13], [9, 9, 13, 13]],
    },
    {
      slug: "vulcao-cinnabar", name: "Mapa 12: Vulcão de Cinnabar", shortName: "Vulcão de Cinnabar",
      description: "Cinzas e magma (nv 50–60). As linhas de fogo completas; Charmeleon treina aqui antes das asas; Moltres aninha na cratera.",
      ground: "stone",
      grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [4, 9, 11, 13]],
    },
    {
      slug: "cidade-sombria", name: "Mapa 13: Cidade Sombria", shortName: "Cidade Sombria",
      description: "Becos de neon e um dojo de portas abertas (nv 54–64). Umbreon, Lucario e os Hitmon-irmãos; Centro Pokémon na praça.",
      ground: "stone",
      grassRects: [[2, 2, 5, 5], [10, 2, 13, 5], [2, 9, 13, 13]],
      flowers: [[6, 3], [9, 12]],
      center: [6, 10],
    },
    {
      slug: "vale-das-fadas", name: "Mapa 14: Vale das Fadas", shortName: "Vale das Fadas",
      description: "Campinas cor-de-rosa (nv 58–68). Clefable e Wigglytuff fazem festa; Gardevoir guarda o vale; Venusaur descansa à sombra.",
      ground: "grass",
      grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
      flowers: [[7, 3], [8, 12], [3, 8], [12, 7]],
    },
    {
      slug: "fossa-abissal", name: "Mapa 15: Fossa Abissal", shortName: "Fossa Abissal",
      description: "Águas negras sem luz (nv 62–72). Os aquáticos definitivos — Starmie, Vaporeon e o próprio Blastoise.",
      ground: "sand",
      grassRects: [[5, 4, 10, 12]],
      waterRects: [[1, 1, 4, 14], [11, 1, 14, 14]],
    },
    {
      slug: "canion-dos-fosseis", name: "Mapa 16: Cânion dos Fósseis", shortName: "Cânion dos Fósseis",
      description: "Estratos escavados pelo tempo (nv 66–76). Omanyte e Kabuto despertam; Golem, Nidoking e Nidoqueen dominam o leito; Centro Pokémon no acampamento.",
      ground: "sand",
      grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [3, 9, 12, 13]],
      center: [6, 10],
    },
    {
      slug: "selva-profunda", name: "Mapa 17: Selva Profunda", shortName: "Selva Profunda",
      description: "Dossel fechado que engole a luz (nv 70–80). Insetos gigantes tesouram o ar; Dratini desliza nos riachos.",
      ground: "grass",
      grassRects: [[1, 1, 6, 6], [9, 1, 14, 6], [1, 9, 6, 14], [9, 9, 14, 14]],
    },
    {
      slug: "rota-do-ceu", name: "Mapa 18: Rota do Céu", shortName: "Rota do Céu",
      description: "Correntes de ar acima das nuvens (nv 74–84). Charizard e Gyarados cortam o vento; Pidgeot patrulha em bando.",
      ground: "grass",
      grassRects: [[2, 3, 6, 7], [9, 3, 13, 7], [4, 10, 11, 13]],
      flowers: [[7, 2], [8, 13]],
    },
    {
      slug: "caverna-suprema", name: "Mapa 19: Caverna Suprema", shortName: "Caverna Suprema",
      description: "O fundo do mundo (nv 78–90). Gengar, Alakazam, Steelix e Rhydon no auge; Mewtwo observa de algum lugar.",
      ground: "stone",
      grassRects: [[2, 2, 6, 5], [9, 2, 13, 5], [2, 8, 5, 13], [9, 8, 13, 13]],
    },
    {
      slug: "santuario-celeste", name: "Mapa 20: Santuário Celeste", shortName: "Santuário Celeste",
      description: "O topo da jornada (nv 82–95). Dratini completa a linha: Dragonair e Dragonite reinam; Rayquaza, Zapdos e Mew aparecem para muito poucos. Centro Pokémon no templo.",
      ground: "grass",
      grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [4, 9, 11, 13]],
      flowers: [[7, 3], [8, 12], [3, 8], [12, 8]],
      center: [6, 10],
    },
  ];

  for (let i = 0; i < themes.length; i++) {
    const order = 4 + i;
    const theme = themes[i];
    maps.push({
      order,
      slug: theme.slug,
      name: theme.name,
      shortName: theme.shortName,
      description: theme.description,
      width: 16,
      height: 16,
      tileGrid: themedGrid({
        ground: theme.ground,
        grassRects: theme.grassRects,
        waterRects: theme.waterRects,
        flowers: theme.flowers,
        center: theme.center,
        northExit: order < 20, // o 20 é o fim da linha
        southExit: true,
      }),
      encounterTable: buildEncounterTable(order, ENCOUNTERS[order]),
      portals: [], // preenchido pela cadeia abaixo
      npcs: [],
    });
  }

  // ── Cadeia de portais 3→4→…→20 (norte) e volta (sul) ─────────────────────
  for (let i = 2; i < maps.length - 1; i++) {
    // i = índice do mapa atual na lista (2 = mapa 3, que ganha saída norte).
    const from = maps[i];
    const to = maps[i + 1];
    from.portals.push(
      { id: `p${from.order}-north-1`, sourceX: 7, sourceY: 0, targetSlug: to.slug, targetMapName: to.shortName, targetX: 7, targetY: 14, label: `Norte → ${to.shortName}` },
      { id: `p${from.order}-north-2`, sourceX: 8, sourceY: 0, targetSlug: to.slug, targetMapName: to.shortName, targetX: 8, targetY: 14, label: `Norte → ${to.shortName}` }
    );
    to.portals.push(
      { id: `p${to.order}-south-1`, sourceX: 7, sourceY: 15, targetSlug: from.slug, targetMapName: from.shortName, targetX: 7, targetY: 1, label: `Sul → ${from.shortName}` },
      { id: `p${to.order}-south-2`, sourceX: 8, sourceY: 15, targetSlug: from.slug, targetMapName: from.shortName, targetX: 8, targetY: 1, label: `Sul → ${from.shortName}` }
    );
  }

  return maps;
}
