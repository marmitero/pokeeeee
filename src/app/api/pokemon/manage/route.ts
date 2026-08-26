import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { manageSchema } from "@/lib/validation";
import { parse, badRequest, notFound, publicUser, routeError } from "@/lib/api";

/**
 * Gestão de Pokémon: soltar, vender, mover entre time/PC, trocar slots, usar item.
 *
 * Fase 1 — o que mudou:
 *  - `userId` vem da **sessão**; `pokemonId` é sempre verificado contra o
 *    dono (V2 — antes bastava trocar o número no corpo da request).
 *  - `action` validada por união discriminada: payloads desconhecidos viram 400.
 *  - `item` restrito ao enum de itens de cura.
 *  - Venda e uso de item agora rodam em **transação**.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const HEAL_AMOUNT: Record<string, number> = {
  potion: 20,
  superPotion: 50,
};

const ITEM_LABEL: Record<string, string> = {
  potion: "Poções",
  superPotion: "Super Poções",
  maxPotion: "Hiper Poções",
  revive: "Reviveres",
};

const INVENTORY_COLUMN = {
  potion: "potions",
  superPotion: "superPotions",
  maxPotion: "maxPotions",
  revive: "revives",
} as const;

/** Re-numera os slots do time para ficarem contíguos (1..n). */
async function renumberParty(tx: Tx, userId: number): Promise<void> {
  const party = await tx
    .select({ id: userPokemon.id, partySlot: userPokemon.partySlot })
    .from(userPokemon)
    .where(and(eq(userPokemon.userId, userId), isNotNull(userPokemon.partySlot)));

  const ordered = party.sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99));

  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].partySlot === i + 1) continue;
    await tx
      .update(userPokemon)
      .set({ partySlot: i + 1 })
      .where(eq(userPokemon.id, ordered[i].id));
  }
}

