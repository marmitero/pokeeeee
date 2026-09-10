import { describe, expect, it } from "vitest";
import {
  CHALLENGE_COOLDOWN_MS,
  CHALLENGE_TTL_MS,
  challengeCooldownUntil,
  challengeExpiresAt,
  isChallengeExpired,
} from "@/lib/pvp-challenge";

describe("convite PvP persistente — regras temporais", () => {
  const now = Date.UTC(2026, 8, 10, 12, 0, 0);

  it("expira exatamente após 60 segundos", () => {
    expect(CHALLENGE_TTL_MS).toBe(60_000);
    expect(challengeExpiresAt(now).getTime()).toBe(now + 60_000);
    expect(isChallengeExpired(challengeExpiresAt(now), now + 59_999)).toBe(false);
    expect(isChallengeExpired(challengeExpiresAt(now), now + 60_000)).toBe(true);
  });

  it("aplica cooldown de 10 segundos após recusa", () => {
    expect(CHALLENGE_COOLDOWN_MS).toBe(10_000);
    expect(challengeCooldownUntil(now).getTime()).toBe(now + 10_000);
  });

  it("trata uma data inválida como não expirada, sem aceitar silenciosamente", () => {
    expect(isChallengeExpired("not-a-date", now)).toBe(false);
  });
});
