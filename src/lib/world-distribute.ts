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
  type WorldMapLayout,
} from "./world-layout";

/**
 * Redistribuição das 649 espécies pelos 40 mapas (Fase 7.1 — Etapa B).
 *
 * Lógica **pura e determinística**: mesma Pokédex + mesmo `world-layout.ts`
 * ⇒ mesma tabela de encontros. Ela existe para que a redistribuição seja
 * reproduzível e auditável em vez de um arquivo com 649 números chutados:
 * `npm run world:distribute -- --write` regrava `src/lib/world-encounters.ts`
 * e `src/lib/world-distribute.test.ts` trava que a tabela commitada é
 * exatamente a saída deste módulo.
 *
 * Como decide, uma regra por linha:
 *
 * 1. **Progressão** — cada espécie recebe um `score` de força (BST, catchRate,
 *    estágio da linha e o nível canônico em que ela *chega* à linha). O score
 *    vira um **mapa-alvo** na escada 2…40, por *rank*: forma inicial fraca no
 *    começo do jogo, forma final forte no fim. Lendários ignoram o score e
 *    entram na janela da própria geração.
 * 2. **Pai antes do filho** — a colocação é uma varredura **mapa-a-mapa**
 *    (do mapa 2 ao 40), e cada mapa só pode escolher entre as espécies
 *    *prontas*, isto é, cujos pais já têm mapa. "Evolução nunca em mapa
 *    anterior ao da forma prévia" vale **por construção**, não por reparo.
 * 3. **Bioma coerente** — afinidade com os tipos do tema (primário vale mais
 *    que secundário, Water vale mais em mapa com água, lendário vale mais em
 *    mapa-santuário) entra no custo do passo 4 com teto de desvio: bioma
 *    desempata perto do alvo, nunca arranca a espécie da própria progressão.
 * 4. **Cota por mapa** — 644 espécies (649 menos as 5 pinadas do mapa 1) em 39
 *    mapas: 20 mapas com 17 e 19 com 16. Cada mapa pega exatamente a própria
 *    cota, então o peso 100 continua significando chance real de ~2%…~22%.
 * 5. **Passe de troca** — depois da varredura, troca-se pares entre mapas
 *    vizinhos (|Δ| ≤ 5) sempre que o ganho de bioma paga o desvio na escada.
 *    Troca preserva contagem, então as cotas continuam exatas. Cada leitura é
 *    feita do estado **atual** (nunca de um índice velho — foi assim que uma
 *    versão antiga chegou a repetir a mesma espécie 84 vezes), e o passe para
 *    quando não há mais ganho positivo: monotônico por construção.
 * 6. **Peso = raridade** e **nível = banda + raridade + piso de evolução**,
 *    ambos calculados aqui: o artefato gera `[id, peso, nv mín, nv máx, água]`
 *    e `default-world.ts` apenas renderiza. Assim a escada não é reimplementada
 *    em dois lugares. Trade/felicidade não têm nível canônico: entram com o
 *    proxy 32 (média das linhas de pedra do catálogo).
 *
 * O mapa 1 é intocável: suas cinco espécies pinadas (contrato da 6.2-C) nunca
 * entram no sorteio e nenhuma outra espécie é aceita nele.
 */

export interface DistributionAssignment {
  pokedexId: number;
  /** Faixa de nível calculada (banda do mapa + raridade + piso de evolução). */
  minLevel: number;
  maxLevel: number;
  /** Também aparece em `water` (mapa com água e tipo Water). */
  aquatic: boolean;
  /** Número do mapa (2…40). O mapa 1 é pinado e não passa por aqui. */
  map: number;
  weight: number;
  /** Score de progressão (0…1) que definiu o mapa-alvo. */
  score: number;
  /** 0 = forma base, 1 = primeira evolução, 2 = forma final. */
  stage: number;
  legendary: boolean;
}

