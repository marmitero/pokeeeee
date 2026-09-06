import { EVOLUTION_ITEM_IDS } from "./evolution-items";
import { gen1Rest } from "./pokedex-gen1";
import { johtoRest } from "./pokedex-johto";

export type DelugeVariant =
  | "Normal"
  | "Shiny"
  | "Metallic"
  | "Mystic"
  | "Dark"
  | "Ghostly";

export interface PokemonMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  category: "Physical" | "Special" | "Status";
  description: string;
  sfx: "flame" | "thunder" | "water" | "slash" | "beam" | "heal";
}

/**
 * Um golpe e o nível em que a espécie o aprende (Fase 6.1).
 *
 * Antes da 6.1 não existia learnset: `PokemonSpecies.moves` era uma lista fixa
 * de 4 golpes de fim de jogo (poder 80–110) que o Pokémon carregava **desde o
 * nível 1**. Com ~20 de HP no nível 5, um Lança-Chamas com STAB e vantagem de
 * tipo causava 3,5× o HP total do alvo — todo combate inicial terminava em um
 * golpe. O learnset é a correção principal do balanceamento.
 */
export interface LearnsetEntry {
  level: number;
  move: PokemonMove;
}

/**
 * Para qual espécie esta evolui e o que dispara (Fase 6.3).
 *
 * Dirigido por dados, como o learnset da 6.1: a lista aceita gatilhos de
 * `"level"` (implementados), `"item"` e `"special"` (reservados para pedras de
 * evolução e afins — nada os usa ainda, e o teste de sanidade proíbe citá-los
 * antes de existirem). `level` é obrigatório para o gatilho de nível.
 */
export interface EvolvesTo {
  speciesId: number;
  trigger: "level" | "item" | "special";
  level?: number;
  itemId?: number;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  types: [string] | [string, string];
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpAtk: number;
  baseSpDef: number;
  baseSpd: number;
  catchRate: number;
  /** Todos os golpes da espécie, com o nível de aprendizado. Fonte da verdade. */
  learnset: LearnsetEntry[];
  /**
   * Evoluções possíveis a partir daqui (Fase 6.3). Vazio/omitido = não evolui.
   * Uma lista (e não um alvo único) porque linhas ramificadas (Eevee) existem.
   */
  evolvesTo?: EvolvesTo[];
  /**
   * Conjunto de fim de jogo (os 4 últimos golpes do learnset), derivado.
   *
   * Mantido porque a vitrine de sprites e alguns componentes exibem "os golpes
   * da espécie" sem contexto de nível. **Não** use isto para montar um
   * combatente — use `movesAtLevel`.
   */
  moves: PokemonMove[];
  frontSprite: string;
  backSprite: string;
  shinyFrontSprite: string;
  description: string;
}

/** Espécie como é escrita no catálogo: só o learnset; `moves` é derivado. */
export type PokemonSpeciesData = Omit<PokemonSpecies, "moves">;

/** Quantos golpes um Pokémon carrega em batalha. */
export const MOVE_SLOTS = 4;

/**
 * Nível máximo do jogo, replicado aqui para derivar o conjunto de fim de jogo.
 * Duplicado de propósito: `engine/xp.ts` importa a Pokédex, então importar
 * `MAX_LEVEL` de lá criaria ciclo de módulos.
 */
export const MAX_SPECIES_LEVEL = 100;

export const DELUGE_VARIANTS: {
  id: DelugeVariant;
  label: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  filterCss: string;
  auraCss: string;
  statBonusText: string;
}[] = [
  {
    id: "Normal",
    label: "NORMAL",
    badgeBg: "bg-slate-700",
    badgeBorder: "border-slate-500",
    badgeText: "text-slate-100",
    filterCss: "none",
    auraCss: "none",
    statBonusText: "Status balanceados clássicos",
  },
  {
    id: "Shiny",
    label: "★ SHINY",
    badgeBg: "bg-amber-500/20",
    badgeBorder: "border-amber-400",
    badgeText: "text-amber-300",
    filterCss: "saturate(1.45) hue-rotate(-20deg) brightness(1.1)",
    auraCss: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.85))",
    statBonusText: "+15% VEL / +10% HP • Estrela Dourada",
  },
  {
    id: "Metallic",
    label: "⚙ METALLIC",
    badgeBg: "bg-slate-400/25",
    badgeBorder: "border-cyan-300",
    badgeText: "text-cyan-200",
    filterCss: "grayscale(0.65) contrast(1.4) brightness(1.25)",
    auraCss: "drop-shadow(0 0 10px rgba(103, 232, 249, 0.9))",
    statBonusText: "+25% DEFESA & SP.DEF • Armadura de Aço",
  },
  {
    id: "Mystic",
    label: "✦ MYSTIC",
    badgeBg: "bg-purple-600/30",
    badgeBorder: "border-purple-400",
    badgeText: "text-purple-200",
    filterCss: "hue-rotate(240deg) saturate(1.8) brightness(1.15)",
    auraCss: "drop-shadow(0 0 12px rgba(168, 85, 247, 0.95))",
    statBonusText: "+25% SP. ATAQUE • Energia Arcana",
  },
  {
    id: "Dark",
    label: "🌑 DARK",
    badgeBg: "bg-red-950/60",
    badgeBorder: "border-red-500",
    badgeText: "text-red-400",
    filterCss: "brightness(0.72) contrast(1.45) sepia(0.55) hue-rotate(320deg)",
    auraCss: "drop-shadow(0 0 12px rgba(239, 68, 68, 0.95))",
    statBonusText: "+25% ATAQUE FÍSICO • Fúria Sombria",
  },
  {
    id: "Ghostly",
    label: "👻 GHOSTLY",
    badgeBg: "bg-cyan-950/60",
    badgeBorder: "border-teal-400",
    badgeText: "text-teal-300",
    filterCss: "invert(0.18) hue-rotate(160deg) opacity(0.92)",
    auraCss: "drop-shadow(0 0 12px rgba(45, 212, 191, 0.9))",
    statBonusText: "+20% ESQUIVA & CRÍTICO • Forma Espectral",
  },
];

