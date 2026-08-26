/**
 * Rolagem de captura no servidor (Fase 2).
 *
 * `catchRate` era declarado nas 21 espécies e nunca lido em lugar nenhum: a
 * captura sempre succeedia e a decisão era do cliente.
 *
 * Cálculo:
 *   a = ((3*maxHp - 2*hp) * catchRate * bonusDaBola) / (3*maxHp)
 *
 * Em seguida aplica-se o **limiar de chacoalhada** da fórmula clássica, em vez
 * de um `a/255` linear. A versão linear foi a primeira tentativa e dava ~6%
 * num Pokémon comum com HP cheio — punitivo demais. A clássica produz a curva
 * esperada: difícil com HP cheio, fácil com o alvo enfraquecido.
 *
 *   b = 65536 / (255/a)^0.1875      chance = (b/65536)^4
 *
 * Referência medida (Pokébola, catchRate 45 — Eevee/Bulbasaur):
 *   HP cheio → 12% · metade do HP → 20% · 10% do HP → 26%
 *   Great Ball: 16% / 27% / 35%   ·   Ultra Ball: 20% / 34% / 43%
 * Lendário (Rayquaza, catchRate 10): 4% com HP cheio, 14% com Ultra Ball a 10%.
 * Master Ball é sempre 100%.
 */

export type BallKey = "pokeballs" | "greatballs" | "ultraballs" | "masterballs";

export const BALL_BONUS: Record<BallKey, number> = {
  pokeballs: 1,
  greatballs: 1.5,
  ultraballs: 2,
  masterballs: Number.POSITIVE_INFINITY,
};

export const BALL_LABEL: Record<BallKey, string> = {
  pokeballs: "Pokébola",
  greatballs: "Great Ball",
  ultraballs: "Ultra Ball",
  masterballs: "Master Ball",
};

const MIN_CHANCE = 0.03;
const MAX_CHANCE = 0.95;
const SHAKE_EXPONENT = 0.1875;

export function captureChance(
  catchRate: number,
  hp: number,
  maxHp: number,
  ball: BallKey
): number {
  if (ball === "masterballs") return 1;
  if (maxHp <= 0) return MAX_CHANCE;

  const a =
    ((3 * maxHp - 2 * Math.max(0, hp)) * catchRate * BALL_BONUS[ball]) /
    (3 * maxHp);

  if (a <= 0) return MIN_CHANCE;
  if (a >= 255) return MAX_CHANCE;

  const b = 65536 / Math.pow(255 / a, SHAKE_EXPONENT);
  const p = Math.pow(b / 65536, 4);

  return Math.min(MAX_CHANCE, Math.max(MIN_CHANCE, p));
}

export function rollCapture(chance: number): boolean {
  return Math.random() <= chance;
}
