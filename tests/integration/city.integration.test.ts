import { beforeEach, describe, expect, it } from "vitest";
import { client } from "./client";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";

beforeEach(async () => {
  await resetRateLimits();
});

let seq = 0;
async function register() {
  seq += 1;
  const { c } = await registerVerified(`cid${Date.now()}${seq}`);
  return c;
}

interface ShopItemBody {
  id: number;
  shopId: number;
  itemKey: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
}

async function shopItems(c: ReturnType<typeof client>, shopId: number): Promise<ShopItemBody[]> {
  const r = await c.call(`/api/shop?shopId=${shopId}`);
  expect(r.status).toBe(200);
  return (r.body as { items: ShopItemBody[] }).items;
}

describe("Etapa C — lojas das cidades (8.1)", () => {
  it("toda cidade vende as 21 pedras a preços extremos", async () => {
    const c = await register();
    for (const shopId of [4, 7, 11]) {
      const items = await shopItems(c, shopId);
      const stones = items.filter((i) => i.category === "misc");
      expect(stones, `loja ${shopId} sem as 21 pedras`).toHaveLength(21);
      const fire = stones.find((i) => i.itemKey === "fireStone")!;
      const reaper = stones.find((i) => i.itemKey === "reaperCloth")!;
      expect(fire.buyPrice).toBe(100_000);
      expect(reaper.buyPrice).toBe(200_000);
    }
  });

  it("consumíveis sobem de tier com a cidade", async () => {
    const c = await register();
    const shop1 = await shopItems(c, 1);
    const shop11 = await shopItems(c, 11);
    const keys1 = new Set(shop1.map((i) => i.itemKey));
    const keys11 = new Set(shop11.map((i) => i.itemKey));
    // Loja inicial: só o básico.
    expect(keys1.has("masterballs")).toBe(false);
    expect(keys1.has("ultraballs")).toBe(false);
    expect(keys1.has("maxPotions")).toBe(false);
    // Loja da Coroa: o melhor estoque do jogo.
    expect(keys11.has("masterballs")).toBe(true);
    expect(keys11.has("ultraballs")).toBe(true);
    expect(keys11.has("maxPotions")).toBe(true);
  });

  it("venda de consumível credita o sellPrice exato", async () => {
    const c = await register();
    const items = await shopItems(c, 1);
    const potion = items.find((i) => i.itemKey === "potions")!;
    expect(potion.sellPrice).toBe(150);

    const sold = await c.call("/api/shop", {
      body: { action: "sell", itemId: potion.id, quantity: 2 },
    });
    expect(sold.status, JSON.stringify(sold.body)).toBe(200);
    const user = (sold.body as { user: { money: number; potions: number } }).user;
    expect(user.money).toBe(3000 + 300); // 2 × 150
    expect(user.potions).toBe(3 - 2); // começa com 3
  });

  it("pedra de evolução não pode ser vendida", async () => {
    const c = await register();
    const items = await shopItems(c, 1);
    const fire = items.find((i) => i.itemKey === "fireStone")!;
    const r = await c.call("/api/shop", {
      body: { action: "sell", itemId: fire.id, quantity: 1 },
    });
    expect(r.status).toBe(400);
  });

  it("vender mais do que possui é rejeitado", async () => {
    const c = await register();
    const items = await shopItems(c, 1);
    const potion = items.find((i) => i.itemKey === "potions")!;
    const r = await c.call("/api/shop", {
      body: { action: "sell", itemId: potion.id, quantity: 99 },
    });
    expect(r.status).toBe(400);
  });
});

describe("Etapa C — ginásios das cidades (8.2)", () => {
  it("lista os 11 líderes com a escada de insígnias 0→10", async () => {
    const c = await register();
    const r = await c.call("/api/gym");
    expect(r.status).toBe(200);
    const leaders = (r.body as { gymLeaders: { name: string; requiredBadges: number; mapId: number }[] }).gymLeaders;
    expect(leaders).toHaveLength(11);
    const reqs = [...leaders].sort((a, b) => a.requiredBadges - b.requiredBadges);
    expect(reqs.map((l) => l.requiredBadges)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(reqs.map((l) => l.name)).toContain("Magnus");
  });

  it("ginásio de cidade exige as insígnias anteriores", async () => {
    const c = await register();
    const r = await c.call("/api/battle", {
      body: { action: "start_gym", gymLeaderId: 4 },
    });
    expect(r.status).toBe(403);
  });
});

describe("Etapa C — cidades no mapa (8.1/8.2)", () => {
  it("mapa 5 tem loja + ginásio + cura; mapa 4 é selvagem", async () => {
    const c = await register();
    const r = await c.call("/api/maps");
    expect(r.status).toBe(200);
    const maps = (r.body as { maps: { id: number; npcs: { type: string; shopId?: number; gymId?: number }[] }[] }).maps;
    const m5 = maps.find((m) => m.id === 5)!;
    const m4 = maps.find((m) => m.id === 4)!;
    expect(m5.npcs.map((n) => n.type).sort()).toEqual(["gym", "healer", "shop"]);
    expect(m5.npcs.find((n) => n.type === "shop")!.shopId).toBe(4);
    expect(m5.npcs.find((n) => n.type === "gym")!.gymId).toBe(4);
    expect(m4.npcs ?? []).toHaveLength(0);
  });
});
