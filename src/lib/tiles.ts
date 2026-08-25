export type TileId =
  | "grass"
  | "tall_grass"
  | "water"
  | "stone"
  | "sand"
  | "tree"
  | "center"
  | "portal"
  | "flower"
  | "bridge";

export const TILE_DEFINITIONS: Record<
  TileId,
  {
    name: string;
    walkable: boolean;
    hasEncounter: boolean;
    colorBg: string;
    symbol: string;
  }
> = {
  grass: {
    name: "Grama Verde",
    walkable: true,
    hasEncounter: false,
    colorBg: "bg-emerald-700",
    symbol: "·",
  },
  tall_grass: {
    name: "Grama Alta (Batalha Selvagem)",
    walkable: true,
    hasEncounter: true,
    colorBg: "bg-emerald-900",
    symbol: "🌿",
  },
  water: {
    name: "Água / Lagoa (Encontro Aquático)",
    walkable: false,
    hasEncounter: true,
    colorBg: "bg-sky-700",
    symbol: "〰",
  },
  stone: {
    name: "Trilha de Pedra",
    walkable: true,
    hasEncounter: false,
    colorBg: "bg-stone-600",
    symbol: "▪",
  },
  sand: {
    name: "Areia Dourada",
    walkable: true,
    hasEncounter: false,
    colorBg: "bg-amber-700",
    symbol: "░",
  },
  tree: {
    name: "Pinheiro Antigo (Barreira)",
    walkable: false,
    hasEncounter: false,
    colorBg: "bg-green-950",
    symbol: "🌲",
  },
  center: {
    name: "Centro Pokémon (Cura Equipe)",
    walkable: true,
    hasEncounter: false,
    colorBg: "bg-rose-600",
    symbol: "✚",
  },
  portal: {
    name: "Portal Warp (Liga a Outro Mapa)",
    walkable: true,
    hasEncounter: false,
    colorBg: "bg-amber-400",
    symbol: "🌀",
  },
  flower: {
    name: "Campo de Flores",
    walkable: true,
    hasEncounter: false,
    colorBg: "bg-emerald-600",
    symbol: "✿",
  },
  bridge: {
    name: "Ponte de Madeira",
    walkable: true,
    hasEncounter: false,
    colorBg: "bg-amber-800",
    symbol: "═",
  },
};
