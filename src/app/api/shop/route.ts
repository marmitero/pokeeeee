import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, shopItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureShopSeeded } from "@/lib/seed-shop";

export async function GET(req: Request) {
  await ensureShopSeeded();
  const { searchParams } = new URL(req.url);
  const shopId = Number(searchParams.get("shopId") || "1");
  const items = await db.select().from(shopItems).where(eq(shopItems.shopId, shopId));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  try {
    await ensureShopSeeded();
    const body = await req.json();
    const { action, userId, itemId, quantity = 1, pokemonId } = body;

    const userRows = await db.select().from(users).where(eq(users.id, Number(userId)));
    if (!userRows.length) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    const u = userRows[0];

    if (action === "buy") {
      const itemRows = await db.select().from(shopItems).where(eq(shopItems.id, Number(itemId)));
      if (!itemRows.length) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
      const item = itemRows[0];

      const totalCost = item.buyPrice * quantity;
      if (u.money < totalCost) {
        return NextResponse.json({ error: `Sem Pk$ suficiente! Precisa de ${totalCost} Pk$.` }, { status: 400 });
      }

      const key = item.itemKey as keyof typeof u;
      const current = (u[key] as number) ?? 0;

      await db.update(users).set({
        money: u.money - totalCost,
        [item.itemKey]: current + quantity,
      }).where(eq(users.id, u.id));

      const updated = await db.select().from(users).where(eq(users.id, u.id));
      return NextResponse.json({
        user: updated[0],
        message: `Comprou ${quantity}x ${item.name} por ${totalCost} Pk$!`,
      });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro na loja";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
