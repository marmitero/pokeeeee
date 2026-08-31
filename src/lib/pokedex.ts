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
    power: 45,
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
    power: 40,
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
  Scratch: {
    name: "Arranhão",
    type: "Normal",
    power: 40,
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
    power: 40,
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
    power: 40,
    accuracy: 100,
    category: "Special",
    description: "Dispara uma rajada de bolhas contra o alvo.",
    sfx: "water",
  },
  VineWhip: {
    name: "Chicote de Cipó",
    type: "Grass",
    power: 45,
    accuracy: 100,
    category: "Physical",
    description: "Chicoteia o alvo com cipós finos e flexíveis.",
    sfx: "slash",
  },
  RazorLeaf: {
    name: "Folha Navalha",
    type: "Grass",
    power: 55,
    accuracy: 95,
    category: "Physical",
    description: "Folhas afiadas cortam o ar em direção ao oponente.",
    sfx: "slash",
  },
  ThunderShock: {
    name: "Choque",
    type: "Electric",
    power: 40,
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
    power: 40,
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
    power: 40,
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
    power: 50,
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
};

const POKEDEX_DATA: PokemonSpeciesData[] = [
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
      { level: 12, move: ALL_MOVES.MudSlap },
      { level: 18, move: ALL_MOVES.QuickAttack },
      { level: 24, move: ALL_MOVES.Dig },
      { level: 32, move: ALL_MOVES.ShadowBall },
      { level: 40, move: ALL_MOVES.Earthquake },
      { level: 48, move: ALL_MOVES.SolarBeam },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/1.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/1.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/1.gif",
    description: "Um bulbo de semente em suas costas cresce absorvendo energia solar.",
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
      { level: 7, move: ALL_MOVES.MetalClaw },
      { level: 12, move: ALL_MOVES.FireFang },
      { level: 18, move: ALL_MOVES.QuickAttack },
      { level: 24, move: ALL_MOVES.Bite },
      { level: 32, move: ALL_MOVES.DragonBreath },
      { level: 40, move: ALL_MOVES.DarkPulse },
      { level: 48, move: ALL_MOVES.DragonClaw },
      { level: 56, move: ALL_MOVES.Flamethrower },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/4.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/4.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/4.gif",
    description: "A chama na ponta de sua cauda reflete sua emoção de combate.",
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
      { level: 7, move: ALL_MOVES.MetalClaw },
      { level: 12, move: ALL_MOVES.FireFang },
      { level: 18, move: ALL_MOVES.Gust },
      { level: 24, move: ALL_MOVES.WingAttack },
      { level: 30, move: ALL_MOVES.DragonBreath },
      { level: 38, move: ALL_MOVES.AirSlash },
      { level: 44, move: ALL_MOVES.Earthquake },
      { level: 50, move: ALL_MOVES.DragonClaw },
      { level: 56, move: ALL_MOVES.Flamethrower },
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
      { level: 7, move: ALL_MOVES.IceShard },
      { level: 12, move: ALL_MOVES.WaterPulse },
      { level: 18, move: ALL_MOVES.QuickAttack },
      { level: 24, move: ALL_MOVES.Bite },
      { level: 32, move: ALL_MOVES.IcyWind },
      { level: 40, move: ALL_MOVES.Earthquake },
      { level: 48, move: ALL_MOVES.IceBeam },
      { level: 56, move: ALL_MOVES.HydroPump },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/7.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/7.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/7.gif",
    description: "Após nascer, seu casco endurece em uma armadura resistente.",
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
      { level: 7, move: ALL_MOVES.IceShard },
      { level: 12, move: ALL_MOVES.WaterPulse },
      { level: 18, move: ALL_MOVES.Bite },
      { level: 26, move: ALL_MOVES.IcyWind },
      { level: 34, move: ALL_MOVES.DarkPulse },
      { level: 42, move: ALL_MOVES.Earthquake },
      { level: 50, move: ALL_MOVES.IceBeam },
      { level: 58, move: ALL_MOVES.HydroPump },
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
      { level: 12, move: ALL_MOVES.Spark },
      { level: 18, move: ALL_MOVES.KarateChop },
      { level: 26, move: ALL_MOVES.Bite },
      { level: 32, move: ALL_MOVES.AuraSphere },
      { level: 40, move: ALL_MOVES.ShadowBall },
      { level: 48, move: ALL_MOVES.Thunderbolt },
    ],
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
      { level: 18, move: ALL_MOVES.Bite },
      { level: 26, move: ALL_MOVES.Dig },
      { level: 34, move: ALL_MOVES.RockSlide },
      { level: 42, move: ALL_MOVES.IronTail },
      { level: 50, move: ALL_MOVES.Earthquake },
    ],
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
      { level: 18, move: ALL_MOVES.Bite },
      { level: 26, move: ALL_MOVES.Dig },
      { level: 34, move: ALL_MOVES.RockSlide },
      { level: 42, move: ALL_MOVES.IronTail },
      { level: 50, move: ALL_MOVES.Earthquake },
    ],
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
      { level: 7, move: ALL_MOVES.IceShard },
      { level: 12, move: ALL_MOVES.Confusion },
      { level: 18, move: ALL_MOVES.WaterPulse },
      { level: 26, move: ALL_MOVES.Psybeam },
      { level: 34, move: ALL_MOVES.IcyWind },
      { level: 42, move: ALL_MOVES.Psychic },
      { level: 50, move: ALL_MOVES.IceBeam },
    ],
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
      { level: 1, move: ALL_MOVES.Bubble },
      { level: 7, move: ALL_MOVES.Confusion },
      { level: 12, move: ALL_MOVES.WaterPulse },
      { level: 20, move: ALL_MOVES.Psybeam },
      { level: 28, move: ALL_MOVES.IcyWind },
      { level: 36, move: ALL_MOVES.Thunderbolt },
      { level: 44, move: ALL_MOVES.IceBeam },
      { level: 52, move: ALL_MOVES.Psychic },
      { level: 58, move: ALL_MOVES.HydroPump },
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
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 7, move: ALL_MOVES.Confusion },
      { level: 12, move: ALL_MOVES.Bite },
      { level: 20, move: ALL_MOVES.Psybeam },
      { level: 28, move: ALL_MOVES.Spark },
      { level: 36, move: ALL_MOVES.Thunderbolt },
      { level: 44, move: ALL_MOVES.Psychic },
      { level: 52, move: ALL_MOVES.DarkPulse },
      { level: 58, move: ALL_MOVES.ShadowBall },
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
      { level: 7, move: ALL_MOVES.Bite },
      { level: 14, move: ALL_MOVES.WaterPulse },
      { level: 22, move: ALL_MOVES.IceShard },
      { level: 30, move: ALL_MOVES.DragonBreath },
      { level: 38, move: ALL_MOVES.IceBeam },
      { level: 46, move: ALL_MOVES.Earthquake },
      { level: 54, move: ALL_MOVES.DragonClaw },
      { level: 60, move: ALL_MOVES.HydroPump },
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
      { level: 1, move: ALL_MOVES.Bubble },
      { level: 7, move: ALL_MOVES.IceShard },
      { level: 14, move: ALL_MOVES.Confusion },
      { level: 22, move: ALL_MOVES.WaterPulse },
      { level: 30, move: ALL_MOVES.IcyWind },
      { level: 38, move: ALL_MOVES.Psybeam },
      { level: 46, move: ALL_MOVES.Thunderbolt },
      { level: 54, move: ALL_MOVES.Psychic },
      { level: 60, move: ALL_MOVES.IceBeam },
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
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 7, move: ALL_MOVES.QuickAttack },
      { level: 13, move: ALL_MOVES.Bite },
      { level: 20, move: ALL_MOVES.BodySlam },
      { level: 28, move: ALL_MOVES.Spark },
      { level: 36, move: ALL_MOVES.ShadowBall },
      { level: 44, move: ALL_MOVES.Thunderbolt },
      { level: 52, move: ALL_MOVES.Flamethrower },
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
      { level: 1, move: ALL_MOVES.ThunderShock },
      { level: 7, move: ALL_MOVES.DragonBreath },
      { level: 14, move: ALL_MOVES.IceShard },
      { level: 22, move: ALL_MOVES.Spark },
      { level: 30, move: ALL_MOVES.IcyWind },
      { level: 38, move: ALL_MOVES.DragonPulse },
      { level: 46, move: ALL_MOVES.Thunderbolt },
      { level: 54, move: ALL_MOVES.IceBeam },
      { level: 60, move: ALL_MOVES.DragonClaw },
    ],
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
      { level: 1, move: ALL_MOVES.DragonBreath },
      { level: 8, move: ALL_MOVES.WingAttack },
      { level: 16, move: ALL_MOVES.Spark },
      { level: 24, move: ALL_MOVES.FireFang },
      { level: 32, move: ALL_MOVES.IcyWind },
      { level: 40, move: ALL_MOVES.Thunderbolt },
      { level: 48, move: ALL_MOVES.Earthquake },
      { level: 56, move: ALL_MOVES.Flamethrower },
      { level: 62, move: ALL_MOVES.DragonClaw },
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
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 10, move: ALL_MOVES.Psybeam },
      { level: 20, move: ALL_MOVES.KarateChop },
      { level: 30, move: ALL_MOVES.IceShard },
      { level: 40, move: ALL_MOVES.AuraSphere },
      { level: 50, move: ALL_MOVES.IceBeam },
      { level: 60, move: ALL_MOVES.ShadowBall },
      { level: 70, move: ALL_MOVES.Psychic },
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
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 7, move: ALL_MOVES.QuickAttack },
      { level: 14, move: ALL_MOVES.Bite },
      { level: 22, move: ALL_MOVES.Lick },
      { level: 30, move: ALL_MOVES.Confusion },
      { level: 38, move: ALL_MOVES.Psychic },
      { level: 46, move: ALL_MOVES.ShadowBall },
      { level: 54, move: ALL_MOVES.DarkPulse },
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
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 8, move: ALL_MOVES.Psybeam },
      { level: 16, move: ALL_MOVES.Lick },
      { level: 24, move: ALL_MOVES.ThunderShock },
      { level: 32, move: ALL_MOVES.Spark },
      { level: 40, move: ALL_MOVES.AuraSphere },
      { level: 48, move: ALL_MOVES.Thunderbolt },
      { level: 56, move: ALL_MOVES.ShadowBall },
      { level: 62, move: ALL_MOVES.Psychic },
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
      { level: 1, move: ALL_MOVES.DragonBreath },
      { level: 10, move: ALL_MOVES.Gust },
      { level: 20, move: ALL_MOVES.WingAttack },
      { level: 30, move: ALL_MOVES.FireFang },
      { level: 40, move: ALL_MOVES.Spark },
      { level: 50, move: ALL_MOVES.Thunderbolt },
      { level: 58, move: ALL_MOVES.Earthquake },
      { level: 66, move: ALL_MOVES.Flamethrower },
      { level: 74, move: ALL_MOVES.DragonClaw },
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
      { level: 1, move: ALL_MOVES.Scratch },
      { level: 1, move: ALL_MOVES.KarateChop },
      { level: 8, move: ALL_MOVES.MetalClaw },
      { level: 16, move: ALL_MOVES.Bite },
      { level: 24, move: ALL_MOVES.MudSlap },
      { level: 32, move: ALL_MOVES.Dig },
      { level: 40, move: ALL_MOVES.DragonBreath },
      { level: 48, move: ALL_MOVES.DarkPulse },
      { level: 56, move: ALL_MOVES.Earthquake },
      { level: 64, move: ALL_MOVES.AuraSphere },
    ],
    frontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/448.gif",
    backSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/448.gif",
    shinyFrontSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/shiny/448.gif",
    description: "Lê a aura de seres vivos a mais de um quilômetro.",
  },
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