export interface DistributionDiagnostics {
  /** `[id, peso]` por mapa, na ordem em que devem ser versionados. */
  encounters: Record<number, Array<[number, number]>>;
  /**
   * `[id, peso, minLevel, maxLevel, água]` — o que o runtime versiona. Os
   * níveis saem **daqui** (não da fórmula de `default-world.ts`) para que a
   * escada seja calculada uma vez só, com o grafo de evolução em mãos.
   */
  rows: Record<number, WorldEncounterRow[]>;
  assignments: Map<number, DistributionAssignment>;
  perMap: Map<number, number[]>;
  /** Espécies que não couberam em mapa nenhum (deve ser sempre vazio). */
  unplaced: number[];
  /** Ajustes de peso feitos para fechar os 100 exatos por mapa. */
  weightAdjustments: number;
  /** % das espécies cujo tipo **primário** bate com o tema do mapa. */
  themeMatchPct: number;
  /** % das espécies cujo tipo primário **ou** secundário bate com o tema. */
  anyTypeMatchPct: number;
  minCount: number;
  maxCount: number;
  /** Quantas trocas o passe de coerência aplicou. */
  swaps: number;
}

export interface DistributeOptions {
  /** Trocas máximas do passe de coerência (0 desliga). Default: 3000. */
  maxSwaps?: number;
}

const FIRST_MAP = 2;
const LAST_MAP = WORLD_MAP_COUNT;
const PINNED = new Set(MAP1_PINNED);
const BST_MIN = 180;
const BST_MAX = 720;

/**
 * Janela de mapas onde os lendários de cada geração "fazem sentido" na
 * jornada. Todos acima de `LEGENDARY_MIN_MAP` (contrato 6.4-A).
 */
const LEGENDARY_WINDOWS: Array<{ from: number; to: number; window: readonly [number, number] }> = [
  { from: 1, to: 151, window: [18, 22] },
  { from: 152, to: 251, window: [22, 27] },
  { from: 252, to: 386, window: [26, 31] },
  { from: 387, to: 493, window: [30, 35] },
  { from: 494, to: 649, window: [34, 40] },
];

interface SpeciesGraph {
  childrenOf: Map<number, number[]>;
  parentsOf: Map<number, number[]>;
  stage: Map<number, number>;
  /** Nível (ou proxy) em que a espécie chega à linha: o menor gatilho dos pais. */
  evolutionIn: Map<number, number>;
}

/** Uma passada sobre o catálogo: árvore de evolução, estágios e níveis de entrada. */
function buildGraph(): SpeciesGraph {
  const childrenOf = new Map<number, number[]>();
  const parentsOf = new Map<number, number[]>();
  const evolutionIn = new Map<number, number>();
  for (const s of POKEDEX) {
    for (const evo of s.evolvesTo ?? []) {
      childrenOf.set(s.id, [...(childrenOf.get(s.id) ?? []), evo.speciesId]);
      parentsOf.set(evo.speciesId, [...(parentsOf.get(evo.speciesId) ?? []), s.id]);
      // Item (pedra) e "especial" não têm nível canônico aqui: 32 é a média
      // das linhas de pedra do catálogo, o suficiente para ordenar a escada.
      const level = evo.trigger === "level" ? (evo.level ?? 32) : 32;
      const known = evolutionIn.get(evo.speciesId);
      if (known === undefined || level < known) evolutionIn.set(evo.speciesId, level);
    }
  }

  const stage = new Map<number, number>();
  const depthOf = (id: number, seen: Set<number>): number => {
    if (stage.has(id)) return stage.get(id)!;
    if (seen.has(id)) return 0; // guarda contra ciclo (não existe no catálogo)
    seen.add(id);
    const ps = parentsOf.get(id) ?? [];
    const value = ps.length === 0 ? 0 : Math.max(...ps.map((p) => depthOf(p, seen) + 1));
    stage.set(id, value);
    return value;
  };
  for (const s of POKEDEX) depthOf(s.id, new Set());

  return { childrenOf, parentsOf, stage, evolutionIn };
}

function themedMaps(): WorldMapLayout[] {
  return WORLD_MAP_LAYOUT.filter((m) => m.order >= FIRST_MAP).sort((a, b) => a.order - b.order);
}

/**
 * Alvo na escada 2…40 a partir do **rank** do score, não do valor absoluto.
 *
 * O motivo é prático: os scores se amontoam em 0,05…0,4 (muita espécie fraca e
 * comum, pouca no topo), então mapear o score direto deixava o mapa 2 com 8
 * espécies e o resto estourando a cota. O rank por construção distribui as 644
 * em ~16,5 por mapa e mantém a ordem de progressão idêntica.
 */
