import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { client } from "./client";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { bossFights, users } from "@/db/schema";

beforeEach(async () => {
  await resetRateLimits();
});

let seq = 0;
async function register() {
  seq += 1;
  const { c, r } = await registerVerified(`boss${Date.now()}${seq}`);
  const userId = (r.body as { user: { id: number } }).user.id;
  return { c, userId };
}

async function bossStatus(c: ReturnType<typeof client>, arenaMapId: number) {
  return c.call(`/api/boss?arenaMapId=${arenaMapId}`);
}

interface BossStatusBody {
  boss: { pokedexId: number; name: string; level: number; weekId: string };
  attemptsLeft: number;
  wonThisWeek: boolean;
  stoneClaimed: boolean;
  legendaryGranted: boolean;
}

describe("Etapa C — Arena Boss: status e limites (8.3)", () => {
  it("mostra o lendário semanal nv 80–100 com 2 tentativas", async () => {
    const { c } = await register();
    const r = await bossStatus(c, 20);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const s = r.body as BossStatusBody;
    expect(s.boss.pokedexId).toBeGreaterThan(0);
    expect(s.boss.level).toBeGreaterThanOrEqual(80);
    expect(s.boss.level).toBeLessThanOrEqual(100);
    expect(s.attemptsLeft).toBe(2);
    expect(s.wonThisWeek).toBe(false);
    expect(s.stoneClaimed).toBe(false);
  });

  it("arenas 20 e 40 têm lendários diferentes na mesma semana", async () => {
    const { c } = await register();
    const a = (await bossStatus(c, 20)).body as BossStatusBody;
    const b = (await bossStatus(c, 40)).body as BossStatusBody;
    expect(a.boss.pokedexId).not.toBe(b.boss.pokedexId);
  });

  it("rejeita arena inválida", async () => {
    const { c } = await register();
    const r = await bossStatus(c, 99);
    expect(r.status).toBe(400);
    const s = await c.call("/api/battle", {
      body: { action: "start_boss", arenaMapId: 99 },
    });
    expect(s.status).toBe(400);
  });

  it("iniciar consome tentativa; a 3ª no dia é barrada", async () => {
    const { c } = await register();
    for (const expectedLeft of [1, 0]) {
      const r = await c.call("/api/battle", {
        body: { action: "start_boss", arenaMapId: 20 },
      });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      const battle = (r.body as { battle: { kind: string; status: string } }).battle;
      expect(battle.kind).toBe("boss");
      expect(battle.status).toBe("ACTIVE");
      const s = (await bossStatus(c, 20)).body as BossStatusBody;
      expect(s.attemptsLeft).toBe(expectedLeft);
    }
    const third = await c.call("/api/battle", {
      body: { action: "start_boss", arenaMapId: 20 },
    });
    expect(third.status).toBe(400);
  });

  it("captura e fuga são bloqueadas na arena", async () => {
    const { c } = await register();
    const started = await c.call("/api/battle", {
      body: { action: "start_boss", arenaMapId: 40 },
    });
    expect(started.status, JSON.stringify(started.body)).toBe(200);
    const battleId = (started.body as { battle: { id: number } }).battle.id;

    const caught = await c.call("/api/battle", {
      body: { action: "catch", battleId, ball: "pokeballs" },
    });
    expect(caught.status).toBe(400);

    const fled = await c.call("/api/battle", {
      body: { action: "flee", battleId },
    });
    expect(fled.status).toBe(400);
  });

  it("pedra sem vitória é recusada", async () => {
    const { c } = await register();
    const r = await c.call("/api/boss", {
      body: { action: "claim_stone", arenaMapId: 20, item: "fireStone" },
    });
    expect(r.status).toBe(400);
  });
});

describe("Etapa C — Arena Boss: vitória trava a semana e libera a pedra (8.3)", () => {
  /** Simula a vitória (vencer um nv 80–100 de verdade é inviável no teste). */
  async function forceWin(userId: number, arenaMapId: number) {
    await db
      .update(bossFights)
      .set({ status: "WON" })
      .where(and(eq(bossFights.userId, userId), eq(bossFights.arenaMapId, arenaMapId)));
  }

  it("vitória trava novos inícios e libera 1 pedra à escolha", async () => {
    const { c, userId } = await register();
    const started = await c.call("/api/battle", {
      body: { action: "start_boss", arenaMapId: 20 },
    });
    expect(started.status, JSON.stringify(started.body)).toBe(200);
    await forceWin(userId, 20);

    const locked = await c.call("/api/battle", {
      body: { action: "start_boss", arenaMapId: 20 },
    });
    expect(locked.status).toBe(400);

    const s = (await bossStatus(c, 20)).body as BossStatusBody;
    expect(s.wonThisWeek).toBe(true);
    expect(s.stoneClaimed).toBe(false);

    const claim = await c.call("/api/boss", {
      body: { action: "claim_stone", arenaMapId: 20, item: "moonStone" },
    });
    expect(claim.status, JSON.stringify(claim.body)).toBe(200);

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user!.moonStone).toBe(1);

    const again = await c.call("/api/boss", {
      body: { action: "claim_stone", arenaMapId: 20, item: "fireStone" },
    });
    expect(again.status).toBe(400);

    const after = (await bossStatus(c, 20)).body as BossStatusBody;
    expect(after.stoneClaimed).toBe(true);
  });

  it("vitória numa arena não trava a outra", async () => {
    const { c, userId } = await register();
    const started = await c.call("/api/battle", {
      body: { action: "start_boss", arenaMapId: 20 },
    });
    expect(started.status, JSON.stringify(started.body)).toBe(200);
    await forceWin(userId, 20);

    const other = await c.call("/api/battle", {
      body: { action: "start_boss", arenaMapId: 40 },
    });
    expect(other.status, JSON.stringify(other.body)).toBe(200);
  });
});
