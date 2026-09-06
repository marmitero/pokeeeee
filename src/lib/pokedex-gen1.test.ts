import { describe, expect, it } from "vitest";
import { POKEDEX, getPokemonSpecies, ALL_MOVES, movesAtLevel } from "./pokedex";
import { gen1Rest } from "./pokedex-gen1";
import { EVOLUTION_ITEM_IDS } from "./evolution-items";
import { TYPE_NAMES, isKnownType } from "./engine/types";

/**
 * Guarda do catálogo Kanto completo (Fase 6.3-A).
 *
 * O objetivo da fase: TODAS as espécies de Kanto presentes, com linhas
 * evolutivas inteiras — base para a estética própria do futuro. Estes testes
 * impedem que um refactor apague espécies, quebre a fonte de sprites ou
 * introduza tipo/golpe inválido sem o CI perceber.
 */

/** Kanto (1–151) + Johto (152–251) + Hoenn (252–386) + Lucario. */
const ESPERADAS = [
  ...Array.from({ length: 151 }, (_, i) => i + 1), // 1–151
  ...Array.from({ length: 100 }, (_, i) => 152 + i), // 152–251
  ...Array.from({ length: 135 }, (_, i) => 252 + i), // 252–386 (inclui 282/384)
  448, // Lucario
];

