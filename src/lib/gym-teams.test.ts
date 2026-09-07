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

  it("níveis da Etapa C: um time por cidade, no topo da banda do mapa", () => {
    expect(GYM_TEAMS.Coralina.map((m) => m.level)).toEqual([24, 27]); // mapa 5 (13–27)
    expect(GYM_TEAMS.Glacio.map((m) => m.level)).toEqual([33, 37]); // mapa 10 (23–37)
    expect(GYM_TEAMS.Nerissa.map((m) => m.level)).toEqual([43, 45, 47]); // mapa 15 (33–47)
    expect(GYM_TEAMS.Ventus.map((m) => m.level)).toEqual([54, 56, 58]); // mapa 20 (44–58)
    expect(GYM_TEAMS.Ferrao.map((m) => m.level)).toEqual([64, 66, 68]); // mapa 25 (54–68)
    expect(GYM_TEAMS.Tormenta.map((m) => m.level)).toEqual([75, 77, 79]); // mapa 30 (65–79)
    expect(GYM_TEAMS.Nocturna.map((m) => m.level)).toEqual([86, 88, 90]); // mapa 35 (76–90)
    expect(GYM_TEAMS.Magnus.map((m) => m.level)).toEqual([95, 97, 100]); // mapa 40 (86–100)
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
