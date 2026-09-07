import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getPokemonSpecies, POKEDEX } from "./pokedex";
import {
  bandFor,
  GYM_ACE_MIN_MAP,
  LEGENDARY_MIN_MAP,
  MAP1_PINNED,
  WORLD_LEGENDARIES,
  WORLD_MAP_COUNT,
  WORLD_MAP_LAYOUT,
  type WorldEncounterRow,
} from "./world-layout";
import { WORLD_ENCOUNTERS } from "./world-encounters";
import { distributeWorld, validateDistribution } from "./world-distribute";

/**
 * Guarda do gerador de distribuição (Fase 7.1 — Etapa B).
 *
 * `src/lib/world-encounters.ts` é artefato **gerado**; este arquivo garante que
 * ele é exatamente a saída determinística de `world-distribute.ts` contra o
 * `world-layout.ts` e o catálogo atuais. É o que impede os dois modos de
 * azedar a Etapa B:
 *
 * 1. editar o JSON/TS gerado à mão (o `world:seed` seguinte apaga e ninguém
 *    percebe);
 * 2. mexer no layout/na Pokédex e esquecer de regerar (o banco e o
 *    `content/world/` passariam a contar outra história).
 *
 * Rode `npm run world:distribute -- --write` e depois `world:seed` +
 * `world:export`. Os testes de contrato do *mundo* (mapa 1, pesos, evolução,
 * portais) vivem em `world-expansion.test.ts` e leem os JSONs versionados.
 */

const GENERATED = fileURLToPath(new URL("./world-encounters.ts", import.meta.url));

/** `[id, peso, nv mín, nv máx, água]` por mapa, como o arquivo commitado. */
function committedTable(): Record<number, WorldEncounterRow[]> {
  const src = readFileSync(GENERATED, "utf8");
  const out: Record<number, WorldEncounterRow[]> = {};
  for (const line of src.split("\n")) {
    const m = /^\s{2}(\d+): \[(.*)\],$/.exec(line);
    if (!m) continue;
    const rows = m[2]!
      .split("], [")
      .map((cell) => cell.replace(/^\[/, "").replace(/\]$/, ""))
      .map((cell) => cell.split(",").map((v) => Number(v.trim())) as unknown as WorldEncounterRow);
    out[Number(m[1])] = rows;
  }
  return out;
}

