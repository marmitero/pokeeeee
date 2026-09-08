import { describe, expect, it } from "vitest";
import {
  BOSS_DAILY_ATTEMPTS,
  BOSS_LEGENDARY_CHANCE,
  BOSS_MAX_LEVEL,
  BOSS_MIN_LEVEL,
  BOSS_POOL,
  bossFor,
  bossMoneyForLevel,
  dayIdOf,
  isBossArena,
  weekIdOf,
  weekIndexOf,
} from "./boss-rotation";

describe("rotação da Arena Boss (Etapa C, 8.3)", () => {
  it("constantes da espec do mantenedor", () => {
    expect(BOSS_POOL).toHaveLength(47);
    expect(BOSS_MIN_LEVEL).toBe(80);
    expect(BOSS_MAX_LEVEL).toBe(100);
    expect(BOSS_DAILY_ATTEMPTS).toBe(2);
    expect(BOSS_LEGENDARY_CHANCE).toBeCloseTo(1 / 1200, 10);
    expect(bossMoneyForLevel(80)).toBe(23_000);
    expect(bossMoneyForLevel(100)).toBe(25_000);
  });

  it("arenas válidas: só os mapas 20 e 40", () => {
    expect(isBossArena(20)).toBe(true);
    expect(isBossArena(40)).toBe(true);
    expect(isBossArena(1)).toBe(false);
    expect(isBossArena(21)).toBe(false);
  });

  it("weekId ISO: segunda e domingo caem na mesma semana", () => {
    // 2026-09-07 é segunda; 2026-09-13 é o domingo seguinte.
    expect(weekIdOf(new Date("2026-09-07T12:00:00Z"))).toBe("2026-W37");
    expect(weekIdOf(new Date("2026-09-13T23:59:59Z"))).toBe("2026-W37");
    expect(weekIdOf(new Date("2026-09-14T00:00:00Z"))).toBe("2026-W38");
    expect(dayIdOf(new Date("2026-09-07T23:00:00-03:00"))).toBe("2026-09-08"); // UTC, não local
  });

  it("determinístico: mesma semana, mesmo boss", () => {
    const a = bossFor(20, new Date("2026-09-07T12:00:00Z"));
    const b = bossFor(20, new Date("2026-09-13T23:59:59Z"));
    expect(a).toEqual(b);
  });

  it("nível sempre entre 80 e 100, em 200 semanas", () => {
    for (let w = 0; w < 200; w++) {
      const date = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000);
      for (const arena of [20, 40] as const) {
        const boss = bossFor(arena, date);
        expect(boss.level).toBeGreaterThanOrEqual(80);
        expect(boss.level).toBeLessThanOrEqual(100);
      }
    }
  });

  it("cada arena percorre os 47 sem repetir dentro do ciclo", () => {
    const start = weekIndexOf(new Date("2026-09-07T12:00:00Z"));
    for (const arena of [20, 40] as const) {
      const cycle = Math.floor(start / BOSS_POOL.length);
      const seen = new Set<number>();
      for (let pos = 0; pos < BOSS_POOL.length; pos++) {
        const weekIndex = cycle * BOSS_POOL.length + pos;
        const date = new Date(Date.UTC(1970, 0, 5) + weekIndex * 7 * 86_400_000);
        seen.add(bossFor(arena, date).pokedexId);
      }
      expect(seen.size).toBe(47);
    }
  });

  it("as duas arenas nunca exibem o mesmo lendário na mesma semana (4 anos)", () => {
    for (let w = 0; w < 208; w++) {
      const date = new Date(Date.UTC(2026, 0, 5) + w * 7 * 86_400_000);
      const a = bossFor(20, date);
      const b = bossFor(40, date);
      expect(a.pokedexId, `semana ${a.weekId}`).not.toBe(b.pokedexId);
    }
  });
});
