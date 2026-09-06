import { describe, expect, it } from "vitest";
import { GYM_TEAMS } from "./gym-teams";
import { getPokemonSpecies } from "./pokedex";

/**
 * Guarda dos times de ginásio (Fase 6.2-C).
 *
 * `GYM_TEAMS` é a fonte única usada por `seed-gym.ts` (banco novo),
 * `scripts/backfill-balance.ts` (banco já populado) e
 * `scripts/balance-report.mts` (medição). Os níveis foram restaurados na
 * 6.2-C por decisão do mantenedor: a 6.1 os tinha baixado temendo o muro do
 * primeiro ginásio; com o mapa 1 arrumado (criaturas 2–7, golpes 15–35) e a
 * curva `nível³ × 0,8` de volta, os valores originais retornam.
 */
describe("GYM_TEAMS", () => {
  it("níveis da 6.2-C: Brock 12/14, Misty 18/21, Lance 38/45", () => {
    expect(GYM_TEAMS.Brock.map((m) => m.level)).toEqual([12, 14]);
    expect(GYM_TEAMS.Misty.map((m) => m.level)).toEqual([18, 21]);
    expect(GYM_TEAMS.Lance.map((m) => m.level)).toEqual([38, 45]);
  });

  it("espécies dos times existem na Pokédex (o seed depende disso)", () => {
    for (const team of Object.values(GYM_TEAMS)) {
      for (const member of team) {
        expect(() => getPokemonSpecies(member.pokedexId)).not.toThrow();
      }
    }
  });

  it("todo membro tem nível plausível", () => {
    for (const team of Object.values(GYM_TEAMS)) {
      for (const member of team) {
        expect(member.level).toBeGreaterThanOrEqual(1);
        expect(member.level).toBeLessThanOrEqual(100);
      }
    }
  });
});
