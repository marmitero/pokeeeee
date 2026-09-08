import { db } from "@/db";
import { shopItems } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { EVOLUTION_ITEM_EMOJI, EVOLUTION_ITEM_LABEL, type EvolutionItemKey } from "./evolution-items";

/**
 * Catálogo das lojas.
 *
 * Etapa C (8.1): 11 lojas — as 3 originais (mapas 1–3) + uma por cidade
 * (lojas 4–11 nos mapas 5→40). Consumíveis sobem de tier com a cidade
 * (Masterball e Hiper Poção só do meio da jornada em diante); as 21 pedras
 * de evolução estão em TODAS as lojas, porque evoluções de espécies
 * capturadas cedo (Eevee, Pikachu) não podem ficar presas atrás do mapa 20.
 *
 * Preços das pedras (decisão do mantenedor, Etapa C): **absurdamente caras**
 * — 100k a 200k Pk$. Vitória selvagem paga `nível×12+40` (≈520 no nv 40,
 * ≈1240 no nv 100), então uma pedra de loja custa dezenas de vitórias: a
 * loja é o último recurso, e as vias principais são o drop raro de
 * selvagens nv 40+ (`src/lib/engine/drops.ts`) e a Arena Boss semanal (8.3).
 * Pedras **não podem ser vendidas** (`POST /api/shop` rejeita `misc` de
 * evolução) — senão drop/boss virariam fonte infinita de dinheiro.
 */

interface ConsumableSpec {
  itemKey: string;
  name: string;
  description: string;
  category: string;
  buyPrice: number;
  iconEmoji: string;
  stock: number;
}

const BALL = {
  pokeballs: { name: "Pokébola", description: "Captura Pokémon selvagens.", buyPrice: 200, iconEmoji: "🔴" },
  greatballs: { name: "Greatball", description: "Maior chance de captura.", buyPrice: 600, iconEmoji: "🔵" },
  ultraballs: { name: "Ultraball", description: "Alta chance de captura.", buyPrice: 1200, iconEmoji: "🟡" },
  masterballs: { name: "Masterball", description: "Captura garantida! 100% de chance.", buyPrice: 8000, iconEmoji: "🟣" },
} as const;

const POTION = {
  potions: { name: "Poção", description: "Restaura 20 HP de um Pokémon.", buyPrice: 300, iconEmoji: "🧪" },
  superPotions: { name: "Super Poção", description: "Restaura 50 HP de um Pokémon.", buyPrice: 700, iconEmoji: "🧴" },
  maxPotions: { name: "Hiper Poção", description: "Restaura todo o HP.", buyPrice: 2500, iconEmoji: "💊" },
  revives: { name: "Reviver", description: "Revive um Pokémon com metade do HP.", buyPrice: 1500, iconEmoji: "⚡" },
} as const;

function consumable(
  kind: "ball" | "potion",
  itemKey: string,
  stock: number
): ConsumableSpec {
  const base = kind === "ball"
    ? BALL[itemKey as keyof typeof BALL]
    : POTION[itemKey as keyof typeof POTION];
  return {
    itemKey,
    name: base.name,
    description: base.description,
    category: kind === "ball" ? "ball" : "potion",
    buyPrice: base.buyPrice,
    iconEmoji: base.iconEmoji,
    stock,
  };
}

