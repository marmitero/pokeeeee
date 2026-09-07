import { EVOLUTION_ITEM_VALUES, type EvolutionItemKey } from "../evolution-items";

/**
 * Drops de pedra de evolução (Etapa C, 8.1).
 *
 * Decisão do mantenedor: pedras absurdamente caras na loja (100k–200k) e
 * drop raro de Pokémon selvagens nv 40+. A loja é o último recurso; as vias
 * principais são este drop e a pedra semanal da Arena Boss (8.3).
 *
 * - Só selvagens de nível >= `STONE_DROP_MIN_LEVEL` dropam;
 * - chance `STONE_DROP_RATE` (0,2% = 1 a cada 500 vitórias, em média);
 * - a pedra é uniforme entre as 21 (todas têm o mesmo peso).
 *
 * `rand` é injetável para os testes não dependerem de sorte.
 */
export const STONE_DROP_MIN_LEVEL = 40;
export const STONE_DROP_RATE = 0.002;

export function rollStoneDrop(
  opponentLevel: number,
  rand: () => number = Math.random
): EvolutionItemKey | null {
  if (opponentLevel < STONE_DROP_MIN_LEVEL) return null;
  if (rand() >= STONE_DROP_RATE) return null;
  const idx = Math.floor(rand() * EVOLUTION_ITEM_VALUES.length);
  return EVOLUTION_ITEM_VALUES[idx]!;
}
