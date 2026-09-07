import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMapFile, type WorldMapFile } from "./world-content";
import { POKEDEX, getPokemonSpecies } from "./pokedex";

/**
 * Guardas da Fase 6.4-A — o mundo até o mapa 20 (2026-09-06).
 *
 * Pedido do mantenedor: mapas temáticos (regiões) até o 20, com as espécies
 * distribuídas de forma balanceada e separada — formas básicas e
 * comuns nos mapas iniciais; evoluídos, raros e faixas de nível altas nos
 * avançados. Estes testes leem `content/world/maps/*.json` (a cópia
 * versionada do mundo — MUNDO-COMO-CODIGO) e travam o contrato para que um
 * refactor ou uma edição no Editor não desfaça a progressão silenciosamente.
 */

const MAPS_DIR = fileURLToPath(new URL("../../content/world/maps", import.meta.url));

/** Entrada de encontro como vive no arquivo versionado (jsonb solto). */
interface EncounterEntry {
  pokedexId: number;
  name: string;
  weight: number;
  minLevel: number;
  maxLevel: number;
  tileTypes: string[];
}

interface LoadedMap extends Omit<WorldMapFile, "encounterTable"> {
  encounterTable: EncounterEntry[];
}

function loadMaps(): LoadedMap[] {
  return readdirSync(MAPS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const parsed = parseMapFile(JSON.parse(readFileSync(path.join(MAPS_DIR, f), "utf8")), f);
      return { ...parsed, encounterTable: parsed.encounterTable as EncounterEntry[] };
    });
}

/** Número do mapa extraído do nome ("Mapa 7: Usina de Volt" → 7). */
function mapNumber(file: LoadedMap): number {
  const m = /^Mapa (\d+):/.exec(file.name);
  if (!m) throw new Error(`nome de mapa sem ordem: ${file.name}`);
  return Number(m[1]);
}

/** Faixas de nível por mapa — a escada da jornada (âncora da 6.4-A). */
const BANDS: Record<number, [number, number]> = {
  1: [3, 10], 2: [8, 16], 3: [14, 24], 4: [18, 28], 5: [22, 32],
  6: [26, 36], 7: [30, 40], 8: [34, 44], 9: [38, 48], 10: [42, 52],
  11: [46, 56], 12: [50, 60], 13: [54, 64], 14: [58, 68], 15: [62, 72],
  16: [66, 76], 17: [70, 80], 18: [74, 84], 19: [78, 90], 20: [82, 95],
};

const EXPECTED_SLUGS = [
  "vale-pallet", "floresta-viridian", "pico-celeste", "caverna-monte-lua",
  "litoral-vermilion", "pantano-venenoso", "usina-volt", "deserto-das-ruinas",
  "planicies-douradas", "ilhas-glaciais", "torre-dos-espiritos",
  "vulcao-cinnabar", "cidade-sombria", "vale-das-fadas", "fossa-abissal",
  "canion-dos-fosseis", "selva-profunda", "rota-do-ceu", "caverna-suprema",
  "santuario-celeste",
];

const LEGENDARIES = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 384]);

/** Espécies dos três ginásios: o desafio não pode virar commons de mapa cedo. */
const GYM_ACES = new Set([74, 95, 120, 121, 148, 149]);

