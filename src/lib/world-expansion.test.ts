import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMapFile, type WorldMapFile } from "./world-content";
import { POKEDEX, getPokemonSpecies } from "./pokedex";
import { buildDefaultMaps } from "./default-world";
import { encounterPoolAt, hasEncounterAt, pickWeighted, rollEncounterLevel } from "./map-rules";
import {
  bandFor,
  GYM_ACE_MIN_MAP,
  LEGENDARY_MIN_MAP,
  WORLD_BANDS,
  WORLD_LEGENDARIES,
  WORLD_MAP_COUNT,
  WORLD_MAP_LAYOUT,
} from "./world-layout";

/**
 * Guardas do mundo (Fase 6.4-A criou os 20 mapas; Fase 7.1 — Etapa B — levou a
 * 40 e redistribuiu as 649 espécies de Unova).
 *
 * Dois grupos de guardas, de propósito:
 *
 * 1. As que leem `content/world/maps/*.json` — a cópia versionada do mundo
 *    (MUNDO-COMO-CODIGO) é o que o `world:activation` aplica; o contrato tem
 *    de valer nela, não só no código.
 * 2. A que compara os JSONs com `buildDefaultMaps()` — se a semente em código
 *    e o conteúdo versionado divergirem, alguém editou um lado só (e o
 *    `world:seed` calado por cima do trabalho do Editor é o pior bug possível).
 *
 * Contrato travado:
 * - 40 mapas numerados 1–40 sem buraco, todos publicados;
 * - mapa 1 intocado (6.2-C);
 * - as 649 espécies do catálogo em **exatamente um** mapa, pesos somando 100;
 * - evolução nunca antes da forma prévia;
 * - lendários só a partir do mapa 10 com peso ≤ 20;
 * - escada de nível crescente; banda citada na descrição = banda real;
 * - `tileTypes` de cada entrada existem de fato na grade do mapa;
 * - cadeia de portais 1→2→…→40 navegável nos dois sentidos.
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

/** Slugs do mundo, na ordem da jornada — derivados do layout (fonte única). */
const EXPECTED_SLUGS = WORLD_MAP_LAYOUT.map((l) => l.slug);

/** Espécies dos três ginásios: o desafio não pode virar commons de mapa cedo. */
const GYM_ACES = new Set(Object.keys(GYM_ACE_MIN_MAP).map(Number));

