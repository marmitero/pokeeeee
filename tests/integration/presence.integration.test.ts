import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { friendships, users } from "@/db/schema";

/**
 * Presença multiplayer + amizade (8.9).
 *
 * Cobre: heartbeat publica posição e `last_seen_at`; lista só os jogadores do
 * MESMO mapa com heartbeat recente (nunca a si mesmo); jogador de outro mapa
 * não aparece; jogador "morto" (sem heartbeat) some; amizade add/remove
 * idempotente (par canônico) com o flag `isFriend` na presença; autorização
 * (401 sem sessão) e validação (self 400, alvo 404).
 */

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  const { c, r } = await registerVerified(username);
  return { c, username, userId: (r.body as { user: { id: number } }).user.id };
}

async function beat(
  player: Awaited<ReturnType<typeof register>>,
  mapId: number,
  x: number,
  y: number
) {
  return player.c.call("/api/presence", {
    body: { currentMapId: mapId, playerX: x, playerY: y },
  });
}

const playersOf = (r: Awaited<ReturnType<typeof beat>>) =>
  (r.body as { players: Array<{ username: string; isFriend: boolean }> }).players ?? [];

describe("Presença multiplayer (8.9)", () => {
  it("heartbeat publica posição e lista os outros do mesmo mapa (não a si)", async () => {
    const a = await register(`pa${Date.now()}`);
    const b = await register(`pb${Date.now()}`);

    const ra = await beat(a, 1, 5, 5);
    expect(ra.status, JSON.stringify(ra.body)).toBe(200);
    const namesA = playersOf(ra).map((p) => p.username);
    expect(namesA).not.toContain(a.username); // nunca a si mesmo
    expect(namesA).not.toContain(b.username); // B ainda não bateu o heartbeat

    const rb = await beat(b, 1, 6, 6);
    expect(rb.status).toBe(200);

    const names = playersOf(rb).map((p) => p.username);
    expect(names).toContain(a.username); // B vê A
    expect(names).not.toContain(b.username); // nunca a si mesmo

    // A agora também vê B, com a posição publicada.
    const ra2 = await beat(a, 1, 5, 5);
    const seen = playersOf(ra2).find((p) => p.username === b.username);
    expect(seen).toBeTruthy();
    expect(seen?.isFriend).toBe(false);
  });

  it("jogador de outro mapa não aparece", async () => {
    const a = await register(`pc${Date.now()}`);
    const b = await register(`pd${Date.now()}`);

    await beat(a, 1, 4, 4);
    await beat(b, 2, 4, 4);

    const r = await beat(a, 1, 4, 4);
    expect(playersOf(r).map((p) => p.username)).not.toContain(b.username);
  });

  it("jogador sem heartbeat recente some do mapa", async () => {
    const a = await register(`pe${Date.now()}`);
    const b = await register(`pf${Date.now()}`);

    await beat(a, 1, 3, 3);
    await beat(b, 1, 3, 4);

    // B "fechou a aba": heartbeat muito antigo.
    await db
      .update(users)
      .set({ lastSeenAt: new Date(Date.now() - 120_000) })
      .where(eq(users.username, b.username));

    const r = await beat(a, 1, 3, 3);
    expect(playersOf(r).map((p) => p.username)).not.toContain(b.username);
  });

  it("exige sessão (401)", async () => {
    const c = client();
    const r = await c.call("/api/presence", { body: { currentMapId: 1, playerX: 1, playerY: 1 } });
    expect(r.status).toBe(401);
  });
});

describe("Amizade (8.9)", () => {
  it("add/remove idempotente e refletido no flag isFriend da presença", async () => {
    const a = await register(`ga${Date.now()}`);
    const b = await register(`gb${Date.now()}`);

    // add
    const add1 = await a.c.call("/api/friends", {
      body: { action: "add", username: b.username },
    });
    expect(add1.status, JSON.stringify(add1.body)).toBe(200);
    expect((add1.body as { isFriend: boolean }).isFriend).toBe(true);

    // add de novo → idempotente (uma linha só)
    await a.c.call("/api/friends", { body: { action: "add", username: b.username } });
    const rows = await db
      .select()
      .from(friendships)
      .where(eq(friendships.userAId, Math.min(a.userId, b.userId)));
    expect(rows.length).toBe(1);

    // presença reflete isFriend
    await beat(a, 1, 1, 1);
    await beat(b, 1, 1, 2);
    const r = await beat(a, 1, 1, 1);
    const seen = playersOf(r).find((p) => p.username === b.username);
    expect(seen?.isFriend).toBe(true);

    // remove
    const rm = await a.c.call("/api/friends", {
      body: { action: "remove", username: b.username },
    });
    expect((rm.body as { isFriend: boolean }).isFriend).toBe(false);

    const r2 = await beat(a, 1, 1, 1);
    const seen2 = playersOf(r2).find((p) => p.username === b.username);
    expect(seen2?.isFriend).toBe(false);
  });

  it("GET lista os amigos", async () => {
    const a = await register(`gc${Date.now()}`);
    const b = await register(`gd${Date.now()}`);

    await a.c.call("/api/friends", { body: { action: "add", username: b.username } });

    const list = await a.c.call("/api/friends");
    expect(list.status).toBe(200);
    const listed = (list.body as { friends: Array<{ username: string; online: boolean }> }).friends;
    const names = listed.map((f) => f.username);
    expect(names).toContain(b.username);
    expect(names).not.toContain(a.username);
    expect(listed.find((f) => f.username === b.username)?.online).toBe(false);
  });

  it("valida: self 400 e alvo inexistente 404", async () => {
    const a = await register(`ge${Date.now()}`);

    const self = await a.c.call("/api/friends", {
      body: { action: "add", username: a.username },
    });
    expect(self.status).toBe(400);

    const missing = await a.c.call("/api/friends", {
      body: { action: "add", username: `zz${Date.now() % 100000000}` },
    });
    expect(missing.status).toBe(404);
  });
});