async function loadOwned(pokemonId: number, userId: number) {
  const rows = await db
    .select()
    .from(userPokemon)
    .where(and(eq(userPokemon.id, pokemonId), eq(userPokemon.userId, userId)));
  if (rows.length === 0) throw notFound("Pokémon não encontrado.");
  return rows[0];
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    enforceRateLimit(req, "manage", 60, 60_000);

    const input = parse(manageSchema, await req.json().catch(() => ({})));
    const uid = user.id;

    // ── RELEASE ──────────────────────────────────────────────────────────
    if (input.action === "release") {
      const poke = await loadOwned(input.pokemonId, uid);
      if (poke.isStarter) {
        throw badRequest("Não é possível soltar seu inicial!");
      }

      await db.transaction(async (tx) => {
        await tx.delete(userPokemon).where(eq(userPokemon.id, poke.id));
        await renumberParty(tx, uid);
      });

      const party = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, uid));

      return NextResponse.json({
        party,
        message: `${poke.name} foi solto na natureza!`,
      });
    }

    // ── SELL ─────────────────────────────────────────────────────────────
    if (input.action === "sell") {
      const poke = await loadOwned(input.pokemonId, uid);
      if (poke.isStarter) {
        throw badRequest("Não é possível vender seu inicial!");
      }

      const sellPrice = 200 + poke.level * 50;

      await db.transaction(async (tx) => {
        await tx.delete(userPokemon).where(eq(userPokemon.id, poke.id));
        await tx
          .update(users)
          .set({ money: sql`${users.money} + ${sellPrice}` })
          .where(eq(users.id, uid));
        await renumberParty(tx, uid);
      });

      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, uid));
      const party = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, uid));

      return NextResponse.json({
        user: publicUser(updatedUser),
        party,
        message: `${poke.name} vendido por ${sellPrice} Pk$!`,
        earned: sellPrice,
      });
    }

    // ── TO PARTY ─────────────────────────────────────────────────────────
    if (input.action === "to_party") {
      const poke = await loadOwned(input.pokemonId, uid);

      const party = await db
        .select({ id: userPokemon.id })
        .from(userPokemon)
        .where(
          and(eq(userPokemon.userId, uid), isNotNull(userPokemon.partySlot))
        );

      if (party.length >= 6) {
        throw badRequest("Seu time já está cheio (6 Pokémon)!");
      }

      await db
        .update(userPokemon)
        .set({ partySlot: party.length + 1 })
        .where(eq(userPokemon.id, poke.id));

      const all = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, uid));

      return NextResponse.json({ party: all, message: "Pokémon adicionado ao time!" });
    }

    // ── TO BOX ───────────────────────────────────────────────────────────
    if (input.action === "to_box") {
      const poke = await loadOwned(input.pokemonId, uid);

      const party = await db
        .select({ id: userPokemon.id })
        .from(userPokemon)
        .where(
          and(eq(userPokemon.userId, uid), isNotNull(userPokemon.partySlot))
        );

      if (party.length <= 1) {
        throw badRequest("Você precisa de ao menos 1 Pokémon no time!");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(userPokemon)
          .set({ partySlot: null })
          .where(eq(userPokemon.id, poke.id));
        await renumberParty(tx, uid);
      });

      const all = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, uid));

      return NextResponse.json({ party: all, message: "Pokémon enviado para o PC!" });
    }

    // ── SWAP SLOTS ───────────────────────────────────────────────────────
    if (input.action === "swap_slots") {
      const p1 = await loadOwned(input.slot1PokemonId, uid);
      const p2 = await loadOwned(input.slot2PokemonId, uid);

      await db.transaction(async (tx) => {
        await tx
          .update(userPokemon)
          .set({ partySlot: p2.partySlot })
          .where(eq(userPokemon.id, p1.id));
        await tx
          .update(userPokemon)
          .set({ partySlot: p1.partySlot })
          .where(eq(userPokemon.id, p2.id));
      });

      const all = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, uid));

      return NextResponse.json({ party: all, message: "Posições trocadas!" });
    }

    // ── USE ITEM ─────────────────────────────────────────────────────────
    if (input.action === "use_item") {
      const poke = await loadOwned(input.pokemonId, uid);
      const column = INVENTORY_COLUMN[input.item];
      const inStock = user[column];

      if (inStock <= 0) {
        throw badRequest(`Sem ${ITEM_LABEL[input.item]}!`);
      }
      if (input.item === "revive" && poke.hp > 0) {
        throw badRequest("Pokémon não está desmaiado!");
      }
      if (input.item !== "revive" && poke.hp >= poke.maxHp) {
        throw badRequest("Este Pokémon já está com o HP cheio!");
      }

      const healAmount =
        input.item === "maxPotion"
          ? poke.maxHp - poke.hp
          : input.item === "revive"
            ? Math.floor(poke.maxHp / 2)
            : HEAL_AMOUNT[input.item];

      await db.transaction(async (tx) => {
        // Débito condicional: impede gasto duplo em requests concorrentes.
        const deducted = await tx
          .update(users)
          .set({ [column]: sql`${users[column]} - 1` })
          .where(and(eq(users.id, uid), sql`${users[column]} > 0`))
          .returning({ id: users.id });

        if (deducted.length === 0) {
          throw badRequest(`Sem ${ITEM_LABEL[input.item]}!`);
        }

        await tx
          .update(userPokemon)
          .set({
            hp: input.item === "revive" ? healAmount : sql`LEAST(${userPokemon.maxHp}, ${userPokemon.hp} + ${healAmount})`,
          })
          .where(eq(userPokemon.id, poke.id));
      });

      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, uid));
      const all = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, uid));

      return NextResponse.json({
        user: publicUser(updatedUser),
        party: all,
        message: `Item usado! +${healAmount} HP`,
      });
    }

    throw badRequest("Ação inválida.");
  } catch (err: unknown) {
    return routeError(err, "pokemon:manage", "Erro ao gerenciar o Pokémon.");
  }
}

export const dynamic = "force-dynamic";
