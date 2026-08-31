import { TILE_DEFINITIONS, type TileId } from "@/lib/tiles";
import type { CollisionOverride, WildEncounterEntry } from "@/db/schema";

/**
 * Regras espaciais do mapa (Fase 6.2-A).
 *
 * Antes desta fase, "posso andar aqui?" e "aqui aparece bicho?" eram
 * respondidas **só pelo tipo de tile**, com as respostas fixas no código
 * (`TILE_DEFINITIONS`). Isso criava dois problemas que o mantenedor apontou:
 *
 * 1. água é `walkable: false` **e** `hasEncounter: true` — encontro aquático
 *    era impossível, porque ninguém pisa na água;
 * 2. só o matinho gerava encontro, e a área de caça era o mapa inteiro: não
 *    dava para dizer "aqui nesta faixa de areia aparece bicho, ali não".
 *
 * A correção são duas camadas gravadas por mapa, pintadas no editor:
 *
 * - `encounterGrid` — o "tile invisível": marca a célula como área de caça sem
 *   alterar o desenho;
 * - `collisionGrid` — override de passagem por célula, com três estados.
 *
 * Este módulo é **puro de propósito**: sem banco, sem `Math.random`, sem
 * React. O servidor usa para decidir (autoridade) e o cliente usa para prever
 * o mesmo resultado, sem duas implementações divergentes da mesma regra.
 */

/** O mínimo que as regras precisam saber de um mapa. */
export interface MapRulesSource {
  width: number;
  height: number;
  tileGrid: unknown;
  encounterGrid?: unknown;
  collisionGrid?: unknown;
  encounterTable?: unknown;
}

/** Chance de encontro por passo (%) quando o mapa não define a sua. */
export const DEFAULT_ENCOUNTER_RATE = 22;

function asGrid<T>(value: unknown): T[][] {
  return Array.isArray(value) ? (value as T[][]) : [];
}

/** `true` quando a camada existe e cobre a célula pedida. */
function layerCovers(grid: unknown[][], x: number, y: number): boolean {
  return grid.length > 0 && Array.isArray(grid[y]) && grid[y][x] !== undefined;
}

export function tileAt(map: MapRulesSource, x: number, y: number): TileId | null {
  const grid = asGrid<string>(map.tileGrid);
  const tile = grid[y]?.[x];
  if (typeof tile !== "string") return null;
  return (tile in TILE_DEFINITIONS ? tile : "grass") as TileId;
}

function inBounds(map: MapRulesSource, x: number, y: number): boolean {
  const width = map.width || 16;
  const height = map.height || 16;
  return x >= 0 && y >= 0 && x < width && y < height;
}

/**
 * O jogador pode ocupar esta célula?
 *
 * Precedência: fora da grade → não; override da célula → manda; senão, o
 * padrão do tipo de tile. A borda do mapa nunca é atravessável, mesmo com
 * override — `"walkable"` libera terreno, não teleporte para fora do mundo.
 */
export function isWalkableAt(map: MapRulesSource, x: number, y: number): boolean {
  if (!inBounds(map, x, y)) return false;

  const collision = asGrid<CollisionOverride>(map.collisionGrid);
  if (layerCovers(collision, x, y)) {
    const override = collision[y][x];
    if (override === "blocked") return false;
    if (override === "walkable") return true;
  }

  const tile = tileAt(map, x, y);
  if (!tile) return false;
  return TILE_DEFINITIONS[tile].walkable;
}

/**
 * Esta célula é área de caça?
 *
 * Com `encounterGrid` preenchida, ela é a **única** fonte da verdade — é o que
 * permite marcar areia/pedra e desmarcar um matinho decorativo. Sem ela, o
 * comportamento é o legado: `hasEncounter` do tipo de tile.
 */
export function hasEncounterAt(map: MapRulesSource, x: number, y: number): boolean {
  if (!inBounds(map, x, y)) return false;

  const encounters = asGrid<boolean>(map.encounterGrid);
  if (layerCovers(encounters, x, y)) {
    return encounters[y][x] === true;
  }

  const tile = tileAt(map, x, y);
  if (!tile) return false;
  return TILE_DEFINITIONS[tile].hasEncounter;
}

/** A camada nova está em uso neste mapa? (falso = mapa legado) */
export function usesEncounterLayer(map: MapRulesSource): boolean {
  return asGrid<boolean>(map.encounterGrid).length > 0;
}

