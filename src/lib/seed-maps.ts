import { db } from "@/db";
import { gameMaps } from "@/db/schema";
import { count } from "drizzle-orm";
import { TileId } from "@/lib/tiles";

function createEmptyGrid(fill: TileId = "grass"): TileId[][] {
  return Array.from({ length: 16 }, () =>
    Array.from({ length: 16 }, () => fill)
  );
}

export async function ensureDefaultMapsSeeded() {
  const existingCount = await db.select({ value: count() }).from(gameMaps);
  if (existingCount[0].value > 0) return;

  // ── MAPA 1: Vale Pallet & Rota 101 ──────────────────────────────────────
  const map1Grid = createEmptyGrid("grass");
  // Borda de árvores
  for (let x = 0; x < 16; x++) {
    if (x !== 7 && x !== 8) { map1Grid[0][x] = "tree"; map1Grid[15][x] = "tree"; }
  }
  for (let y = 0; y < 16; y++) { map1Grid[y][0] = "tree"; map1Grid[y][15] = "tree"; }
  // Caminho central
  for (let y = 0; y < 15; y++) { map1Grid[y][7] = "stone"; map1Grid[y][8] = "stone"; }
  map1Grid[0][7] = "portal"; map1Grid[0][8] = "portal";
  // Centro Pokémon
  map1Grid[4][4] = "center"; map1Grid[4][3] = "stone";
  map1Grid[3][4] = "flower"; map1Grid[5][4] = "flower";
  // Gym (tile especial usa 'stone' com NPC definido separadamente)
  map1Grid[4][11] = "stone"; map1Grid[3][11] = "stone";
  // Loja NPC
  map1Grid[7][2] = "stone"; map1Grid[7][3] = "stone";
  // Lago
  for (let y = 2; y <= 5; y++) for (let x = 12; x <= 14; x++) map1Grid[y][x] = "water";
  // Grama Alta
  for (let y = 8; y <= 13; y++) {
    for (let x = 2; x <= 6; x++) map1Grid[y][x] = "tall_grass";
    for (let x = 10; x <= 13; x++) map1Grid[y][x] = "tall_grass";
  }

  // ── MAPA 2: Floresta Sombria de Viridian ────────────────────────────────
  const map2Grid = createEmptyGrid("grass");
  for (let x = 0; x < 16; x++) {
    map2Grid[0][x] = "tree";
    if (x !== 7 && x !== 8) map2Grid[15][x] = "tree";
  }
  for (let y = 0; y < 16; y++) {
    map2Grid[y][0] = "tree";
    if (y !== 7 && y !== 8) map2Grid[y][15] = "tree";
  }
  map2Grid[15][7] = "portal"; map2Grid[15][8] = "portal";
  map2Grid[7][15] = "portal"; map2Grid[8][15] = "portal";
  for (let y = 1; y < 16; y++) { map2Grid[y][7] = "stone"; map2Grid[y][8] = "stone"; }
  for (let x = 8; x < 16; x++) { map2Grid[7][x] = "stone"; map2Grid[8][x] = "stone"; }
  map2Grid[6][6] = "center";
  // Gym Misty area
  map2Grid[3][11] = "stone"; map2Grid[3][12] = "stone";
  // Loja 2
  map2Grid[11][3] = "stone";
  for (let y = 2; y <= 13; y++) {
    for (let x = 2; x <= 5; x++) map2Grid[y][x] = "tall_grass";
    for (let x = 10; x <= 13; x++) {
      if (y !== 7 && y !== 8 && y !== 3) map2Grid[y][x] = "tall_grass";
    }
  }

  // ── MAPA 3: Pico Celeste do Dragão ──────────────────────────────────────
  const map3Grid = createEmptyGrid("stone");
  for (let x = 0; x < 16; x++) { map3Grid[0][x] = "tree"; map3Grid[15][x] = "tree"; }
  for (let y = 0; y < 16; y++) {
    if (y !== 7 && y !== 8) map3Grid[y][0] = "tree";
    map3Grid[y][15] = "tree";
  }
  map3Grid[7][0] = "portal"; map3Grid[8][0] = "portal";
  map3Grid[7][8] = "center";
  // Gym Lance
  map3Grid[3][7] = "stone"; map3Grid[3][8] = "stone";
  // Loja 3
  map3Grid[12][8] = "stone";
  for (let y = 3; y <= 12; y++) {
    for (let x = 4; x <= 12; x++) {
      if (map3Grid[y][x] !== "center" && !(y === 3 && (x === 7 || x === 8)) && !(y === 12 && x === 8))
        map3Grid[y][x] = "tall_grass";
    }
  }

  await db.insert(gameMaps).values([
    {
      slug: "vale-pallet",
      name: "Mapa 1: Vale Pallet",
      description: "Lar dos primeiros treinadores. Ginásio do Brock (Pedra) e Loja básica.",
      width: 16, height: 16,
      tileGrid: map1Grid,
      encounterTable: [
        { pokedexId: 1, name: "Bulbasaur", weight: 22, minLevel: 3, maxLevel: 8, tileTypes: ["tall_grass"] },
        { pokedexId: 4, name: "Charmander", weight: 22, minLevel: 3, maxLevel: 8, tileTypes: ["tall_grass"] },
        { pokedexId: 7, name: "Squirtle", weight: 22, minLevel: 3, maxLevel: 8, tileTypes: ["tall_grass", "water"] },
        { pokedexId: 25, name: "Pikachu", weight: 18, minLevel: 4, maxLevel: 9, tileTypes: ["tall_grass"] },
        { pokedexId: 133, name: "Eevee", weight: 16, minLevel: 4, maxLevel: 10, tileTypes: ["tall_grass"] },
      ],
      portals: [
        { id: "p1-north-1", sourceX: 7, sourceY: 0, targetMapId: 2, targetMapName: "Floresta de Viridian", targetX: 7, targetY: 14, label: "Norte → Floresta de Viridian" },
        { id: "p1-north-2", sourceX: 8, sourceY: 0, targetMapId: 2, targetMapName: "Floresta de Viridian", targetX: 8, targetY: 14, label: "Norte → Floresta de Viridian" },
      ],
      npcs: [
        { id: "shop-pallet", x: 2, y: 7, type: "shop", name: "Loja Pallet", shopId: 1, dialog: "Bem-vindo! Temos itens básicos para sua jornada!" },
        { id: "gym-brock", x: 11, y: 4, type: "gym", name: "Brock", gymId: 1, dialog: "Sou Brock! Líder do Ginásio Pewter! Você tem coragem para me enfrentar?" },
      ],
    },
    {
      slug: "floresta-viridian",
      name: "Mapa 2: Floresta de Viridian",
      description: "Floresta densa com Gengar, Umbreon e Lucario. Ginásio da Misty (Água).",
      width: 16, height: 16,
      tileGrid: map2Grid,
      encounterTable: [
        { pokedexId: 94, name: "Gengar", weight: 25, minLevel: 12, maxLevel: 22, tileTypes: ["tall_grass"] },
        { pokedexId: 197, name: "Umbreon", weight: 20, minLevel: 14, maxLevel: 24, tileTypes: ["tall_grass"] },
        { pokedexId: 448, name: "Lucario", weight: 20, minLevel: 15, maxLevel: 25, tileTypes: ["tall_grass"] },
        { pokedexId: 282, name: "Gardevoir", weight: 18, minLevel: 15, maxLevel: 26, tileTypes: ["tall_grass"] },
        { pokedexId: 131, name: "Lapras", weight: 17, minLevel: 16, maxLevel: 25, tileTypes: ["tall_grass"] },
      ],
      portals: [
        { id: "p2-south-1", sourceX: 7, sourceY: 15, targetMapId: 1, targetMapName: "Vale Pallet", targetX: 7, targetY: 1, label: "Sul → Vale Pallet" },
        { id: "p2-south-2", sourceX: 8, sourceY: 15, targetMapId: 1, targetMapName: "Vale Pallet", targetX: 8, targetY: 1, label: "Sul → Vale Pallet" },
        { id: "p2-east-1", sourceX: 15, sourceY: 7, targetMapId: 3, targetMapName: "Pico Celeste", targetX: 1, targetY: 7, label: "Leste → Pico Celeste" },
        { id: "p2-east-2", sourceX: 15, sourceY: 8, targetMapId: 3, targetMapName: "Pico Celeste", targetX: 1, targetY: 8, label: "Leste → Pico Celeste" },
      ],
      npcs: [
        { id: "shop-viridian", x: 3, y: 11, type: "shop", name: "Loja da Floresta", shopId: 2, dialog: "Estoque intermediário para Treinadores que chegam longe!" },
        { id: "gym-misty", x: 11, y: 3, type: "gym", name: "Misty", gymId: 2, dialog: "Sou Misty! A Garota Sereia! Prepare-se para se afogar!" },
      ],
    },
    {
      slug: "pico-celeste",
      name: "Mapa 3: Pico Celeste",
      description: "Santuário lendário com Rayquaza, Mewtwo e Dragonite. Ginásio do Lance (Dragão).",
      width: 16, height: 16,
      tileGrid: map3Grid,
      encounterTable: [
        { pokedexId: 384, name: "Rayquaza", weight: 20, minLevel: 35, maxLevel: 55, tileTypes: ["tall_grass"] },
        { pokedexId: 150, name: "Mewtwo", weight: 20, minLevel: 35, maxLevel: 55, tileTypes: ["tall_grass"] },
        { pokedexId: 149, name: "Dragonite", weight: 25, minLevel: 28, maxLevel: 45, tileTypes: ["tall_grass"] },
        { pokedexId: 6, name: "Charizard", weight: 20, minLevel: 25, maxLevel: 45, tileTypes: ["tall_grass"] },
        { pokedexId: 130, name: "Gyarados", weight: 15, minLevel: 26, maxLevel: 44, tileTypes: ["tall_grass"] },
      ],
      portals: [
        { id: "p3-west-1", sourceX: 0, sourceY: 7, targetMapId: 2, targetMapName: "Floresta de Viridian", targetX: 14, targetY: 7, label: "Oeste → Floresta de Viridian" },
        { id: "p3-west-2", sourceX: 0, sourceY: 8, targetMapId: 2, targetMapName: "Floresta de Viridian", targetX: 14, targetY: 8, label: "Oeste → Floresta de Viridian" },
      ],
      npcs: [
        { id: "shop-peak", x: 8, y: 12, type: "shop", name: "Loja do Pico", shopId: 3, dialog: "Items raros para os mais fortes Treinadores do mundo!" },
        { id: "gym-lance", x: 7, y: 3, type: "gym", name: "Lance", gymId: 3, dialog: "Lance, Mestre dos Dragões! Ninguém passou por mim ainda!" },
      ],
    },
  ]);
}
