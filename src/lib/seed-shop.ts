import { db } from "@/db";
import { shopItems } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { EVOLUTION_ITEM_EMOJI, EVOLUTION_ITEM_LABEL } from "./evolution-items";

export async function ensureShopSeeded() {
  // B10 (Fase 3): o "Antídoto" tinha `itemKey: "potions"` — comprar um antídoto
  // creditava uma Poção. Não existe sistema de status (veneno/queimadura/
  // paralisia) para ele curar, então o item foi **removido** em vez de
  // reaproveitado. A limpeza abaixo é idempotente e cobre bancos já semeados;
  // quando o sistema de status chegar (roadmap), o item volta com coluna própria.
  await db
    .delete(shopItems)
    .where(and(eq(shopItems.name, "Antídoto"), eq(shopItems.itemKey, "potions")));

  const existing = await db.select({ value: count() }).from(shopItems);
  if (existing[0].value === 0) {
    await db.insert(shopItems).values([
    // ─── Shop 1 – Loja Pallet (basic) ───────────────────────────
    { shopId: 1, name: "Pokébola", description: "Captura Pokémon selvagens.", category: "ball", itemKey: "pokeballs", buyPrice: 200, sellPrice: 100, iconEmoji: "🔴", isPremium: false, stock: 99 },
    { shopId: 1, name: "Poção", description: "Restaura 20 HP de um Pokémon.", category: "potion", itemKey: "potions", buyPrice: 300, sellPrice: 150, iconEmoji: "🧪", isPremium: false, stock: 99 },
    { shopId: 1, name: "Reviver", description: "Revive um Pokémon com metade do HP.", category: "potion", itemKey: "revives", buyPrice: 1500, sellPrice: 750, iconEmoji: "⚡", isPremium: false, stock: 10 },

    // ─── Shop 2 – Loja Viridian (intermediate) ────────────────────
    { shopId: 2, name: "Pokébola", description: "Captura Pokémon selvagens.", category: "ball", itemKey: "pokeballs", buyPrice: 200, sellPrice: 100, iconEmoji: "🔴", isPremium: false, stock: 99 },
    { shopId: 2, name: "Greatball", description: "Maior chance de captura.", category: "ball", itemKey: "greatballs", buyPrice: 600, sellPrice: 300, iconEmoji: "🔵", isPremium: false, stock: 50 },
    { shopId: 2, name: "Super Poção", description: "Restaura 50 HP de um Pokémon.", category: "potion", itemKey: "superPotions", buyPrice: 700, sellPrice: 350, iconEmoji: "🧴", isPremium: false, stock: 99 },
    { shopId: 2, name: "Reviver", description: "Revive um Pokémon com metade do HP.", category: "potion", itemKey: "revives", buyPrice: 1500, sellPrice: 750, iconEmoji: "⚡", isPremium: false, stock: 20 },

    // ─── Shop 3 – Loja Pico Celeste (advanced) ────────────────────
    { shopId: 3, name: "Ultraball", description: "Alta chance de captura.", category: "ball", itemKey: "ultraballs", buyPrice: 1200, sellPrice: 600, iconEmoji: "🟡", isPremium: false, stock: 30 },
    { shopId: 3, name: "Hiper Poção", description: "Restaura todo o HP.", category: "potion", itemKey: "maxPotions", buyPrice: 2500, sellPrice: 1250, iconEmoji: "💊", isPremium: false, stock: 20 },
    { shopId: 3, name: "Masterball", description: "Captura garantida! 100% de chance.", category: "ball", itemKey: "masterballs", buyPrice: 8000, sellPrice: 4000, iconEmoji: "🟣", isPremium: false, stock: 5 },
    { shopId: 3, name: "Reviver", description: "Revive um Pokémon com metade do HP.", category: "potion", itemKey: "revives", buyPrice: 1500, sellPrice: 750, iconEmoji: "⚡", isPremium: false, stock: 30 },
    ]);
  }

  // ─── Fase 6.4-B: itens de evolução (idempotente) ─────────────────────────
  // Estes itens usam insert-if-ausente, então rodam também em bancos que já
  // tinham as lojas básicas semeadas. O preço/estoque é conteúdo; a
  // existência é o contrato. Todos passam pela allowlist de `INVENTORY_KEYS`.
  const evolutionShopItems = [
    // Loja básica: pedras clássicas
    { shopId: 1, itemKey: "fireStone", buyPrice: 1200, stock: 10 },
    { shopId: 1, itemKey: "waterStone", buyPrice: 1200, stock: 10 },
    { shopId: 1, itemKey: "thunderStone", buyPrice: 1200, stock: 10 },
    { shopId: 1, itemKey: "leafStone", buyPrice: 1200, stock: 10 },
    { shopId: 1, itemKey: "moonStone", buyPrice: 1500, stock: 8 },
    // Loja intermediária: pedras modernas e os "cascos" raros
    { shopId: 2, itemKey: "sunStone", buyPrice: 1800, stock: 8 },
    { shopId: 2, itemKey: "shinyStone", buyPrice: 2200, stock: 6 },
    { shopId: 2, itemKey: "metalCoat", buyPrice: 2500, stock: 5 },
    { shopId: 2, itemKey: "kingsRock", buyPrice: 3000, stock: 5 },
    { shopId: 2, itemKey: "dragonScale", buyPrice: 3000, stock: 5 },
    { shopId: 2, itemKey: "upgrade", buyPrice: 3000, stock: 5 },
    // Loja avançada: pedras de linha de evolução tardia
    { shopId: 3, itemKey: "duskStone", buyPrice: 5000, stock: 4 },
    { shopId: 3, itemKey: "dawnStone", buyPrice: 5000, stock: 4 },
    { shopId: 3, itemKey: "ovalStone", buyPrice: 6000, stock: 4 },
  ];

  for (const spec of evolutionShopItems) {
    const exists = await db
      .select({ id: shopItems.id })
      .from(shopItems)
      .where(and(eq(shopItems.shopId, spec.shopId), eq(shopItems.itemKey, spec.itemKey)))
      .limit(1);
    if (exists.length > 0) continue;

    await db.insert(shopItems).values({
      shopId: spec.shopId,
      name: EVOLUTION_ITEM_LABEL[spec.itemKey as keyof typeof EVOLUTION_ITEM_LABEL],
      description: "Usado fora de batalha para evoluir certas espécies.",
      category: "misc",
      itemKey: spec.itemKey,
      buyPrice: spec.buyPrice,
      sellPrice: Math.floor(spec.buyPrice / 2),
      iconEmoji: EVOLUTION_ITEM_EMOJI[spec.itemKey as keyof typeof EVOLUTION_ITEM_EMOJI],
      isPremium: false,
      stock: spec.stock,
    });
  }
}
