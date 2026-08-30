import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { client } from "./client";
import { db } from "@/db";
import { pvpBattles, sessions, users } from "@/db/schema";

beforeAll(() => {
  process.env.CRON_SECRET = "segredo-cron-de-teste";
});

describe("manutenção agendada", () => {
  it("recusa chamada sem o Bearer do cron", async () => {
    const response = await client().call("/api/maintenance");
    expect(response.status).toBe(401);
  });

  it("remove sessão expirada e abandona sala antiga sem tocar no usuário", async () => {
    const username = `mt${Date.now()}`;
    const c = client();
    const registered = await c.call("/api/auth", {
      body: { action: "register", username, password: "senhaSegura123", starterId: 4 },
    });
    expect(registered.status).toBe(200);

    const body = registered.body as { user: { id: number }; party: Array<{ id: number }> };
    const userId = body.user.id;
    const pokemonId = body.party[0].id;

    const room = await c.call("/api/pvp", {
      body: { action: "create_room", pokemonIds: [pokemonId] },
    });
    expect(room.status).toBe(200);
    const roomCode = (room.body as { roomCode: string }).roomCode;

    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await db
      .update(sessions)
      .set({ expiresAt: old })
      .where(eq(sessions.userId, userId));
    await db
      .update(pvpBattles)
      .set({ updatedAt: old })
      .where(eq(pvpBattles.roomCode, roomCode));

    const response = await c.call("/api/maintenance", {
      headers: { Authorization: "Bearer segredo-cron-de-teste" },
    });
    expect(response.status).toBe(200);
    const result = (response.body as { result: { expiredSessions: number; staleWaitingRooms: number } }).result;
    expect(result.expiredSessions).toBeGreaterThanOrEqual(1);
    expect(result.staleWaitingRooms).toBeGreaterThanOrEqual(1);

    const remainingSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId));
    expect(remainingSession).toHaveLength(0);

    const [updatedRoom] = await db
      .select()
      .from(pvpBattles)
      .where(
        and(eq(pvpBattles.roomCode, roomCode), eq(pvpBattles.player1Id, userId))
      );
    expect(updatedRoom.status).toBe("ABANDONED");

    const remainingUser = await db.select().from(users).where(eq(users.id, userId));
    expect(remainingUser).toHaveLength(1);
  });
});
