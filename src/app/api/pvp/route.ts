import { NextResponse } from "next/server";
import { db } from "@/db";
import { pvpBattles, chatMessages, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

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
    const msg = err instanceof Error ? err.message : "Erro ao carregar PvP";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, username, message, roomCode, player1Pokemon } =
      body;

    if (action === "chat") {
      if (!message || !username) {
        return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
      }
      await db.insert(chatMessages).values({
        userId: Number(userId || 1),
        username,
        message,
        channel: "arena-global",
      });
      const chats = await db
        .select()
        .from(chatMessages)
        .orderBy(desc(chatMessages.createdAt))
        .limit(30);
      return NextResponse.json({ chatMessages: chats.reverse() });
    }

    if (action === "create_room") {
      const code =
        roomCode ||
        `DLG-${Math.floor(1000 + Math.random() * 9000)}`;

      const [newBattle] = await db
        .insert(pvpBattles)
        .values({
          roomCode: code,
          player1Id: Number(userId),
          player1Username: username,
          status: "WAITING",
          currentTurnPlayerId: Number(userId),
          battleState: {
            turn: 1,
            logs: [`${username} abriu a sala ${code} e aguarda um rival!`],
            player1Pokemon: player1Pokemon || {
              name: "Charizard",
              variant: "Shiny",
              level: 15,
              hp: 68,
              maxHp: 68,
            },
          },
        })
        .returning();

      return NextResponse.json({ battle: newBattle });
    }

    if (action === "join_room") {
      const existing = await db
        .select()
        .from(pvpBattles)
        .where(eq(pvpBattles.roomCode, roomCode));
      if (!existing.length) {
        return NextResponse.json(
          { error: "Sala PvP não encontrada" },
          { status: 404 }
        );
      }

      const battle = existing[0];
      const state = (battle.battleState || {}) as {
        logs?: string[];
        player1Pokemon?: unknown;
      };

      const updatedLogs = [
        ...(state.logs || []),
        `⚡ ${username} entrou na arena e aceitou o duelo contra ${battle.player1Username}!`,
      ];

      const [updated] = await db
        .update(pvpBattles)
        .set({
          player2Id: Number(userId),
          player2Username: username,
          status: "ACTIVE",
          battleState: {
            ...state,
            player2Pokemon: player1Pokemon || {
              name: "Gengar",
              variant: "Mystic",
              level: 15,
              hp: 64,
              maxHp: 64,
            },
            logs: updatedLogs,
          },
          updatedAt: new Date(),
        })
        .where(eq(pvpBattles.id, battle.id))
        .returning();

      return NextResponse.json({ battle: updated });
    }

    if (action === "reward_win") {
      await db
        .update(users)
        .set({
          money: 3500 + 750,
          wins: 1,
        })
        .where(eq(users.id, Number(userId)));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no PvP";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