/** Consumíveis por loja (o tier sobe com a cidade). */
const SHOP_CONSUMABLES: Record<number, ConsumableSpec[]> = {
  1: [
    consumable("ball", "pokeballs", 99),
    consumable("potion", "potions", 99),
    consumable("potion", "revives", 10),
  ],
  2: [
    consumable("ball", "pokeballs", 99),
    consumable("ball", "greatballs", 50),
    consumable("potion", "superPotions", 99),
    consumable("potion", "revives", 20),
  ],
  3: [
    consumable("ball", "ultraballs", 30),
    consumable("potion", "maxPotions", 20),
    consumable("ball", "masterballs", 5),
    consumable("potion", "revives", 30),
  ],
  // ── Etapa C: lojas das cidades ──
  4: [ // mapa 5 — Litoral de Vermilion
    consumable("ball", "pokeballs", 99),
    consumable("ball", "greatballs", 60),
    consumable("potion", "potions", 99),
    consumable("potion", "superPotions", 60),
    consumable("potion", "revives", 25),
  ],
  5: [ // mapa 10 — Ilhas Glaciais
    consumable("ball", "greatballs", 80),
    consumable("ball", "ultraballs", 40),
    consumable("potion", "superPotions", 80),
    consumable("potion", "revives", 30),
  ],
  6: [ // mapa 15 — Fossa Abissal
    consumable("ball", "greatballs", 80),
    consumable("ball", "ultraballs", 50),
    consumable("potion", "superPotions", 80),
    consumable("potion", "revives", 35),
  ],
  7: [ // mapa 20 — Santuário Celeste
    consumable("ball", "ultraballs", 60),
    consumable("potion", "superPotions", 99),
    consumable("potion", "maxPotions", 30),
    consumable("potion", "revives", 40),
  ],
  8: [ // mapa 25 — Forja Abandonada
    consumable("ball", "ultraballs", 70),
    consumable("potion", "maxPotions", 40),
    consumable("potion", "revives", 45),
  ],
  9: [ // mapa 30 — Recife da Tempestade
    consumable("ball", "ultraballs", 80),
    consumable("ball", "masterballs", 6),
    consumable("potion", "maxPotions", 50),
    consumable("potion", "revives", 50),
  ],
  10: [ // mapa 35 — Farol do Fim
    consumable("ball", "ultraballs", 90),
    consumable("ball", "masterballs", 8),
    consumable("potion", "maxPotions", 60),
    consumable("potion", "revives", 60),
  ],
  11: [ // mapa 40 — Coroa do Mundo
    consumable("ball", "ultraballs", 99),
    consumable("ball", "masterballs", 10),
    consumable("potion", "maxPotions", 80),
    consumable("potion", "revives", 80),
  ],
};

/** As 21 pedras/itens de evolução, com os preços extremos da Etapa C. */
const STONE_SPECS: Array<{ itemKey: EvolutionItemKey; buyPrice: number; stock: number }> = [
  { itemKey: "fireStone", buyPrice: 100_000, stock: 5 },
  { itemKey: "waterStone", buyPrice: 100_000, stock: 5 },
  { itemKey: "thunderStone", buyPrice: 100_000, stock: 5 },
  { itemKey: "leafStone", buyPrice: 100_000, stock: 5 },
  { itemKey: "moonStone", buyPrice: 110_000, stock: 4 },
  { itemKey: "sunStone", buyPrice: 120_000, stock: 4 },
  { itemKey: "shinyStone", buyPrice: 120_000, stock: 4 },
  { itemKey: "metalCoat", buyPrice: 130_000, stock: 4 },
  { itemKey: "kingsRock", buyPrice: 130_000, stock: 4 },
  { itemKey: "dragonScale", buyPrice: 130_000, stock: 4 },
  { itemKey: "upgrade", buyPrice: 130_000, stock: 4 },
  { itemKey: "duskStone", buyPrice: 150_000, stock: 3 },
  { itemKey: "dawnStone", buyPrice: 150_000, stock: 3 },
  { itemKey: "ovalStone", buyPrice: 150_000, stock: 3 },
  { itemKey: "protector", buyPrice: 160_000, stock: 3 },
  { itemKey: "electirizer", buyPrice: 160_000, stock: 3 },
  { itemKey: "magmarizer", buyPrice: 160_000, stock: 3 },
  { itemKey: "razorClaw", buyPrice: 160_000, stock: 3 },
  { itemKey: "razorFang", buyPrice: 160_000, stock: 3 },
  { itemKey: "dubiousDisc", buyPrice: 200_000, stock: 2 },
  { itemKey: "reaperCloth", buyPrice: 200_000, stock: 2 },
];

