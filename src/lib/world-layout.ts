import type { TileId } from "./tiles";

/**
 * Layout do mundo (Fase 7.1 — Etapa B: 40 mapas) — dados puros, sem banco.
 *
 * Este módulo é a **planta** do mundo: quem existe, em que ordem, com que
 * bioma e com que faixa de nível. `src/lib/default-world.ts` usa estes dados
 * para montar os mapas (grades, portais, NPCs) e `scripts/world-distribute.mts`
 * usa as **mesmas** bandas + temas para distribuir as 649 espécies. Os dois
 * lados nunca divergem porque ninguém reimplementa a escada de nível.
 *
 * Por que as bandas foram **reescaladas** (a 6.4-A ia de 8–16 até 82–95 em 20
 * mapas): com 40 mapas a escada precisa continuar subindo sem estourar o teto
 * de nível 100. A âncora do contrato — **mapa 1 = 3–10** — é preservada
 * verbatim; os mapas 2–40 passam a subir ~2 níveis por mapa com 14 de largura,
 * terminando em 86–100 na Coroa do Mundo.
 *
 * Invariantes travadas por teste (`src/lib/world-expansion.test.ts`):
 * - 40 mapas numerados 1–40 sem buraco, todos publicados;
 * - as 649 espécies do catálogo aparecem em **exatamente um** mapa;
 * - pesos somam **100** por mapa;
 * - evolução **nunca** em mapa anterior ao da forma prévia;
 * - lendários só a partir do **mapa 10** e sempre com **peso ≤ 20**;
 * - escada de nível crescente e sobreposta (sem buraco entre mapas);
 * - a descrição de um mapa que cita "(nv A–B)" bate com a banda real;
 * - cadeia de portais 1→2→3→…→40 navegável nos dois sentidos.
 */

/** Total de mapas do mundo (7.1 fecha em 40; 7.2 leva a 60). */
export const WORLD_MAP_COUNT = 40;

/** Primeiro mapa onde um lendário pode aparecer (contrato da 6.4-A). */
export const LEGENDARY_MIN_MAP = 10;

/** Faixa de nível de cada mapa. M1 é contrato da 6.2-C e não se mexe. */
export const WORLD_BANDS: Record<number, readonly [number, number]> = {
  1: [3, 10], 2: [6, 20], 3: [8, 22], 4: [10, 24], 5: [13, 27],
  6: [14, 28], 7: [17, 31], 8: [19, 33], 9: [21, 35], 10: [23, 37],
  11: [25, 39], 12: [27, 41], 13: [29, 43], 14: [31, 45], 15: [33, 47],
  16: [36, 50], 17: [38, 52], 18: [40, 54], 19: [42, 56], 20: [44, 58],
  21: [46, 60], 22: [48, 62], 23: [50, 64], 24: [53, 67], 25: [54, 68],
  26: [57, 71], 27: [59, 73], 28: [61, 75], 29: [63, 77], 30: [65, 79],
  31: [67, 81], 32: [69, 83], 33: [71, 85], 34: [73, 87], 35: [76, 90],
  36: [78, 92], 37: [80, 94], 38: [82, 96], 39: [84, 98], 40: [86, 100],
};

export function bandFor(order: number): readonly [number, number] {
  const band = WORLD_BANDS[order];
  if (!band) throw new Error(`banda inexistente para o mapa ${order}`);
  return band;
}

/**
 * Lendários e míticos do catálogo (649, teto do CDN). É a lista que a
 * redistribuição protege: nenhum deles cai em mapa comum de começo de jogo e
 * nenhum pesa mais que 20 no sorteio.
 */
export const WORLD_LEGENDARIES: ReadonlySet<number> = new Set([
  // Kanto — aves lendárias, Mewtwo, Mew
  144, 145, 146, 150, 151,
  // Johto — cães lendários, Lugia, Ho-Oh, Celebi
  243, 244, 245, 249, 250, 251,
  // Hoenn — titãs, Eon duo, clima, Rayquaza, Jirachi, Deoxys
  377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
  // Sinnoh — trio dos lagos, criação, Heatran, Regigigas, Giratina,
  // Cresselia, Manaphy, Darkrai, Shaymin, Arceus
  480, 481, 482, 483, 484, 485, 486, 487, 488, 490, 491, 492, 493,
  // Unova — Victini, Espadas da Justiça, tufo do clima, dragões da história,
  // Keldeo, Meloetta, Genesect
  494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
]);

