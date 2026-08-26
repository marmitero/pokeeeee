/**
 * Cálculos de combate.
 *
 * Estas funções vivem FORA do escopo de render dos componentes por dois motivos:
 *
 *  1. `Math.random()` é impuro e a regra `react-hooks/purity` proíbe chamá-lo
 *     diretamente dentro do corpo de um componente React.
 *  2. Centraliza num único lugar a matemática de batalha que a **Fase 2** do
 *     roadmap vai mover para o servidor. Quando isso acontecer, este arquivo é
 *     o único ponto a substituir.
 *
 * ⚠️  NADA AQUI FOI REBALANCEADO. As fórmulas são idênticas às que estavam
 *     escritas em `BattleArenaModal.tsx` e `GymModal.tsx`. Rebalancear
 *     (usar power/accuracy/tipos/stats reais) é trabalho da Fase 2.
 */

/** Probabilidade de golpe crítico. */
export function rollCritical(chance: number): boolean {
  return Math.random() < chance;
}

/** Fator de variação aleatória de dano (0.925 a 1.075). */
export function rollDamageVariance(): number {
  return Math.random() * 0.15 + 0.925;
}

// ─── Batalha selvagem (BattleArenaModal) ──────────────────────────────────

/** Dano causado pelo Pokémon do jogador num encontro selvagem. */
export function computeWildDamage(level: number, critical: boolean): number {
  return Math.floor((level * 2.4 + 14) * (critical ? 1.5 : 1.0));
}

/** Dano do contra-ataque do Pokémon selvagem. */
export function computeWildCounterDamage(opponentLevel: number): number {
  return Math.floor(Math.random() * 12 + opponentLevel * 0.85);
}

// ─── Batalha de ginásio (GymModal) ────────────────────────────────────────

/** Dano do jogador contra o Pokémon do líder de ginásio. */
export function computeGymDamage(
  attackerLevel: number,
  attackerAttack: number,
  defenderDefense: number,
  critical: boolean
): number {
  const atkMult = critical ? 1.6 : 1;
  return Math.max(
    1,
    Math.floor(
      (((attackerLevel * 2 + 10) / 250) * (attackerAttack / defenderDefense) +
        2) *
        atkMult *
        rollDamageVariance()
    )
  );
}

/** Dano do contra-ataque do líder de ginásio. */
export function computeGymCounterDamage(
  attackerLevel: number,
  attackerAttack: number,
  defenderDefense: number
): number {
  return Math.max(
    1,
    Math.floor(
      (((attackerLevel * 2 + 10) / 250) * (attackerAttack / defenderDefense) +
        2) *
        rollDamageVariance()
    )
  );
}
