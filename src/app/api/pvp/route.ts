import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pvpBattles, chatMessages } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import {   pvpActionSchema   } from "@/lib/validation";
import {   parse, notFound, routeError   } from "@/lib/api";

/**
 * Arena PvP e chat global.
 *
 * Fase 1 — o que mudou:
 *  - Escrita exige **sessão** (V2).
 *  - `username` do chat e das salas vem da **sessão**, não do corpo. Antes
 *    qualquer um postava no chat se passando por qualquer treinador.
 *  - Mensagem limitada a 200 caracteres (antes sem limite algum).
 *  - `roomCode` validado (3–32, A-Z0-9-).
 *  - `player1Pokemon` validado por schema em vez de gravar JSON arbitrário.
 *  - **Removido `action: "reward_win"`** (V5): ele fazia
 *    `set({ money: 3500 + 750, wins: 1 })` — uma *atribuição* que apagava o
 *    dinheiro e o histórico do jogador, e fixava o saldo em 4.250 Pk$.
 *    Nenhuma parte do cliente o chamava: era código morto e explorável.
 *
 * ⚠️ Ainda pendente (Fase 4): não existe PvP de verdade — as salas são
 * gravadas, mas nenhuma luta é resolvida. O `GET` segue público (leitura).
 */

const LEGENDARY_CHALLENGERS = [
  {
    roomCode: "ARENA-RED",
    username: "Campeão Red [Deluge Master]",
    pokemon: {
      name: "Charizard",
      variant: "Metallic",
      level: 42,
      hp: 185,
      maxHp: 185,
      pokedexId: 6,
      sprite:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/6.gif",
    },
  },
  {
    roomCode: "ARENA-CYNTHIA",
    username: "Cynthia [Mystic Garchomp]",
    pokemon: {
      name: "Lucario",
      variant: "Mystic",
      level: 45,
      hp: 198,
      maxHp: 198,
      pokedexId: 448,
      sprite:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/448.gif",
    },
  },
  {
    roomCode: "ARENA-RAYQUAZA",
    username: "Lance [Shiny Rayquaza]",
    pokemon: {
      name: "Rayquaza",
      variant: "Shiny",
      level: 50,
      hp: 245,
      maxHp: 245,
      pokedexId: 384,
      sprite:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/384.gif",
    },
  },
];

export async function GET() {
  try {
    const battles = await db
      .select()
      .from(pvpBattles)
      .orderBy(desc(pvpBattles.createdAt))
      .limit(15);

    const chats = await db
      .select()
      .from(chatMessages)
      .orderBy(desc(chatMessages.createdAt))
      .limit(30);

    return NextResponse.json({
      battles,
      legendaryChallengers: LEGENDARY_CHALLENGERS,
      chatMessages: chats.reverse(),
    });
  } catch (err: unknown) {
    return routeError(err, "pvp:list", "Erro ao carregar a Arena.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    enforceRateLimit(req, "pvp", 30, 60_000);

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

    // ── CREATE ROOM ──────────────────────────────────────────────────────
    if (input.action === "create_room") {
      const code =
        input.roomCode || `DLG-${Math.floor(1000 + Math.random() * 9000)}`;

      const [newBattle] = await db
        .insert(pvpBattles)
        .values({
          roomCode: code,
          player1Id: user.id,
          player1Username: user.username,
          status: "WAITING",
          currentTurnPlayerId: user.id,
          battleState: {
            turn: 1,
            logs: [`${user.username} abriu a sala ${code} e aguarda um rival!`],
            player1Pokemon: input.player1Pokemon,
          },
        })
        .returning();

      return NextResponse.json({ battle: newBattle });
    }

    // ── JOIN ROOM ────────────────────────────────────────────────────────
    const existing = await db
      .select()
      .from(pvpBattles)
      .where(eq(pvpBattles.roomCode, input.roomCode));

    if (existing.length === 0) throw notFound("Sala PvP não encontrada.");

    const battle = existing[0];
    const state = (battle.battleState || {}) as {
      logs?: string[];
      player1Pokemon?: unknown;
    };

    const [updated] = await db
      .update(pvpBattles)
      .set({
        player2Id: user.id,
        player2Username: user.username,
        status: "ACTIVE",
        battleState: {
          ...state,
          player2Pokemon: input.player1Pokemon,
          logs: [
            ...(state.logs || []),
            `⚡ ${user.username} entrou na arena e aceitou o duelo contra ${battle.player1Username}!`,
          ],
        },
        updatedAt: new Date(),
      })
      .where(eq(pvpBattles.id, battle.id))
      .returning();

    return NextResponse.json({ battle: updated });
  } catch (err: unknown) {
    return routeError(err, "pvp:action", "Erro na Arena PvP.");
  }
}

export const dynamic = "force-dynamic";