/** Espécies que moram no mapa 1 — contrato verbatim da 6.2-C. */
export const MAP1_PINNED: readonly number[] = [1, 4, 7, 25, 133];

/**
 * Ases dos ginásios: não podem virar commons antes do próprio ginásio.
 * Brock (mapa 1), Misty (mapa 2), Lance (mapa 3).
 */
export const GYM_ACE_MIN_MAP: Readonly<Record<number, number>> = {
  74: 1, 95: 1, 120: 2, 121: 2, 148: 3, 149: 3,
};

export type Rect = readonly [number, number, number, number]; // x1, y1, x2, y2

/**
 * Entrada da tabela de encontros gerada (`world-encounters.ts`): só o par
 * `[espécie, peso]`. Nível e nomes são derivados aqui no runtime, para que a
 * escada de níveis (`WORLD_BANDS`) continue sendo a única alavanca de balanceio.
 */
/**
 * Uma linha da tabela de encontros versionada: `[id, peso, nv mín, nv máx,
 * água]`. `água = 1` libera o tile `water` além de `tall_grass`. É o formato do
 * artefato gerado (`world-encounters.ts`) — o runtime só o renderiza.
 */
export type WorldEncounterRow = readonly [
  pokedexId: number,
  weight: number,
  minLevel: number,
  maxLevel: number,
  water: 0 | 1,
];

export interface WorldMapLayout {
  order: number;
  slug: string;
  name: string;
  shortName: string;
  /**
   * Sabor do bioma. Entra na descrição antes da faixa de nível:
   * `"<flavor> (nv A–B). <cast>"`.
   */
  flavor: string;
  /** Destaques do elenco (o que faz sentido achar aqui). */
  cast: string;
  /** Descrição fechada, quando o mapa não segue o padrão (só o mapa 1). */
  descriptionOverride?: string;
  /** Tipos que o gerador de encontros prefere para este mapa. */
  types: readonly string[];
  /**
   * Grade própria, escrita à mão na semente original (mapas 1–3). Os demais
   * saem de `themedGrid` com os retângulos abaixo.
   */
  legacyGrid?: boolean;
  ground?: TileId;
  grassRects?: readonly Rect[];
  /** Águas do mapa — também libera `water` nos `tileTypes` dos aquáticos. */
  waterRects?: readonly Rect[];
  flowers?: readonly (readonly [number, number])[];
  center?: readonly [number, number];
  /** Mapa-santuário: o gerador dá preferência a lendários aqui. */
  legendaryHaven?: boolean;
  /** Loja/NPC do mapa (só os três originais têm loja e ginásio na 7.1). */
  npcIds?: readonly string[];
}

/**
 * Os 40 mapas, em ordem de jornada.
 *
 * Mapas 1–3 preservam as grades, os NPCs e os ginásios originais (contrato).
 * Mapas 4–20 mantêm identidade e tema da 6.4-A; a partir do 21 a jornada entra
 * na segunda metade — biomas mais duros, Centro Pokémon espaçado de propósito.
 */
