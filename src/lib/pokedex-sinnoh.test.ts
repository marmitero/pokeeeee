import { describe, expect, it } from "vitest";
import { POKEDEX, getPokemonSpecies, ALL_MOVES, movesAtLevel } from "./pokedex";
import { sinnohRest } from "./pokedex-sinnoh";
import {
  EVOLUTION_ITEM_EMOJI,
  EVOLUTION_ITEM_IDS,
  EVOLUTION_ITEM_LABEL,
  EVOLUTION_ITEM_VALUES,
  evolutionItemId,
  evolutionItemKey,
} from "./evolution-items";
import { isKnownType } from "./engine/types";

/**
 * Guardas do catálogo Sinnoh (Fase 6.4-D, 2026-09-06).
 *
 * Mesmo contrato da 6.4-C (só catálogo, sem redistribuir no mundo), com uma
 * diferença: Sinnoh traz 7 itens de evolução que não existiam (Protetor,
 * Eletrizador, Magmatizador, Garra Afiada, Presa Afiada, Disco Dúbio, Manto
 * do Ceifador) — colunas novas em `users` (migration 0008) e itens na loja 3.
 * Estes testes travam: as 106 espécies novas, as 21 evoluções cruzadas de
 * gerações anteriores para Sinnoh, os proxies documentados e a integridade
 * do mapa de itens.
 */

/** 387–493, exceto Lucario (448), que já existia. */
const SINNOH_NOVAS = Array.from({ length: 107 }, (_, i) => 387 + i).filter((id) => id !== 448);

const SINNOH_ITEMS = [
  "protector",
  "electirizer",
  "magmarizer",
  "razorClaw",
  "razorFang",
  "dubiousDisc",
  "reaperCloth",
] as const;

describe("catálogo Sinnoh (6.4-D)", () => {
  const sinnoh = sinnohRest(ALL_MOVES);

  it("adiciona 106 espécies novas, em ordem de id e sem repetir Lucario", () => {
    expect(sinnoh).toHaveLength(106);
    expect(sinnoh.map((s) => s.id)).toEqual(SINNOH_NOVAS);
  });

  it("as 107 espécies de Sinnoh estão todas na Pokédex final (≥493)", () => {
    for (let id = 387; id <= 493; id++) {
      expect(() => getPokemonSpecies(id), `#${id} ausente`).not.toThrow();
    }
    expect(POKEDEX.length).toBeGreaterThanOrEqual(493);
  });

  it("tipos, status-base e catchRate são plausíveis (e a coluna certa do CSV)", () => {
    for (const s of sinnoh) {
      for (const t of s.types) {
        expect(isKnownType(t), `${s.name}: tipo ${t} desconhecido`).toBe(true);
      }
      expect(s.baseHp).toBeGreaterThan(0);
      expect(s.catchRate).toBeGreaterThanOrEqual(3);
      expect(s.catchRate).toBeLessThanOrEqual(255);
    }
    // Amostras canônicas — a 6.4-C nasceu com catchRate=1 em todo mundo por
    // ler a coluna errada; isto impede a regressão.
    expect(getPokemonSpecies(396).catchRate).toBe(255); // Starly
    expect(getPokemonSpecies(443).catchRate).toBe(45); // Gible
    expect(getPokemonSpecies(483).catchRate).toBe(3); // Dialga
    expect(getPokemonSpecies(445).types).toEqual(["Dragon", "Ground"]); // Garchomp
    expect(getPokemonSpecies(395).types).toEqual(["Water", "Steel"]); // Empoleon
  });

  it("sprites seguem o CDN Gen V animado (existe até o id 649)", () => {
    const base =
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
    for (const s of sinnoh) {
      expect(s.id).toBeLessThanOrEqual(649);
      expect(s.frontSprite).toBe(`${base}/${s.id}.gif`);
      expect(s.backSprite).toBe(`${base}/back/${s.id}.gif`);
      expect(s.shinyFrontSprite).toBe(`${base}/shiny/${s.id}.gif`);
    }
  });

  it("todo golpe do learnset é um objeto real do catálogo, e há STAB primário forte", () => {
    const catalogo = new Set(Object.values(ALL_MOVES));
    for (const s of sinnoh) {
      expect(s.learnset.length).toBeGreaterThan(0);
      for (const e of s.learnset) expect(catalogo.has(e.move)).toBe(true);

      if (s.evolvesTo?.length) continue; // formas intermediárias podem ser fracas
      const last4 = movesAtLevel(s, 100);
      expect(
        last4.some((m) => m.type === s.types[0] && m.power >= 70),
        `${s.name} termina sem golpe primário forte`
      ).toBe(true);
    }
  });

  it("curva 6.2-C: nada acima de poder 50 até o nível 7", () => {
    for (const s of sinnoh) {
      for (const e of s.learnset) {
        if (e.level > 7) continue;
        expect(e.move.power, `${s.name} lvl ${e.level}: ${e.move.name}`).toBeLessThanOrEqual(50);
      }
    }
  });

  it("duas chamadas de sinnohRest produzem o mesmo catálogo, sem mutar ALL_MOVES", () => {
    const a = sinnohRest(ALL_MOVES);
    const b = sinnohRest(ALL_MOVES);
    expect(a).toHaveLength(b.length);
    expect(a[0].learnset[0].move).toBe(b[0].learnset[0].move);
    for (let i = 1; i < a.length; i++) expect(a[i].id).toBeGreaterThan(a[i - 1].id);
  });
});