export const SHOP_IDS = Object.keys(SHOP_CONSUMABLES).map(Number);

export async function ensureShopSeeded() {
  // B10 (Fase 3): o \"Antídoto\" tinha `itemKey: \"potions\"` — comprar um antídoto
  // creditava uma Poção. Não existe sistema de status (veneno/queimadura/
  // paralisia) para ele curar, então o item foi **removido** em vez de
  // reaproveitado. A limpeza abaixo é idempotente e cobre bancos já semeados;
  // quando o sistema de status chegar (8.4), o item volta com coluna própria.
  await db
    .delete(shopItems)
    .where(and(eq(shopItems.name, "Antídoto"), eq(shopItems.itemKey, "potions")));

  // Uma leitura só: este seed roda a cada request de loja, e 11 lojas × 21
  // pedras em SELECTs individuais seria pesado. Tudo abaixo é decidido em
  // memória a partir deste snapshot.
  const rows = await db
    .select({
      shopId: shopItems.shopId,
      itemKey: shopItems.itemKey,
      buyPrice: shopItems.buyPrice,
    })
    .from(shopItems);
  const have = new Map(rows.map((r) => [`${r.shopId}:${r.itemKey}`, r.buyPrice]));

  const toInsert: (typeof shopItems.$inferInsert)[] = [];

  for (const shopId of SHOP_IDS) {
    for (const spec of SHOP_CONSUMABLES[shopId]!) {
      if (have.has(`${shopId}:${spec.itemKey}`)) continue;
      toInsert.push({
        shopId,
        name: spec.name,
        description: spec.description,
        category: spec.category,
        itemKey: spec.itemKey,
        buyPrice: spec.buyPrice,
        sellPrice: Math.floor(spec.buyPrice / 2),
        iconEmoji: spec.iconEmoji,
        isPremium: false,
        stock: spec.stock,
      });
    }
    for (const stone of STONE_SPECS) {
      if (have.has(`${shopId}:${stone.itemKey}`)) continue;
      toInsert.push({
        shopId,
        name: EVOLUTION_ITEM_LABEL[stone.itemKey],
        description: "Usado fora de batalha para evoluir certas espécies.",
        category: "misc",
        itemKey: stone.itemKey,
        buyPrice: stone.buyPrice,
        sellPrice: Math.floor(stone.buyPrice / 2),
        iconEmoji: EVOLUTION_ITEM_EMOJI[stone.itemKey],
        isPremium: false,
        stock: stone.stock,
      });
    }
  }

  if (toInsert.length > 0) {
    await db.insert(shopItems).values(toInsert);
  }

  // ── Etapa C: sincronização de preços das pedras (idempotente) ──────────
  // Bancos antigos (produção) têm as pedras a 1.200–6.000. Como o seed roda
  // a cada request de loja, o UPDATE abaixo propaga os preços extremos sem
  // migration e sem workflow — cada linha é tocada uma única vez, quando o
  // preço ainda é o antigo. O `if` decide em memória pelo snapshot: depois
  // de sincronizado, nenhum UPDATE roda.
  const stoneTarget = new Map(STONE_SPECS.map((s) => [s.itemKey, s.buyPrice]));
  const needsSync = rows.some(
    (r) => stoneTarget.has(r.itemKey as EvolutionItemKey) && r.buyPrice !== stoneTarget.get(r.itemKey as EvolutionItemKey)
  );
  if (needsSync) {
    for (const stone of STONE_SPECS) {
      await db
        .update(shopItems)
        .set({
          buyPrice: stone.buyPrice,
          sellPrice: Math.floor(stone.buyPrice / 2),
        })
        .where(
          and(eq(shopItems.itemKey, stone.itemKey), ne(shopItems.buyPrice, stone.buyPrice))
        );
    }
  }
}
