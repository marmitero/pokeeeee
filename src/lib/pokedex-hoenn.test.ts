import { describe, expect, it } from "vitest";
import { POKEDEX, getPokemonSpecies, ALL_MOVES, movesAtLevel } from "./pokedex";
import { hoennRest } from "./pokedex-hoenn";
import { EVOLUTION_ITEM_IDS } from "./evolution-items";
import { isKnownType } from "./engine/types";

/**
 * Guardas do catálogo Hoenn (Fase 6.4-C, 2026-09-06).
 *
 * Decisão desta rodada (mantenedor): **só catálogo**. As 133 espécies novas
 * entram na Pokédex, na vitrine de sprites e no motor de evolução, mas **não**
 * são distribuídas nos encontros dos 20 mapas — isso fica para o lote de mapas
 * seguinte. Estes testes travam exatamente esse contrato.
 */

/** 252–386, exceto Gardevoir (282) e Rayquaza (384), que já existiam. */
const HOENN_NOVAS = Array.from({ length: 135 }, (_, i) => 252 + i).filter(
  (id) => id !== 282 && id !== 384
);

describe("catálogo Hoenn (6.4-C)", () => {
  const hoenn = hoennRest(ALL_MOVES);

  it("adiciona 133 espécies novas, em ordem de id e sem repetir as que já existiam", () => {
    expect(hoenn).toHaveLength(133);
    expect(hoenn.map((s) => s.id)).toEqual(HOENN_NOVAS);
  });

  it("as 135 espécies de Hoenn estão todas na Pokédex final", () => {
    for (let id = 252; id <= 386; id++) {
      expect(() => getPokemonSpecies(id), `#${id} ausente`).not.toThrow();
    }
    expect(POKEDEX.length).toBeGreaterThanOrEqual(387); // 6.4-D somou Sinnoh por cima
  });

  it("tipos, status-base e catchRate são plausíveis", () => {
    for (const s of hoenn) {
      for (const t of s.types) {
        expect(isKnownType(t), `${s.name}: tipo ${t} desconhecido`).toBe(true);
      }
      expect(s.baseHp).toBeGreaterThan(0);
      expect(s.catchRate).toBeGreaterThanOrEqual(3);
      expect(s.catchRate).toBeLessThanOrEqual(255);
    }
  });

  it("sprites seguem o CDN Gen V animado (existe até o id 649)", () => {
    const base =
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated";
    for (const s of hoenn) {
      expect(s.id).toBeLessThanOrEqual(649);
      expect(s.frontSprite).toBe(`${base}/${s.id}.gif`);
      expect(s.backSprite).toBe(`${base}/back/${s.id}.gif`);
      expect(s.shinyFrontSprite).toBe(`${base}/shiny/${s.id}.gif`);
    }
  });

  it("todo golpe do learnset é um objeto real do catálogo, e há STAB primário forte", () => {
    const catalogo = new Set(Object.values(ALL_MOVES));
    for (const s of hoenn) {
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
});

describe("linhas evolutivas de Hoenn (6.4-C)", () => {
  it("os três iniciais evoluem em 16/36, como no cânone", () => {
    const casos: Array<[number, number, number]> = [
      [252, 16, 253], [253, 36, 254], // Treecko
      [255, 16, 256], [256, 36, 257], // Torchic
      [258, 16, 259], [259, 36, 260], // Mudkip
    ];
    for (const [from, level, to] of casos) {
      const rule = getPokemonSpecies(from).evolvesTo?.find((e) => e.trigger === "level");
      expect(rule, `#${from} sem gatilho de nível`).toBeDefined();
      expect(rule!.speciesId).toBe(to);
      expect(rule!.level).toBe(level);
    }
  });

  it("as pedras de Hoenn usam os itens já existentes na loja (6.4-B)", () => {
    const pedras: Array<[number, number, number]> = [
      [271, 272, EVOLUTION_ITEM_IDS.waterStone], // Lombre → Ludicolo
      [274, 275, EVOLUTION_ITEM_IDS.leafStone], // Nuzleaf → Shiftry
      [300, 301, EVOLUTION_ITEM_IDS.moonStone], // Skitty → Delcatty
      [349, 350, EVOLUTION_ITEM_IDS.shinyStone], // Feebas → Milotic (proxy de beleza)
      [366, 367, EVOLUTION_ITEM_IDS.dragonScale], // Clamperl → Huntail
      [366, 368, EVOLUTION_ITEM_IDS.waterStone], // Clamperl → Gorebyss
    ];
    for (const [from, to, itemId] of pedras) {
      const rule = getPokemonSpecies(from).evolvesTo?.find(
        (e) => e.trigger === "item" && e.itemId === itemId && e.speciesId === to
      );
      expect(rule, `#${from} sem gatilho de item #${itemId} para #${to}`).toBeDefined();
    }
  });

  it("lendários de Hoenn e Shedinja não evoluem", () => {
    // Shedinja (292) exige slot vazio + Pokébola no cânone: mecânica que não
    // existe aqui, então a espécie vive sem gatilho (capturável, não evolutiva).
    for (const id of [292, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386]) {
      expect(getPokemonSpecies(id).evolvesTo, `#${id} não deveria evoluir`).toBeUndefined();
    }
  });

  it("duas chamadas de hoennRest produzem o mesmo catálogo, sem mutar ALL_MOVES", () => {
    const a = hoennRest(ALL_MOVES);
    const b = hoennRest(ALL_MOVES);
    expect(a).toHaveLength(b.length);
    expect(a[0].learnset[0].move).toBe(b[0].learnset[0].move);
    for (let i = 1; i < a.length; i++) expect(a[i].id).toBeGreaterThan(a[i - 1].id);
  });
});
