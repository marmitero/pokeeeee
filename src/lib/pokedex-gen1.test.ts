import { describe, expect, it } from "vitest";
import { POKEDEX, getPokemonSpecies, ALL_MOVES } from "./pokedex";
import { gen1Rest } from "./pokedex-gen1";
import { TYPE_NAMES, isKnownType } from "./engine/types";

/**
 * Guarda do catálogo Kanto completo (Fase 6.3-A).
 *
 * O objetivo da fase: TODAS as espécies de Kanto presentes, com linhas
 * evolutivas inteiras — base para a estética própria do futuro. Estes testes
 * impedem que um refactor apague espécies, quebre a fonte de sprites ou
 * introduza tipo/golpe inválido sem o CI perceber.
 */

/** Kanto completa (1–151) + os 4 fora de Kanto que o jogo já tinha + Steelix. */
const ESPERADAS = [
  ...Array.from({ length: 151 }, (_, i) => i + 1), // 1–151
  197, // Umbreon (fechava a Eevee desde a 6.3)
  208, // Steelix (fecha a linha do Onix)
  282, // Gardevoir
  384, // Rayquaza
  448, // Lucario
];

describe("catálogo Kanto completo (6.3-A)", () => {
  it("contém exatamente as espécies esperadas, sem duplicata", () => {
    const ids = POKEDEX.map((s) => s.id).sort((a, b) => a - b);
    const esperadas = [...ESPERADAS].sort((a, b) => a - b);

    expect(ids).toEqual(esperadas);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("são 156 espécies — 151 de Kanto + 5 de outras gerações", () => {
    expect(POKEDEX).toHaveLength(156);
  });

  it("toda espécie usa os três sprites do CDN no padrão Gen V animado", () => {
    const base =
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";

    for (const species of POKEDEX) {
      expect(species.frontSprite, `${species.name} front`).toBe(`${base}/${species.id}.gif`);
      expect(species.backSprite, `${species.name} back`).toBe(`${base}/back/${species.id}.gif`);
      expect(species.shinyFrontSprite, `${species.name} shiny`).toBe(`${base}/shiny/${species.id}.gif`);
    }
  });

  it("todo tipo citado existe na tabela de efetividade", () => {
    expect(TYPE_NAMES).toHaveLength(18); // a base do contrato

    for (const species of POKEDEX) {
      for (const type of species.types) {
        expect(isKnownType(type), `${species.name} usa tipo desconhecido: ${type}`).toBe(true);
      }
    }
    for (const move of Object.values(ALL_MOVES)) {
      expect(isKnownType(move.type), `golpe ${move.name} usa tipo desconhecido`).toBe(true);
    }
  });

  it("todo golpe citado num learnset é um objeto real do catálogo", () => {
    const catalogo = new Set(Object.values(ALL_MOVES));

    for (const species of POKEDEX) {
      for (const entry of species.learnset) {
        expect(catalogo.has(entry.move), `${species.name} cita golpe inexistente`).toBe(true);
      }
    }
  });

  it("status-base e catchRate em faixas plausíveis", () => {
    for (const species of POKEDEX) {
      expect(species.baseHp).toBeGreaterThan(0);
      expect(species.baseAtk + species.baseDef + species.baseSpAtk + species.baseSpDef + species.baseSpd)
        .toBeGreaterThan(100);
      expect(species.catchRate).toBeGreaterThanOrEqual(3);
      expect(species.catchRate).toBeLessThanOrEqual(255);
    }
  });
});

describe("linhas evolutivas de Kanto", () => {
  it("as linhas clássicas estão inteiras e nos níveis canônicos", () => {
    const casos: Array<[number, number, number]> = [
      // [de, nível, para]
      [10, 7, 11], [11, 10, 12],
      [13, 7, 14], [14, 10, 15],
      [16, 18, 17], [17, 36, 18],
      [19, 20, 20],
      [21, 20, 22],
      [23, 22, 24],
      [27, 22, 28],
      [29, 16, 30], [32, 16, 33],
      [41, 22, 42],
      [43, 21, 44],
      [46, 24, 47],
      [48, 31, 49],
      [50, 26, 51],
      [52, 28, 53],
      [54, 33, 55],
      [56, 28, 57],
      [60, 25, 61],
      [63, 16, 64],
      [66, 28, 67],
      [69, 21, 70],
      [72, 30, 73],
      [74, 25, 75],
      [77, 40, 78],
      [79, 37, 80],
      [81, 30, 82],
      [84, 31, 85],
      [86, 34, 87],
      [88, 38, 89],
      [92, 25, 93],
      [96, 26, 97],
      [98, 28, 99],
      [100, 30, 101],
      [104, 28, 105],
      [109, 35, 110],
      [111, 42, 112],
      [116, 32, 117],
      [118, 33, 119],
      [129, 20, 130],
      [147, 30, 148],
    ];

    for (const [from, level, to] of casos) {
      const species = getPokemonSpecies(from);
      const rule = species.evolvesTo?.find((e) => e.trigger === "level");
      expect(
        rule,
        `${species.name} deveria evoluir para #${to} por nível`
      ).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("pedra/troca provisionais: Pikachu, Onix e os demais viram nível", () => {
    const provisorios: Array<[number, number, number]> = [
      [25, 30, 26], // Pikachu → Raichu (pedra Trovão)
      [30, 30, 31], // Nidorina → Nidoqueen (pedra Lua)
      [33, 30, 34], // Nidorino → Nidoking (pedra Lua)
      [35, 30, 36], // Clefairy → Clefable (pedra Lua)
      [37, 30, 38], // Vulpix → Ninetales (pedra Fogo)
      [39, 30, 40], // Jigglypuff → Wigglytuff (pedra Lua)
      [44, 30, 45], // Gloom → Vileplume (pedra Folha)
      [58, 30, 59], // Growlithe → Arcanine (pedra Fogo)
      [61, 30, 62], // Poliwhirl → Poliwrath (pedra Água)
      [64, 36, 65], // Kadabra → Alakazam (troca)
      [67, 40, 68], // Machoke → Machamp (troca)
      [70, 30, 71], // Weepinbell → Victreebel (pedra Folha)
      [75, 40, 76], // Graveler → Golem (troca)
      [90, 30, 91], // Shellder → Cloyster (pedra Água)
      [93, 40, 94], // Haunter → Gengar (troca)
      [95, 36, 208], // Onix → Steelix (troca + Casaco de Metal)
      [102, 30, 103], // Exeggcute → Exeggutor (pedra Folha)
    ];

    for (const [from, level, to] of provisorios) {
      const species = getPokemonSpecies(from);
      const rule = species.evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `${species.name} deveria ter gatilho provisório`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("eeveelutions de Kanto existem como espécie, sem gatilho da Eevee", () => {
    // A escolha entre três destinos exige mecânica de pedras/escolha que
    // ainda não existe; a Eevee segue para Umbreon (6.3). As três existem no
    // catálogo para a estética futura — e o teste trava a decisão.
    for (const id of [134, 135, 136]) {
      expect(() => getPokemonSpecies(id)).not.toThrow();
      expect(getPokemonSpecies(id).evolvesTo).toBeUndefined();
    }

    const eevee = getPokemonSpecies(133);
    expect(eevee.evolvesTo).toEqual([{ speciesId: 197, trigger: "level", level: 30 }]);
  });

  it("lendários de Kanto não evoluem", () => {
    for (const id of [144, 145, 146, 150, 151]) {
      expect(getPokemonSpecies(id).evolvesTo).toBeUndefined();
    }
  });
});

describe("sanidade do módulo gen1Rest", () => {
  it("duas chamadas produzem catálogos equivalentes e sem mutação de ALL_MOVES", () => {
    const a = gen1Rest(ALL_MOVES);
    const b = gen1Rest(ALL_MOVES);

    expect(a).toHaveLength(b.length);
    expect(a[0].id).toBe(b[0].id);
    expect(a[0].learnset[0].move).toBe(b[0].learnset[0].move);
    // As espécies novas entram em ordem de id.
    for (let i = 1; i < a.length; i++) {
      expect(a[i].id).toBeGreaterThan(a[i - 1].id);
    }
  });
});
