import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { manageSchema } from "@/lib/validation";
import {
  EVOLUTION_ITEM_LABEL,
  EVOLUTION_ITEM_VALUES,
  type EvolutionItemKey,
} from "@/lib/evolution-items";
import { applyItemEvolution, evolutionWithItem } from "@/lib/engine/evolution";
import { moveNamesForDb, refreshMovesForLevel, sideFromUserPokemon } from "@/lib/engine/combatant";
import { STATUS_ITEMS, itemCures, statusItemByUseKey } from "@/lib/status-items";
import { STATUS_NOUN, normalizeStatus } from "@/lib/engine/status";
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

/** Guarda de tipo: `use_item` aceita cura OU item de evolução (6.4-B). */
function isEvolutionItem(item: string): item is EvolutionItemKey {
  return (EVOLUTION_ITEM_VALUES as readonly string[]).includes(item);
}

const INVENTORY_COLUMN = {
  potion: "potions",
  superPotion: "superPotions",
  maxPotion: "maxPotions",
  revive: "revives",
} as const;

type HealItem = keyof typeof INVENTORY_COLUMN;

function isHealItem(item: string): item is HealItem {
  return item in INVENTORY_COLUMN;
}

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
    await enforceRateLimit(req, "manage", 60, 60_000);

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

      // Fase 6.4-B: itens de evolução (pedras/cascos raros). Consomem o item e
      // aplicam a evolução fora de batalha, com o mesmo motor da evolução por
      // nível (stats recalculados, % HP preservado, apelido mantido).
      if (isEvolutionItem(input.item)) {
        const itemKey = input.item;
        const rule = evolutionWithItem(poke.pokedexId, itemKey);
        if (!rule) {
          throw badRequest(`${EVOLUTION_ITEM_LABEL[itemKey]} não evolui ${poke.name}!`);
        }

        const side = sideFromUserPokemon(poke);
        const outcome = applyItemEvolution(side, itemKey);
        if (!outcome) {
          throw badRequest(`${EVOLUTION_ITEM_LABEL[itemKey]} não evolui ${poke.name}!`);
        }
        const newMoves = refreshMovesForLevel(side, side.level);
        const { move1, move2, move3, move4 } = moveNamesForDb(side);

        await db.transaction(async (tx) => {
          const deducted = await tx
            .update(users)
            .set({ [itemKey]: sql`${users[itemKey]} - 1` })
            .where(and(eq(users.id, uid), sql`${users[itemKey]} > 0`))
            .returning({ id: users.id });

          if (deducted.length === 0) {
            throw badRequest(`Sem ${EVOLUTION_ITEM_LABEL[itemKey]}!`);
          }

          await tx
            .update(userPokemon)
            .set({
              pokedexId: side.pokedexId,
              name: side.name,
              hp: side.hp,
              maxHp: side.maxHp,
              attack: side.attack,
              defense: side.defense,
              spAttack: side.spAttack,
              spDefense: side.spDefense,
              speed: side.speed,
              move1, move2, move3, move4,
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
          message: `★ ${outcome.fromName} evoluiu para ${outcome.toName}!` +
            (newMoves.length ? ` Aprendeu: ${newMoves.join(", ")}.` : ""),
        });
      }

      // Fase 8.4: itens de cura de status (Antídoto, Anti-Paralisia, …).
      // Fora de batalha o status persiste até Centro Pokémon ou item — este é
      // o item. Restaurador Total também enche o HP.
      const cureKey = statusItemByUseKey(input.item);
      if (cureKey) {
        const spec = STATUS_ITEMS[cureKey];
        const status = normalizeStatus(poke.status);
        if (poke.hp <= 0) {
          throw badRequest("Pokémon desmaiado — use um Reviver primeiro!");
        }
        const cures = itemCures(cureKey, status);
        const fillsHp = Boolean(spec.fullHp) && poke.hp < poke.maxHp;
        if (!cures && !fillsHp) {
          throw badRequest(
            status === "NONE"
              ? `${poke.name} não tem nenhum problema de status!`
              : `${spec.name} não cura ${STATUS_NOUN[status]}!`
          );
        }

        await db.transaction(async (tx) => {
          const deducted = await tx
            .update(users)
            .set({ [cureKey]: sql`${users[cureKey]} - 1` })
            .where(and(eq(users.id, uid), sql`${users[cureKey]} > 0`))
            .returning({ id: users.id });
          if (deducted.length === 0) {
            throw badRequest(`Sem ${spec.plural}!`);
          }
          await tx
            .update(userPokemon)
            .set({
              ...(cures ? { status: "NONE", statusTurns: 0 } : {}),
              ...(spec.fullHp ? { hp: poke.maxHp } : {}),
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

        const parts: string[] = [];
        if (cures && status !== "NONE") parts.push(`${poke.name} se curou de ${STATUS_NOUN[status]}!`);
        if (fillsHp) parts.push(`HP restaurado por completo.`);
        return NextResponse.json({
          user: publicUser(updatedUser),
          party: all,
          message: parts.join(" "),
        });
      }

      if (!isHealItem(input.item)) {
        throw badRequest("Item desconhecido.");
      }
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
