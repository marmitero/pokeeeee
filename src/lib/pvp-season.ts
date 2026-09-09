import { weekIdOf } from "./boss-rotation";

/**
 * Temporada semanal da Arena PvP ranqueada (Fase 8.5).
 *
 * A temporada usa a MESMA semana ISO UTC do boss (`weekIdOf`) — segunda a
 * domingo. O fechamento é **preguiçoso**: na 1ª chamada da semana nova
 * (qualquer `GET /api/pvp?ranking=1` ou `join_ranked`), a semana anterior é
 * fechada — os top 10 por ELO (entre quem tem ≥ 10 partidas ranqueadas) são
 * fotografados em `pvp_seasons` e as recompensas são entregues na hora
 * (Pk$ + Cura Total + Restaurador Total).
 *
 * Tudo aqui é puro: o que precisa de banco mora em `pvp-service.ts`.
 */

export const SEASON_TOP_RANKS = 10;
/** Mínimo de partidas ranqueadas encerradas para entrar no top/ranking. */
export const MIN_RANKED_MATCHES = 10;

export interface SeasonReward {
  money: number;
  fullHeals: number;
  fullRestores: number;
}

export const SEASON_REWARDS: Record<1 | 2 | 3, SeasonReward> = {
  1: { money: 50_000, fullHeals: 5, fullRestores: 5 },
  2: { money: 30_000, fullHeals: 3, fullRestores: 3 },
  3: { money: 20_000, fullHeals: 2, fullRestores: 2 },
};

/** Recompensa do top 10: pódio (1/2/3) e faixa 4–10. */
export function seasonRewardForRank(rank: number): SeasonReward {
  if (rank === 1) return SEASON_REWARDS[1];
  if (rank === 2) return SEASON_REWARDS[2];
  if (rank === 3) return SEASON_REWARDS[3];
  return { money: 10_000, fullHeals: 1, fullRestores: 1 };
}

const DAY_MS = 86_400_000;

/** Segunda-feira (00:00 UTC) da semana ISO de `date`. */
export function startOfIsoWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // segunda = 0
  return new Date(d.getTime() - day * DAY_MS);
}

/** `YYYY-Www` da semana anterior à de `now`. */
export function previousWeekId(now: Date): string {
  const monday = startOfIsoWeekUtc(now);
  return weekIdOf(new Date(monday.getTime() - 7 * DAY_MS));
}