export const ALL_MOVES: Record<string, PokemonMove> = {
  Flamethrower: {
    name: "Lança-Chamas",
    type: "Fire",
    power: 90,
    accuracy: 100,
    category: "Special",
    description: "Um jato de fogo ardente que pode queimar o oponente.",
    sfx: "flame",
  },
  DragonClaw: {
    name: "Garra Dragão",
    type: "Dragon",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Garras afiadas cortam o alvo com ferocidade.",
    sfx: "slash",
  },
  HydroPump: {
    name: "Jato d'Água",
    type: "Water",
    power: 110,
    accuracy: 80,
    category: "Special",
    description: "Um canhão de água pressurizado devastador.",
    sfx: "water",
  },
  Thunderbolt: {
    name: "Choque do Trovão",
    type: "Electric",
    power: 90,
    accuracy: 100,
    category: "Special",
    description: "Descarga elétrica de 100.000 volts.",
    sfx: "thunder",
  },
  SolarBeam: {
    name: "Raio Solar",
    type: "Grass",
    power: 105,
    accuracy: 100,
    category: "Special",
    description: "Concentra luz solar pura em um feixe laser.",
    sfx: "beam",
  },
  ShadowBall: {
    name: "Bola Sombria",
    type: "Ghost",
    power: 80,
    accuracy: 100,
    category: "Special",
    description: "Esfera de ectoplasma escuro.",
    sfx: "beam",
  },
  Psychic: {
    name: "Psíquico",
    type: "Psychic",
    power: 90,
    accuracy: 100,
    category: "Special",
    description: "Onda telecinética que esmaga a mente inimiga.",
    sfx: "beam",
  },
  QuickAttack: {
    name: "Ataque Rápido",
    type: "Normal",
    power: 35,
    accuracy: 100,
    category: "Physical",
    description: "Avanço em alta velocidade imbatível.",
    sfx: "slash",
  },
  IceBeam: {
    name: "Raio Congelante",
    type: "Ice",
    power: 90,
    accuracy: 100,
    category: "Special",
    description: "Feixe gélido que pode congelar o alvo.",
    sfx: "beam",
  },
  DarkPulse: {
    name: "Pulso Sombrio",
    type: "Dark",
    power: 80,
    accuracy: 100,
    category: "Special",
    description: "Aura cheia de pensamentos sombrios.",
    sfx: "beam",
  },
  Earthquake: {
    name: "Terremoto",
    type: "Ground",
    power: 100,
    accuracy: 100,
    category: "Physical",
    description: "Abalo sísmico que atinge o solo.",
    sfx: "slash",
  },
  AuraSphere: {
    name: "Esfera de Aura",
    type: "Fighting",
    power: 80,
    accuracy: 100,
    category: "Special",
    description: "Disparo de aura espiritual que nunca erra.",
    sfx: "beam",
  },
  // ── Adicionados na Fase 3 (B2): necessários para os Pokémon de ginásio
  //    que existiam em seed-gym.ts mas não na Pokédex, e para o AirSlash que
  //    Charizard referenciava sem existir (B12).
  Tackle: {
    name: "Investida",
    type: "Normal",
    power: 25,
    accuracy: 100,
    category: "Physical",
    description: "Um ataque corporal simples que atinge o alvo em cheio.",
    sfx: "slash",
  },
  RockThrow: {
    name: "Arremesso de Rocha",
    type: "Rock",
    power: 50,
    accuracy: 90,
    category: "Physical",
    description: "Atira pedras pequenas para acertar o oponente.",
    sfx: "slash",
  },
  RockSlide: {
    name: "Deslizamento de Pedras",
    type: "Rock",
    power: 75,
    accuracy: 90,
    category: "Physical",
    description: "Rochas enormes caem sobre o alvo e podem fazê-lo hesitar.",
    sfx: "slash",
  },
  IronTail: {
    name: "Cauda de Ferro",
    type: "Steel",
    power: 100,
    accuracy: 75,
    category: "Physical",
    description: "Golpeia com uma cauda dura como ferro; pode reduzir a defesa.",
    sfx: "slash",
  },
  WaterPulse: {
    name: "Pulso d'Água",
    type: "Water",
    power: 60,
    accuracy: 100,
    category: "Special",
    description: "Um jato de água pulsado que pode confundir o alvo.",
    sfx: "water",
  },
  AirSlash: {
    name: "Corte Aéreo",
    type: "Flying",
    power: 75,
    accuracy: 95,
    category: "Special",
    description: "Lâminas de ar cortam o céu; podem fazer o alvo hesitar.",
    sfx: "beam",
  },
  DragonPulse: {
    name: "Pulso do Dragão",
    type: "Dragon",
    power: 85,
    accuracy: 100,
    category: "Special",
    description: "Uma onda de choque draconiana emitida pela boca aberta.",
    sfx: "beam",
  },

  // ── Fase 6.1 — golpes de início e de meio de jogo ────────────────────────
  //
  // Antes da 6.1 o catálogo só tinha golpes de fim de jogo (poder 80–110) e
  // toda espécie os carregava desde o nível 1. Estes golpes fracos existem
  // para o `learnset` ter o que entregar nos primeiros níveis.
  //
  // Fase 6.2-C: os golpes fracos de iniciais e dos bichos dos primeiros mapas
  // (aprendidos até o nível ~7) ficam confinados à faixa **15–35**. O `+2`
  // constante da fórmula achata qualquer coisa abaixo de 15 (poder 5, 10 e 15
  // causam praticamente o mesmo dano), e acima de ~35 um golpe tipado com
  // STAB + vantagem já nocauteia um inicial de nível 5 num crítico — o que
  // forçaria a manter o teto de dano aposentado nesta fase. A progressão do
  // começo do jogo passou a ser: neutra 20–25 → tipada 25 → upgrade 35 (nível
  // 7) → 50–65 (nível 12).
  Scratch: {
    name: "Arranhão",
    type: "Normal",
    power: 20,
    accuracy: 100,
    category: "Physical",
    description: "Garras afiadas arranham o alvo repetidamente.",
    sfx: "slash",
  },
  BodySlam: {
    name: "Golpe Corporal",
    type: "Normal",
    power: 70,
    accuracy: 100,
    category: "Physical",
    description: "Joga o corpo inteiro sobre o oponente.",
    sfx: "slash",
  },
  Ember: {
    name: "Brasa",
    type: "Fire",
    power: 25,
    accuracy: 100,
    category: "Special",
    description: "Cospe pequenas chamas na direção do alvo.",
    sfx: "flame",
  },
  FireFang: {
    name: "Presa de Fogo",
    type: "Fire",
    power: 65,
    accuracy: 95,
    category: "Physical",
    description: "Morde o alvo com presas envoltas em chamas.",
    sfx: "flame",
  },
  Bubble: {
    name: "Bolha",
    type: "Water",
    power: 25,
    accuracy: 100,
    category: "Special",
    description: "Dispara uma rajada de bolhas contra o alvo.",
    sfx: "water",
  },
  VineWhip: {
    name: "Chicote de Cipó",
    type: "Grass",
    power: 25,
    accuracy: 100,
    category: "Physical",
    description: "Chicoteia o alvo com cipós finos e flexíveis.",
    sfx: "slash",
  },
  RazorLeaf: {
    name: "Folha Navalha",
    type: "Grass",
    power: 35,
    accuracy: 95,
    category: "Physical",
    description: "Folhas afiadas cortam o ar em direção ao oponente.",
    sfx: "slash",
  },
  ThunderShock: {
    name: "Choque",
    type: "Electric",
    power: 25,
    accuracy: 100,
    category: "Special",
    description: "Uma descarga elétrica fraca, porém certeira.",
    sfx: "thunder",
  },
  Spark: {
    name: "Faísca",
    type: "Electric",
    power: 65,
    accuracy: 100,
    category: "Physical",
    description: "Avança envolto em uma carga elétrica crepitante.",
    sfx: "thunder",
  },
  Confusion: {
    name: "Confusão",
    type: "Psychic",
    power: 50,
    accuracy: 100,
    category: "Special",
    description: "Um leve pulso telecinético atinge a mente do alvo.",
    sfx: "beam",
  },
  Psybeam: {
    name: "Psico-Raio",
    type: "Psychic",
    power: 65,
    accuracy: 100,
    category: "Special",
    description: "Um feixe mental estranho atinge o oponente.",
    sfx: "beam",
  },
  MudSlap: {
    name: "Bofetada de Lama",
    type: "Ground",
    power: 35,
    accuracy: 100,
    category: "Special",
    description: "Atira lama no rosto do alvo para atrapalhar sua mira.",
    sfx: "slash",
  },
  Dig: {
    name: "Escavar",
    type: "Ground",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Cava o solo e irrompe embaixo do oponente.",
    sfx: "slash",
  },
  Lick: {
    name: "Lambida",
    type: "Ghost",
    power: 30,
    accuracy: 100,
    category: "Physical",
    description: "Uma língua espectral lambe o alvo e o arrepia.",
    sfx: "slash",
  },
  Bite: {
    name: "Mordida",
    type: "Dark",
    power: 60,
    accuracy: 100,
    category: "Physical",
    description: "Crava presas afiadas para intimidar o oponente.",
    sfx: "slash",
  },
  IceShard: {
    name: "Estilhaço de Gelo",
    type: "Ice",
    power: 35,
    accuracy: 100,
    category: "Physical",
    description: "Lascas de gelo disparadas em alta velocidade.",
    sfx: "beam",
  },
  IcyWind: {
    name: "Vento Gélido",
    type: "Ice",
    power: 55,
    accuracy: 95,
    category: "Special",
    description: "Uma lufada congelante que reduz o ímpeto do alvo.",
    sfx: "beam",
  },
  KarateChop: {
    name: "Golpe de Caratê",
    type: "Fighting",
    power: 50,
    accuracy: 100,
    category: "Physical",
    description: "Um golpe de mão aberta com precisão marcial.",
    sfx: "slash",
  },
  Gust: {
    name: "Rajada",
    type: "Flying",
    power: 25,
    accuracy: 100,
    category: "Special",
    description: "Bate as asas e cria um vento cortante.",
    sfx: "beam",
  },
  WingAttack: {
    name: "Ataque de Asa",
    type: "Flying",
    power: 60,
    accuracy: 100,
    category: "Physical",
    description: "Atinge o alvo com asas amplamente abertas.",
    sfx: "slash",
  },
  MetalClaw: {
    name: "Garra de Metal",
    type: "Steel",
    power: 35,
    accuracy: 95,
    category: "Physical",
    description: "Corta o alvo com garras de aço endurecido.",
    sfx: "slash",
  },
  DragonBreath: {
    name: "Sopro do Dragão",
    type: "Dragon",
    power: 60,
    accuracy: 100,
    category: "Special",
    description: "Um sopro poderoso que sacode o oponente.",
    sfx: "beam",
  },
  RockPolish: {
    name: "Rocha Rolante",
    type: "Rock",
    power: 45,
    accuracy: 100,
    category: "Physical",
    description: "Rola uma pedra pesada por cima do alvo.",
    sfx: "slash",
  },

  // ── Fase 6.3-A — catálogo Kanto completo ─────────────────────────────────
  //
  // Tipos que ainda não tinham NENHUM golpe no catálogo (Poison, Bug, Fairy)
  // e variedade de fim de jogo para Water/Electric. Sem isto, espécies
  // desses tipos lutariam com golpes nebulosos — a tabela de efetividade 18×18
  // já existia desde a Fase 2, faltava o conteúdo.
  Surf: {
    name: "Surf",
    type: "Water",
    power: 90,
    accuracy: 100,
    category: "Special",
    description: "Uma onda enorme arremessa o alvo para cima e para baixo.",
    sfx: "water",
  },
  Thunder: {
    name: "Trovoada",
    type: "Electric",
    power: 110,
    accuracy: 70,
    category: "Special",
    description: "Um raio brutal cai do céu; pode fazer o alvo hesitar.",
    sfx: "thunder",
  },
  PoisonSting: {
    name: "Ferrão",
    type: "Poison",
    power: 25,
    accuracy: 100,
    category: "Physical",
    description: "Perfura o alvo com um ferrão venenoso.",
    sfx: "slash",
  },
  Sludge: {
    name: "Lodo",
    type: "Poison",
    power: 65,
    accuracy: 100,
    category: "Special",
    description: "Arremessa lama suja no alvo.",
    sfx: "water",
  },
  SludgeBomb: {
    name: "Bomba de Lodo",
    type: "Poison",
    power: 90,
    accuracy: 100,
    category: "Special",
    description: "Explode lodo tóxico que pode envenenar o alvo.",
    sfx: "beam",
  },
  FuryCutter: {
    name: "Corte Fúria",
    type: "Bug",
    power: 40,
    accuracy: 95,
    category: "Physical",
    description: "Cortes sucessivos que afiam a cada golpe.",
    sfx: "slash",
  },
  BugBite: {
    name: "Insetada",
    type: "Bug",
    power: 60,
    accuracy: 100,
    category: "Physical",
    description: "Morde o alvo com mandíbulas de inseto.",
    sfx: "slash",
  },
  XScissor: {
    name: "Tesoura X",
    type: "Bug",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Cruza garras como tesouras e rasga o alvo.",
    sfx: "slash",
  },
  FairyWind: {
    name: "Vento de Fada",
    type: "Fairy",
    power: 25,
    accuracy: 100,
    category: "Special",
    description: "Uma brisa encantada que arrasta o alvo.",
    sfx: "beam",
  },
  PlayRough: {
    name: "Luta Fofa",
    type: "Fairy",
    power: 90,
    accuracy: 90,
    category: "Physical",
    description: "Brinca com o alvo até machucar de verdade.",
    sfx: "slash",
  },
  Moonblast: {
    name: "Força Lunar",
    type: "Fairy",
    power: 95,
    accuracy: 100,
    category: "Special",
    description: "Canaliza o poder da lua num golpe ofuscante.",
    sfx: "beam",
  },

  // ── Fase 6.3-B — golpes com identidade (Gens 1–3, foco nos jogos de GBA) ──
  //
  // Pesquisa: learnsets de nível/TM/tutor de Ruby/Sapphire/Emerald/FireRed/
  // LeafGreen (e Gen 1/2 onde o golpe é antigo), via pokemondb.net/pokedex/
  // <espécie>/moves/3 e Bulbapedia. O objetivo do mantenedor: acabar com os
  // "ataques genéricos" — cada espécie recebe golpes condizentes com seu tipo
  // E sua raça/linha (assinaturas como Presas Hyper do Rattata, Martelo Pinça
  // do Krabby, Ossomerangue do Cubone, Gancho do Céu do Hitmonchan...).
  //
  // Rúbrio de conversão (fontes diferentes → uma casa só; o motor não modela
  // efeitos secundários, então eles viram ajuste de números):
  // - Valores da era GBA quando existem (Premonição 80/90, Fúria 90, Dança
  //   das Pétalas 70); senão, valores modernos.
  // - Multigolpes (Agulha Dupla, Ossomerangue) = golpe único com a soma dos
  //   golpes e ~10–15% de desconto (sem a segunda chance de crítico).
  // - Efeito não modelado (recuo, dreno, carga, troca, precisão própria)
  //   = desconto de ~5 de poder ou de precisão. Golpes de status ficam de
  //   fora (o motor os trataria como "nada aconteceu").
  // - Nunca erra (Rápido, Onda de Choque, Ás dos Ares, Ataque Falso,
  //   Bomba Magnética, Voz Encantadora) = precisão 100, igual ao resto do
  //   catálogo; a descrição preserva a identidade.
  // - Teto da casa: poder ≤ 115 e precisão ≥ 50 (Hiper Raio e Superaquecimento
  //   são os tetos de Normal/Fogo; Jato d'Água segue sendo a água máxima).

  // Normal — investidas, mordidas e finalizadores
  ViceGrip: {
    name: "Pegada Viciante",
    type: "Normal",
    power: 55,
    accuracy: 100,
    category: "Physical",
    description: "Aperta o alvo com pinças grossas e implacáveis.",
    sfx: "slash",
  },
  Slash: {
    name: "Corte",
    type: "Normal",
    power: 70,
    accuracy: 100,
    category: "Physical",
    description: "Rasga o alvo com garras ou foices; tende a acertar pontos vitais.",
    sfx: "slash",
  },
  Headbutt: {
    name: "Cabeçada",
    type: "Normal",
    power: 70,
    accuracy: 100,
    category: "Physical",
    description: "Uma tromba com a cabeça cheia de casco ou de chifres.",
    sfx: "slash",
  },
  Swift: {
    name: "Rápido",
    type: "Normal",
    power: 60,
    accuracy: 100,
    category: "Special",
    description: "Dispara estrelas que perseguem o alvo — nunca erram.",
    sfx: "beam",
  },
  HyperFang: {
    name: "Hiperpresa",
    type: "Normal",
    power: 80,
    accuracy: 90,
    category: "Physical",
    description: "Crava os incisivos afiadíssimos com força para rasgar.",
    sfx: "slash",
  },
  PayDay: {
    name: "Dia de Pagamento",
    type: "Normal",
    power: 40,
    accuracy: 100,
    category: "Physical",
    description: "Arremessa moedas cintilantes que cortam o alvo.",
    sfx: "slash",
  },
  TakeDown: {
    name: "Arremetida",
    type: "Normal",
    power: 85,
    accuracy: 85,
    category: "Physical",
    description: "Investida descuidada que arrasta o usuário junto (sem recuo aqui).",
    sfx: "slash",
  },
  SkullBash: {
    name: "Cabeçada Ossuda",
    type: "Normal",
    power: 85,
    accuracy: 95,
    category: "Physical",
    description: "Recolhe a cabeça no casco e dispara como um projétil.",
    sfx: "slash",
  },
  ExtremeSpeed: {
    name: "Velocidade Extrema",
    type: "Normal",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Avança antes que o olho perceba o movimento.",
    sfx: "slash",
  },
  HyperBeam: {
    name: "Hiper Raio",
    type: "Normal",
    power: 115,
    accuracy: 85,
    category: "Special",
    description: "Feixe devastador que drena quem o dispara (sem recarga aqui).",
    sfx: "beam",
  },

  // Fogo
  FireSpin: {
    name: "Redemoinho de Fogo",
    type: "Fire",
    power: 35,
    accuracy: 85,
    category: "Special",
    description: "Um redemoinho de chamas prende o alvo em espiral.",
    sfx: "flame",
  },
  FlameWheel: {
    name: "Roda de Fogo",
    type: "Fire",
    power: 60,
    accuracy: 100,
    category: "Physical",
    description: "Envolve o corpo em chamas e rola sobre o oponente.",
    sfx: "flame",
  },
  FirePunch: {
    name: "Soco de Fogo",
    type: "Fire",
    power: 75,
    accuracy: 100,
    category: "Physical",
    description: "Um punho envolto em chamas, golpe pesado e certeiro.",
    sfx: "flame",
  },
  FireBlast: {
    name: "Explosão de Fogo",
    type: "Fire",
    power: 110,
    accuracy: 85,
    category: "Special",
    description: "Uma flor de fogo colossal explode sobre o alvo.",
    sfx: "flame",
  },
  Overheat: {
    name: "Superaquecimento",
    type: "Fire",
    power: 115,
    accuracy: 90,
    category: "Special",
    description: "Queima toda a energia de uma vez; depois dela, sobra fumaça.",
    sfx: "flame",
  },

  // Água
  WaterGun: {
    name: "Pistola d'Água",
    type: "Water",
    power: 40,
    accuracy: 100,
    category: "Special",
    description: "Um jato curto e certeiro de água pressurizada.",
    sfx: "water",
  },
  BubbleBeam: {
    name: "Raio de Bolhas",
    type: "Water",
    power: 65,
    accuracy: 100,
    category: "Special",
    description: "Uma rajada de bolhas que bombardeia o alvo.",
    sfx: "water",
  },
  Waterfall: {
    name: "Cachoeira",
    type: "Water",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Arremete com a força de uma queda d'água.",
    sfx: "water",
  },
  Crabhammer: {
    name: "Martelo Pinça",
    type: "Water",
    power: 100,
    accuracy: 90,
    category: "Physical",
    description: "Esmaga o alvo com uma pinça enorme como um martelo.",
    sfx: "slash",
  },

  // Grama
  Absorb: {
    name: "Absorver",
    type: "Grass",
    power: 20,
    accuracy: 100,
    category: "Special",
    description: "Suga a energia do alvo por raízes invisíveis.",
    sfx: "heal",
  },
  MegaDrain: {
    name: "Mega Dreno",
    type: "Grass",
    power: 40,
    accuracy: 100,
    category: "Special",
    description: "Drena seiva e ânimo com fios de energia verde.",
    sfx: "heal",
  },
  PetalDance: {
    name: "Dança das Pétalas",
    type: "Grass",
    power: 70,
    accuracy: 100,
    category: "Special",
    description: "Uma tempestade de pétalas girantes corta o alvo.",
    sfx: "beam",
  },
  SeedBomb: {
    name: "Bomba de Sementes",
    type: "Grass",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Dispara sementes duras que explodem no impacto.",
    sfx: "slash",
  },
  LeafBlade: {
    name: "Lâmina de Folha",
    type: "Grass",
    power: 90,
    accuracy: 100,
    category: "Physical",
    description: "Esfola o alvo com uma folha afiada como espada.",
    sfx: "slash",
  },
  EnergyBall: {
    name: "Bola de Energia",
    type: "Grass",
    power: 85,
    accuracy: 100,
    category: "Special",
    description: "Uma esfera de energia vegetal colide com o alvo.",
    sfx: "beam",
  },

  // Elétrico
  ShockWave: {
    name: "Onda de Choque",
    type: "Electric",
    power: 60,
    accuracy: 100,
    category: "Special",
    description: "Corrente veloz que rastreia o alvo — nunca erra.",
    sfx: "thunder",
  },
  ThunderPunch: {
    name: "Soco Trovejante",
    type: "Electric",
    power: 75,
    accuracy: 100,
    category: "Physical",
    description: "Um soco carregado com alta tensão.",
    sfx: "thunder",
  },
  Discharge: {
    name: "Descarga",
    type: "Electric",
    power: 80,
    accuracy: 100,
    category: "Special",
    description: "Solta toda a carga acumulada de uma vez.",
    sfx: "thunder",
  },
  WildCharge: {
    name: "Carga Selvagem",
    type: "Electric",
    power: 85,
    accuracy: 95,
    category: "Physical",
    description: "Investida elétrica que sacode o próprio corpo (sem recuo aqui).",
    sfx: "thunder",
  },

  // Psíquico
  FutureSight: {
    name: "Premonição",
    type: "Psychic",
    power: 80,
    accuracy: 90,
    category: "Special",
    description: "Um golpe do futuro que atravessa o presente.",
    sfx: "beam",
  },
  ZenHeadbutt: {
    name: "Cabeçada Zen",
    type: "Psychic",
    power: 80,
    accuracy: 90,
    category: "Physical",
    description: "Concentra a vontade na cabeça e tromba com precisão.",
    sfx: "slash",
  },

  // Fantasma
  Astonish: {
    name: "Assustar",
    type: "Ghost",
    power: 30,
    accuracy: 100,
    category: "Physical",
    description: "Surge de repente na cara do alvo, arrepianando-o.",
    sfx: "slash",
  },
  ShadowSneak: {
    name: "Avanço Sombrio",
    type: "Ghost",
    power: 40,
    accuracy: 100,
    category: "Physical",
    description: "A própria sombra avança e golpeia por baixo.",
    sfx: "slash",
  },

  // Sombrio
  Pursuit: {
    name: "Perseguição",
    type: "Dark",
    power: 40,
    accuracy: 100,
    category: "Physical",
    description: "Um ataque que pune quem tenta fugir.",
    sfx: "slash",
  },
  FeintAttack: {
    name: "Ataque Falso",
    type: "Dark",
    power: 60,
    accuracy: 100,
    category: "Physical",
    description: "Finge desviar e golpeia de raspão — nunca erra.",
    sfx: "slash",
  },
  NightSlash: {
    name: "Corte Noturno",
    type: "Dark",
    power: 70,
    accuracy: 100,
    category: "Physical",
    description: "Um talho frio buscado no ponto cego do alvo.",
    sfx: "slash",
  },
  Crunch: {
    name: "Mastigar",
    type: "Dark",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Mordida com tudo que a mandíbula tem.",
    sfx: "slash",
  },

  // Inseto
  Twineedle: {
    name: "Agulha Dupla",
    type: "Bug",
    power: 45,
    accuracy: 95,
    category: "Physical",
    description: "Dois ferrões seguidos disparados em rajada.",
    sfx: "slash",
  },
  SilverWind: {
    name: "Vento Prateado",
    type: "Bug",
    power: 60,
    accuracy: 100,
    category: "Special",
    description: "Escamas pulverizadas formam um vento que brilha como prata.",
    sfx: "beam",
  },
  SignalBeam: {
    name: "Raio de Sinal",
    type: "Bug",
    power: 75,
    accuracy: 100,
    category: "Special",
    description: "Um feixe sinuoso de luz perturbadora.",
    sfx: "beam",
  },
  LeechLife: {
    name: "Chupavidas",
    type: "Bug",
    power: 20,
    accuracy: 100,
    category: "Physical",
    description: "Ferra e suga a energia que mantém o alvo de pé.",
    sfx: "heal",
  },

  // Lutador
  LowKick: {
    name: "Rasteira",
    type: "Fighting",
    power: 50,
    accuracy: 100,
    category: "Physical",
    description: "Varredão nas pernas do oponente.",
    sfx: "slash",
  },
  MachPunch: {
    name: "Soco Sônico",
    type: "Fighting",
    power: 40,
    accuracy: 100,
    category: "Physical",
    description: "Soco disparado mais rápido que o reflexo.",
    sfx: "slash",
  },
  RollingKick: {
    name: "Chute Rolante",
    type: "Fighting",
    power: 60,
    accuracy: 85,
    category: "Physical",
    description: "Gira o corpo inteiro e chicoteia com a perna estendida.",
    sfx: "slash",
  },
  VitalThrow: {
    name: "Arremesso Vital",
    type: "Fighting",
    power: 70,
    accuracy: 100,
    category: "Physical",
    description: "Agarra e arremessa mirando um ponto vital — nunca erra.",
    sfx: "slash",
  },
  BrickBreak: {
    name: "Quebra-Bloco",
    type: "Fighting",
    power: 75,
    accuracy: 100,
    category: "Physical",
    description: "Golpe de mão que estilhaça pedra e proteções.",
    sfx: "slash",
  },
  Submission: {
    name: "Submissão",
    type: "Fighting",
    power: 80,
    accuracy: 80,
    category: "Physical",
    description: "Agarramento que força o alvo até o limite.",
    sfx: "slash",
  },
  SkyUppercut: {
    name: "Gancho do Céu",
    type: "Fighting",
    power: 85,
    accuracy: 90,
    category: "Physical",
    description: "Um uppercut que procura o queixo até no ar.",
    sfx: "slash",
  },
  HighJumpKick: {
    name: "Chute de Salto Alto",
    type: "Fighting",
    power: 100,
    accuracy: 90,
    category: "Physical",
    description: "Salta e desce com o calcanhar como machado.",
    sfx: "slash",
  },
  CrossChop: {
    name: "Golpe Cruzado",
    type: "Fighting",
    power: 100,
    accuracy: 80,
    category: "Physical",
    description: "Os dois braços cruzados descem como machadinhas.",
    sfx: "slash",
  },
  DynamicPunch: {
    name: "Soco Dinâmico",
    type: "Fighting",
    power: 100,
    accuracy: 50,
    category: "Physical",
    description: "Um soco perfeito — quando acerta, o mundo gira.",
    sfx: "slash",
  },

  // Pedra
  RockTomb: {
    name: "Tumba de Pedras",
    type: "Rock",
    power: 50,
    accuracy: 80,
    category: "Physical",
    description: "Rochas despencam e prendem os pés do alvo.",
    sfx: "slash",
  },
  AncientPower: {
    name: "Poder Antigo",
    type: "Rock",
    power: 60,
    accuracy: 100,
    category: "Special",
    description: "Energia primordial erupta pelas rochas.",
    sfx: "beam",
  },
  StoneEdge: {
    name: "Gume de Pedra",
    type: "Rock",
    power: 100,
    accuracy: 80,
    category: "Physical",
    description: "Lascas de rocha afiadas espetam por baixo do alvo.",
    sfx: "slash",
  },

  // Terrestre
  MudShot: {
    name: "Disparo de Lama",
    type: "Ground",
    power: 55,
    accuracy: 95,
    category: "Special",
    description: "Lama pesada atirada em cheio no rosto.",
    sfx: "water",
  },
  BoneClub: {
    name: "Clava de Osso",
    type: "Ground",
    power: 65,
    accuracy: 85,
    category: "Physical",
    description: "Golpeia com um osso duro herdado da mãe.",
    sfx: "slash",
  },
  Bonemerang: {
    name: "Ossomerangue",
    type: "Ground",
    power: 85,
    accuracy: 90,
    category: "Physical",
    description: "O osso voa, bate e volta à mão do dono.",
    sfx: "slash",
  },
  EarthPower: {
    name: "Força Terrestre",
    type: "Ground",
    power: 90,
    accuracy: 100,
    category: "Special",
    description: "O chão inteiro fervilha sob os pés do alvo.",
    sfx: "beam",
  },

  // Gelo
  PowderSnow: {
    name: "Pó de Neve",
    type: "Ice",
    power: 40,
    accuracy: 100,
    category: "Special",
    description: "Uma baforada de neve seca e congelante.",
    sfx: "beam",
  },
  AuroraBeam: {
    name: "Raio Aurora",
    type: "Ice",
    power: 65,
    accuracy: 100,
    category: "Special",
    description: "Um feixe de luz polar que atravessa o ar frio.",
    sfx: "beam",
  },
  IcePunch: {
    name: "Soco de Gelo",
    type: "Ice",
    power: 75,
    accuracy: 100,
    category: "Physical",
    description: "Um soco com o punho coberto de gelo.",
    sfx: "beam",
  },
  IceFang: {
    name: "Presa de Gelo",
    type: "Ice",
    power: 65,
    accuracy: 95,
    category: "Physical",
    description: "Mordida com mandíbulas cristalizadas de geada.",
    sfx: "slash",
  },
  Blizzard: {
    name: "Nevasca",
    type: "Ice",
    power: 110,
    accuracy: 70,
    category: "Special",
    description: "Uma tormenta de neve engole o campo de batalha.",
    sfx: "beam",
  },

  // Voador
  Peck: {
    name: "Bicada",
    type: "Flying",
    power: 35,
    accuracy: 100,
    category: "Physical",
    description: "Bica o alvo com um rostro afiado.",
    sfx: "slash",
  },
  AerialAce: {
    name: "Ás dos Ares",
    type: "Flying",
    power: 60,
    accuracy: 100,
    category: "Physical",
    description: "Manobra veloz de voo que nunca erra o alvo.",
    sfx: "slash",
  },
  DrillPeck: {
    name: "Bico Broca",
    type: "Flying",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Gira o bico como uma broca e perfura.",
    sfx: "slash",
  },
  Fly: {
    name: "Voo",
    type: "Flying",
    power: 80,
    accuracy: 95,
    category: "Physical",
    description: "Sobe fora do alcance e desce em queda livre.",
    sfx: "slash",
  },
  Bounce: {
    name: "Salto",
    type: "Flying",
    power: 85,
    accuracy: 85,
    category: "Physical",
    description: "Quica alto e cai com todo o peso do corpo.",
    sfx: "slash",
  },

  // Veneno
  Acid: {
    name: "Ácido",
    type: "Poison",
    power: 40,
    accuracy: 100,
    category: "Special",
    description: "Cospe um jato corrosivo que fende a defesa.",
    sfx: "water",
  },
  PoisonFang: {
    name: "Presa Venenosa",
    type: "Poison",
    power: 65,
    accuracy: 100,
    category: "Physical",
    description: "Mordida que injeta veneno concentrado.",
    sfx: "slash",
  },
  PoisonJab: {
    name: "Estocada Venenosa",
    type: "Poison",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Avança com o ferrão encharcado de toxina.",
    sfx: "slash",
  },

  // Aço
  MagnetBomb: {
    name: "Bomba Magnética",
    type: "Steel",
    power: 60,
    accuracy: 100,
    category: "Physical",
    description: "Dispara esferas magnéticas guiadas — nunca erram.",
    sfx: "beam",
  },
  SteelWing: {
    name: "Asa de Aço",
    type: "Steel",
    power: 70,
    accuracy: 90,
    category: "Physical",
    description: "Golpeia com asas temperadas como lâminas.",
    sfx: "slash",
  },
  IronHead: {
    name: "Cabeça de Ferro",
    type: "Steel",
    power: 80,
    accuracy: 100,
    category: "Physical",
    description: "Uma cabeça de aço maciço usada como aríete.",
    sfx: "slash",
  },
  FlashCannon: {
    name: "Canhão de Luz",
    type: "Steel",
    power: 80,
    accuracy: 100,
    category: "Special",
    description: "Condensa luz metálica num disparo perfurante.",
    sfx: "beam",
  },

  // Dragão
  Twister: {
    name: "Tornado",
    type: "Dragon",
    power: 40,
    accuracy: 100,
    category: "Special",
    description: "Um redemoinho violento levanta o alvo do chão.",
    sfx: "beam",
  },
  Outrage: {
    name: "Fúria",
    type: "Dragon",
    power: 90,
    accuracy: 100,
    category: "Physical",
    description: "Fúria cega: golpeia tudo ao redor sem parar.",
    sfx: "slash",
  },

  // Fada
  DisarmingVoice: {
    name: "Voz Encantadora",
    type: "Fairy",
    power: 40,
    accuracy: 100,
    category: "Special",
    description: "Um chamado doce que ecoa — nunca erra.",
    sfx: "beam",
  },
  DrainingKiss: {
    name: "Beijo Drenante",
    type: "Fairy",
    power: 50,
    accuracy: 100,
    category: "Special",
    description: "Um beijo que carrega a energia de quem o recebe.",
    sfx: "heal",
  },
  DazzlingGleam: {
    name: "Luz Deslumbrante",
    type: "Fairy",
    power: 80,
    accuracy: 100,
    category: "Special",
    description: "Um clarão rosa intenso inunda o oponente.",
    sfx: "beam",
  },
};

