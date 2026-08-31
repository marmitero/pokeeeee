/**
 * Progressão de XP e nível (Fase 2 — bug B5).
 *
 * As colunas `xp` e `xp_to_next_level` existiam desde o começo e **nunca
 * receberam um UPDATE**: a barra de XP do PC Box era decorativa e nenhum
 * Pokémon jamais subiu de nível.
 */

export const MAX_LEVEL = 100;

/** Nível com que todo jogador começa (Fase 6.1: era um `5` solto na rota). */
export const STARTER_LEVEL = 5;

/**
 * XP de referência acumulado até um dado nível.
 *
 * Fase 6.1: a curva era `level^3 * 0.8`. Medida com `scripts/balance-report.mts`,
 * ela pedia 2,7 batalhas para sair do nível 5 mas **11,2** para sair do 25 e
 * 17,7 para sair do 40 — o começo passava rápido demais e o meio virava grind.
 * A curva `level^2.5 * 2.5` mantém o começo em ~3 batalhas por nível e sobe
 * para ~5–7 no meio do jogo, em vez de dobrar.
 */
function xpFloor(level: number): number {
  return Math.floor(Math.pow(level, 2.5) * 2.5);
}

/** Quanto XP falta para ir de `level` a `level + 1`. */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return Math.max(20, xpFloor(level + 1) - xpFloor(level));
}

/**
 * XP ganho ao derrotar um oponente.
 *
 * `baseXp` deriva do total de status-base da espécie (mais forte = mais XP),
 * no espírito da fórmula clássica `baseXp * level / 7`. Há um bônus por
 * enfrentar alguém acima do seu nível, limitado para não explodir.
 */
export function battleXpGain(
  defenderTotalBaseStats: number,
  defenderLevel: number,
  winnerLevel: number
): number {
  const baseXp = Math.max(10, Math.floor(defenderTotalBaseStats / 8));
  const raw = (baseXp * defenderLevel) / 7;

  const diff = defenderLevel - winnerLevel;
  const bonus = diff > 0 ? 1 + Math.min(diff, 20) * 0.05 : 1;

  return Math.max(1, Math.floor(raw * bonus));
}

export interface LevelUpOutcome {
  levelsGained: number;
  newLevel: number;
  newXp: number;
  newXpToNext: number;
}

/** Consome o ganho de XP, aplicando quantos níveis forem necessários. */
export function applyXp(
  currentLevel: number,
  currentXp: number,
  gain: number
): LevelUpOutcome {
  let level = currentLevel;
  let xp = currentXp + gain;
  let levelsGained = 0;

  while (level < MAX_LEVEL && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
  }

  if (level >= MAX_LEVEL) xp = 0;

  return { levelsGained, newLevel: level, newXp: xp, newXpToNext: xpToNextLevel(level) };
}
