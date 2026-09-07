import { describe, expect, it } from "vitest";
import { POKEDEX, getPokemonSpecies, ALL_MOVES, movesAtLevel } from "./pokedex";
import { unovaRest } from "./pokedex-unova";
import { EVOLUTION_ITEM_IDS } from "./evolution-items";
import { isKnownType } from "./engine/types";

/**
 * Guardas do catálogo Unova (Fase 6.4-E, 2026-09-07).
 *
 * 156 espécies (494–649), região fechada (nenhuma evolução de espécie antiga).
 * Só catálogo, sem redistribuir no mundo. Itens de evolução reutilizam pedras
 * existentes (nenhuma migration). Troca e felicidade viram nível (proxies
 * documentados no módulo). Sprites: black-white/animated cobre até 649 — é o
 * teto do CDN atual.
 */

const UNOVA_IDS = Array.from({ length: 156 }, (_, i) => 494 + i);

describe("catálogo Unova (6.4-E)", () => {
  const unova = unovaRest(ALL_MOVES);

  it("adiciona 156 espécies novas, em ordem de id (494–649)", () => {
    expect(unova).toHaveLength(156);
    expect(unova.map((s) => s.id)).toEqual(UNOVA_IDS);
  });

  it("as 156 espécies de Unova estão todas na Pokédex final (649)", () => {
    for (let id = 494; id <= 649; id++) {
      expect(() => getPokemonSpecies(id), `#${id} ausente`).not.toThrow();
    }
    expect(POKEDEX).toHaveLength(649);
  });

  it("tipos, status-base e catchRate plausíveis (coluna certa do CSV)", () => {
    for (const s of unova) {
      for (const t of s.types) {
        expect(isKnownType(t), `${s.name}: tipo ${t} desconhecido`).toBe(true);
      }
      expect(s.baseHp).toBeGreaterThan(0);
      expect(s.catchRate).toBeGreaterThanOrEqual(3);
      expect(s.catchRate).toBeLessThanOrEqual(255);
    }
    // Amostras canônicas
    expect(getPokemonSpecies(495).catchRate).toBe(45); // Snivy
    expect(getPokemonSpecies(494).catchRate).toBe(3); // Victini
    expect(getPokemonSpecies(504).catchRate).toBe(255); // Patrat
    expect(getPokemonSpecies(638).types).toEqual(["Steel", "Fighting"]); // Cobalion
    expect(getPokemonSpecies(643).types).toEqual(["Dragon", "Fire"]); // Reshiram
    expect(getPokemonSpecies(644).types).toEqual(["Dragon", "Electric"]); // Zekrom
  });

  it("sprites seguem o CDN Gen V animado (teto 649)", () => {
    const base =
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
    for (const s of unova) {
      expect(s.id).toBeLessThanOrEqual(649);
      expect(s.frontSprite).toBe(`${base}/${s.id}.gif`);
      expect(s.backSprite).toBe(`${base}/back/${s.id}.gif`);
      expect(s.shinyFrontSprite).toBe(`${base}/shiny/${s.id}.gif`);
    }
  });

  it("todo golpe do learnset é objeto real do catálogo, e há STAB primário forte", () => {
    const catalogo = new Set(Object.values(ALL_MOVES));
    for (const s of unova) {
      expect(s.learnset.length).toBeGreaterThan(0);
      for (const e of s.learnset) expect(catalogo.has(e.move)).toBe(true);

      if (s.evolvesTo?.length) continue;
      const last4 = movesAtLevel(s, 100);
      expect(
        last4.some((m) => m.type === s.types[0] && m.power >= 70),
        `${s.name} termina sem golpe primário forte`
      ).toBe(true);
    }
  });

  it("curva 6.2-C: nada acima de poder 50 até o nível 7", () => {
    for (const s of unova) {
      for (const e of s.learnset) {
        if (e.level > 7) continue;
        expect(e.move.power, `${s.name} lvl ${e.level}: ${e.move.name}`).toBeLessThanOrEqual(50);
      }
    }
  });

  it("duas chamadas de unovaRest produzem o mesmo catálogo, sem mutar ALL_MOVES", () => {
    const a = unovaRest(ALL_MOVES);
    const b = unovaRest(ALL_MOVES);
    expect(a).toHaveLength(b.length);
    expect(a[0].learnset[0].move).toBe(b[0].learnset[0].move);
    for (let i = 1; i < a.length; i++) expect(a[i].id).toBeGreaterThan(a[i - 1].id);
  });
});