/** Tipo do catálogo de golpes — usado por `pokedex-gen1.ts` sem ciclo de módulos. */
export type AllMoves = typeof ALL_MOVES;

const POKEDEX_BASE: PokemonSpeciesData[] = [
  {
    id: 1,
    name: "Bulbasaur",
    types: ["Grass", "Poison"],
    baseHp: 45,
    baseAtk: 49,
    baseDef: 49,
    baseSpAtk: 65,
    baseSpDef: 65,
    baseSpd: 45,
    catchRate: 45,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.VineWhip },
      { level: 7, move: ALL_MOVES.RazorLeaf },
      { level: 13, move: ALL_MOVES.PoisonSting },
      { level: 18, move: ALL_MOVES.MegaDrain },
      { level: 24, move: ALL_MOVES.Sludge },
      { level: 32, move: ALL_MOVES.EnergyBall },
      { level: 40, move: ALL_MOVES.Earthquake },
      { level: 48, move: ALL_MOVES.SolarBeam },
    ],
    evolvesTo: [{ speciesId: 2, trigger: "level", level: 16 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/1.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/1.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/1.gif",
    description: "Um bulbo de semente em suas costas cresce absorvendo energia solar.",
  },
  {
    id: 2,
    name: "Ivysaur",
    types: ["Grass", "Poison"],
    baseHp: 60,
    baseAtk: 62,
    baseDef: 63,
    baseSpAtk: 80,
    baseSpDef: 80,
    baseSpd: 60,
    catchRate: 45,
    // Fase 6.3: herda o learnset da linha — evoluir no nível 16 não pode
    // fazer o Pokémon "esquecer" a curva de golpes que ele já seguia.
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.VineWhip },
      { level: 7, move: ALL_MOVES.RazorLeaf },
      { level: 13, move: ALL_MOVES.PoisonSting },
      { level: 18, move: ALL_MOVES.MegaDrain },
      { level: 24, move: ALL_MOVES.Sludge },
      { level: 32, move: ALL_MOVES.EnergyBall },
      { level: 42, move: ALL_MOVES.Earthquake },
      { level: 48, move: ALL_MOVES.SolarBeam },
    ],
    evolvesTo: [{ speciesId: 3, trigger: "level", level: 32 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/2.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/2.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/2.gif",
    description: "Quando o bulbo nas costas desabrocha, perde a capacidade de ficar de pé.",
  },
  {
    id: 3,
    name: "Venusaur",
    types: ["Grass", "Poison"],
    baseHp: 80,
    baseAtk: 82,
    baseDef: 83,
    baseSpAtk: 100,
    baseSpDef: 100,
    baseSpd: 80,
    catchRate: 45,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.VineWhip },
      { level: 7, move: ALL_MOVES.RazorLeaf },
      { level: 16, move: ALL_MOVES.Sludge },
      { level: 24, move: ALL_MOVES.EnergyBall },
      { level: 34, move: ALL_MOVES.Earthquake },
      { level: 44, move: ALL_MOVES.SolarBeam },
      { level: 54, move: ALL_MOVES.SludgeBomb },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/3.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/3.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/3.gif",
    description: "A flor nas costas libera um perfume calmante que emociona quem sente.",
  },
  {
    id: 4,
    name: "Charmander",
    types: ["Fire"],
    baseHp: 39,
    baseAtk: 52,
    baseDef: 43,
    baseSpAtk: 60,
    baseSpDef: 50,
    baseSpd: 65,
    catchRate: 45,
    learnset: [
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 1, move: ALL_MOVES.Ember },
      { level: 7, move: ALL_MOVES.FireSpin },
      { level: 13, move: ALL_MOVES.MetalClaw },
      { level: 19, move: ALL_MOVES.FireFang },
      { level: 25, move: ALL_MOVES.DragonBreath },
      { level: 33, move: ALL_MOVES.Slash },
      { level: 41, move: ALL_MOVES.Flamethrower },
      { level: 49, move: ALL_MOVES.DragonClaw },
    ],
    evolvesTo: [{ speciesId: 5, trigger: "level", level: 16 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/4.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/4.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/4.gif",
    description: "A chama na ponta de sua cauda reflete sua emoção de combate.",
  },
  {
    id: 5,
    name: "Charmeleon",
    types: ["Fire"],
    baseHp: 58,
    baseAtk: 64,
    baseDef: 58,
    baseSpAtk: 80,
    baseSpDef: 65,
    baseSpd: 80,
    catchRate: 45,
    // Fase 6.3: herda o learnset da linha (ver comentário em Ivysaur).
    learnset: [
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 1, move: ALL_MOVES.Ember },
      { level: 7, move: ALL_MOVES.FireSpin },
      { level: 13, move: ALL_MOVES.MetalClaw },
      { level: 19, move: ALL_MOVES.FireFang },
      { level: 25, move: ALL_MOVES.DragonBreath },
      { level: 33, move: ALL_MOVES.Slash },
      { level: 39, move: ALL_MOVES.Flamethrower },
      { level: 47, move: ALL_MOVES.DragonClaw },
    ],
    evolvesTo: [{ speciesId: 6, trigger: "level", level: 36 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/5.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/5.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/5.gif",
    description: "Tem uma cauda ardente e garras afiadas; ataca sem piedade quando irritado.",
  },
  {
    id: 6,
    name: "Charizard",
    types: ["Fire", "Flying"],
    baseHp: 78,
    baseAtk: 84,
    baseDef: 78,
    baseSpAtk: 109,
    baseSpDef: 85,
    baseSpd: 100,
    catchRate: 30,
    learnset: [
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 1, move: ALL_MOVES.Ember },
      { level: 7, move: ALL_MOVES.FireSpin },
      { level: 13, move: ALL_MOVES.MetalClaw },
      { level: 19, move: ALL_MOVES.FireFang },
      { level: 26, move: ALL_MOVES.DragonBreath },
      { level: 34, move: ALL_MOVES.WingAttack },
      { level: 42, move: ALL_MOVES.AirSlash },
      { level: 50, move: ALL_MOVES.Flamethrower },
      { level: 58, move: ALL_MOVES.DragonClaw },
      { level: 64, move: ALL_MOVES.Outrage },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/6.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/6.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/6.gif",
    description: "Cospe fogo tão quente que derrete rochas maciças.",
  },
  {
    id: 7,
    name: "Squirtle",
    types: ["Water"],
    baseHp: 44,
    baseAtk: 48,
    baseDef: 65,
    baseSpAtk: 50,
    baseSpDef: 64,
    baseSpd: 43,
    catchRate: 45,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.Bubble },
      { level: 10, move: ALL_MOVES.WaterGun },
      { level: 14, move: ALL_MOVES.Bite },
      { level: 20, move: ALL_MOVES.WaterPulse },
      { level: 28, move: ALL_MOVES.SkullBash },
      { level: 36, move: ALL_MOVES.Surf },
      { level: 44, move: ALL_MOVES.IceBeam },
      { level: 52, move: ALL_MOVES.HydroPump },
    ],
    evolvesTo: [{ speciesId: 8, trigger: "level", level: 16 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/7.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/7.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/7.gif",
    description: "Após nascer, seu casco endurece em uma armadura resistente.",
  },
  {
    id: 8,
    name: "Wartortle",
    types: ["Water"],
    baseHp: 59,
    baseAtk: 63,
    baseDef: 80,
    baseSpAtk: 65,
    baseSpDef: 80,
    baseSpd: 58,
    catchRate: 45,
    // Fase 6.3: herda o learnset da linha (ver comentário em Ivysaur).
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.Bubble },
      { level: 10, move: ALL_MOVES.WaterGun },
      { level: 14, move: ALL_MOVES.Bite },
      { level: 20, move: ALL_MOVES.WaterPulse },
      { level: 30, move: ALL_MOVES.SkullBash },
      { level: 38, move: ALL_MOVES.Surf },
      { level: 46, move: ALL_MOVES.IceBeam },
      { level: 54, move: ALL_MOVES.HydroPump },
    ],
    evolvesTo: [{ speciesId: 9, trigger: "level", level: 36 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/8.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/8.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/8.gif",
    description: "Sua cauda longa e peluda é símbolo de longevidade e sabedoria.",
  },
  {
    id: 9,
    name: "Blastoise",
    types: ["Water"],
    baseHp: 79,
    baseAtk: 83,
    baseDef: 100,
    baseSpAtk: 85,
    baseSpDef: 105,
    baseSpd: 78,
    catchRate: 30,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.Bubble },
      { level: 10, move: ALL_MOVES.WaterGun },
      { level: 16, move: ALL_MOVES.Bite },
      { level: 22, move: ALL_MOVES.WaterPulse },
      { level: 28, move: ALL_MOVES.SkullBash },
      { level: 36, move: ALL_MOVES.Surf },
      { level: 44, move: ALL_MOVES.IceBeam },
      { level: 52, move: ALL_MOVES.HydroPump },
      { level: 58, move: ALL_MOVES.HyperBeam },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/9.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/9.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/9.gif",
    description: "Dois canhões de água de alta pressão disparam de seu casco.",
  },
  {
    id: 25,
    name: "Pikachu",
    types: ["Electric"],
    baseHp: 45,
    baseAtk: 55,
    baseDef: 40,
    baseSpAtk: 75,
    baseSpDef: 50,
    baseSpd: 90,
    catchRate: 50,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.ThunderShock },
      { level: 6, move: ALL_MOVES.QuickAttack },
      { level: 12, move: ALL_MOVES.ShockWave },
      { level: 18, move: ALL_MOVES.Spark },
      { level: 26, move: ALL_MOVES.Thunderbolt },
      { level: 34, move: ALL_MOVES.ThunderPunch },
      { level: 42, move: ALL_MOVES.Thunder },
      { level: 50, move: ALL_MOVES.WildCharge },
    ],
    evolvesTo: [{ speciesId: 26, trigger: "item", itemId: EVOLUTION_ITEM_IDS.thunderStone }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/25.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/25.gif",
    description: "Armazena eletricidade nas bochechas vermelhas.",
  },
  {
    id: 74,
    name: "Geodude",
    types: ["Rock", "Ground"],
    baseHp: 40,
    baseAtk: 80,
    baseDef: 100,
    baseSpAtk: 30,
    baseSpDef: 30,
    baseSpd: 20,
    catchRate: 255,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.MudSlap },
      { level: 7, move: ALL_MOVES.RockPolish },
      { level: 12, move: ALL_MOVES.RockThrow },
      { level: 18, move: ALL_MOVES.RockTomb },
      { level: 26, move: ALL_MOVES.RockSlide },
      { level: 34, move: ALL_MOVES.Dig },
      { level: 44, move: ALL_MOVES.Earthquake },
      { level: 52, move: ALL_MOVES.StoneEdge },
    ],
    evolvesTo: [{ speciesId: 75, trigger: "level", level: 25 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/74.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/74.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/74.gif",
    description: "Comum em trilhas de montanha. Parece uma pedra comum até ganhar vida.",
  },
  {
    id: 95,
    name: "Onix",
    types: ["Rock", "Ground"],
    baseHp: 35,
    baseAtk: 45,
    baseDef: 160,
    baseSpAtk: 30,
    baseSpDef: 45,
    baseSpd: 70,
    catchRate: 45,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.MudSlap },
      { level: 7, move: ALL_MOVES.RockPolish },
      { level: 12, move: ALL_MOVES.RockThrow },
      { level: 18, move: ALL_MOVES.RockTomb },
      { level: 26, move: ALL_MOVES.RockSlide },
      { level: 34, move: ALL_MOVES.Dig },
      { level: 44, move: ALL_MOVES.IronTail },
      { level: 52, move: ALL_MOVES.Earthquake },
      { level: 58, move: ALL_MOVES.StoneEdge },
    ],
    // Fase 6.4-B: cânon é troca + Revestimento de Metal; sem sistema de troca,
    // o item sozinho é o gatilho (consumível raro, resolvido no servidor).
    evolvesTo: [{ speciesId: 208, trigger: "item", itemId: EVOLUTION_ITEM_IDS.metalCoat }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/95.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/95.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/95.gif",
    description: "Escava o subsolo a 80 km/h, deixando túneis que viram seu território.",
  },
  {
    id: 120,
    name: "Staryu",
    types: ["Water"],
    baseHp: 30,
    baseAtk: 45,
    baseDef: 55,
    baseSpAtk: 70,
    baseSpDef: 55,
    baseSpd: 85,
    catchRate: 225,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.Bubble },
      { level: 10, move: ALL_MOVES.WaterGun },
      { level: 16, move: ALL_MOVES.Swift },
      { level: 24, move: ALL_MOVES.WaterPulse },
      { level: 32, move: ALL_MOVES.Surf },
      { level: 42, move: ALL_MOVES.IceBeam },
      { level: 52, move: ALL_MOVES.HydroPump },
    ],
    // Fase 6.4-B: Pedra d'Água, consumível na loja (antes era nível provisório).
    evolvesTo: [{ speciesId: 121, trigger: "item", itemId: EVOLUTION_ITEM_IDS.waterStone }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/120.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/120.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/120.gif",
    description: "No centro do corpo há um núcleo vermelho que pulsa como uma estrela.",
  },
  {
    id: 121,
    name: "Starmie",
    types: ["Water", "Psychic"],
    baseHp: 60,
    baseAtk: 75,
    baseDef: 85,
    baseSpAtk: 100,
    baseSpDef: 85,
    baseSpd: 115,
    catchRate: 60,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.WaterGun },
      { level: 1, move: ALL_MOVES.Confusion },
      { level: 16, move: ALL_MOVES.Swift },
      { level: 24, move: ALL_MOVES.WaterPulse },
      { level: 32, move: ALL_MOVES.Psybeam },
      { level: 40, move: ALL_MOVES.Surf },
      { level: 48, move: ALL_MOVES.Psychic },
      { level: 56, move: ALL_MOVES.IceBeam },
      { level: 62, move: ALL_MOVES.HydroPump },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/121.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/121.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/121.gif",
    description: "Seu núcleo emite sinais de rádio que muitos acreditam ser uma linguagem.",
  },
  {
    id: 94,
    name: "Gengar",
    types: ["Ghost", "Poison"],
    baseHp: 60,
    baseAtk: 65,
    baseDef: 60,
    baseSpAtk: 130,
    baseSpDef: 75,
    baseSpd: 110,
    catchRate: 35,
    learnset: [
      { level: 1, move: ALL_MOVES.Lick },
      { level: 1, move: ALL_MOVES.Astonish },
      { level: 14, move: ALL_MOVES.Sludge },
      { level: 22, move: ALL_MOVES.ShadowBall },
      { level: 32, move: ALL_MOVES.SludgeBomb },
      { level: 42, move: ALL_MOVES.DarkPulse },
      { level: 52, move: ALL_MOVES.Psychic },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/94.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/94.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/94.gif",
    description: "Esconde-se nas sombras rindo enquanto drena o calor da sala.",
  },
  {
    id: 130,
    name: "Gyarados",
    types: ["Water", "Flying"],
    baseHp: 95,
    baseAtk: 125,
    baseDef: 79,
    baseSpAtk: 60,
    baseSpDef: 100,
    baseSpd: 81,
    catchRate: 30,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.Bubble },
      { level: 10, move: ALL_MOVES.Bite },
      { level: 16, move: ALL_MOVES.Twister },
      { level: 24, move: ALL_MOVES.IceFang },
      { level: 32, move: ALL_MOVES.Crunch },
      { level: 40, move: ALL_MOVES.Bounce },
      { level: 48, move: ALL_MOVES.Waterfall },
      { level: 54, move: ALL_MOVES.Earthquake },
      { level: 60, move: ALL_MOVES.HyperBeam },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/130.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/130.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/130.gif",
    description: "O Dragão Marinho Feroz de Lago da Fúria.",
  },
  {
    id: 131,
    name: "Lapras",
    types: ["Water", "Ice"],
    baseHp: 130,
    baseAtk: 85,
    baseDef: 80,
    baseSpAtk: 85,
    baseSpDef: 95,
    baseSpd: 60,
    catchRate: 35,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.WaterGun },
      { level: 10, move: ALL_MOVES.IceShard },
      { level: 16, move: ALL_MOVES.BodySlam },
      { level: 24, move: ALL_MOVES.WaterPulse },
      { level: 32, move: ALL_MOVES.Surf },
      { level: 40, move: ALL_MOVES.IceBeam },
      { level: 48, move: ALL_MOVES.Blizzard },
      { level: 56, move: ALL_MOVES.HydroPump },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/131.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/131.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/131.gif",
    description: "Navega pelos mares cantando melodias pacíficas.",
  },
  {
    id: 133,
    name: "Eevee",
    types: ["Normal"],
    baseHp: 55,
    baseAtk: 55,
    baseDef: 50,
    baseSpAtk: 45,
    baseSpDef: 65,
    baseSpd: 55,
    catchRate: 45,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 7, move: ALL_MOVES.QuickAttack },
      { level: 13, move: ALL_MOVES.Bite },
      { level: 20, move: ALL_MOVES.Swift },
      { level: 28, move: ALL_MOVES.Headbutt },
      { level: 36, move: ALL_MOVES.TakeDown },
      { level: 44, move: ALL_MOVES.ShadowBall },
      { level: 52, move: ALL_MOVES.BodySlam },
    ],
    // Fase 6.4-B: com as pedras na loja, a decisão é do jogador. Espeon/Umbreon
    // usam Pedra do Sol/Lua como proxy para felicidade (mecânica futura da 6.5).
    evolvesTo: [
      { speciesId: 134, trigger: "item", itemId: EVOLUTION_ITEM_IDS.waterStone },
      { speciesId: 135, trigger: "item", itemId: EVOLUTION_ITEM_IDS.thunderStone },
      { speciesId: 136, trigger: "item", itemId: EVOLUTION_ITEM_IDS.fireStone },
      { speciesId: 196, trigger: "item", itemId: EVOLUTION_ITEM_IDS.sunStone },
      { speciesId: 197, trigger: "item", itemId: EVOLUTION_ITEM_IDS.moonStone },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/133.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/133.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/133.gif",
    description: "Possui DNA genético instável que se adapta a qualquer ambiente.",
  },
  {
    id: 148,
    name: "Dragonair",
    types: ["Dragon"],
    baseHp: 61,
    baseAtk: 84,
    baseDef: 65,
    baseSpAtk: 70,
    baseSpDef: 70,
    baseSpd: 70,
    catchRate: 45,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 10, move: ALL_MOVES.Twister },
      { level: 16, move: ALL_MOVES.DragonBreath },
      { level: 24, move: ALL_MOVES.BodySlam },
      { level: 32, move: ALL_MOVES.DragonPulse },
      { level: 44, move: ALL_MOVES.Outrage },
      { level: 52, move: ALL_MOVES.HyperBeam },
    ],
    evolvesTo: [{ speciesId: 149, trigger: "level", level: 55 }],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/148.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/148.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/148.gif",
    description: "Armazena uma imensa energia nas esferas de cristal em sua cauda.",
  },
  {
    id: 149,
    name: "Dragonite",
    types: ["Dragon", "Flying"],
    baseHp: 91,
    baseAtk: 134,
    baseDef: 95,
    baseSpAtk: 100,
    baseSpDef: 100,
    baseSpd: 80,
    catchRate: 25,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.Twister },
      { level: 14, move: ALL_MOVES.WingAttack },
      { level: 22, move: ALL_MOVES.DragonClaw },
      { level: 32, move: ALL_MOVES.Fly },
      { level: 40, move: ALL_MOVES.Outrage },
      { level: 48, move: ALL_MOVES.Earthquake },
      { level: 56, move: ALL_MOVES.Thunderbolt },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/149.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/149.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/149.gif",
    description: "Pode circular o globo em apenas 16 horas.",
  },
  {
    id: 150,
    name: "Mewtwo",
    types: ["Psychic"],
    baseHp: 106,
    baseAtk: 110,
    baseDef: 90,
    baseSpAtk: 154,
    baseSpDef: 90,
    baseSpd: 130,
    catchRate: 15,
    learnset: [
      { level: 1, move: ALL_MOVES.Confusion },
      { level: 10, move: ALL_MOVES.Psybeam },
      { level: 20, move: ALL_MOVES.AuraSphere },
      { level: 30, move: ALL_MOVES.ShadowBall },
      { level: 40, move: ALL_MOVES.IceBeam },
      { level: 50, move: ALL_MOVES.Psychic },
      { level: 60, move: ALL_MOVES.HyperBeam },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/150.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/150.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/150.gif",
    description: "Pokémon lendário criado por engenharia genética suprema.",
  },
  {
    id: 197,
    name: "Umbreon",
    types: ["Dark"],
    baseHp: 95,
    baseAtk: 65,
    baseDef: 110,
    baseSpAtk: 60,
    baseSpDef: 130,
    baseSpd: 65,
    catchRate: 35,
    learnset: [
      { level: 1, move: ALL_MOVES.Tackle },
      { level: 1, move: ALL_MOVES.Pursuit },
      { level: 8, move: ALL_MOVES.QuickAttack },
      { level: 15, move: ALL_MOVES.Bite },
      { level: 22, move: ALL_MOVES.FeintAttack },
      { level: 30, move: ALL_MOVES.Crunch },
      { level: 38, move: ALL_MOVES.ShadowBall },
      { level: 46, move: ALL_MOVES.DarkPulse },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/197.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/197.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/197.gif",
    description: "Anéis dourados brilham sob a luz do luar durante o combate.",
  },
  {
    id: 282,
    name: "Gardevoir",
    types: ["Psychic", "Fairy"],
    baseHp: 68,
    baseAtk: 65,
    baseDef: 65,
    baseSpAtk: 125,
    baseSpDef: 115,
    baseSpd: 80,
    catchRate: 35,
    learnset: [
      { level: 1, move: ALL_MOVES.Confusion },
      { level: 1, move: ALL_MOVES.DisarmingVoice },
      { level: 10, move: ALL_MOVES.Psybeam },
      { level: 18, move: ALL_MOVES.DrainingKiss },
      { level: 26, move: ALL_MOVES.DazzlingGleam },
      { level: 34, move: ALL_MOVES.ShadowBall },
      { level: 42, move: ALL_MOVES.Psychic },
      { level: 50, move: ALL_MOVES.Moonblast },
      { level: 58, move: ALL_MOVES.FutureSight },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/282.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/282.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/282.gif",
    description: "Cria pequenos buracos negros para proteger seu treinador.",
  },
  {
    id: 384,
    name: "Rayquaza",
    types: ["Dragon", "Flying"],
    baseHp: 105,
    baseAtk: 150,
    baseDef: 90,
    baseSpAtk: 150,
    baseSpDef: 90,
    baseSpd: 95,
    catchRate: 10,
    learnset: [
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 1, move: ALL_MOVES.Twister },
      { level: 12, move: ALL_MOVES.AncientPower },
      { level: 24, move: ALL_MOVES.DragonClaw },
      { level: 32, move: ALL_MOVES.Fly },
      { level: 40, move: ALL_MOVES.AirSlash },
      { level: 48, move: ALL_MOVES.DragonPulse },
      { level: 56, move: ALL_MOVES.Outrage },
      { level: 64, move: ALL_MOVES.HyperBeam },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/384.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/384.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/384.gif",
    description: "Guardião lendário da camada de ozônio.",
  },
  {
    id: 448,
    name: "Lucario",
    types: ["Fighting", "Steel"],
    baseHp: 70,
    baseAtk: 110,
    baseDef: 70,
    baseSpAtk: 115,
    baseSpDef: 70,
    baseSpd: 90,
    catchRate: 35,
    learnset: [
      { level: 1, move: ALL_MOVES.QuickAttack },
      { level: 1, move: ALL_MOVES.MetalClaw },
      { level: 16, move: ALL_MOVES.BrickBreak },
      { level: 24, move: ALL_MOVES.IronHead },
      { level: 32, move: ALL_MOVES.AuraSphere },
      { level: 40, move: ALL_MOVES.DarkPulse },
      { level: 48, move: ALL_MOVES.DragonPulse },
      { level: 56, move: ALL_MOVES.FlashCannon },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/448.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/448.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/448.gif",
    description: "Lê a aura de seres vivos a mais de um quilômetro.",
  },
];

// Fase 6.3-A: o restante do catálogo Kanto vive em `pokedex-gen1.ts` (mesmos
// tipos, sprites do mesmo CDN) e entra aqui, em ordem de id.
// Fase 6.4-B: Johto (152–251, exceto 197/208 já presentes) entra na sequência;
// dados derivados de PokeAPI e learnsets do catálogo de golpes existente.
const POKEDEX_DATA: PokemonSpeciesData[] = [
  ...POKEDEX_BASE,
  ...gen1Rest(ALL_MOVES),
  ...johtoRest(ALL_MOVES),
];

/** Golpe padrão usado quando o nome gravado no banco não existe mais no catálogo. */
export const FALLBACK_MOVE: PokemonMove = {
  name: "Investida",
  type: "Normal",
  power: 40,
  accuracy: 100,
  category: "Physical",
  description: "Um ataque corporal simples.",
  sfx: "slash",
};

/**
 * Os golpes que a espécie conhece em um dado nível (Fase 6.1).
 *
 * Regra: pega tudo que já foi aprendido até `level` e fica com os **4 últimos**
 * (empates de nível resolvidos pela ordem do learnset). É o que dá ao início do
 * jogo golpes de poder 30–55 em vez de 80–110.
 *
 * Nível abaixo do primeiro aprendizado não deixa o Pokémon sem ação: devolve o
 * primeiro golpe do learnset. Nenhuma batalha pode ficar sem golpe.
 */
export function movesAtLevel(
  species: Pick<PokemonSpeciesData, "learnset">,
  level: number
): PokemonMove[] {
  const known = species.learnset
    .filter((entry) => entry.level <= level)
    .map((entry) => entry.move);

  if (known.length === 0) {
    const first = species.learnset[0]?.move;
    return first ? [first] : [FALLBACK_MOVE];
  }

  return known.slice(-MOVE_SLOTS);
}

/**
 * Os 4 slots de golpe como o banco os guarda (`move1..move4`).
 *
 * Slot sem golpe vira string vazia, **não** uma repetição do primeiro golpe:
 * um Pokémon de nível baixo conhece 1 ou 2 golpes e mostrar "Arranhão" quatro
 * vezes seria mentira de interface. Quem lê filtra vazio (`movesOf`, PC Box).
 */
export function moveSlots(moves: PokemonMove[]): {
  move1: string;
  move2: string;
  move3: string;
  move4: string;
} {
  const names = moves.slice(0, MOVE_SLOTS).map((m) => m.name);
  return {
    move1: names[0] ?? FALLBACK_MOVE.name,
    move2: names[1] ?? "",
    move3: names[2] ?? "",
    move4: names[3] ?? "",
  };
}

/**
 * Catálogo público. `moves` é derivado do learnset (conjunto de fim de jogo),
 * para que nunca exista uma lista de golpes fora de sincronia com a progressão.
 */
export const POKEDEX: PokemonSpecies[] = POKEDEX_DATA.map((species) => ({
  ...species,
  moves: movesAtLevel(species, MAX_SPECIES_LEVEL),
}));

/**
 * Resolve um golpe pelo NOME EXIBIDO ("Lança-Chamas"), não pela chave.
 *
 * Necessário porque `user_pokemon.move1..4` e os times de ginásio guardam o
 * nome em português, enquanto `ALL_MOVES` é indexado pela chave em inglês.
 * Nome desconhecido devolve um golpe neutro em vez de quebrar a batalha — o
 * combate precisa continuar mesmo com dado legado.
 */
export function getMoveByName(displayName: string): PokemonMove {
  const found = Object.values(ALL_MOVES).find((m) => m.name === displayName);
  return found ?? FALLBACK_MOVE;
}

/**
 * Resolve uma espécie por id ou nome.
 *
 * Fase 3 (B2): o fallback silencioso `return found || POKEDEX[0]` foi
 * **removido**. Ele convertia qualquer id desconhecido em Bulbasaur, o que
 * escondia dados inválidos em vez de expô-los — foi exatamente o que fez 5 dos
 * 6 Pokémon de ginásio serem exibidos como Bulbasaur sem que nada acusasse erro.
 *
 * Agora um id fora da Pokédex lança. As rotas já capturam exceções via
 * `routeError()`, que registra o detalhe no log do servidor e devolve uma
 * mensagem genérica ao jogador.
 */
export function getPokemonSpecies(idOrName: number | string): PokemonSpecies {
  const found = POKEDEX.find(
    (p) =>
      p.id === idOrName ||
      p.name.toLowerCase() === String(idOrName).toLowerCase()
  );

  if (!found) {
    throw new Error(
      `Espécie desconhecida na Pokédex: ${String(idOrName)}. ` +
        `Ids disponíveis: [${POKEDEX.map((p) => p.id).join(", ")}].`
    );
  }

  return found;
}

export function computeDelugeStats(
  species: PokemonSpecies,
  level: number,
  variant: DelugeVariant = "Normal"
) {
  let hp = Math.floor(((2 * species.baseHp + 20) * level) / 100 + level + 10);
  let attack = Math.floor(((2 * species.baseAtk + 15) * level) / 100 + 5);
  let defense = Math.floor(((2 * species.baseDef + 15) * level) / 100 + 5);
  let spAttack = Math.floor(((2 * species.baseSpAtk + 15) * level) / 100 + 5);
  let spDefense = Math.floor(((2 * species.baseSpDef + 15) * level) / 100 + 5);
  let speed = Math.floor(((2 * species.baseSpd + 15) * level) / 100 + 5);

  if (variant === "Shiny") {
    hp = Math.floor(hp * 1.1);
    speed = Math.floor(speed * 1.15);
  } else if (variant === "Metallic") {
    defense = Math.floor(defense * 1.25);
    spDefense = Math.floor(spDefense * 1.25);
  } else if (variant === "Mystic") {
    spAttack = Math.floor(spAttack * 1.25);
  } else if (variant === "Dark") {
    attack = Math.floor(attack * 1.25);
  } else if (variant === "Ghostly") {
    hp = Math.floor(hp * 1.12);
    speed = Math.floor(speed * 1.12);
  }

  return { hp, maxHp: hp, attack, defense, spAttack, spDefense, speed };
}

export function rollRandomDelugeVariant(): DelugeVariant {
  const r = Math.random();
  if (r < 0.04) return "Metallic";
  if (r < 0.08) return "Mystic";
  if (r < 0.12) return "Dark";
  if (r < 0.15) return "Ghostly";
  if (r < 0.20) return "Shiny";
  return "Normal";
}
