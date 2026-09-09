import { describe, expect, it } from "vitest";
import { weekIdOf } from "./boss-rotation";
import {
  previousWeekId,
  seasonRewardForRank,
  startOfIsoWeekUtc,
  SEASON_TOP_RANKS,
  MIN_RANKED_MATCHES,
} from "./pvp-season";

/**
 * Temporada semanal da Arena ranqueada (8.5): a mesma semana ISO UTC do boss,
 * recompensas por colocação e o fechamento preguiçoso da semana anterior.
 */

const DAY_MS = 86_400_000;

describe("Temporada — semana", () => {
  it("a âncora da semana é a segunda-feira 00:00 UTC", () => {
    const wed = new Date("2026-09-09T18:00:00Z"); // quarta
    const monday = startOfIsoWeekUtc(wed);
    expect(monday.getUTCDay()).toBe(1); // segunda
    expect(monday.getUTCHours()).toBe(0);
    expect(monday.getUTCMinutes()).toBe(0);
    expect(monday.getTime()).toBe(new Date("2026-09-07T00:00:00Z").getTime());
  });

  it("previousWeekId é a semana anterior à atual", () => {
    expect(previousWeekId(new Date("2026-09-14T00:00:00Z"))).toBe("2026-W37");
    expect(previousWeekId(new Date("2026-09-14T12:00:00Z"))).toBe("2026-W37");
  });

  it("previousWeekId == weekIdOf(segunda anterior)", () => {
    for (const iso of ["2026-09-14T03:00:00Z", "2026-01-05T00:00:00Z", "2026-12-28T23:59:59Z"]) {
      const now = new Date(iso);
      const monday = startOfIsoWeekUtc(now);
      expect(previousWeekId(now)).toBe(weekIdOf(new Date(monday.getTime() - 7 * DAY_MS)));
    }
  });
});

describe("Temporada — recompensas", () => {
  it("pódio tem recompensa própria e 4–10 a faixa base", () => {
    expect(seasonRewardForRank(1).money).toBeGreaterThan(seasonRewardForRank(2).money);
    expect(seasonRewardForRank(2).money).toBeGreaterThan(seasonRewardForRank(3).money);
    expect(seasonRewardForRank(3).money).toBeGreaterThan(seasonRewardForRank(4).money);
    for (let r = 4; r <= SEASON_TOP_RANKS; r++) {
      expect(seasonRewardForRank(r)).toEqual(seasonRewardForRank(10));
    }
    expect(seasonRewardForRank(1).money).toBe(50_000);
    expect(seasonRewardForRank(10).money).toBe(10_000);
  });

  it("constantes da spec", () => {
    expect(SEASON_TOP_RANKS).toBe(10);
    expect(MIN_RANKED_MATCHES).toBe(10);
  });
});