describe("mundo até o mapa 40 (7.1 — Etapa B)", () => {
  const maps = loadMaps().sort((a, b) => mapNumber(a) - mapNumber(b));
  const orderBySlug = new Map(maps.map((m) => [m.slug, mapNumber(m)]));
  /** pokedexId → mapa (e quantas vezes apareceu, para a guarda de duplicata). */
  const orderBySpecies = new Map<number, number>();
  const speciesHits = new Map<number, number>();
  for (const m of maps) {
    for (const e of m.encounterTable) {
      orderBySpecies.set(e.pokedexId, mapNumber(m));
      speciesHits.set(e.pokedexId, (speciesHits.get(e.pokedexId) ?? 0) + 1);
    }
  }

  it(`são ${WORLD_MAP_COUNT} mapas publicados, com os slugs e a numeração esperados`, () => {
    expect(maps).toHaveLength(WORLD_MAP_COUNT);
    expect(EXPECTED_SLUGS).toHaveLength(WORLD_MAP_COUNT);
    expect([...orderBySlug.keys()].sort()).toEqual([...EXPECTED_SLUGS].sort());
    for (const m of maps) {
      const n = mapNumber(m);
      expect(n, `${m.slug} fora de 1..${WORLD_MAP_COUNT}`).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(WORLD_MAP_COUNT);
      expect(m.isPublished, `${m.slug} despublicado`).toBe(true);
      expect(m.slug).toBe(EXPECTED_SLUGS[n - 1]);
    }
    // Um arquivo por número, sem buraco nem repetido.
    const numeros = maps.map(mapNumber).sort((a, b) => a - b);
    expect(numeros).toEqual(Array.from({ length: WORLD_MAP_COUNT }, (_, i) => i + 1));
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
    expect(
      m1.encounterTable.map((e) => ({
        pokedexId: e.pokedexId,
        weight: e.weight,
        minLevel: e.minLevel,
        maxLevel: e.maxLevel,
      }))
    ).toEqual(esperado);
    // A faixa travada (3–10) e a grade original também não se mexem.
    expect(WORLD_BANDS[1]).toEqual([3, 10]);
    expect(m1.description).toBe(
      "Lar dos primeiros treinadores. Ginásio do Brock (Pedra) e Loja básica."
    );
    expect(m1.width).toBe(16);
    expect(m1.height).toBe(16);
    expect(m1.gyms.map((g) => g.leaderName)).toEqual(["Brock"]);
  });

  it("as 649 espécies do catálogo aparecem exatamente uma vez cada", () => {
    expect(POKEDEX.length).toBe(649);
    expect(orderBySpecies.size).toBe(POKEDEX.length);
    for (const [id, hits] of speciesHits) {
      expect(hits, `#${id} aparece ${hits}× no mundo`).toBe(1);
    }
    for (const m of maps) {
      for (const e of m.encounterTable) {
        expect(
          POKEDEX.some((s) => s.id === e.pokedexId),
          `espécie desconhecida nas tabelas: #${e.pokedexId}`
        ).toBe(true);
      }
    }
  });

  it("toda entrada cita nome e níveis coerentes com a Pokédex e a faixa do mapa", () => {
    for (const m of maps) {
      const n = mapNumber(m);
      const [lo, hi] = bandFor(n);
      expect(m.encounterTable.length, `mapa ${n} vazio`).toBeGreaterThan(0);
      expect(m.encounterTable.length, `mapa ${n} estoura o limite de 50 entradas`).toBeLessThanOrEqual(50);

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

  it("os tileTypes pedidos existem na grade do mapa (nada pescável só no papel)", () => {
    for (const m of maps) {
      const tiles = new Set((m.tileGrid as unknown as string[][]).flat());
      for (const e of m.encounterTable) {
        for (const t of e.tileTypes) {
          expect(
            tiles.has(t),
            `${m.slug}: ${e.name} quer encontrar em "${t}", que não existe na grade`
          ).toBe(true);
        }
      }
    }
  });

  it("a escada de nível sobe com o número do mapa e a descrição cita a banda real", () => {
    for (let n = 2; n <= WORLD_MAP_COUNT; n++) {
      const atual = bandFor(n - 1);
      const proxima = bandFor(n);
      expect(proxima[0], `mapa ${n}: a base da faixa desceu`).toBeGreaterThanOrEqual(atual[0]);
      expect(proxima[1], `mapa ${n}: o topo da faixa desceu`).toBeGreaterThan(atual[1]);
      expect(proxima[1], `mapa ${n}: acima do nível máximo do jogo`).toBeLessThanOrEqual(100);
      // Sobreposição: sem buraco intransponível entre um mapa e o próximo.
      expect(proxima[0], `mapa ${n}: salto sem sobreposição`).toBeLessThanOrEqual(atual[1] + 4);
    }
    for (const m of maps) {
      const n = mapNumber(m);
      const [lo, hi] = bandFor(n);
      const citada = /\(nv (\d+)–(\d+)\)/.exec(m.description);
      if (n === 1) continue; // descrição verbatim da 6.2-C, sem citação de faixa
      expect(citada, `${m.slug}: descrição sem "(nv A–B)"`).not.toBeNull();
      expect([Number(citada![1]), Number(citada![2])], `${m.slug}: banda na descrição ≠ banda real`).toEqual([lo, hi]);
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
    let vistos = 0;
    for (const m of maps) {
      const n = mapNumber(m);
      for (const e of m.encounterTable) {
        if (!WORLD_LEGENDARIES.has(e.pokedexId)) continue;
        vistos++;
        expect(n, `${e.name} em mapa cedo demais`).toBeGreaterThanOrEqual(LEGENDARY_MIN_MAP);
        expect(e.weight, `${e.name} pesado demais (${e.weight})`).toBeLessThanOrEqual(20);
      }
    }
    // Todo lendário do catálogo tem de morar em algum mapa.
    expect(vistos).toBe(WORLD_LEGENDARIES.size);
  });

  it("ases de ginásio não são commons de mapa anterior ao próprio ginásio", () => {
    // Brock mora no mapa 1 (74/95 nv 12/14), Misty no 2 (120/121 nv 18/21),
    // Lance no 3 (148/149 nv 38/45). Aparecer como selvagem ANTES seria queimar
    // o desafio — Gyarados/Dragonite só bem depois.
    for (const [id, min] of Object.entries(GYM_ACE_MIN_MAP)) {
      const at = orderBySpecies.get(Number(id));
      expect(at, `#${id} fora das tabelas`).toBeDefined();
      expect(at!, `#${id} em mapa ${at} < ${min}`).toBeGreaterThanOrEqual(min);
    }
    expect(GYM_ACES.size).toBe(6);
  });

  it(`a cadeia de portais liga 1→2→3→…→${WORLD_MAP_COUNT} nas duas direções`, () => {
    // 1→2 (norte do 1), 2→3 (leste do 2) e 3→4→…→40 (corredor norte/sul).
    const byNumber = new Map(maps.map((m) => [mapNumber(m), m]));
    for (let n = 1; n < WORLD_MAP_COUNT; n++) {
      const from = byNumber.get(n)!;
      const to = byNumber.get(n + 1)!;
      expect(
        from.portals.some((p) => p.targetMapSlug === to.slug),
        `sem portal ${n} → ${n + 1}`
      ).toBe(true);
      expect(
        to.portals.some((p) => p.targetMapSlug === from.slug),
        `sem portal de volta ${n + 1} → ${n}`
      ).toBe(true);
    }
    expect(maps.every((m) => mapNumber(m) <= WORLD_MAP_COUNT)).toBe(true);
    // Ninguém aponta para um mapa 41.
    const slugs = new Set(maps.map((m) => m.slug));
    for (const m of maps) {
      for (const p of m.portals) expect(slugs.has(p.targetMapSlug), `${m.slug} → ${p.targetMapSlug}`).toBe(true);
    }
  });

  it("o pipeline de encontro do runtime alcança todas as entradas de todos os mapas", () => {
    // Não basta a tabela estar certa no papel: `encounterPoolAt` filtra por
    // tile e `rollEncounterLevel` sana a faixa — é por aí que o jogador de fato
    // pesca. 1.000 sorteios por mapa (rng determinístico) e toda entrada tem de
    // aparecer, com nível sempre dentro da própria faixa e da banda do mapa.
    let rngState = 42;
    const rng = () => {
      rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
      return rngState / 0x7fffffff;
    };
    for (const m of maps) {
      const n = mapNumber(m);
      const [lo, hi] = bandFor(n);
      const huntTiles: Array<[number, number]> = [];
      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          if (hasEncounterAt(m as never, x, y)) huntTiles.push([x, y]);
        }
      }
      expect(huntTiles.length, `mapa ${n}: nenhuma célula de caça`).toBeGreaterThan(0);
      // A célula filtra por tile: o que tem de valer é que a **união** das
      // células de caça cubra a tabela inteira (nada órfão).
      const uniao = new Set<number>();
      for (const [x, y] of huntTiles) {
        for (const e of encounterPoolAt(m as never, x, y)) uniao.add(e.pokedexId);
      }
      expect(
        uniao.size,
        `mapa ${n}: ${m.encounterTable.length - uniao.size} entrada(s) inatingível(is) nas células de caça`
      ).toBe(m.encounterTable.length);

      const vistos = new Map<number, number>();
      for (let i = 0; i < 1000; i++) {
        const [x, y] = huntTiles[i % huntTiles.length]!;
        const entry = pickWeighted(encounterPoolAt(m as never, x, y), rng);
        expect(entry, `mapa ${n}: sorteio sem entrada`).not.toBeNull();
        const level = rollEncounterLevel(entry!, hi, rng);
        expect(level, `mapa ${n} ${entry!.name}: nv ${level} fora de ${entry!.minLevel}–${entry!.maxLevel}`).toBeGreaterThanOrEqual(entry!.minLevel);
        expect(level).toBeLessThanOrEqual(entry!.maxLevel);
        expect(level).toBeLessThanOrEqual(hi);
        expect(level).toBeGreaterThanOrEqual(lo);
        vistos.set(entry!.pokedexId, (vistos.get(entry!.pokedexId) ?? 0) + 1);
      }
      for (const e of m.encounterTable) {
        // Peso 2 em 100 dá ~2% por sorteio; em 1.000 sorteios esperar zero é
        // praticamente impossível — se acontecer, a entrada está órfã.
        expect(vistos.has(e.pokedexId), `mapa ${n}: ${e.name} (peso ${e.weight}) nunca sai no sorteio`).toBe(true);
      }
    }
  });

  it("a semente em código bate com o mundo versionado (MUNDO-COMO-CODIGO)", () => {
    // Projeção comum: os campos que a semente controla. O JSON guarda ainda
    // `creatorUsername`, `encounterRate`, `targetMapId` etc., que pertencem ao
    // banco/Editor e não são comparáveis aqui.
    const npcTag = (n: {
      type: string;
      name: string;
      x: number;
      y: number;
      shopId?: number | null;
    }) => `${n.type}:${n.name}@${n.x},${n.y}:${n.type === "shop" ? (n.shopId ?? "-") : "-"}`;
    const codific = new Map(
      buildDefaultMaps().map((m) => [
        m.slug,
        {
          name: m.name,
          description: m.description,
          width: m.width,
          height: m.height,
          tileGrid: m.tileGrid as unknown as string[][],
          encounterTable: m.encounterTable,
          portals: m.portals
            .map((p) => `${p.sourceX},${p.sourceY}→${p.targetSlug},${p.targetX},${p.targetY}`)
            .sort(),
          npcs: m.npcs.map(npcTag).sort(),
        },
      ])
    );
    expect(codific.size).toBe(maps.length);
    for (const m of maps) {
      const esperado = codific.get(m.slug);
      expect(esperado, `${m.slug} existe no JSON mas não na semente`).toBeDefined();
      expect(
        {
          name: m.name,
          description: m.description,
          width: m.width,
          height: m.height,
          tileGrid: m.tileGrid as unknown as string[][],
          encounterTable: m.encounterTable,
          portals: m.portals
            .map((p) => `${p.sourceX},${p.sourceY}→${p.targetMapSlug},${p.targetX},${p.targetY}`)
            .sort(),
          npcs: m.npcs.map(npcTag).sort(),
        },
        `${m.slug}: JSON versionado divergiu da semente`
      ).toEqual(esperado);
      // O NPC de ginásio referencia o líder por nome no arquivo — e o líder tem
      // de estar no próprio mapa (é o que `world:export` recusa se divergir).
      for (const n of m.npcs) {
        if (n.type !== "gym") continue;
        expect(n.gymLeaderName, `${m.slug}: NPC de ginásio sem líder`).toBe(n.name);
        expect(m.gyms.some((g) => g.leaderName === n.name), `${m.slug}: ginásio ausente no arquivo`).toBe(true);
      }
    }
  });
});
