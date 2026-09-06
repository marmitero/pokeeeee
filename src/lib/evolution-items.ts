/**
 * Itens de evolução (Fase 6.4-B — Johto + pedras na loja).
 *
 * As regras de evolução vivem no catálogo (`PokemonSpecies.evolvesTo`) com o
 * campo `itemId`. Este módulo é o único mapa entre:
 *   - a coluna de inventário (`fireStone`, `waterStone`, ...),
 *   - o ID usado pelo motor (`EvolvesTo.itemId`),
 *   - e os nomes/emoji exibidos na loja/Pokémon Box.
 *
 * Decisão: evolução por item é sempre um item próprio e consumível (uma pedra
 * ou um "casco" raro). O sistema de tempo/felicidade/troca da série original
 * ainda não existe aqui — linhas como Togepi→Togetic e Eevee→Espeon/Umbreon
 * usam pedra como proxy enquanto a 6.5 não traz o estado de felicidade.
 */
export const EVOLUTION_ITEM_IDS = {
  fireStone: 1,
  waterStone: 2,
  thunderStone: 3,
  leafStone: 4,
  moonStone: 5,
  sunStone: 6,
  shinyStone: 7,
  metalCoat: 8,
  kingsRock: 9,
  dragonScale: 10,
  upgrade: 11,
  duskStone: 12,
  dawnStone: 13,
  ovalStone: 14,
} as const;

export type EvolutionItemKey = keyof typeof EVOLUTION_ITEM_IDS;

export const EVOLUTION_ITEM_VALUES = Object.keys(
  EVOLUTION_ITEM_IDS
) as EvolutionItemKey[];

export const EVOLUTION_ITEM_LABEL: Record<EvolutionItemKey, string> = {
  fireStone: "Pedra de Fogo",
  waterStone: "Pedra d'Água",
  thunderStone: "Pedra de Trovão",
  leafStone: "Pedra de Folha",
  moonStone: "Pedra da Lua",
  sunStone: "Pedra do Sol",
  shinyStone: "Pedra Brilhante",
  metalCoat: "Revestimento de Metal",
  kingsRock: "Rocha do Rei",
  dragonScale: "Escama de Dragão",
  upgrade: "Melhorador",
  duskStone: "Pedra do Entardecer",
  dawnStone: "Pedra do Amanhecer",
  ovalStone: "Pedra Oval",
};

export const EVOLUTION_ITEM_EMOJI: Record<EvolutionItemKey, string> = {
  fireStone: "🔥",
  waterStone: "💧",
  thunderStone: "⚡",
  leafStone: "🍃",
  moonStone: "🌙",
  sunStone: "☀️",
  shinyStone: "✨",
  metalCoat: "🛡️",
  kingsRock: "👑",
  dragonScale: "🐉",
  upgrade: "🖥️",
  duskStone: "🌆",
  dawnStone: "🌅",
  ovalStone: "🥚",
};

/** ID do motor de evolução a partir da chave do inventário/loja. */
export function evolutionItemId(key: string): number | null {
  return EVOLUTION_ITEM_IDS[key as EvolutionItemKey] ?? null;
}

/** Chave do inventário/loja a partir do ID do motor (para validar posse). */
export function evolutionItemKey(id: number): EvolutionItemKey | null {
  const entry = Object.entries(EVOLUTION_ITEM_IDS).find(([, value]) => value === id);
  return entry ? (entry[0] as EvolutionItemKey) : null;
}