function targetMapForRank(rank: number, total: number): number {
  return FIRST_MAP + Math.min(LAST_MAP - FIRST_MAP, Math.floor((rank * (LAST_MAP - FIRST_MAP + 1)) / total));
}

function legendaryTargetMap(id: number, indexInGeneration: number, totalInGeneration: number): number {
  const gen = LEGENDARY_WINDOWS.find((g) => id >= g.from && id <= g.to)!;
  const [lo, hi] = gen.window;
  if (totalInGeneration <= 1) return Math.max(LEGENDARY_MIN_MAP, Math.round((lo + hi) / 2));
  const step = (hi - lo) / (totalInGeneration - 1);
  return Math.max(LEGENDARY_MIN_MAP, Math.round(lo + step * indexInGeneration));
}

export function distributeWorld(options: DistributeOptions = {}): DistributionDiagnostics {
  const maxSwaps = options.maxSwaps ?? 3000;
  const layouts = themedMaps();
  const layoutByOrder = new Map(layouts.map((l) => [l.order, l]));
  const { childrenOf, parentsOf, stage, evolutionIn } = buildGraph();

  // ── 1. Score de progressão ────────────────────────────────────────────────
  //
  // Nenhum sinal isolado manda na distribuição: um Pokémon pode ser fraco e
  // raro (Magikarp) ou forte e comum no fim da linha (Pidgeot). O nível de
  // evolução pesa bastante porque é o que o jogador de fato desbloqueia.
  interface Meta {
    id: number;
    types: string[];
    stage: number;
    score: number;
    legendary: boolean;
  }
  const metas: Meta[] = [];
  for (const s of POKEDEX) {
    if (PINNED.has(s.id)) continue;
    const legendary = WORLD_LEGENDARIES.has(s.id);
    const st = stage.get(s.id) ?? 0;
    const bst = (s.baseHp + s.baseAtk + s.baseDef + s.baseSpAtk + s.baseSpDef + s.baseSpd - BST_MIN) / (BST_MAX - BST_MIN);
    const rarity = 1 - Math.min(s.catchRate, 255) / 255;
    const evoIn = Math.min(evolutionIn.get(s.id) ?? 0, 64) / 64;
    const raw = 0.38 * Math.max(0, Math.min(1, bst)) + 0.22 * rarity + 0.16 * (st / 2) + 0.24 * evoIn;
    metas.push({
      id: s.id,
      types: s.types as string[],
      stage: st,
      score: Math.max(0, Math.min(1, raw)),
      legendary,
    });
  }
  const metaById = new Map(metas.map((m) => [m.id, m]));

  // Lendários têm alvo próprio (janela da geração), e o score passa a ser essa
  // posição — senão o BST 580 com catchRate 3 os largaria no meio do caminho.
  const legendaryIds = metas.filter((m) => m.legendary).map((m) => m.id).sort((a, b) => a - b);
  const legendaryTarget = new Map<number, number>();
  for (const id of legendaryIds) {
    const gen = LEGENDARY_WINDOWS.find((g) => id >= g.from && id <= g.to)!;
    const inGen = legendaryIds.filter((x) => x >= gen.from && x <= gen.to);
    legendaryTarget.set(id, legendaryTargetMap(id, inGen.indexOf(id), inGen.length));
  }
  for (const m of metas) {
    if (m.legendary) m.score = (legendaryTarget.get(m.id)! - FIRST_MAP) / (LAST_MAP - FIRST_MAP);
  }
  const byScore = metas
    .slice()
    .sort((a, b) => (a.score === b.score ? a.id - b.id : a.score - b.score));
  const targetOf = new Map<number, number>();
  byScore.forEach((m, i) => {
    targetOf.set(m.id, m.legendary ? legendaryTarget.get(m.id)! : targetMapForRank(i, byScore.length));
  });

  // ── 2. Afinidade por (espécie, mapa), pré-computada ───────────────────────
  //
  // O cache não é micro-otimização: sem ele o passe de troca chamava
  // `getPokemonSpecies` ~40 M de vezes e a distribuição levava 5 minutos.
  const affinity = new Map<number, Map<number, number>>();
  for (const m of metas) {
    const row = new Map<number, number>();
    const hasWater = m.types.includes("Water");
    for (const layout of layouts) {
      const wet = (layout.waterRects?.length ?? 0) > 0;
      let value = 0;
      if (layout.types.includes(m.types[0]!)) value += 3;
      if (m.types[1] !== undefined && layout.types.includes(m.types[1])) value += 2;
      if (hasWater && wet) value += 1;
      if (!hasWater && wet) value -= 0.5; // terra firme dentro de mapa alagado
      if (m.legendary) value += layout.legendaryHaven ? 2.5 : -0.5;
      row.set(layout.order, value);
    }
    affinity.set(m.id, row);
  }
  const affinityOf = (id: number, n: number): number => affinity.get(id)?.get(n) ?? 0;

  // O custo de cada mapa para cada espécie é a balança do resto do algoritmo:
  // `DIST_WEIGHT` × desvio na escada contra `AFFINITY_WEIGHT` × afinidade de
  // bioma. Com 1.2/1.7 um tipo primário que bate (afinidade 3) paga migrar
  // ~4 mapas na escada — o suficiente para o elenco parecer do bioma sem
  // embaralhar a progressão de dificuldade.
  const DIST_WEIGHT = 1.2;
  const AFFINITY_WEIGHT = 1.7;
  const SAME_MAP_PENALTY = 1.2;
  /** Mapas de distância tolerados do alvo antes do custo disparar. */
  const MAX_DRIFT = 6;
  const DRIFT_PENALTY = 9;

  // ── 3. Cotas ──────────────────────────────────────────────────────────────
  const perMapBase = Math.floor(metas.length / layouts.length);
  const withExtra = metas.length - perMapBase * layouts.length;
  const quota = new Map<number, number>();
  layouts.forEach((l, i) => quota.set(l.order, perMapBase + (i < withExtra ? 1 : 0)));
  const perMap = new Map<number, number[]>(layouts.map((l) => [l.order, []]));
  const placed = new Map<number, number>();

  // Só interessam as arestas cujo filho entra no sorteio (o mapa 1 é fixo).
  const distChildren = new Map<number, number[]>();
  const pendingParents = new Map<number, number>();
  for (const m of metas) pendingParents.set(m.id, 0);
  for (const m of metas) {
    const kids = (childrenOf.get(m.id) ?? []).filter((c) => metaById.has(c));
    if (kids.length > 0) distChildren.set(m.id, kids);
    for (const kid of kids) pendingParents.set(kid, (pendingParents.get(kid) ?? 0) + 1);
  }

  /** Mínimo de mapa que a espécie respeita (contratos de lendário e de ginásio). */
  const minMapOf = (id: number): number => {
    let min = FIRST_MAP;
    if (metaById.get(id)!.legendary) min = Math.max(min, LEGENDARY_MIN_MAP);
    const ace = GYM_ACE_MIN_MAP[id];
    if (ace !== undefined) min = Math.max(min, ace);
    return min;
  };

  const costAt = (id: number, n: number): number => {
    const drift = Math.abs(n - targetOf.get(id)!);
    let cost = drift * DIST_WEIGHT - affinityOf(id, n) * AFFINITY_WEIGHT;
    // Teto macio de desvio: bioma nenhum vale levar uma espécie para 10 mapas
    // fora da sua posição na escada. Acima de `MAX_DRIFT` o custo explode,
    // então a espécie só migra longe quando não há alternativa.
    if (drift > MAX_DRIFT) cost += (drift - MAX_DRIFT) * DRIFT_PENALTY;
    const parentMap = parentMapOf(id);
    if (parentMap === n) cost += SAME_MAP_PENALTY; // evolução junto do pai: permitido, preterido
    return cost;
  };

  const parentMapOf = (id: number): number | undefined => {
    let max: number | undefined;
    for (const p of parentsOf.get(id) ?? []) {
      const pm = placed.get(p);
      if (pm !== undefined && (max === undefined || pm > max)) max = pm;
    }
    return max;
  };

  // ── 4. Varredura mapa-a-mapa ──────────────────────────────────────────────
  //
  // Cada mapa, na ordem da jornada, escolhe as `quota` melhores espécies entre
  // as que estão "prontas" (todos os pais já colocados ⇒ evolução nunca fica
  // antes da forma prévia, por construção). Pronto + perto do alvo + afinidade
  // com o bioma. O custo de distância impede o mapa 4 de roubar a espécie cujo
  // alvo é o 25, então a progressão não é sacrificada pelo enfeite temático.
  const readyPool: number[] = metas.filter((m) => (pendingParents.get(m.id) ?? 0) === 0).map((m) => m.id);
  for (const layout of layouts) {
    const n = layout.order;
    const want = quota.get(n) ?? 0;
    for (let k = 0; k < want; k++) {
      let best = -1;
      let bestIdx = -1;
      for (let i = 0; i < readyPool.length; i++) {
        const id = readyPool[i]!;
        if (n < minMapOf(id)) continue;
        const cost = costAt(id, n);
        if (bestIdx === -1 || cost < best - 1e-9) {
          best = cost;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break; // nenhum candidato elegível neste mapa
      const [id] = readyPool.splice(bestIdx, 1);
      placed.set(id!, n);
      perMap.get(n)!.push(id!);
      for (const child of distChildren.get(id!) ?? []) {
        const left = (pendingParents.get(child) ?? 0) - 1;
        pendingParents.set(child, left);
        if (left === 0) readyPool.push(child);
      }
    }
  }

  // O que sobrou (normalmente nada: as cotas fecham o total) entra no mapa de
  // menor custo que ainda aguente, com folga de +4 por mapa.
  const stragglers = metas.filter((m) => !placed.has(m.id)).map((m) => m.id);
  const load = new Map<number, number>(layouts.map((l) => [l.order, perMap.get(l.order)!.length]));
  for (const id of stragglers.sort((a, b) => targetOf.get(a)! - targetOf.get(b)!)) {
    let best = 0;
    let bestCost = Infinity;
    for (const layout of layouts) {
      const n = layout.order;
      if (n < minMapOf(id)) continue;
      if ((load.get(n) ?? 0) >= (quota.get(n) ?? 0) + 4) continue;
      const parentMap = parentMapOf(id);
      if (parentMap !== undefined && n < parentMap) continue;
      const cost = costAt(id, n);
      if (cost < bestCost - 1e-9) {
        best = n;
        bestCost = cost;
      }
    }
    if (best === 0) continue;
    placed.set(id, best);
    perMap.get(best)!.push(id);
    load.set(best, (load.get(best) ?? 0) + 1);
  }

  // ── 5. Passe de troca: coerência de bioma sem mexer nas cotas ─────────────
  const canOccupy = (id: number, n: number): boolean => {
    if (n < minMapOf(id)) return false;
    const parentMap = parentMapOf(id);
    if (parentMap !== undefined && n < parentMap) return false;
    for (const c of childrenOf.get(id) ?? []) {
      const cm = placed.get(c);
      if (cm !== undefined && n > cm) return false;
    }
    return true;
  };

  let swaps = 0;
  const swapGuard = maxSwaps;
  while (swaps < swapGuard) {
    let applied = 0;
    for (const layoutA of layouts) {
      const listA = perMap.get(layoutA.order)!;
      for (let i = 0; i < listA.length; i++) {
        for (const layoutB of layouts) {
          if (layoutB.order <= layoutA.order) continue;
          if (layoutB.order - layoutA.order > 5) continue;
          const listB = perMap.get(layoutB.order)!;
          for (let j = 0; j < listB.length; j++) {
            // lidos do estado atual a cada tentativa — troca muda os dois lados
            const a = listA[i]!;
            const b = listB[j]!;
            if (a === b) continue;
            const before = costAt(a, layoutA.order) + costAt(b, layoutB.order);
            const after = costAt(a, layoutB.order) + costAt(b, layoutA.order);
            if (after - before > -0.4) continue; // só com ganho real
            if (!canOccupy(a, layoutB.order) || !canOccupy(b, layoutA.order)) continue;
            listA[i] = b;
            listB[j] = a;
            placed.set(a, layoutB.order);
            placed.set(b, layoutA.order);
            applied++;
            swaps++;
          }
        }
      }
    }
    if (applied === 0) break;
  }

  // ── 6. Pesos: raridade → agenda geométrica somando 100 ────────────────────
  //
  // Ordem do mapa: o mais comum recebe o maior peso. A partir daí o peso decai
  // geometricamente, o que reproduz o desenho da 6.4-A (alguns commons com
  // 14–18 e uma cauda rara em 2–5) em vez de um bolo achatado em 6 — como o
  // peso também decide a *altura* na faixa de nível (passo 7), a agenda é o
  // que garante comum no chão da faixa e raro no topo.
  const encounters: Record<number, Array<[number, number]>> = {};
  let weightAdjustments = 0;
  const STAGE_COMMONNESS = [1, 0.62, 0.42];
  const MIN_WEIGHT = 2;
  const MAX_LEGENDARY_WEIGHT = 10;
  const DECAY = 0.87;

  for (const layout of layouts) {
    const ids = perMap
      .get(layout.order)!
      .slice()
      .sort((a, b) => {
        const commonness = (id: number) => {
          const meta = metaById.get(id)!;
          if (meta.legendary) return -1;
          const catchFactor = Math.min(getPokemonSpecies(id).catchRate, 255) / 255;
          return catchFactor * (STAGE_COMMONNESS[meta.stage] ?? 0.42);
        };
        const diff = commonness(b) - commonness(a);
        if (diff !== 0) return diff;
        return a - b;
      });

    const base = ids.map((_, i) => Math.pow(DECAY, i));
    const sum = base.reduce((acc, v) => acc + v, 0) || 1;
    const ceiling = ids.map((id) => (metaById.get(id)!.legendary ? MAX_LEGENDARY_WEIGHT : 30));
    const weights = base.map((v, i) => Math.min(ceiling[i]!, Math.max(MIN_WEIGHT, Math.round((100 * v) / sum))));

    // Teto/piso mexeram na soma: devolve ao mais comum que ainda tem teto,
    // tira do mais comum acima do piso.
    for (let guard = 0; guard < 4000; guard++) {
      const total = weights.reduce((a, b) => a + b, 0);
      if (total === 100) break;
      weightAdjustments++;
      if (total > 100) {
        let idx = -1;
        for (let k = 0; k < weights.length; k++) {
          if (weights[k]! <= MIN_WEIGHT) continue;
          if (idx === -1 || weights[k]! > weights[idx]!) idx = k;
        }
        if (idx === -1) break;
        weights[idx] = weights[idx]! - 1;
      } else {
        let idx = -1;
        for (let k = 0; k < weights.length; k++) {
          if (weights[k]! + 1 > ceiling[k]!) continue;
          if (idx === -1 || weights[k]! < weights[idx]!) idx = k;
        }
        if (idx === -1) break;
        weights[idx] = weights[idx]! + 1;
      }
    }

    encounters[layout.order] = ids.map((id, i) => [id, weights[i]!] as [number, number]);
  }

  // ── 7. Níveis: banda do mapa + raridade + piso da evolução ────────────────
  //
  // O peso decide a *altura* dentro da banda (comum no chão, raro no topo) e o
  // nível de evolução decide o *piso*: uma forma final nunca aparece no pé da
  // faixa do mapa onde mora, senão o jogador esbarra em Blastoise de nv 24.
  // Trade/felicidade não têm nível, então viram um proxy (nível médio da linha).
  const rows: Record<number, WorldEncounterRow[]> = {};
  for (const [order, list] of Object.entries(encounters)) {
    const n = Number(order);
    const band = bandFor(n);
    const watery = (layoutByOrder.get(n)!.waterRects?.length ?? 0) > 0;
    rows[n] = list.map(([id, weight]) => {
      const legendary = metaById.get(id)!.legendary;
      let [minLevel, maxLevel] = legendary
        ? [Math.max(band[0], band[1] - 8), band[1]]
        : weight >= 14
          ? [band[0], band[1] - 3]
          : weight >= 9
            ? [band[0] + 2, band[1] - 1]
            : weight >= 5
              ? [band[0] + 4, band[1]]
              : [band[0] + 6, band[1]];
      const evolvesAt = evolutionIn.get(id) ?? 0;
      if (evolvesAt > 0) {
        minLevel = Math.min(Math.max(minLevel, evolvesAt + 1), Math.max(band[0], band[1] - 1));
        maxLevel = Math.max(maxLevel, minLevel);
      }
      const aquatic = watery && getPokemonSpecies(id).types.includes("Water");
      return [id, weight, minLevel, maxLevel, aquatic ? 1 : 0];
    });
  }

  // ── 8. Diagnóstico ───────────────────────────────────────────────────────
  const assignments = new Map<number, DistributionAssignment>();
  for (const [order, list] of Object.entries(rows)) {
    for (const [id, weight, minLevel, maxLevel, aquatic] of list) {
      const meta = metaById.get(id)!;
      assignments.set(id, {
        pokedexId: id,
        map: Number(order),
        weight,
        minLevel,
        maxLevel,
        aquatic: aquatic === 1,
        score: meta.score,
        stage: meta.stage,
        legendary: meta.legendary,
      });
    }
  }
  let primaryMatch = 0;
  let anyMatch = 0;
  for (const [id, a] of assignments) {
    const layout = layoutByOrder.get(a.map)!;
    const s = getPokemonSpecies(id);
    if (layout.types.includes(s.types[0])) primaryMatch++;
    if (s.types.some((t) => layout.types.includes(t))) anyMatch++;
  }
  const counts = layouts.map((l) => perMap.get(l.order)!.length);

  return {
    encounters,
    rows,
    assignments,
    perMap,
    unplaced: metas.filter((m) => !placed.has(m.id)).map((m) => m.id),
    weightAdjustments,
    themeMatchPct: Math.round((100 * primaryMatch) / Math.max(1, assignments.size)),
    anyTypeMatchPct: Math.round((100 * anyMatch) / Math.max(1, assignments.size)),
    minCount: Math.min(...counts),
    maxCount: Math.max(...counts),
    swaps,
  };
}

/** Autoauditoria do gerador: nada é escrito se algo aqui reclamar. */
export function validateDistribution(d: DistributionDiagnostics): string[] {
  const problems: string[] = [];
  const seen = new Map<number, number>();

  for (const [order, list] of Object.entries(d.encounters)) {
    const n = Number(order);
    const sum = list.reduce((acc, [, w]) => acc + w, 0);
    if (sum !== 100) problems.push(`mapa ${n}: pesos somam ${sum}, esperava 100`);
    if (list.length < 10) problems.push(`mapa ${n}: só ${list.length} espécies`);
    if (list.length > 24) problems.push(`mapa ${n}: ${list.length} espécies (teto de 24)`);
    for (const [id, w] of list) {
      if (seen.has(id)) problems.push(`espécie ${id} repetida: mapa ${seen.get(id)} e ${n}`);
      seen.set(id, n);
      if (PINNED.has(id)) problems.push(`espécie pinada do mapa 1 apareceu no mapa ${n}: ${id}`);
      if (w < 2) problems.push(`mapa ${n}: peso ${w} de ${id} abaixo do piso 2`);
      if (WORLD_LEGENDARIES.has(id)) {
        if (n < LEGENDARY_MIN_MAP) problems.push(`lendário ${id} no mapa ${n} (< ${LEGENDARY_MIN_MAP})`);
        if (w > 20) problems.push(`lendário ${id} com peso ${w} (> 20)`);
      }
      const ace = GYM_ACE_MIN_MAP[id];
      if (ace !== undefined && n < ace) problems.push(`ás de ginásio ${id} no mapa ${n} (< ${ace})`);
    }
  }

  const missing = POKEDEX.filter((s) => !PINNED.has(s.id) && !seen.has(s.id)).map((s) => s.id);
  if (missing.length > 0) problems.push(`${missing.length} espécies sem mapa: ${missing.slice(0, 20).join(", ")}`);
  if (seen.size + PINNED.size !== POKEDEX.length) {
    problems.push(`contagem não fecha: ${seen.size} distribuídas + ${PINNED.size} pinadas ≠ ${POKEDEX.length}`);
  }

  for (const s of POKEDEX) {
    const from = seen.get(s.id);
    if (from === undefined) continue;
    for (const evo of s.evolvesTo ?? []) {
      const to = seen.get(evo.speciesId);
      if (to === undefined) continue;
      if (to < from) problems.push(`${s.name} (M${from}) evolui em mapa mais cedo: M${to}`);
    }
  }
  if (d.unplaced.length > 0) problems.push(`não colocadas: ${d.unplaced.join(", ")}`);
  return problems;
}