describe("gerador de distribuição (world-distribute)", () => {
  const fresh = distributeWorld();

  it("é determinístico: duas execuções produzem a mesma tabela", () => {
    expect(distributeWorld().rows).toEqual(fresh.rows);
  });

  it("o arquivo commitado é exatamente a saída do gerador (sem edição à mão)", () => {
    const committed = committedTable();
    expect(Object.keys(committed).length).toBe(WORLD_MAP_COUNT - 1);
    for (let n = 2; n <= WORLD_MAP_COUNT; n++) {
      expect(committed[n], `mapa ${n} ausente em world-encounters.ts`).toEqual(fresh.rows[n]);
    }
    // O parser acima não pode ter engolido linha nenhuma: se o formato do
    // arquivo gerado mudar sem atualizar este teste, ele leria menos linhas do
    // que o gerador produz e a comparação de cima passaria por fora.
    expect(Object.values(committed).flat().length).toBe(Object.values(fresh.rows).flat().length);
  });

  it("cobre as 649 espécies: 5 pinadas no mapa 1 + 644 geradas, cada uma em um mapa", () => {
    const geradas = Object.values(fresh.rows).flat();
    expect(POKEDEX.length).toBe(649);
    expect(MAP1_PINNED.length).toBe(5);
    expect(geradas.length).toBe(POKEDEX.length - MAP1_PINNED.length);
    const ids = new Set(geradas.map((r) => r[0]));
    expect(ids.size).toBe(geradas.length);
    for (const id of MAP1_PINNED) expect(ids.has(id), `#${id} pinada e redistribuída`).toBe(false);
    for (const species of POKEDEX) expect(ids.has(species.id) || MAP1_PINNED.includes(species.id)).toBe(true);
  });

  it("todo mapa fecha 100 de peso, tem elenco parecido e nenhuma entrada sobrando", () => {
    for (const layout of WORLD_MAP_LAYOUT) {
      const n = layout.order;
      if (n === 1) continue;
      const rows = fresh.rows[n]!;
      expect(rows.length, `mapa ${n} ficou com ${rows.length} espécies`).toBeGreaterThanOrEqual(14);
      expect(rows.length).toBeLessThanOrEqual(20);
      expect(rows.reduce((acc, r) => acc + r[1], 0), `mapa ${n}: pesos não somam 100`).toBe(100);
      for (const [id, weight, minLevel, maxLevel, water] of rows) {
        const [lo, hi] = bandFor(n);
        expect(weight, `#${id} com peso ${weight}`).toBeGreaterThanOrEqual(2);
        expect(weight).toBeLessThanOrEqual(30);
        expect(minLevel).toBeGreaterThanOrEqual(lo);
        expect(maxLevel).toBeLessThanOrEqual(hi);
        expect(minLevel).toBeLessThanOrEqual(maxLevel);
        // `water` só faz sentido onde existe água na grade do mapa.
        if (water === 1) expect((layout.waterRects?.length ?? 0) > 0, `#${id} aquática sem água no mapa ${n}`).toBe(true);
      }
    }
  });

  it("lendários: nunca antes do mapa 10, peso pequeno e alvo nas janelas de geração", () => {
    const lendarios = Object.values(fresh.rows).flat().filter((r) => WORLD_LEGENDARIES.has(r[0]));
    expect(lendarios.length).toBe(WORLD_LEGENDARIES.size);
    for (const [id, weight, , , ] of lendarios) {
      expect(weight, `#${id} com peso ${weight}`).toBeLessThanOrEqual(10);
      const at = fresh.assignments.get(id)!.map;
      expect(at, `#${id} no mapa ${at}`).toBeGreaterThanOrEqual(LEGENDARY_MIN_MAP);
    }
  });

  it("a escada de evolução sobe com a jornada (sem forma final no começo)", () => {
    for (const a of fresh.assignments.values()) {
      if (a.stage >= 1) expect(a.map, `${a.pokedexId} evoluído cedo demais (M${a.map})`).toBeGreaterThanOrEqual(8);
      if (a.stage >= 2) expect(a.map, `${a.pokedexId} forma final cedo demais (M${a.map})`).toBeGreaterThanOrEqual(12);
    }
    for (const [idStr, min] of Object.entries(GYM_ACE_MIN_MAP)) {
      const at = fresh.assignments.get(Number(idStr));
      expect(at?.map, `#${idStr} fora da distribuição`).toBeGreaterThanOrEqual(min);
    }
  });

  it("o autoauditor do gerador não reclama de nada", () => {
    expect(validateDistribution(fresh)).toEqual([]);
  });

  it("coerência de bioma não regride abaixo do mundo desenhado à mão (6.4-A)", () => {
    // 72% era o número do mundo de 254 espécies curado à mão; com 644 espécies
    // e cotas iguais por mapa o teto é mais baixo, mas nunca pode cair daqui —
    // se cair, alguém trocou um tema do layout sem regerar/repensar o elenco.
    expect(fresh.themeMatchPct).toBeGreaterThanOrEqual(70);
    expect(fresh.anyTypeMatchPct).toBeGreaterThanOrEqual(fresh.themeMatchPct);
    // ...e o piso de nível da evolução vale: quem evolui por nível nunca aparece
    // abaixo do nível em que evolui.
    for (const [id, a] of fresh.assignments) {
      const pais = POKEDEX.filter((s) => (s.evolvesTo ?? []).some((e) => e.speciesId === id));
      const porNivel = pais
        .flatMap((p) => p.evolvesTo ?? [])
        .filter((e) => e.speciesId === id && e.trigger === "level" && e.level !== undefined)
        .map((e) => e.level!);
      if (porNivel.length === 0) continue;
      const necessario = Math.min(...porNivel) + 1;
      const [lo, hi] = bandFor(a.map);
      const piso = Math.min(Math.max(lo, necessario), Math.max(lo, hi - 1));
      expect(a.minLevel, `${getPokemonSpecies(id).name} achado no nv ${a.minLevel}, evolui no ${necessario - 1}`).toBeGreaterThanOrEqual(
        piso
      );
    }
  });
});