export const WORLD_MAP_LAYOUT: readonly WorldMapLayout[] = [
  {
    order: 1, slug: "vale-pallet", name: "Mapa 1: Vale Pallet", shortName: "Vale Pallet",
    flavor: "Lar dos primeiros treinadores",
    cast: "Ginásio do Brock (Pedra) e Loja básica.",
    // O mapa 1 é byte a byte o contrato da 6.2-C — inclusive a frase abaixo.
    descriptionOverride: "Lar dos primeiros treinadores. Ginásio do Brock (Pedra) e Loja básica.",
    types: ["Grass", "Fire", "Water", "Electric", "Normal"],
    legacyGrid: true,
    npcIds: ["shop-pallet", "gym-brock"],
  },
  {
    order: 2, slug: "floresta-viridian", name: "Mapa 2: Floresta de Viridian", shortName: "Floresta de Viridian",
    flavor: "Mata fechada de insetos e plantas selvagens",
    cast: "Ginásio da Misty (Água) e Loja intermediária.",
    types: ["Bug", "Grass", "Poison"],
    legacyGrid: true,
    npcIds: ["shop-viridian", "gym-misty"],
  },
  {
    order: 3, slug: "pico-celeste", name: "Mapa 3: Pico Celeste", shortName: "Pico Celeste",
    flavor: "Colinas rochosas na subida da montanha",
    cast: "Ginásio do Lance (Dragão); ao norte começa a longa jornada até o mapa 40.",
    types: ["Rock", "Ground", "Fighting", "Normal"],
    legacyGrid: true,
    npcIds: ["shop-peak", "gym-lance"],
  },
  {
    order: 4, slug: "caverna-monte-lua", name: "Mapa 4: Caverna do Monte Lua", shortName: "Caverna do Monte Lua",
    flavor: "Túneis úmidos de pedra",
    cast: "Morcegos e bichos de toca dominam os corredores; o Centro Pokémon fica na clareira.",
    types: ["Poison", "Rock", "Fairy", "Bug"],
    ground: "stone",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 5, 13], [9, 9, 13, 13]],
    center: [6, 10],
  },
  {
    order: 5, slug: "litoral-vermilion", name: "Mapa 5: Litoral de Vermilion", shortName: "Litoral de Vermilion",
    flavor: "Praia e mar raso",
    cast: "Aquáticos pequenos na arrebentação e na restinga; conchas são o achado raro.",
    types: ["Water", "Rock", "Psychic"],
    ground: "sand",
    grassRects: [[2, 8, 6, 13], [10, 8, 13, 13]],
    waterRects: [[10, 1, 14, 6], [1, 1, 5, 4]],
  },
  {
    order: 6, slug: "pantano-venenoso", name: "Mapa 6: Pântano Venenoso", shortName: "Pântano Venenoso",
    flavor: "Lama tóxica e névoa baixa",
    cast: "Lodo que borbulha: venenosos, sapos e os Fantasmas que gostam de umidade.",
    types: ["Poison", "Water", "Grass"],
    ground: "grass",
    grassRects: [[2, 2, 6, 6], [9, 3, 13, 6], [3, 9, 12, 13]],
    waterRects: [[9, 9, 13, 13]],
  },
  {
    order: 7, slug: "usina-volt", name: "Mapa 7: Usina de Volt", shortName: "Usina de Volt",
    flavor: "Geradores que nunca desligam",
    cast: "Corredores zumbindo de Elétricos, Aço e o veneno que escorre dos transformadores.",
    types: ["Electric", "Steel", "Poison"],
    ground: "stone",
    grassRects: [[2, 2, 5, 6], [10, 2, 13, 6], [2, 9, 13, 13]],
  },
  {
    order: 8, slug: "deserto-das-ruinas", name: "Mapa 8: Deserto das Ruínas", shortName: "Deserto das Ruínas",
    flavor: "Dunas sobre ruínas enterradas",
    cast: "Fósseis vivos, pedreiros teimosos e mães protetoras; Centro Pokémon no oásis.",
    types: ["Rock", "Ground", "Normal"],
    ground: "sand",
    grassRects: [[1, 2, 5, 7], [10, 2, 14, 7], [4, 10, 11, 13]],
    center: [6, 10],
  },
  {
    order: 9, slug: "planicies-douradas", name: "Mapa 9: Planícies Douradas", shortName: "Planícies Douradas",
    flavor: "Campos abertos de vento e pólen",
    cast: "Cães, cavalos e bichos de campo correm soltos; os fortes bloqueiam a trilha.",
    types: ["Normal", "Grass", "Fire"],
    ground: "grass",
    grassRects: [[2, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
    flowers: [[3, 7], [12, 8], [6, 3]],
  },
  {
    order: 10, slug: "ilhas-glaciais", name: "Mapa 10: Ilhas Glaciais", shortName: "Ilhas Glaciais",
    flavor: "Canais congelados entre ilhas",
    cast: "Focas, focos de gelo e aves do frio; o primeiro lendário que a jornada mostra.",
    types: ["Ice", "Water"],
    ground: "grass",
    grassRects: [[2, 5, 6, 10], [9, 5, 13, 10]],
    waterRects: [[1, 1, 14, 3], [1, 12, 14, 14]],
  },
  {
    order: 11, slug: "torre-dos-espiritos", name: "Mapa 11: Torre dos Espíritos", shortName: "Torre dos Espíritos",
    flavor: "Andares silenciosos entre velas",
    cast: "Fantasmas nos corredores, Psíquicos nas escadas e as aves que entraram por engano — e ficaram.",
    types: ["Ghost", "Psychic", "Normal", "Flying"],
    ground: "stone",
    grassRects: [[2, 2, 6, 5], [9, 2, 13, 5], [2, 9, 6, 13], [9, 9, 13, 13]],
  },
  {
    order: 12, slug: "vulcao-cinnabar", name: "Mapa 12: Vulcão de Cinnabar", shortName: "Vulcão de Cinnabar",
    flavor: "Cinzas, magma e pedra quente",
    cast: "Linhas de fogo completas e os Elétricos que moram em usina quebrada.",
    types: ["Fire", "Ground", "Electric"],
    ground: "stone",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [4, 9, 11, 13]],
  },
  {
    order: 13, slug: "cidade-sombria", name: "Mapa 13: Cidade Sombria", shortName: "Cidade Sombria",
    flavor: "Becos de neon e um dojo de portas abertas",
    cast: "Sombrios e Lutadores dividem a praça; Centro Pokémon entre os becos.",
    types: ["Dark", "Fighting", "Poison"],
    ground: "stone",
    grassRects: [[2, 2, 5, 5], [10, 2, 13, 5], [2, 9, 13, 13]],
    flowers: [[6, 3], [9, 12]],
    center: [6, 10],
  },
  {
    order: 14, slug: "vale-das-fadas", name: "Mapa 14: Vale das Fadas", shortName: "Vale das Fadas",
    flavor: "Campinas cor-de-rosa",
    cast: "Fadas, Normal e plantas de jardim — o mapa mais gentil da jornada inteira.",
    types: ["Fairy", "Normal", "Grass"],
    ground: "grass",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
    flowers: [[7, 3], [8, 12], [3, 8], [12, 7]],
  },
  {
    order: 15, slug: "fossa-abissal", name: "Mapa 15: Fossa Abissal", shortName: "Fossa Abissal",
    flavor: "Águas negras sem luz",
    cast: "Os aquáticos definitivos — polvos, estrelas-do-mar e jacarés de mar aberto.",
    types: ["Water", "Dragon", "Ice"],
    ground: "sand",
    grassRects: [[5, 4, 10, 12]],
    waterRects: [[1, 1, 4, 14], [11, 1, 14, 14]],
  },
  {
    order: 16, slug: "canion-dos-fosseis", name: "Mapa 16: Cânion dos Fósseis", shortName: "Cânion dos Fósseis",
    flavor: "Estratos escavados pelo tempo",
    cast: "Fósseis despertam nos degraus; Centro Pokémon no acampamento dos escavadores.",
    types: ["Rock", "Flying", "Ground"],
    ground: "sand",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [3, 9, 12, 13]],
    center: [6, 10],
  },
  {
    order: 17, slug: "selva-profunda", name: "Mapa 17: Selva Profunda", shortName: "Selva Profunda",
    flavor: "Dossel fechado que engole a luz",
    cast: "Insetos gigantes tesouram o ar e as linhas de dragão deslizam nos riachos.",
    types: ["Bug", "Grass", "Poison", "Dragon"],
    ground: "grass",
    grassRects: [[1, 1, 6, 6], [9, 1, 14, 6], [1, 9, 6, 14], [9, 9, 14, 14]],
  },
  {
    order: 18, slug: "rota-do-ceu", name: "Mapa 18: Rota do Céu", shortName: "Rota do Céu",
    flavor: "Correntes de ar acima das nuvens",
    cast: "Asas por todo lado: quem não voe aqui, pelo menos salta longe.",
    types: ["Flying", "Normal", "Dragon"],
    ground: "grass",
    grassRects: [[2, 3, 6, 7], [9, 3, 13, 7], [4, 10, 11, 13]],
    flowers: [[7, 2], [8, 13]],
  },
  {
    order: 19, slug: "caverna-suprema", name: "Mapa 19: Caverna Suprema", shortName: "Caverna Suprema",
    flavor: "O fundo do mundo",
    cast: "Psíquicos, Aço e o que sobrou dos Fantasmas no escuro de verdade.",
    types: ["Psychic", "Steel", "Ghost", "Dark"],
    ground: "stone",
    grassRects: [[2, 2, 6, 5], [9, 2, 13, 5], [2, 8, 5, 13], [9, 8, 13, 13]],
  },
  {
    order: 20, slug: "santuario-celeste", name: "Mapa 20: Santuário Celeste", shortName: "Santuário Celeste",
    flavor: "O topo da primeira jornada",
    cast: "Dragões reinam no templo; os lendários de Kanto e Johto assistem. Centro Pokémon no altar.",
    types: ["Dragon", "Flying", "Psychic"],
    ground: "grass",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [4, 9, 11, 13]],
    flowers: [[7, 3], [8, 12], [3, 8], [12, 8]],
    center: [6, 10],
    legendaryHaven: true,
  },

  // ── Mapas 21–40 (novos na 7.1) — a segunda metade da jornada ─────────────
  {
    order: 21, slug: "trilha-do-ocaso", name: "Mapa 21: Trilha do Ocaso", shortName: "Trilha do Ocaso",
    flavor: "Estrada de terra que só pega sol no fim do dia",
    cast: "Bichos de estrada, aves teimosas e Normal de trilha — a porta de entrada da segunda metade.",
    types: ["Normal", "Flying"],
    ground: "grass",
    grassRects: [[2, 2, 6, 5], [9, 2, 13, 5], [2, 10, 6, 13], [9, 10, 13, 13]],
    flowers: [[4, 7], [11, 8]],
  },
  {
    order: 22, slug: "bosque-da-seiva", name: "Mapa 22: Bosque da Seiva", shortName: "Bosque da Seiva",
    flavor: "Floresta que escorre resina",
    cast: "Plantas e insetos em bando; o chão é feito de folhas que ninguém varre.",
    types: ["Grass", "Bug"],
    ground: "grass",
    grassRects: [[1, 1, 6, 6], [9, 1, 14, 6], [1, 9, 6, 14], [9, 9, 14, 14]],
    flowers: [[7, 4], [8, 11]],
  },
  {
    order: 23, slug: "gruta-do-eco", name: "Mapa 23: Gruta do Eco", shortName: "Gruta do Eco",
    flavor: "Salões de pedra que devolvem a própria voz",
    cast: "Psíquicos de caverna, pedreiros antigos e os Lutadores que treinam no eco.",
    types: ["Psychic", "Rock", "Fighting"],
    ground: "stone",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 13, 13]],
  },
  {
    order: 24, slug: "praia-do-coral", name: "Mapa 24: Praia do Coral", shortName: "Praia do Coral",
    flavor: "Recife raso e areia branca",
    cast: "Aquáticos de água quente e caranguejos de concha; Centro Pokémon na barraca da praia.",
    types: ["Water", "Rock", "Bug"],
    ground: "sand",
    grassRects: [[2, 9, 6, 13], [9, 9, 13, 13]],
    waterRects: [[1, 1, 14, 6]],
    center: [7, 7],
  },
  {
    order: 25, slug: "forja-abandonada", name: "Mapa 25: Forja Abandonada", shortName: "Forja Abandonada",
    flavor: "Correntes e bigornas frias",
    cast: "Aço, pedra e Sombrios morando onde a indústria parou.",
    types: ["Steel", "Rock", "Dark"],
    ground: "stone",
    grassRects: [[2, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
  },
  {
    order: 26, slug: "pantano-do-silencio", name: "Mapa 26: Pântano do Silêncio", shortName: "Pântano do Silêncio",
    flavor: "Água parada que engole som",
    cast: "Venenos de água doce, larvas e o que rasteja entre as raízes.",
    types: ["Poison", "Bug", "Water"],
    ground: "grass",
    grassRects: [[2, 2, 6, 6], [9, 3, 13, 6], [3, 9, 12, 13]],
    waterRects: [[1, 9, 14, 13]],
  },
  {
    order: 27, slug: "cratera-de-brasa", name: "Mapa 27: Cratera de Brasa", shortName: "Cratera de Brasa",
    flavor: "Borda de um vulcão que ainda respira",
    cast: "Fogo, terra e os dragões que escolhem pedra quente para chocar.",
    types: ["Fire", "Ground", "Dragon"],
    ground: "stone",
    grassRects: [[1, 2, 6, 6], [9, 2, 14, 6], [4, 9, 11, 13]],
  },
  {
    order: 28, slug: "lago-espelhado", name: "Mapa 28: Lago Espelhado", shortName: "Lago Espelhado",
    flavor: "Água tão lisa que reflete duas vezes",
    cast: "Psíquicos aquáticos e medusas de água doce; o lago devolve o que você trouxe.",
    types: ["Water", "Psychic"],
    ground: "grass",
    grassRects: [[2, 2, 6, 5], [9, 2, 13, 5], [2, 10, 13, 13]],
    waterRects: [[5, 6, 10, 9]],
  },
  {
    order: 29, slug: "jardim-da-lua", name: "Mapa 29: Jardim da Lua", shortName: "Jardim da Lua",
    flavor: "Jardim noturno de flores pálidas",
    cast: "Fadas, sombrios e plantas de floração lenta; Centro Pokémon na fonte.",
    types: ["Fairy", "Grass", "Dark"],
    ground: "grass",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
    flowers: [[7, 2], [8, 13], [3, 7], [12, 8]],
    center: [7, 7],
  },
  {
    order: 30, slug: "recife-da-tempestade", name: "Mapa 30: Recife da Tempestade", shortName: "Recife da Tempestade",
    flavor: "Mar que nunca esteve calmo",
    cast: "Águas bravas, Lutadores de cais e tudo que aguenta a correnteza.",
    types: ["Water", "Fighting", "Flying"],
    ground: "sand",
    grassRects: [[2, 2, 6, 6], [9, 9, 13, 13]],
    waterRects: [[9, 1, 14, 6], [1, 9, 6, 13]],
  },
  {
    order: 31, slug: "duna-de-vidro", name: "Mapa 31: Duna de Vidro", shortName: "Duna de Vidro",
    flavor: "Areia vitrificada por um raio antigo",
    cast: "Terra, pedra e o eco de eletricidade no vidro.",
    types: ["Ground", "Rock", "Electric"],
    ground: "sand",
    grassRects: [[1, 1, 6, 6], [9, 2, 14, 7], [4, 9, 11, 13]],
  },
  {
    order: 32, slug: "geleira-suspensa", name: "Mapa 32: Geleira Suspensa", shortName: "Geleira Suspensa",
    flavor: "Plataforma de gelo acima da névoa",
    cast: "Gelo por todo lado e os aquáticos que aguentam água congelada.",
    types: ["Ice", "Water"],
    ground: "stone",
    grassRects: [[2, 2, 13, 6], [2, 9, 13, 13]],
    waterRects: [[6, 7, 9, 8]],
  },
  {
    order: 33, slug: "serra-fumegante", name: "Mapa 33: Serra Fumegante", shortName: "Serra Fumegante",
    flavor: "Serra com fissuras que sopram fumaça",
    cast: "Pedra quente, metal e fogo de mina; Lutadores treinam nas fissuras.",
    types: ["Fire", "Rock", "Fighting"],
    ground: "stone",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 6, 13], [9, 9, 13, 13]],
  },
  {
    order: 34, slug: "mata-noturna", name: "Mapa 34: Mata Noturna", shortName: "Mata Noturna",
    flavor: "Mata onde o dossel não deixa anoitecer acabar",
    cast: "Sombrios e insetos de asa opaca, com o Aço que a mina deixou para trás.",
    types: ["Dark", "Bug", "Ghost"],
    ground: "grass",
    grassRects: [[1, 1, 6, 7], [9, 1, 14, 7], [1, 9, 6, 14], [9, 9, 14, 14]],
  },
  {
    order: 35, slug: "farol-do-fim", name: "Mapa 35: Farol do Fim", shortName: "Farol do Fim",
    flavor: "Farol no último pedaço de terra",
    cast: "Fantasmas de marinheiro e os aquáticos que subiram do abismo.",
    types: ["Ghost", "Water"],
    ground: "sand",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [4, 10, 11, 13]],
    waterRects: [[1, 8, 14, 9]],
    center: [7, 7],
  },
  {
    order: 36, slug: "planalto-do-raio", name: "Mapa 36: Planalto do Raio", shortName: "Planalto do Raio",
    flavor: "Campo alto onde o raio escolhe pousar",
    cast: "Elétricos voadores e Aço de tempestade; o pelo fica em pé antes de ver bicho.",
    types: ["Electric", "Flying", "Steel"],
    ground: "grass",
    grassRects: [[2, 2, 13, 5], [2, 10, 13, 13]],
    flowers: [[6, 7], [9, 8]],
  },
  {
    order: 37, slug: "ninho-do-dragao", name: "Mapa 37: Ninho do Dragão", shortName: "Ninho do Dragão",
    flavor: "Anfiteatro de pedra morna com cheiro de escama e seiva",
    cast: "Onde as linhas de dragão — e os lagartos gigantes — terminam de crescer.",
    types: ["Dragon", "Grass", "Fire"],
    ground: "stone",
    grassRects: [[2, 2, 6, 6], [9, 2, 13, 6], [2, 9, 13, 13]],
  },
  {
    order: 38, slug: "tundra-ancestral", name: "Mapa 38: Tundra Ancestral", shortName: "Tundra Ancestral",
    flavor: "Planície congelada sobre osso e permafrost",
    cast: "Gelo antigo, terra dura e os Normal que nunca precisaram de sol.",
    types: ["Ice", "Ground", "Normal"],
    ground: "sand",
    grassRects: [[1, 2, 6, 7], [9, 2, 14, 7], [3, 10, 12, 13]],
    waterRects: [[1, 8, 14, 9]],
  },
  {
    order: 39, slug: "santuario-submerso", name: "Mapa 39: Santuário Submerso", shortName: "Santuário Submerso",
    flavor: "Templo que o mar decidiu guardar",
    cast: "Colunas cobertas de água, plantas de maré e lendários que dormiam embaixo delas.",
    types: ["Water", "Psychic", "Ghost", "Grass"],
    ground: "sand",
    grassRects: [[5, 2, 10, 6], [2, 9, 13, 13]],
    // A trilha em cruz pinta as linhas 7/8 — água declarada ali nunca vira
    // tile. As duas poças ficam nos braços norte/sul, onde o chão é areia.
    waterRects: [[1, 3, 4, 5], [11, 10, 14, 12]],
    center: [7, 7],
    legendaryHaven: true,
  },
  {
    order: 40, slug: "coroa-do-mundo", name: "Mapa 40: Coroa do Mundo", shortName: "Coroa do Mundo",
    flavor: "O último degrau da jornada",
    cast: "Dragões, Aço e os lendários de todas as gerações no andar de cima. Centro Pokémon no portal.",
    types: ["Dragon", "Steel", "Normal"],
    ground: "grass",
    grassRects: [[2, 2, 13, 5], [2, 9, 13, 13]],
    flowers: [[7, 7], [8, 8]],
    center: [6, 7],
    legendaryHaven: true,
  },
];

export function layoutByOrder(order: number): WorldMapLayout {
  const found = WORLD_MAP_LAYOUT.find((m) => m.order === order);
  if (!found) throw new Error(`layout inexistente para o mapa ${order}`);
  return found;
}

/** Descrições: flavor + faixa de nível + elenco (mapa 1 tem a frase travada). */
export function descriptionFor(layout: WorldMapLayout): string {
  if (layout.descriptionOverride) return layout.descriptionOverride;
  const [lo, hi] = bandFor(layout.order);
  return `${layout.flavor} (nv ${lo}–${hi}). ${layout.cast}`;
}
