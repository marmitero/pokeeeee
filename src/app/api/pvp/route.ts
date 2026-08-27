import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { pvpActionSchema } from "@/lib/validation";
import { parse, publicUser, routeError } from "@/lib/api";
import {
  createRoom,
  forfeit,
  getState,
  joinRoom,
  listWaitingRooms,
  submitTurn,
  switchPokemon,
} from "@/lib/pvp-service";

/**
 * Arena PvP e chat global (Fase 4).
 *
 * Substitui o modelo em que `create_room`/`join_room` gravavam a sala e paravam
 * aí — a "batalha" nunca acontecia, e o cliente ainda mandava o Pokémon inteiro
 * (hp/attack até 9999) para o servidor aceitar como veio.
 *
 * Agora:
 *  - o Pokémon é referenciado por **id** e lido do banco (`pvp-service`);
 *  - `submit_turn` trava a ação às cegas e a troca é resolvida no servidor
 *    com lock de linha, então não há como resolver duas vezes;
 *  - `GET /api/pvp?roomCode=` devolve o estado **sem** a ação do oponente.
 *
 * Amistoso não mexe em `users.elo` (decisão do mantenedor).
 */

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");

    // Estado de uma sala específica (polling).
    if (roomCode) {
      const view = await getState(user.id, roomCode);
      return NextResponse.json({ battle: view });
    }

    // Sem roomCode: chat global + salas aguardando.
    const chats = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(30);

    const rooms = await listWaitingRooms();

    return NextResponse.json({
      chatMessages: chats.reverse(),
      waitingRooms: rooms,
    });
  } catch (err: unknown) {
    return routeError(err, "pvp:get", "Erro ao carregar a Arena.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "pvp", 60, 60_000);

    const input = parse(pvpActionSchema, await req.json().catch(() => ({})));

    // ── CHAT ─────────────────────────────────────────────────────────────
    if (input.action === "chat") {
      await db.insert(chatMessages).values({
        userId: user.id,
        username: user.username, // da sessão: impossível se passar por outro
        message: input.message,
        channel: "arena-global",
      });

      const chats = await db
        .select()
        .from(chatMessages)
        .orderBy(desc(chatMessages.createdAt))
        .limit(30);

      return NextResponse.json({ chatMessages: chats.reverse() });
    }

    // ── SALAS ────────────────────────────────────────────────────────────
    if (input.action === "list_rooms") {
      return NextResponse.json({ waitingRooms: await listWaitingRooms() });
    }

    if (input.action === "create_room") {
      const room = await createRoom(
        user.id,
        user.username,
        input.roomCode,
        input.pokemonId
      );
      return NextResponse.json({ roomCode: room.roomCode, room });
    }

    if (input.action === "join_room") {
      const room = await joinRoom(
        user.id,
        user.username,
        input.roomCode,
        input.pokemonId
      );
      return NextResponse.json({ roomCode: room.roomCode, room });
    }

    // ── TURNO ────────────────────────────────────────────────────────────
    if (input.action === "submit_turn") {
      const result = await submitTurn(user.id, input.roomCode, input.turnAction);
      const view = await getState(user.id, input.roomCode);
      const [freshUser] = await db.select().from(users).where(eq(users.id, user.id));

      return NextResponse.json({
        status: result.status,
        battle: view,
        user: freshUser ? publicUser(freshUser) : null,
      });
    }

    if (input.action === "switch") {
      await switchPokemon(user.id, input.roomCode, input.userPokemonId);
      const view = await getState(user.id, input.roomCode);
      return NextResponse.json({ battle: view });
    }

    if (input.action === "forfeit") {
      const result = await forfeit(user.id, input.roomCode);
      const view = await getState(user.id, input.roomCode);
      return NextResponse.json({ winnerId: result.winnerId, battle: view });
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (err: unknown) {
    return routeError(err, "pvp:action", "Erro na Arena PvP.");
  }
}

export const dynamic = "force-dynamic";
