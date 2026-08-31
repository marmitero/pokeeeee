import { describe, expect, it } from "vitest";

import {
  DEFAULT_ENCOUNTER_RATE,
  encounterChance,
  encounterPoolAt,
  hasEncounterAt,
  isWalkableAt,
  pickWeighted,
  rollEncounterLevel,
  tileAt,
  usesEncounterLayer,
  validateMapLayers,
  type MapRulesSource,
} from "@/lib/map-rules";

/**
 * Fase 6.2-A — regras espaciais do mapa.
 *
 * O que estes testes protegem, em ordem de importância:
 *
 * 1. **mapa legado não muda de comportamento.** As colunas novas nascem
 *    vazias em todo mapa que já existe; se a camada vazia alterasse alguma
 *    resposta, a fase quebraria o jogo em produção no deploy da migration.
 * 2. **a água pode ser liberada** e o matinho pode ser bloqueado — era o
 *    impedimento concreto para encontros aquáticos.
 * 3. **o sorteio é determinístico sob `rng` injetado**, senão não há como
 *    afirmar nada sobre peso.
 */

/** Mapa 4×3 com uma faixa de água no meio e matinho embaixo. */
function baseMap(overrides: Partial<MapRulesSource> = {}): MapRulesSource {
  return {
    width: 4,
    height: 3,
    tileGrid: [
      ["grass", "grass", "sand", "sand"],
      ["water", "water", "water", "water"],
      ["tall_grass", "tall_grass", "grass", "tree"],
    ],
    encounterTable: [],
    ...overrides,
  };
}

/** Grade `height × width` preenchida com um valor só. */
function filled<T>(map: MapRulesSource, value: T): T[][] {
  return Array.from({ length: map.height }, () => Array.from({ length: map.width }, () => value));
}

