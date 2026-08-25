import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, userPokemon } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getPokemonSpecies } from "@/lib/pokedex";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, pokemonId, targetSlot } = body;

    if (!userId) return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });

    const uid = Number(userId);
    const pid = Number(pokemonId);

    // ── RELEASE ────────────────────────────────────────────────────────────
    if (action === "release") {
      const poke = await db.select().from(userPokemon).where(
        and(eq(userPokemon.id, pid), eq(userPokemon.userId, uid))
      );
      if (!poke.length) return NextResponse.json({ error: "Pokémon não encontrado" }, { status: 404 });
      if (poke[0].isStarter) return NextResponse.json({ error: "Não é possível soltar seu inicial!" }, { status: 400 });

      await db.delete(userPokemon).where(eq(userPokemon.id, pid));

      const remaining = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      const partyOnly = remaining.filter((p) => p.partySlot !== null).sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99));
      // re-number slots
      for (let i = 0; i < partyOnly.length; i++) {
        await db.update(userPokemon).set({ partySlot: i + 1 }).where(eq(userPokemon.id, partyOnly[i].id));
      }

      const allPokemon = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      return NextResponse.json({ party: allPokemon, message: `${poke[0].name} foi solto na natureza!` });
    }

    // ── SELL ───────────────────────────────────────────────────────────────
    if (action === "sell") {
      const poke = await db.select().from(userPokemon).where(
        and(eq(userPokemon.id, pid), eq(userPokemon.userId, uid))
      );
      if (!poke.length) return NextResponse.json({ error: "Pokémon não encontrado" }, { status: 404 });
      if (poke[0].isStarter) return NextResponse.json({ error: "Não é possível vender seu inicial!" }, { status: 400 });

      const species = getPokemonSpecies(poke[0].pokedexId);
      // sell price: base 200 + 50 per level
      const sellPrice = 200 + poke[0].level * 50;

      await db.delete(userPokemon).where(eq(userPokemon.id, pid));

      const userRow = await db.select().from(users).where(eq(users.id, uid));
      const newMoney = (userRow[0]?.money ?? 0) + sellPrice;
      await db.update(users).set({ money: newMoney }).where(eq(users.id, uid));

      // Re-number party slots
      const remaining = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      const partyOnly = remaining.filter((p) => p.partySlot !== null).sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99));
      for (let i = 0; i < partyOnly.length; i++) {
        await db.update(userPokemon).set({ partySlot: i + 1 }).where(eq(userPokemon.id, partyOnly[i].id));
      }

      const updatedUser = await db.select().from(users).where(eq(users.id, uid));
      const allPokemon = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      return NextResponse.json({
        user: updatedUser[0],
        party: allPokemon,
        message: `${poke[0].name} vendido por ${sellPrice} Pk$!`,
        earned: sellPrice,
      });
    }

    // ── MOVE TO PARTY ──────────────────────────────────────────────────────
    if (action === "to_party") {
      const partyPokemon = await db.select().from(userPokemon).where(
        and(eq(userPokemon.userId, uid), isNotNull(userPokemon.partySlot))
      );
      if (partyPokemon.length >= 6) {
        return NextResponse.json({ error: "Seu time já está cheio (6 Pokémon)!" }, { status: 400 });
      }
      const nextSlot = partyPokemon.length + 1;
      await db.update(userPokemon).set({ partySlot: nextSlot }).where(
        and(eq(userPokemon.id, pid), eq(userPokemon.userId, uid))
      );
      const allPokemon = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      return NextResponse.json({ party: allPokemon, message: "Pokémon adicionado ao time!" });
    }

    // ── MOVE TO PC (BOX) ───────────────────────────────────────────────────
    if (action === "to_box") {
      const poke = await db.select().from(userPokemon).where(
        and(eq(userPokemon.id, pid), eq(userPokemon.userId, uid))
      );
      if (!poke.length) return NextResponse.json({ error: "Pokémon não encontrado" }, { status: 404 });

      // Must keep at least 1 in party
      const partyNow = await db.select().from(userPokemon).where(
        and(eq(userPokemon.userId, uid), isNotNull(userPokemon.partySlot))
      );
      if (partyNow.length <= 1) {
        return NextResponse.json({ error: "Você precisa de ao menos 1 Pokémon no time!" }, { status: 400 });
      }

      await db.update(userPokemon).set({ partySlot: null }).where(
        and(eq(userPokemon.id, pid), eq(userPokemon.userId, uid))
      );

      // Re-number party
      const remaining = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      const partyOnly = remaining.filter((p) => p.partySlot !== null).sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99));
      for (let i = 0; i < partyOnly.length; i++) {
        await db.update(userPokemon).set({ partySlot: i + 1 }).where(eq(userPokemon.id, partyOnly[i].id));
      }

      const allPokemon = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      return NextResponse.json({ party: allPokemon, message: "Pokémon enviado para o PC!" });
    }

    // ── SWAP PARTY SLOTS ───────────────────────────────────────────────────
    if (action === "swap_slots") {
      const { slot1PokemonId, slot2PokemonId } = body;
      const p1 = await db.select().from(userPokemon).where(and(eq(userPokemon.id, Number(slot1PokemonId)), eq(userPokemon.userId, uid)));
      const p2 = await db.select().from(userPokemon).where(and(eq(userPokemon.id, Number(slot2PokemonId)), eq(userPokemon.userId, uid)));
      if (!p1.length || !p2.length) return NextResponse.json({ error: "Pokémon inválido" }, { status: 404 });

      const slot1 = p1[0].partySlot;
      const slot2 = p2[0].partySlot;
      await db.update(userPokemon).set({ partySlot: slot2 }).where(eq(userPokemon.id, p1[0].id));
      await db.update(userPokemon).set({ partySlot: slot1 }).where(eq(userPokemon.id, p2[0].id));

      const allPokemon = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      return NextResponse.json({ party: allPokemon, message: "Posições trocadas!" });
    }

    // ── USE ITEM ────────────────────────────────────────────────────────────
    if (action === "use_item") {
      const { item } = body;
      const poke = await db.select().from(userPokemon).where(and(eq(userPokemon.id, pid), eq(userPokemon.userId, uid)));
      if (!poke.length) return NextResponse.json({ error: "Pokémon não encontrado" }, { status: 404 });

      const userRow = await db.select().from(users).where(eq(users.id, uid));
      if (!userRow.length) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

      const u = userRow[0];
      const p = poke[0];

      let healAmount = 0;
      let newUserUpdate: Record<string, number> = {};

      if (item === "potion") {
        if (u.potions <= 0) return NextResponse.json({ error: "Sem Poções!" }, { status: 400 });
        healAmount = 20;
        newUserUpdate = { potions: u.potions - 1 };
      } else if (item === "superPotion") {
        if (u.superPotions <= 0) return NextResponse.json({ error: "Sem Super Poções!" }, { status: 400 });
        healAmount = 50;
        newUserUpdate = { superPotions: u.superPotions - 1 };
      } else if (item === "maxPotion") {
        if (u.maxPotions <= 0) return NextResponse.json({ error: "Sem Hiper Poções!" }, { status: 400 });
        healAmount = p.maxHp - p.hp;
        newUserUpdate = { maxPotions: u.maxPotions - 1 };
      } else if (item === "revive") {
        if (u.revives <= 0) return NextResponse.json({ error: "Sem Reviver!" }, { status: 400 });
        if (p.hp > 0) return NextResponse.json({ error: "Pokémon não está desmaiado!" }, { status: 400 });
        healAmount = Math.floor(p.maxHp / 2);
        newUserUpdate = { revives: u.revives - 1 };
      } else {
        return NextResponse.json({ error: "Item desconhecido" }, { status: 400 });
      }

      const newHp = Math.min(p.maxHp, p.hp + healAmount);
      await db.update(userPokemon).set({ hp: newHp }).where(eq(userPokemon.id, pid));
      if (Object.keys(newUserUpdate).length > 0) {
        await db.update(users).set(newUserUpdate).where(eq(users.id, uid));
      }

      const updatedUser = await db.select().from(users).where(eq(users.id, uid));
      const allPokemon = await db.select().from(userPokemon).where(eq(userPokemon.userId, uid));
      return NextResponse.json({ user: updatedUser[0], party: allPokemon, message: `Item usado! +${healAmount} HP` });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao gerenciar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
