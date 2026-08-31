import { describe, expect, it } from "vitest";

import {
  applyLevelRange,
  blankLayer,
  countMarked,
  countOverrides,
  loadLayer,
  sanitizeLevelRange,
  weightShare,
} from "@/lib/map-layers";

/**
 * Fase 6.2-B — utilidades do editor de camadas.
 *
 * O ponto sensível aqui é `loadLayer`: é ela que decide se o mapa aberto no
 * editor está em **modo legado** (`null`) ou com camada ligada. Errar isso
 * significa ligar a camada sem o admin pedir — e, como a camada ligada é a
 * única fonte da verdade do encontro, isso apagaria silenciosamente todos os
 * spawns do matinho ao salvar.
 */

describe("blankLayer", () => {
  it("cria a grade nas dimensões pedidas", () => {
    const grid = blankLayer(3, 2, false);
    expect(grid).toHaveLength(3);
    expect(grid[0]).toHaveLength(2);
    expect(grid.flat().every((c) => c === false)).toBe(true);
  });

  it("não compartilha a mesma linha entre índices", () => {
    const grid = blankLayer<boolean>(2, 2, false);
    grid[0][0] = true;
    expect(grid[1][0]).toBe(false);
  });
});

describe("loadLayer", () => {
  it("trata ausente e vazio como modo legado", () => {
    expect(loadLayer(undefined, 2, 2, false)).toBeNull();
    expect(loadLayer(null, 2, 2, false)).toBeNull();
    expect(loadLayer([], 2, 2, false)).toBeNull();
  });

  it("carrega a camada existente preservando os valores", () => {
    const grid = loadLayer([[true, false], [false, true]], 2, 2, false);
    expect(grid).toEqual([[true, false], [false, true]]);
  });

  it("reenquadra camada menor que o mapa em vez de quebrar", () => {
    const grid = loadLayer([[true]], 2, 3, false);
    expect(grid).toEqual([
      [true, false, false],
      [false, false, false],
    ]);
  });

  it("descarta o excedente de camada maior que o mapa", () => {
    const grid = loadLayer([[true, true, true], [true, true, true]], 1, 2, false);
    expect(grid).toEqual([[true, true]]);
  });

  it("funciona com o valor vazio da colisão (null)", () => {
    const grid = loadLayer<string | null>([["blocked"]], 1, 2, null);
    expect(grid).toEqual([["blocked", null]]);
  });
});

describe("contadores", () => {
  it("conta células marcadas e camada desligada é zero", () => {
    expect(countMarked([[true, false], [true, true]])).toBe(3);
    expect(countMarked(null)).toBe(0);
  });

  it("conta só as exceções de colisão, não o padrão", () => {
    expect(countOverrides([["blocked", null], [null, "walkable"]])).toBe(2);
    expect(countOverrides([[null, null]])).toBe(0);
    expect(countOverrides(null)).toBe(0);
  });
});

describe("weightShare", () => {
  it("converte peso em chance real", () => {
    const entries = [{ weight: 1 }, { weight: 3 }];
    expect(weightShare(entries, 0)).toBe(25);
    expect(weightShare(entries, 1)).toBe(75);
  });

  it("uma espécie sozinha é 100%, qualquer que seja o peso", () => {
    expect(weightShare([{ weight: 7 }], 0)).toBe(100);
  });

  it("arredonda para uma casa em vez de falsa precisão", () => {
    const entries = [{ weight: 1 }, { weight: 1 }, { weight: 1 }];
    expect(weightShare(entries, 0)).toBe(33.3);
  });

  it("não divide por zero quando todo peso é zero", () => {
    expect(weightShare([{ weight: 0 }, { weight: 0 }], 0)).toBe(0);
  });

  it("ignora peso negativo em vez de gerar chance negativa", () => {
    expect(weightShare([{ weight: -5 }, { weight: 5 }], 1)).toBe(100);
  });
});

describe("sanitizeLevelRange", () => {
  it("mantém faixa válida", () => {
    expect(sanitizeLevelRange(2, 7)).toEqual({ min: 2, max: 7 });
  });

  it("desinverte faixa trocada", () => {
    expect(sanitizeLevelRange(9, 3)).toEqual({ min: 3, max: 9 });
  });

  it("prende nos limites 1 e 100", () => {
    expect(sanitizeLevelRange(0, 250)).toEqual({ min: 1, max: 100 });
    expect(sanitizeLevelRange(-4, -1)).toEqual({ min: 1, max: 1 });
  });

  it("tolera campo vazio virando NaN", () => {
    expect(sanitizeLevelRange(NaN, 5)).toEqual({ min: 1, max: 5 });
  });
});

describe("applyLevelRange", () => {
  const entries = [
    { pokedexId: 1, minLevel: 30, maxLevel: 50 },
    { pokedexId: 4, minLevel: 12, maxLevel: 14 },
  ];

  it("aplica a mesma faixa a todas as espécies", () => {
    expect(applyLevelRange(entries, 2, 7)).toEqual([
      { pokedexId: 1, minLevel: 2, maxLevel: 7 },
      { pokedexId: 4, minLevel: 2, maxLevel: 7 },
    ]);
  });

  it("sanea a faixa antes de aplicar", () => {
    expect(applyLevelRange(entries, 8, 3).every((e) => e.minLevel === 3 && e.maxLevel === 8)).toBe(
      true
    );
  });

  it("não muta a lista original", () => {
    applyLevelRange(entries, 2, 7);
    expect(entries[0].minLevel).toBe(30);
  });
});
