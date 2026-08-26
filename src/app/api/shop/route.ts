import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, shopItems } from "@/db/schema";
import { ensureShopSeeded } from "@/lib/seed-shop";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import {   INVENTORY_KEYS, shopActionSchema, shopQuerySchema   } from "@/lib/validation";
import {   parse, badRequest, notFound, publicUser, routeError   } from "@/lib/api";

/**
 * Loja de itens.
 *
 * Fase 1 — o que mudou:
 *  - `userId` vem da **sessão** (V2).
 *  - `quantity` é validada como **inteiro entre 1 e 99**. Antes vinha crua do
 *    corpo: com valor negativo o `totalCost` ficava negativo e
 *    `money - totalCost` **somava** dinheiro — era o exploit V3, que dava
 *    +10.000 Pk$ numa única request.
 *  - `itemKey` passa por uma **allowlist** antes de virar nome de coluna,
 *    impedindo mass-assignment (ex.: escrever em `is_premium` ou `money`).
 *  - Débito de dinheiro condicional e atômico (`WHERE money >= custo`),
 *    seguro contra requests concorrentes.
 */

export async function GET(req: Request) {
  try {
    await ensureShopSeeded();

    const { shopId } = parse(
      shopQuerySchema,
      Object.fromEntries(new URL(req.url).searchParams)
    );

    const items = await db
      .select()
      .from(shopItems)
      .where(eq(shopItems.shopId, shopId));

    return NextResponse.json({ items });
  } catch (err: unknown) {
    return routeError(err, "shop:list", "Erro ao carregar a loja.");
  }
}

export async function POST(req: Request) {
  try {
    // Regressão da Fase 1 corrigida na Fase 5: o seed tinha sido removido daqui
    // e ficado só no GET. Na prática a UI sempre lista antes de comprar, então
    // nunca apareceu — mas um POST direto num banco novo devolvia 404.
    // Encontrado pelo teste de integração "compra legítima debita o valor exato".
    await ensureShopSeeded();

    const user = await requireUser(req);
    await enforceRateLimit(req, "shop", 30, 60_000);

    const input = parse(shopActionSchema, await req.json().catch(() => ({})));

    const itemRows = await db
      .select()
      .from(shopItems)
      .where(eq(shopItems.id, input.itemId));

    if (itemRows.length === 0) throw notFound("Item não encontrado.");
    const item = itemRows[0];

    // Allowlist: só colunas de inventário podem ser creditadas.
    if (!INVENTORY_KEYS.includes(item.itemKey as (typeof INVENTORY_KEYS)[number])) {
      console.error(`[shop] itemKey fora da allowlist: ${item.itemKey}`);
      throw badRequest("Este item não está disponível para compra.");
    }
    const column = item.itemKey as (typeof INVENTORY_KEYS)[number];

    const quantity = input.quantity;
    const totalCost = item.buyPrice * quantity;

    if (user.money < totalCost) {
      throw badRequest(`Sem Pk$ suficiente! Precisa de ${totalCost} Pk$.`);
    }

    const updated = await db
      .update(users)
      .set({
        money: sql`${users.money} - ${totalCost}`,
        [column]: sql`${users[column]} + ${quantity}`,
      })
      .where(and(eq(users.id, user.id), sql`${users.money} >= ${totalCost}`))
      .returning();

    if (updated.length === 0) {
      throw badRequest(`Sem Pk$ suficiente! Precisa de ${totalCost} Pk$.`);
    }

    return NextResponse.json({
      user: publicUser(updated[0]),
      message: `Comprou ${quantity}x ${item.name} por ${totalCost} Pk$!`,
    });
  } catch (err: unknown) {
    return routeError(err, "shop:buy", "Erro na loja.");
  }
}

export const dynamic = "force-dynamic";
