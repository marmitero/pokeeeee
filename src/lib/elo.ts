/**
 * ELO e pareamento da Arena PvP ranqueada (Fase 8.5).
 *
 * Tudo aqui é puro e determinístico — sem banco, sem Math.random implícito —
 * para ser testável em unidade (simetria, K, piso) e reutilizado na
 * resolução do resultado e na fila de pareamento.
 *
 * Regras (espec do mantenedor):
 *  - K-factor 32; acima de 2000 de ELO cai para 24;
 *  - piso de 100: ninguém desce abaixo de 100 de ELO;
 *  - a vitória por desistência antes do turno 3 paga ½ K ao vencedor
 *    (a derrota de quem desistiu é cheia);
 *  - a fila pareia salas `WAITING` com `|elo − meu| ≤ janela`, e a janela
 *    cresce +50 a cada 30 s de espera (base 150).
 */

export const ELO_FLOOR = 100;
export const ELO_K = 32;
export const ELO_K_HIGH = 24;
/** Acima deste ELO o K-factor cai para o valor alto (24). */
export const ELO_HIGH_THRESHOLD = 2000;

/** Janela inicial de pareamento por ELO. */
export const ELO_MATCH_WINDOW_BASE = 150;
/** A janela cresce +50 a cada `ELO_MATCH_WINDOW_STEP_SEC`. */
export const ELO_MATCH_WINDOW_STEP = 50;
export const ELO_MATCH_WINDOW_STEP_SEC = 30;

/** K-factor do jogador, pelo próprio ELO (padrão Elo: cada um usa o seu K). */
export function kFactor(elo: number): number {
  return elo > ELO_HIGH_THRESHOLD ? ELO_K_HIGH : ELO_K;
}

/** Probabilidade esperada de `rating` vencer `opponent` (Elo clássico). */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - rating) / 400));
}

export interface ApplyEloOptions {
  /**
   * Vitória reduzida (desistência antes do turno 3): o vencedor pontua com
   * ½ K; o perdedor perde o K cheio.
   */
  halfKForWinner?: boolean;
}

export interface EloOutcome {
  winner: number;
  loser: number;
}

/**
 * Calcula o ELO novo dos dois lados após uma vitória. Aplica o piso de 100.
 *
 * Simetria: com K iguais, o que um ganha é exatamente o que o outro perde
 * (fora do piso) — o teste de unidade trava isso.
 */
export function applyElo(
  winnerElo: number,
  loserElo: number,
  opts: ApplyEloOptions = {}
): EloOutcome {
  const winnerK = kFactor(winnerElo) * (opts.halfKForWinner ? 0.5 : 1);
  const loserK = kFactor(loserElo);
  const expectedWinner = expectedScore(winnerElo, loserElo);

  const winner = Math.max(
    ELO_FLOOR,
    Math.round(winnerElo + winnerK * (1 - expectedWinner))
  );
  const loser = Math.max(
    ELO_FLOOR,
    Math.round(loserElo + loserK * (0 - expectedScore(loserElo, winnerElo)))
  );

  return { winner, loser };
}

/** Janela de pareamento após `waitSeconds` na fila (base 150, +50 a cada 30 s). */
export function eloMatchWindow(waitSeconds: number): number {
  const steps = Math.floor(Math.max(0, waitSeconds) / ELO_MATCH_WINDOW_STEP_SEC);
  return ELO_MATCH_WINDOW_BASE + ELO_MATCH_WINDOW_STEP * steps;
}

/**
 * Hash curto do IP para o antifarm de pareamento. Guardamos só o hash (FNV-1a
 * em base 36), nunca o IP cru — duas contas do mesmo IP não se enfrentam.
 */
export function hashIp(ip: string): string {
  let h = 2166136261;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