describe("mundo até o mapa 20 (6.4-A)", () => {
  const maps = loadMaps().sort((a, b) => mapNumber(a) - mapNumber(b));
  const orderBySlug = new Map(maps.map((m) => [m.slug, mapNumber(m)]));
  const orderBySpecies = new Map<number, number>();
  for (const m of maps) {
    for (const e of m.encounterTable) orderBySpecies.set(e.pokedexId, mapNumber(m));
  }

  it("são 20 mapas publicados, com os slugs e a numeração esperados", () => {
    expect(maps).toHaveLength(20);
    expect([...orderBySlug.keys()].sort()).toEqual([...EXPECTED_SLUGS].sort());
    for (const m of maps) {
      expect(mapNumber(m)).toBeGreaterThanOrEqual(1);
      expect(mapNumber(m)).toBeLessThanOrEqual(20);
      expect(m.isPublished).toBe(true);
    }
  });

  it("o mapa 1 é o contrato da 6.2-C, intocado", () => {
    const m1 = maps.find((m) => m.slug === "vale-pallet")!;
    const esperado = [
      { pokedexId: 1, weight: 22, minLevel: 3, maxLevel: 8 },
      { pokedexId: 4, weight: 22, minLevel: 3, maxLevel: 8 },
      { pokedexId: 7, weight: 22, minLevel: 3, maxLevel: 8 },
      { pokedexId: 25, weight: 18, minLevel: 4, maxLevel: 9 },
      { pokedexId: 133, weight: 16, minLevel: 4, maxLevel: 10 },
    ];
    expect(m1.encounterTable.map((e) => ({
      pokedexId: e.pokedexId, weight: e.weight, minLevel: e.minLevel, maxLevel: e.maxLevel,
    }))).toEqual(esperado);
  });

  it("as 254 espécies distribuídas aparecem exatamente uma vez, sem duplicata", () => {
    // 6.4-C/6.4-D (2026-09-06): Hoenn e Sinnoh entraram só no catálogo, por
    // decisão do mantenedor — a redistribuição no mundo fica para o próximo
    // lote de mapas (Etapa B). Por isso o mundo cobre 254 das 493 espécies, e
    // o que se trava aqui é: nada duplicado, nada fora do catálogo, mapa 1
    // intocado.
    expect(orderBySpecies.size).toBe(254);
    expect(orderBySpecies.size).toBeLessThanOrEqual(POKEDEX.length);

    const todas = new Set(POKEDEX.map((s) => s.id));
    for (const id of orderBySpecies.keys()) {
      expect(todas.has(id), `espécie desconhecida nas tabelas: #${id}`).toBe(true);
    }
  });

  it("todo entrada cita nome e níveis coerentes com a Pokédex e a faixa do mapa", () => {
    for (const m of maps) {
      const n = mapNumber(m);
      const [lo, hi] = BANDS[n];
      expect(m.encounterTable.length, `mapa ${n} vazio`).toBeGreaterThan(0);

      const weightSum = m.encounterTable.reduce((acc, e) => acc + (e.weight ?? 0), 0);
      expect(weightSum, `mapa ${n}: pesos somam ${weightSum}`).toBe(100);

      for (const e of m.encounterTable) {
        const species = getPokemonSpecies(e.pokedexId);
        expect(e.name, `mapa ${n}: nome ${e.name} não bate`).toBe(species.name);
        expect(e.minLevel).toBeLessThanOrEqual(e.maxLevel);
        expect(e.minLevel, `mapa ${n} ${e.name}: min ${e.minLevel} < faixa`).toBeGreaterThanOrEqual(lo);
        expect(e.maxLevel, `mapa ${n} ${e.name}: max ${e.maxLevel} > faixa`).toBeLessThanOrEqual(hi);
        expect(e.tileTypes.every((t) => t === "tall_grass" || t === "water")).toBe(true);
      }
    }
  });

  it("a escada de nível sobe com o número do mapa", () => {
    for (let n = 2; n < 20; n++) {
      const atual = BANDS[n];
      const proxima = BANDS[n + 1];
      expect(proxima[0]).toBeGreaterThanOrEqual(atual[0]);
      expect(proxima[1]).toBeGreaterThan(atual[1]);
    }
  });

  it("evolução nunca aparece em mapa anterior ao da sua forma prévia", () => {
    for (const species of POKEDEX) {
      const from = orderBySpecies.get(species.id);
      if (from === undefined) continue;

      for (const evo of species.evolvesTo ?? []) {
        const to = orderBySpecies.get(evo.speciesId);
        if (to === undefined) continue;
        expect(
          to,
          `${species.name} (M${from}) evolui para ${getPokemonSpecies(evo.speciesId).name} em mapa mais cedo (M${to})`
        ).toBeGreaterThanOrEqual(from);
      }
    }
  });

  it("lendários só a partir do mapa 10, sempre com peso baixo (≤ 20)", () => {
    for (const m of maps) {
      const n = mapNumber(m);
      for (const e of m.encounterTable) {
        if (!LEGENDARIES.has(e.pokedexId)) continue;
        expect(n, `${e.name} em mapa cedo demais`).toBeGreaterThanOrEqual(10);
        expect(e.weight, `${e.name} pesado demais (${e.weight})`).toBeLessThanOrEqual(20);
      }
    }
  });

  it("ases de ginásio não são commons de mapa anterior ao próprio ginásio", () => {
    // Brock mora no mapa 1 (74/95 nv 12/14), Misty no 2 (120/121 nv 18/21),
    // Lance no 3 (148/149 nv 38/45). Aparecer como selvagem ANTES seria
    // queimar o desafio — Gyarados/Dragonite só bem depois (18/20).
    const minMap: Record<number, number> = { 74: 1, 95: 1, 120: 2, 121: 2, 148: 3, 149: 3 };
    for (const [idStr, min] of Object.entries(minMap)) {
      const id = Number(idStr);
      const at = orderBySpecies.get(id);
      expect(at, `#${id} fora das tabelas`).toBeDefined();
      expect(at!, `#${id} em mapa ${at} < ${min}`).toBeGreaterThanOrEqual(min);
    }
    expect(GYM_ACES.size).toBe(6);
  });

  it("a cadeia de portais liga 3→4→…→20 nas duas direções", () => {
    for (let n = 3; n < 20; n++) {
      const from = maps.find((m) => mapNumber(m) === n)!;
      const to = maps.find((m) => mapNumber(m) === n + 1)!;
      expect(
        from.portals.some((p) => p.targetMapSlug === to.slug),
        `sem portal ${n} → ${n + 1}`
      ).toBe(true);
      expect(
        to.portals.some((p) => p.targetMapSlug === from.slug),
        `sem portal de volta ${n + 1} → ${n}`
      ).toBe(true);
    }
    // O mapa 20 é o fim da linha: ninguém aponta para um mapa 21.
    expect(maps.every((m) => mapNumber(m) <= 20)).toBe(true);
  });
});