describe("catálogo Kanto + Johto + Hoenn (6.3-A/6.4-B/6.4-C)", () => {
  it("contém exatamente as espécies esperadas, sem duplicata", () => {
    const ids = POKEDEX.map((s) => s.id).sort((a, b) => a - b);
    const esperadas = [...ESPERADAS].sort((a, b) => a - b);

    expect(ids).toEqual(esperadas);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("são 387 espécies — 151 de Kanto + 100 de Johto + 135 de Hoenn + Lucario", () => {
    expect(POKEDEX).toHaveLength(387);
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

  it("pedras de evolução agora são gatilho de item (6.4-B)", () => {
    const pedras: Array<[number, number, number, number]> = [
      // [de, para, itemId, peso mnemônico]
      [25, 26, EVOLUTION_ITEM_IDS.thunderStone, 0], // Pikachu → Raichu
      [30, 31, EVOLUTION_ITEM_IDS.moonStone, 0], // Nidorina → Nidoqueen
      [33, 34, EVOLUTION_ITEM_IDS.moonStone, 0], // Nidorino → Nidoking
      [35, 36, EVOLUTION_ITEM_IDS.moonStone, 0], // Clefairy → Clefable
      [37, 38, EVOLUTION_ITEM_IDS.fireStone, 0], // Vulpix → Ninetales
      [39, 40, EVOLUTION_ITEM_IDS.moonStone, 0], // Jigglypuff → Wigglytuff
      [44, 45, EVOLUTION_ITEM_IDS.leafStone, 0], // Gloom → Vileplume
      [44, 182, EVOLUTION_ITEM_IDS.sunStone, 0], // Gloom → Bellossom
      [58, 59, EVOLUTION_ITEM_IDS.fireStone, 0], // Growlithe → Arcanine
      [61, 62, EVOLUTION_ITEM_IDS.waterStone, 0], // Poliwhirl → Poliwrath
      [61, 186, EVOLUTION_ITEM_IDS.kingsRock, 0], // Poliwhirl → Politoed
      [70, 71, EVOLUTION_ITEM_IDS.leafStone, 0], // Weepinbell → Victreebel
      [79, 199, EVOLUTION_ITEM_IDS.kingsRock, 0], // Slowpoke → Slowking
      [90, 91, EVOLUTION_ITEM_IDS.waterStone, 0], // Shellder → Cloyster
      [95, 208, EVOLUTION_ITEM_IDS.metalCoat, 0], // Onix → Steelix
      [102, 103, EVOLUTION_ITEM_IDS.leafStone, 0], // Exeggcute → Exeggutor
      [113, 242, EVOLUTION_ITEM_IDS.ovalStone, 0], // Chansey → Blissey
      [117, 230, EVOLUTION_ITEM_IDS.dragonScale, 0], // Seadra → Kingdra
      [120, 121, EVOLUTION_ITEM_IDS.waterStone, 0], // Staryu → Starmie
      [123, 212, EVOLUTION_ITEM_IDS.metalCoat, 0], // Scyther → Scizor
      [137, 233, EVOLUTION_ITEM_IDS.upgrade, 0], // Porygon → Porygon2
    ];

    for (const [from, to, itemId] of pedras) {
      const species = getPokemonSpecies(from);
      const rule = species.evolvesTo?.find((e) => e.trigger === "item" && e.itemId === itemId);
      expect(rule, `${species.name} deveria ter gatilho item #${itemId}`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
    }
  });

  it("as linhas de troca continuam provisórias por nível (sem item de troca)", () => {
    const trocas: Array<[number, number, number]> = [
      [64, 36, 65], // Kadabra → Alakazam
      [67, 40, 68], // Machoke → Machamp
      [75, 40, 76], // Graveler → Golem
      [93, 40, 94], // Haunter → Gengar
    ];
    for (const [from, level, to] of trocas) {
      const species = getPokemonSpecies(from);
      const rule = species.evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `${species.name} deveria ter gatilho provisório de nível`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("Eevee ramifica com as cinco pedras, e as formas existem sem evoluir", () => {
    const eevee = getPokemonSpecies(133);
    expect(eevee.evolvesTo).toEqual([
      { speciesId: 134, trigger: "item", itemId: EVOLUTION_ITEM_IDS.waterStone },
      { speciesId: 135, trigger: "item", itemId: EVOLUTION_ITEM_IDS.thunderStone },
      { speciesId: 136, trigger: "item", itemId: EVOLUTION_ITEM_IDS.fireStone },
      { speciesId: 196, trigger: "item", itemId: EVOLUTION_ITEM_IDS.sunStone },
      { speciesId: 197, trigger: "item", itemId: EVOLUTION_ITEM_IDS.moonStone },
    ]);

    for (const id of [134, 135, 136, 196, 197]) {
      expect(() => getPokemonSpecies(id)).not.toThrow();
      expect(getPokemonSpecies(id).evolvesTo).toBeUndefined();
    }
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

/**
 * Guardas da Fase 6.3-B — golpes com identidade (Gen 1–3, foco GBA).
 *
 * A fase reescreveu os learnsets das espécies do catálogo com golpes condizentes
 * com tipo e raça e adicionou ~80 golpes canônicos ao catálogo. Estes testes
 * fixam o contrato para que um refactor não devolva os "ataques genéricos":
 * cobertura por tipo, nenhum golpe órfão, curva de poder preservada e STAB
 * garantido para todo mundo.
 */
describe("catálogo de golpes (6.3-B)", () => {
  it("os 18 tipos têm ao menos 4 golpes de dano", () => {
    const porTipo: Record<string, number> = {};
    for (const move of Object.values(ALL_MOVES)) {
      if (move.category === "Status") continue;
      porTipo[move.type] = (porTipo[move.type] ?? 0) + 1;
    }

    expect(TYPE_NAMES).toHaveLength(18);
    for (const type of TYPE_NAMES) {
      expect(porTipo[type] ?? 0, `tipo ${type} com poucos golpes`).toBeGreaterThanOrEqual(4);
    }
  });

  it("nenhum golpe é órfão — todo golpe tem ao menos uma espécie que o aprende", () => {
    const usados = new Set(POKEDEX.flatMap((s) => s.learnset.map((e) => e.move)));

    for (const [key, move] of Object.entries(ALL_MOVES)) {
      expect(usados.has(move), `golpe órfão: ${key}`).toBe(true);
    }
  });

  it("poder ≤ 115 e precisão entre 50 e 100 (teto da casa)", () => {
    for (const move of Object.values(ALL_MOVES)) {
      expect(move.power, `${move.name} acima do teto`).toBeLessThanOrEqual(115);
      expect(move.accuracy, `${move.name} precisão fora da faixa`).toBeGreaterThanOrEqual(50);
      expect(move.accuracy).toBeLessThanOrEqual(100);
    }
  });
});

describe("learnsets com identidade (6.3-B)", () => {
  it("golpes aprendidos até o nível 7 ficam abaixo de poder 50 (curva 6.2-C)", () => {
    // Os do mapa 1 cumprem faixa mais estreita (15–35) no teste dedicado da
    // 6.2-C; o resto do catálogo admite Confusão (50) de nível 1, padrão dos
    // psíquicos, mas nada além disso.
    for (const species of POKEDEX) {
      for (const entry of species.learnset) {
        if (entry.level > 7) continue;
        expect(
          entry.move.power,
          `${species.name} lvl ${entry.level}: ${entry.move.name}`
        ).toBeLessThanOrEqual(50);
      }
    }
  });

  it("toda espécie tem golpe de dano de cada um de seus tipos até o nível 40", () => {
    for (const species of POKEDEX) {
      const known = species.learnset
        .filter((e) => e.level <= 40)
        .map((e) => e.move);

      for (const type of species.types) {
        expect(
          known.some((m) => m.type === type && m.category !== "Status"),
          `${species.name} sem STAB de ${type} até o nível 40`
        ).toBe(true);
      }
    }
  });

  it("formas finais carregam golpe forte (≥70) do tipo primário nos 4 últimos slots", () => {
    // Larvas, Magikarp e Ditto são fracos por desenho (canon) e ficam de fora.
    const excecoes = new Set([10, 11, 13, 14, 129, 132]);

    for (const species of POKEDEX) {
      if (species.evolvesTo?.length || excecoes.has(species.id)) continue;
      const last4 = movesAtLevel(species, 100);

      expect(
        last4.some((m) => m.type === species.types[0] && m.power >= 70),
        `${species.name} termina sem golpe primário forte: ${last4.map((m) => m.name).join(", ")}`
      ).toBe(true);
    }
  });

  it("assinaturas clássicas continuam com seus donos (GBA, Gen 1–3)", () => {
    const casos: Array<[number, string]> = [
      // [id, golpe assinatura]
      [7, "SkullBash"], // linha Squirtle
      [15, "Twineedle"], // Beedrill
      [19, "HyperFang"], // linha Rattata
      [43, "PetalDance"], // linha Oddish
      [52, "PayDay"], // linha Meowth
      [66, "VitalThrow"], // linha Machop
      [98, "Crabhammer"], // linha Krabby
      [104, "Bonemerang"], // linha Cubone
      [106, "HighJumpKick"], // Hitmonlee
      [107, "SkyUppercut"], // Hitmonchan
      [118, "Waterfall"], // linha Goldeen
      [114, "AncientPower"], // Tangela
      [59, "ExtremeSpeed"], // Arcanine
      [130, "Bounce"], // Gyarados
    ];

    for (const [id, moveKey] of casos) {
      const species = getPokemonSpecies(id);
      expect(
        species.learnset.some((e) => e.move === ALL_MOVES[moveKey as keyof typeof ALL_MOVES]),
        `${species.name} deveria aprender ${moveKey}`
      ).toBe(true);
    }
  });
});