/** Sorteador que devolve a sequência dada — torna o peso verificável. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe("tileAt", () => {
  it("lê a célula e trata tipo desconhecido como grama", () => {
    const map = baseMap({ tileGrid: [["lava", "grass"]], width: 2, height: 1 });
    expect(tileAt(map, 0, 0)).toBe("grass");
    expect(tileAt(map, 1, 0)).toBe("grass");
  });

  it("devolve null fora da grade", () => {
    expect(tileAt(baseMap(), 99, 0)).toBeNull();
  });
});

describe("isWalkableAt — mapa legado (sem camada)", () => {
  const map = baseMap();

  it("mantém o padrão do tipo de tile", () => {
    expect(isWalkableAt(map, 0, 0)).toBe(true); // grama
    expect(isWalkableAt(map, 0, 1)).toBe(false); // água
    expect(isWalkableAt(map, 3, 2)).toBe(false); // árvore
  });

  it("nunca deixa sair do mapa", () => {
    expect(isWalkableAt(map, -1, 0)).toBe(false);
    expect(isWalkableAt(map, 0, -1)).toBe(false);
    expect(isWalkableAt(map, 4, 0)).toBe(false);
    expect(isWalkableAt(map, 0, 3)).toBe(false);
  });
});

describe("isWalkableAt — com camada de colisão", () => {
  it("libera a água quando o editor marca 'walkable'", () => {
    const collisionGrid = filled<string | null>(baseMap(), null);
    collisionGrid[1][2] = "walkable";
    const map = baseMap({ collisionGrid });

    expect(isWalkableAt(map, 2, 1)).toBe(true); // liberada
    expect(isWalkableAt(map, 1, 1)).toBe(false); // vizinha continua água fechada
  });

  it("bloqueia um tile que o tipo permitiria", () => {
    const collisionGrid = filled<string | null>(baseMap(), null);
    collisionGrid[0][0] = "blocked";
    expect(isWalkableAt(baseMap({ collisionGrid }), 0, 0)).toBe(false);
  });

  it("não deixa o override furar a borda do mapa", () => {
    const map = baseMap({ collisionGrid: filled(baseMap(), "walkable") });
    expect(isWalkableAt(map, 4, 0)).toBe(false);
    expect(isWalkableAt(map, -1, 2)).toBe(false);
  });

  it("ignora célula não coberta pela camada e cai no padrão do tile", () => {
    // Camada truncada (só a 1ª linha): as demais seguem o tipo de tile.
    const map = baseMap({ collisionGrid: [["blocked", null, null, null]] });
    expect(isWalkableAt(map, 0, 0)).toBe(false);
    expect(isWalkableAt(map, 0, 2)).toBe(true); // tall_grass, padrão
  });
});

describe("hasEncounterAt", () => {
  it("no legado só o tipo de tile decide", () => {
    const map = baseMap();
    expect(hasEncounterAt(map, 0, 2)).toBe(true); // tall_grass
    expect(hasEncounterAt(map, 2, 0)).toBe(false); // areia
    expect(usesEncounterLayer(map)).toBe(false);
  });

  it("com a camada pintada, ela é a única fonte da verdade", () => {
    const encounterGrid = filled(baseMap(), false);
    encounterGrid[0][2] = true; // areia vira área de caça
    const map = baseMap({ encounterGrid });

    expect(hasEncounterAt(map, 2, 0)).toBe(true); // areia marcada
    expect(hasEncounterAt(map, 0, 2)).toBe(false); // matinho desmarcado
    expect(usesEncounterLayer(map)).toBe(true);
  });

  it("permite área de caça na água liberada", () => {
    const encounterGrid = filled(baseMap(), false);
    encounterGrid[1][0] = true;
    const collisionGrid = filled<string | null>(baseMap(), null);
    collisionGrid[1][0] = "walkable";
    const map = baseMap({ encounterGrid, collisionGrid });

    expect(isWalkableAt(map, 0, 1)).toBe(true);
    expect(hasEncounterAt(map, 0, 1)).toBe(true);
  });

  it("é falso fora da grade", () => {
    expect(hasEncounterAt(baseMap(), 9, 9)).toBe(false);
  });
});

describe("encounterPoolAt", () => {
  const table = [
    { pokedexId: 1, name: "A", weight: 10, minLevel: 2, maxLevel: 5, tileTypes: ["tall_grass"] },
    { pokedexId: 2, name: "B", weight: 10, minLevel: 2, maxLevel: 5, tileTypes: ["water"] },
  ];

  it("no legado filtra por tileTypes", () => {
    const map = baseMap({ encounterTable: table });
    expect(encounterPoolAt(map, 0, 2).map((e) => e.name)).toEqual(["A"]);
    expect(encounterPoolAt(map, 0, 1).map((e) => e.name)).toEqual(["B"]);
  });

  it("com a camada nova, tileTypes deixa de filtrar (uma área de caça por mapa)", () => {
    const encounterGrid = filled(baseMap(), false);
    encounterGrid[0][2] = true;
    const map = baseMap({ encounterTable: table, encounterGrid });
    expect(encounterPoolAt(map, 2, 0).map((e) => e.name)).toEqual(["A", "B"]);
  });

  it("cai na tabela inteira quando o legado não casa nenhum tileTypes", () => {
    const map = baseMap({ encounterTable: table });
    expect(encounterPoolAt(map, 0, 0)).toHaveLength(2); // grama comum
  });

  it("devolve vazio sem tabela", () => {
    expect(encounterPoolAt(baseMap(), 0, 2)).toEqual([]);
  });
});

describe("pickWeighted", () => {
  const entries = [{ id: "a", weight: 1 }, { id: "b", weight: 3 }];

  it("respeita a proporção dos pesos", () => {
    // total = 4; roll < 1 → "a", roll >= 1 → "b".
    expect(pickWeighted(entries, seq(0))?.id).toBe("a");
    expect(pickWeighted(entries, seq(0.2))?.id).toBe("a"); // 0.8
    expect(pickWeighted(entries, seq(0.3))?.id).toBe("b"); // 1.2
    expect(pickWeighted(entries, seq(0.999))?.id).toBe("b");
  });

  it("sorteia uniformemente quando todo peso é zero", () => {
    const zeroed = [{ id: "a", weight: 0 }, { id: "b", weight: 0 }];
    expect(pickWeighted(zeroed, seq(0))?.id).toBe("a");
    expect(pickWeighted(zeroed, seq(0.9))?.id).toBe("b");
  });

  it("devolve null para lista vazia", () => {
    expect(pickWeighted([], seq(0.5))).toBeNull();
  });
});

describe("rollEncounterLevel", () => {
  it("fica dentro da faixa da espécie", () => {
    const entry = { minLevel: 2, maxLevel: 7 };
    expect(rollEncounterLevel(entry, 100, seq(0))).toBe(2);
    expect(rollEncounterLevel(entry, 100, seq(0.999))).toBe(7);
  });

  it("obedece ao teto global do jogo", () => {
    expect(rollEncounterLevel({ minLevel: 2, maxLevel: 40 }, 5, seq(0.999))).toBe(5);
  });

  it("tolera faixa invertida sem estourar", () => {
    expect(rollEncounterLevel({ minLevel: 9, maxLevel: 3 }, 100, seq(0))).toBe(3);
  });
});

describe("encounterChance", () => {
  it("converte porcentagem em fração e aplica o padrão", () => {
    expect(encounterChance(22)).toBeCloseTo(0.22);
    expect(encounterChance(0)).toBe(0);
    expect(encounterChance(null)).toBeCloseTo(DEFAULT_ENCOUNTER_RATE / 100);
    expect(encounterChance(undefined)).toBeCloseTo(DEFAULT_ENCOUNTER_RATE / 100);
  });

  it("prende valores fora do intervalo", () => {
    expect(encounterChance(-10)).toBe(0);
    expect(encounterChance(999)).toBe(1);
  });
});

describe("validateMapLayers", () => {
  const size = { width: 4, height: 3 };

  it("aceita mapa legado (camadas ausentes)", () => {
    expect(validateMapLayers(size)).toBeNull();
  });

  it("aceita camadas com as dimensões certas", () => {
    expect(
      validateMapLayers({
        ...size,
        collisionGrid: filled(baseMap(), null),
        encounterGrid: filled(baseMap(), false),
      })
    ).toBeNull();
  });

  it("rejeita número errado de linhas", () => {
    const erro = validateMapLayers({ ...size, encounterGrid: [[false, false, false, false]] });
    expect(erro).toContain("altura 3");
  });

  it("rejeita linha com número errado de colunas", () => {
    const grid = filled(baseMap(), false);
    grid[1] = [false, false];
    expect(validateMapLayers({ ...size, encounterGrid: grid })).toContain("linha 1");
  });

  it("rejeita área de caça pintada sem nenhuma espécie", () => {
    const grid = filled(baseMap(), false);
    grid[0][0] = true;
    expect(validateMapLayers({ ...size, encounterGrid: grid, encounterTable: [] })).toContain(
      "nenhuma espécie"
    );
  });

  it("aceita área de caça pintada quando há espécie", () => {
    const grid = filled(baseMap(), false);
    grid[0][0] = true;
    expect(
      validateMapLayers({ ...size, encounterGrid: grid, encounterTable: [{ pokedexId: 1 }] })
    ).toBeNull();
  });
});