describe("linhas evolutivas de Sinnoh (6.4-D)", () => {
  it("os três iniciais evoluem nos níveis canônicos (18/32, 14/36, 16/36)", () => {
    const casos: Array<[number, number, number]> = [
      [387, 18, 388], [388, 32, 389], // Turtwig
      [390, 14, 391], [391, 36, 392], // Chimchar
      [393, 16, 394], [394, 36, 395], // Piplup
      [443, 24, 444], [444, 48, 445], // Gible → Garchomp
      [403, 15, 404], [404, 30, 405], // Shinx → Luxray
    ];
    for (const [from, level, to] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `#${from} sem gatilho de nível`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("os 7 itens novos evoluem exatamente as linhas que exigiam troca com item", () => {
    const casos: Array<[number, number, (typeof SINNOH_ITEMS)[number]]> = [
      [112, 464, "protector"], // Rhydon → Rhyperior
      [125, 466, "electirizer"], // Electabuzz → Electivire
      [126, 467, "magmarizer"], // Magmar → Magmortar
      [215, 461, "razorClaw"], // Sneasel → Weavile
      [207, 472, "razorFang"], // Gligar → Gliscor
      [233, 474, "dubiousDisc"], // Porygon2 → Porygon-Z
      [356, 477, "reaperCloth"], // Dusclops → Dusknoir
    ];
    for (const [from, to, key] of casos) {
      const itemId = EVOLUTION_ITEM_IDS[key];
      const rule = getPokemonSpecies(from).evolvesTo?.find(
        (e) => e.trigger === "item" && e.itemId === itemId
      );
      expect(rule, `#${from} sem gatilho ${key}`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      // Cada item novo evolui UMA linha — nenhum é genérico.
      const donos = POKEDEX.filter((s) =>
        (s.evolvesTo ?? []).some((e) => e.trigger === "item" && e.itemId === itemId)
      );
      expect(donos.map((s) => s.id), `${key} deveria ter um único dono`).toEqual([from]);
    }
  });

  it("linhas antigas que ganham evolução por pedra já existente", () => {
    const casos: Array<[number, number, number]> = [
      [315, 407, EVOLUTION_ITEM_IDS.shinyStone], // Roselia → Roserade
      [176, 468, EVOLUTION_ITEM_IDS.shinyStone], // Togetic → Togekiss
      [198, 430, EVOLUTION_ITEM_IDS.duskStone], // Murkrow → Honchkrow
      [200, 429, EVOLUTION_ITEM_IDS.duskStone], // Misdreavus → Mismagius
      [82, 462, EVOLUTION_ITEM_IDS.thunderStone], // Magneton → Magnezone (proxy do campo magnético)
      [299, 476, EVOLUTION_ITEM_IDS.thunderStone], // Nosepass → Probopass (idem)
      [281, 475, EVOLUTION_ITEM_IDS.dawnStone], // Kirlia → Gallade
      [361, 478, EVOLUTION_ITEM_IDS.dawnStone], // Snorunt → Froslass
      [133, 470, EVOLUTION_ITEM_IDS.leafStone], // Eevee → Leafeon
      [133, 471, EVOLUTION_ITEM_IDS.dawnStone], // Eevee → Glaceon (proxy da Pedra de Gelo)
    ];
    for (const [from, to, itemId] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find(
        (e) => e.trigger === "item" && e.itemId === itemId && e.speciesId === to
      );
      expect(rule, `#${from} sem gatilho de item #${itemId} para #${to}`).toBeDefined();
    }
  });

  it("Kirlia e Snorunt mantêm a evolução por nível E ganham a ramificação por Pedra do Amanhecer", () => {
    for (const [id, porNivel, porPedra] of [
      [281, 282, 475],
      [361, 362, 478],
    ] as const) {
      const rules = getPokemonSpecies(id).evolvesTo ?? [];
      expect(rules.find((e) => e.trigger === "level")?.speciesId).toBe(porNivel);
      expect(rules.find((e) => e.trigger === "item")?.speciesId).toBe(porPedra);
    }
  });

  it("linhas de 'conhecer golpe' viraram nível, sem quebrar a subida da cadeia", () => {
    const casos: Array<[number, number, number]> = [
      [190, 32, 424], // Aipom → Ambipom (Golpe Duplo)
      [108, 33, 463], // Lickitung → Lickilicky (Rolamento)
      [114, 33, 465], // Tangela → Tangrowth (Poder Antigo)
      [193, 33, 469], // Yanma → Yanmega (Poder Antigo)
      [221, 45, 473], // Piloswine → Mamoswine (Poder Antigo; > 33 de Swinub→Piloswine)
      [438, 17, 185], // Bonsly → Sudowoodo (Mímica)
      [439, 18, 122], // Mime Jr. → Mr. Mime (Mímica)
    ];
    for (const [from, level, to] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `#${from} sem gatilho de nível`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
    // Swinub 33 → Piloswine 45 → Mamoswine: a cadeia só sobe.
    expect(getPokemonSpecies(220).evolvesTo?.[0].level).toBeLessThan(45);
  });

  it("bebês de Sinnoh evoluem por nível baixo (proxy de felicidade) para a forma antiga", () => {
    const casos: Array<[number, number, number]> = [
      [406, 16, 315], // Budew → Roselia
      [433, 18, 358], // Chingling → Chimecho
      [440, 20, 113], // Happiny → Chansey
      [446, 30, 143], // Munchlax → Snorlax
      [447, 20, 448], // Riolu → Lucario
      [458, 30, 226], // Mantyke → Mantine
      [427, 22, 428], // Buneary → Lopunny
    ];
    for (const [from, level, to] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `#${from} sem gatilho de nível`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("Burmy só vira Wormadam (Mothim exige gênero); Mothim existe sem evoluir", () => {
    expect(getPokemonSpecies(412).evolvesTo).toEqual([{ speciesId: 413, trigger: "level", level: 20 }]);
    expect(getPokemonSpecies(414).evolvesTo).toBeUndefined();
    expect(getPokemonSpecies(415).evolvesTo).toEqual([{ speciesId: 416, trigger: "level", level: 21 }]);
  });

  it("lendários, míticos e Rotom não evoluem", () => {
    for (const id of [479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493]) {
      expect(getPokemonSpecies(id).evolvesTo, `#${id} não deveria evoluir`).toBeUndefined();
    }
  });
});

describe("itens de evolução de Sinnoh (6.4-D)", () => {
  it("são 21 itens no total (14 da 6.4-B + 7 novos), ids contíguos 1..21", () => {
    expect(EVOLUTION_ITEM_VALUES).toHaveLength(21);
    const ids = Object.values(EVOLUTION_ITEM_IDS).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    for (const key of SINNOH_ITEMS) {
      expect(EVOLUTION_ITEM_IDS[key]).toBeGreaterThanOrEqual(15);
      expect(EVOLUTION_ITEM_IDS[key]).toBeLessThanOrEqual(21);
    }
  });

  it("todo item tem rótulo, emoji e ida-e-volta entre chave e id", () => {
    for (const key of EVOLUTION_ITEM_VALUES) {
      expect(EVOLUTION_ITEM_LABEL[key].length).toBeGreaterThan(0);
      expect(EVOLUTION_ITEM_EMOJI[key].length).toBeGreaterThan(0);
      const id = evolutionItemId(key);
      expect(id).not.toBeNull();
      expect(evolutionItemKey(id!)).toBe(key);
    }
    expect(evolutionItemId("money")).toBeNull();
    expect(evolutionItemKey(99)).toBeNull();
  });

  it("nenhum gatilho de item aponta para um id fora do catálogo de itens", () => {
    const validos = new Set(Object.values(EVOLUTION_ITEM_IDS) as number[]);
    for (const s of POKEDEX) {
      for (const e of s.evolvesTo ?? []) {
        if (e.trigger !== "item") continue;
        expect(validos.has(e.itemId!), `${s.name}: itemId ${e.itemId} desconhecido`).toBe(true);
      }
    }
  });
});
