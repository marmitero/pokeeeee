import { db } from "@/db";
import { shopItems } from "@/db/schema";
import { count } from "drizzle-orm";

export async function ensureShopSeeded() {
  const existing = await db.select({ value: count() }).from(shopItems);
  if (existing[0].value > 0) return;

  await db.insert(shopItems).values([
    // ─── Shop 1 – Loja Pallet (basic) ───────────────────────────
    { shopId: 1, name: "Pokébola", description: "Captura Pokémon selvagens.", category: "ball", itemKey: "pokeballs", buyPrice: 200, sellPrice: 100, iconEmoji: "🔴", isPremium: false, stock: 99 },
    { shopId: 1, name: "Poção", description: "Restaura 20 HP de um Pokémon.", category: "potion", itemKey: "potions", buyPrice: 300, sellPrice: 150, iconEmoji: "🧪", isPremium: false, stock: 99 },
    { shopId: 1, name: "Antídoto", description: "Cura envenenamento.", category: "misc", itemKey: "potions", buyPrice: 100, sellPrice: 50, iconEmoji: "💉", isPremium: false, stock: 20 },
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