describe("linhas evolutivas de Unova (6.4-E)", () => {
  it("os três iniciais evoluem nos níveis canônicos 17/36", () => {
    const casos: Array<[number, number, number]> = [
      [495, 17, 496], [496, 36, 497], // Snivy
      [498, 17, 499], [499, 36, 500], // Tepig
      [501, 17, 502], [502, 36, 503], // Oshawott
    ];
    for (const [from, level, to] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `#${from} sem gatilho de nível`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("pedras de Unova reutilizam itens existentes (nenhuma migration)", () => {
    const casos: Array<[number, number, number]> = [
      [511, 512, EVOLUTION_ITEM_IDS.leafStone], // Pansage → Simisage
      [513, 514, EVOLUTION_ITEM_IDS.fireStone], // Pansear → Simisear
      [515, 516, EVOLUTION_ITEM_IDS.waterStone], // Panpour → Simipour
      [517, 518, EVOLUTION_ITEM_IDS.moonStone], // Munna → Musharna
      [546, 547, EVOLUTION_ITEM_IDS.sunStone], // Cottonee → Whimsicott
      [548, 549, EVOLUTION_ITEM_IDS.sunStone], // Petilil → Lilligant
      [572, 573, EVOLUTION_ITEM_IDS.shinyStone], // Minccino → Cinccino
      [603, 604, EVOLUTION_ITEM_IDS.thunderStone], // Eelektrik → Eelektross
      [608, 609, EVOLUTION_ITEM_IDS.duskStone], // Lampent → Chandelure
    ];
    for (const [from, to, itemId] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find(
        (e) => e.trigger === "item" && e.itemId === itemId && e.speciesId === to
      );
      expect(rule, `#${from} sem gatilho de item #${itemId} para #${to}`).toBeDefined();
    }
  });

  it("troca → nível e felicidade → nível (proxies documentados no módulo)", () => {
    const casos: Array<[number, number, number]> = [
      [525, 40, 526], // Boldore → Gigalith (troca)
      [533, 40, 534], // Gurdurr → Conkeldurr (troca)
      [588, 36, 589], // Karrablast → Escavalier (troca mútua)
      [616, 36, 617], // Shelmet → Accelgor (troca mútua)
      [527, 25, 528], // Woobat → Swoobat (felicidade)
      [541, 32, 542], // Swadloon → Leavanny (felicidade)
    ];
    for (const [from, level, to] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `#${from} sem proxy de nível`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("linhas de nível preservam cadeia crescente (ex: Sewaddle 20 → Swadloon 32 → Leavanny)", () => {
    expect(getPokemonSpecies(540).evolvesTo?.[0].level).toBe(20);
    expect(getPokemonSpecies(541).evolvesTo?.[0].level).toBe(32);
    expect(getPokemonSpecies(540).evolvesTo?.[0].level).toBeLessThan(
      getPokemonSpecies(541).evolvesTo?.[0].level!
    );
  });

  it("lendários, míticos e formas únicas de Unova não evoluem", () => {
    for (const id of [
      494, 531, 538, 539, 550, 556, 561, 587, 594, 615, 618, 621, 626, 631, 632,
      638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
    ]) {
      expect(getPokemonSpecies(id).evolvesTo, `#${id} não deveria evoluir`).toBeUndefined();
    }
  });

  it("nenhum gatilho de item aponta para id fora do catálogo de itens", () => {
    const validos = new Set(Object.values(EVOLUTION_ITEM_IDS) as number[]);
    for (const s of unovaRest(ALL_MOVES)) {
      for (const e of s.evolvesTo ?? []) {
        if (e.trigger !== "item") continue;
        expect(validos.has(e.itemId!), `${s.name}: itemId ${e.itemId} desconhecido`).toBe(true);
      }
    }
  });
});