/**
 * As espécies que podem aparecer na célula.
 *
 * No modo legado a filtragem continua sendo por `tileTypes` (cada espécie
 * declara em que tipo de tile aparece). Com a camada nova, a área de caça é
 * decidida pela pintura, então a lista inteira do mapa vale — foi a decisão do
 * mantenedor de ter **uma área de caça por mapa**.
 */
export function encounterPoolAt(
  map: MapRulesSource,
  x: number,
  y: number
): WildEncounterEntry[] {
  const table = Array.isArray(map.encounterTable)
    ? (map.encounterTable as WildEncounterEntry[])
    : [];

  if (table.length === 0) return [];
  if (usesEncounterLayer(map)) return table;

  const tile = tileAt(map, x, y);
  if (!tile) return [];

  const byTile = table.filter(
    (entry) => Array.isArray(entry.tileTypes) && entry.tileTypes.includes(tile)
  );

  // Mapa legado sem `tileTypes` coerente cai na tabela inteira, como antes.
  return byTile.length > 0 ? byTile : table;
}

/**
 * Sorteio ponderado. `rng` é injetável para o teste ser determinístico —
 * mesma razão da Fase 6.1.
 */
export function pickWeighted<T extends { weight?: number }>(
  entries: T[],
  rng: () => number = Math.random
): T | null {
  if (entries.length === 0) return null;

  const weights = entries.map((entry) => Math.max(0, entry.weight || 0));
  const total = weights.reduce((acc, weight) => acc + weight, 0);

  // Todos com peso zero: sorteio uniforme em vez de devolver sempre o mesmo.
  if (total <= 0) return entries[Math.floor(rng() * entries.length)] ?? entries[0];

  let roll = rng() * total;
  for (let i = 0; i < entries.length; i++) {
    if (roll < weights[i]) return entries[i];
    roll -= weights[i];
  }

  return entries[entries.length - 1];
}

/** Nível sorteado dentro da faixa da espécie, com a faixa saneada. */
export function rollEncounterLevel(
  entry: Pick<WildEncounterEntry, "minLevel" | "maxLevel">,
  maxLevel: number,
  rng: () => number = Math.random
): number {
  const min = Math.max(1, Math.min(entry.minLevel, entry.maxLevel));
  const max = Math.max(min, Math.min(entry.maxLevel, maxLevel));
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Chance de encontro por passo, em fração de 0 a 1. */
export function encounterChance(rate: number | null | undefined): number {
  const value = typeof rate === "number" && Number.isFinite(rate) ? rate : DEFAULT_ENCOUNTER_RATE;
  return Math.min(100, Math.max(0, value)) / 100;
}

/**
 * Coerência das camadas com as dimensões do mapa (Fase 6.2-A).
 *
 * Devolve a mensagem do primeiro problema encontrado, ou `null` se está tudo
 * certo. Fica aqui, puro, para as duas rotas de mapa (criar e atualizar)
 * usarem a mesma regra em vez de duplicá-la — e para dar mensagem específica
 * em vez de "dados inválidos".
 */
export function validateMapLayers(input: {
  width: number;
  height: number;
  encounterGrid?: unknown;
  collisionGrid?: unknown;
  encounterTable?: unknown;
}): string | null {
  const layers: Array<[string, unknown[][]]> = [
    ["camada de encontros", asGrid<boolean>(input.encounterGrid)],
    ["camada de colisão", asGrid<CollisionOverride>(input.collisionGrid)],
  ];

  for (const [label, grid] of layers) {
    // Vazia = mapa legado; é um estado válido e não deve ser checada.
    if (grid.length === 0) continue;

    if (grid.length !== input.height) {
      return `A ${label} tem ${grid.length} linhas, mas o mapa tem altura ${input.height}.`;
    }
    const badRow = grid.findIndex((row) => !Array.isArray(row) || row.length !== input.width);
    if (badRow !== -1) {
      return `A ${label} precisa ter ${input.width} colunas em toda linha (linha ${badRow} não tem).`;
    }
  }

  // Área de caça pintada sem espécie na lista = jogador anda numa área que
  // nunca gera nada. É engano de edição, não configuração legítima.
  const encounters = asGrid<boolean>(input.encounterGrid);
  const marked = encounters.some((row) => row.some((cell) => cell === true));
  const table = Array.isArray(input.encounterTable) ? input.encounterTable : [];

  if (marked && table.length === 0) {
    return "Há área de caça pintada, mas nenhuma espécie na lista de encontros do mapa.";
  }

  return null;
}
