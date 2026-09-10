/** Regras temporais do convite direto, mantidas fora do acesso ao banco para
 * poderem ser testadas sem Postgres e reutilizadas por jobs/observabilidade. */
export const CHALLENGE_TTL_MS = 60_000;
export const CHALLENGE_COOLDOWN_MS = 10_000;

export function challengeExpiresAt(now = Date.now()): Date {
  return new Date(now + CHALLENGE_TTL_MS);
}

export function challengeCooldownUntil(now = Date.now()): Date {
  return new Date(now + CHALLENGE_COOLDOWN_MS);
}

export function isChallengeExpired(expiresAt: Date | string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}
