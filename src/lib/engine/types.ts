/**
 * Tabela de efetividade de tipos (Fase 2).
 *
 * Antes não existia nada disso: Água vs. Fogo dava exatamente o mesmo que
 * Normal vs. Normal, e os 4 golpes de um Pokémon causavam dano idêntico.
 *
 * Codificada de forma **esparsa** — só entram os pares que diferem de 1.0.
 * Ausência na tabela significa neutro (×1). Isso mantém o arquivo legível e
 * à prova de erro de digitação em ~300 células.
 */

export const TYPE_NAMES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
] as const;

export type TypeName = (typeof TYPE_NAMES)[number];

/** atacantType → { defenderType → multiplicador } — apenas os não-neutros. */
const CHART: Record<string, Partial<Record<string, number>>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: {
    Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2,
    Rock: 0.5, Dragon: 0.5, Steel: 2,
  },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: {
    Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5,
  },
  Grass: {
    Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5,
    Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5,
  },
  Ice: {
    Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2,
    Dragon: 2, Steel: 0.5,
  },
  Fighting: {
    Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5,
    Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5,
  },
  Poison: {
    Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2,
  },
  Ground: {
    Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5,
    Rock: 2, Steel: 2,
  },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
  Bug: {
    Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2,
    Ghost: 0.5, Dark: 2, Steel: 0.5, Fairy: 0.5,
  },
  Rock: {
    Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5,
  },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Steel: {
    Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2,
  },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 },
};

/** Tipo inexistente é tratado como neutro em vez de derrubar a batalha. */
export function isKnownType(t: string): boolean {
  return (TYPE_NAMES as readonly string[]).includes(t);
}

/** Efetividade de UM golpe contra UM tipo do defensor. */
export function effectiveness(moveType: string, defenderType: string): number {
  return CHART[moveType]?.[defenderType] ?? 1;
}

/**
 * Multiplicador final contra um Pokémon de 1 ou 2 tipos.
 * Normal ×1 · "super efetivo" ×2 ou ×4 · "não muito efetivo" ×0.5 ou ×0.25 ·
 * imune ×0.
 */
export function typeMultiplier(moveType: string, defenderTypes: string[]): number {
  if (defenderTypes.length === 0) return 1;
  return defenderTypes.reduce((acc, t) => acc * effectiveness(moveType, t), 1);
}

/** Rótulo para o log de batalha. */
export function effectivenessLabel(mult: number): string | null {
  if (mult === 0) return "Não afeta o oponente...";
  if (mult >= 2) return "É super efetivo!";
  if (mult > 0 && mult < 1) return "Não é muito efetivo...";
  return null;
}
