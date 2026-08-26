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
  moves: PokemonMove[];
  frontSprite: string;
  backSprite: string;
  shinyFrontSprite: string;
  description: string;
}

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
};

export const POKEDEX: PokemonSpecies[] = [
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
    moves: [ALL_MOVES.SolarBeam, ALL_MOVES.QuickAttack, ALL_MOVES.Earthquake, ALL_MOVES.ShadowBall],
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
    moves: [ALL_MOVES.Flamethrower, ALL_MOVES.DragonClaw, ALL_MOVES.QuickAttack, ALL_MOVES.DarkPulse],
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
    moves: [ALL_MOVES.Flamethrower, ALL_MOVES.DragonClaw, ALL_MOVES.Earthquake, ALL_MOVES.AirSlash],
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
    moves: [ALL_MOVES.HydroPump, ALL_MOVES.IceBeam, ALL_MOVES.QuickAttack, ALL_MOVES.Earthquake],
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
    moves: [ALL_MOVES.HydroPump, ALL_MOVES.IceBeam, ALL_MOVES.Earthquake, ALL_MOVES.DarkPulse],
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
    moves: [ALL_MOVES.Thunderbolt, ALL_MOVES.QuickAttack, ALL_MOVES.AuraSphere, ALL_MOVES.ShadowBall],
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
    moves: [ALL_MOVES.RockThrow, ALL_MOVES.Tackle, ALL_MOVES.Earthquake, ALL_MOVES.RockSlide],
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
    moves: [ALL_MOVES.RockSlide, ALL_MOVES.Tackle, ALL_MOVES.IronTail, ALL_MOVES.Earthquake],
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
    moves: [ALL_MOVES.WaterPulse, ALL_MOVES.IceBeam, ALL_MOVES.Tackle, ALL_MOVES.Psychic],
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
    moves: [ALL_MOVES.HydroPump, ALL_MOVES.Psychic, ALL_MOVES.IceBeam, ALL_MOVES.Thunderbolt],
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
    moves: [ALL_MOVES.ShadowBall, ALL_MOVES.DarkPulse, ALL_MOVES.Thunderbolt, ALL_MOVES.Psychic],
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
    moves: [ALL_MOVES.HydroPump, ALL_MOVES.DragonClaw, ALL_MOVES.Earthquake, ALL_MOVES.IceBeam],
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
    moves: [ALL_MOVES.IceBeam, ALL_MOVES.HydroPump, ALL_MOVES.Thunderbolt, ALL_MOVES.Psychic],
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
    moves: [ALL_MOVES.QuickAttack, ALL_MOVES.ShadowBall, ALL_MOVES.Flamethrower, ALL_MOVES.Thunderbolt],
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
    moves: [ALL_MOVES.DragonPulse, ALL_MOVES.DragonClaw, ALL_MOVES.Thunderbolt, ALL_MOVES.IceBeam],
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
    moves: [ALL_MOVES.DragonClaw, ALL_MOVES.Flamethrower, ALL_MOVES.Thunderbolt, ALL_MOVES.Earthquake],
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
    moves: [ALL_MOVES.Psychic, ALL_MOVES.AuraSphere, ALL_MOVES.ShadowBall, ALL_MOVES.IceBeam],
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
    moves: [ALL_MOVES.DarkPulse, ALL_MOVES.ShadowBall, ALL_MOVES.QuickAttack, ALL_MOVES.Psychic],
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
    moves: [ALL_MOVES.Psychic, ALL_MOVES.ShadowBall, ALL_MOVES.Thunderbolt, ALL_MOVES.AuraSphere],
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
    moves: [ALL_MOVES.DragonClaw, ALL_MOVES.Flamethrower, ALL_MOVES.Earthquake, ALL_MOVES.Thunderbolt],
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
    moves: [ALL_MOVES.AuraSphere, ALL_MOVES.DragonClaw, ALL_MOVES.Earthquake, ALL_MOVES.DarkPulse],
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
