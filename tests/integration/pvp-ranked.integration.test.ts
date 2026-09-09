import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client, type CallResult } from "./client";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { pvpBattles, pvpSeasons, users } from "@/db/schema";
import { previousWeekId } from "@/lib/pvp-season";

/**
 * Arena PvP ranqueada (8.5).
 *
 * Cobre: pareamento por ELO (janela ±150), fila `join_ranked` (sem código),
 * ELO só em `mode = "ranked"` (forfeit conta, com ½ K antes do turno 3),
 * antifarm do mesmo par (3×/dia), mesmo IP não pareia, ranking global
 * (top + posição) e o fechamento preguiçoso da temporada semanal com
 * recompensa.
 *
 * Cada jogador recebe um IP distinto via `x-forwarded-for`, porque o antifarm
 * de pareamento bloqueia o mesmo IP (e o cliente de teste não manda IP).
 */

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  const { c, r } = await registerVerified(username);
  const party = (r.body as { party: Array<{ id: number }> }).party;
  return { c, username, pokemonId: party[0].id };
}

async function joinRanked(
  player: Awaited<ReturnType<typeof register>>,
  ip: string
): Promise<CallResult> {
  return player.c.call("/api/pvp", {
    body: { action: "join_ranked", pokemonIds: [player.pokemonId] },
    headers: { "x-forwarded-for": ip },
  });
}

async function userIdOf(username: string): Promise<number> {
  const [u] = await db.select().from(users).where(eq(users.username, username));
  return u.id;
}

const roomCodeOf = (r: CallResult) => (r.body as { roomCode: string }).roomCode;

const state = (r: CallResult) =>
  (r.body as { battle: Record<string, unknown> }).battle as unknown as {
    mode: string;
    status: string;
    opponentUsername: string;
  };

describe("PvP ranqueado — pareamento", () => {
  it("pareia dois rivais de ELO próximo na fila (sem código)", async () => {
    const a = await register(`ka${Date.now()}`);
    const b = await register(`kb${Date.now()}`);

    const ra = await joinRanked(a, "10.0.0.1");
    expect(ra.status, JSON.stringify(ra.body)).toBe(200);
    const roomA = roomCodeOf(ra);

    const rb = await joinRanked(b, "10.0.0.2");
    expect(rb.status, JSON.stringify(rb.body)).toBe(200);
    const roomB = roomCodeOf(rb);

    expect(roomB).toBe(roomA); // entrou na sala do primeiro

    const view = await a.c.call(`/api/pvp?roomCode=${roomA}`);
    const s = state(view);
    expect(s.status).toBe("ACTIVE");
    expect(s.mode).toBe("ranked");
    expect(s.opponentUsername).toBe(b.username);
  });

  it("ELO muito distante NÃO pareia (janela de 150)", async () => {
    const a = await register(`kc${Date.now()}`);
    const b = await register(`kd${Date.now()}`);
    await db.update(users).set({ elo: 2500 }).where(eq(users.username, a.username));

    const ra = await joinRanked(a, "10.0.0.3");
    const rb = await joinRanked(b, "10.0.0.4");

    expect(roomCodeOf(ra)).not.toBe(roomCodeOf(rb)); // cada um na sua sala
  });

  it("mesmo IP não pareia (antifarm)", async () => {
    const a = await register(`ke${Date.now()}`);
    const b = await register(`kf${Date.now()}`);

    const ra = await joinRanked(a, "10.9.9.9");
    const rb = await joinRanked(b, "10.9.9.9");

    expect(roomCodeOf(ra)).not.toBe(roomCodeOf(rb));
  });

  it("sala ranqueada não aceita join_room (só a fila)", async () => {
    const a = await register(`kg${Date.now()}`);
    const b = await register(`kh${Date.now()}`);

    const ra = await joinRanked(a, "10.0.0.5");
    const room = roomCodeOf(ra);

    const viaCodigo = await b.c.call("/api/pvp", {
      body: { action: "join_room", roomCode: room, pokemonIds: [b.pokemonId] },
    });
    expect(viaCodigo.status).toBe(400);
  });
});

describe("PvP ranqueado — ELO", () => {
  it("forfeit antes do turno 3: derrota cheia e vitória com ½ K", async () => {
    const a = await register(`la${Date.now()}`);
    const b = await register(`lb${Date.now()}`);

    const ra = await joinRanked(a, "10.1.0.1");
    const room = roomCodeOf(ra);
    await joinRanked(b, "10.1.0.2");

    const fr = await a.c.call("/api/pvp", { body: { action: "forfeit", roomCode: room } });
    expect(fr.status).toBe(200);

    const [ua] = await db.select().from(users).where(eq(users.username, a.username));
    const [ub] = await db.select().from(users).where(eq(users.username, b.username));

    // Vencedor b: 1000 + 16×(1−0,5) = 1008 (½ K); perdedor a: 1000 − 16 = 984.
    expect(ub.elo).toBe(1008);
    expect(ua.elo).toBe(984);
    expect(ub.wins).toBe(1);
    expect(ua.losses).toBe(1);
  });

  it("mesmo par só pontua ELO 3× por dia (wins/losses continuam)", async () => {
    const a = await register(`lc${Date.now()}`);
    const b = await register(`ld${Date.now()}`);

    const playOne = async () => {
      const ra = await joinRanked(a, "10.2.0.1");
      const room = roomCodeOf(ra);
      await joinRanked(b, "10.2.0.2");
      await a.c.call("/api/pvp", { body: { action: "forfeit", roomCode: room } });
    };

    for (let i = 0; i < 3; i++) await playOne();

    const [ua3] = await db.select().from(users).where(eq(users.username, a.username));
    const [ub3] = await db.select().from(users).where(eq(users.username, b.username));
    expect(ua3.elo).not.toBe(1000); // pontuou
    expect(ub3.elo).not.toBe(1000);

    await playOne(); // 4ª partida do mesmo par no dia

    const [ua4] = await db.select().from(users).where(eq(users.username, a.username));
    const [ub4] = await db.select().from(users).where(eq(users.username, b.username));

    expect(ua4.elo).toBe(ua3.elo); // ELO travado no 4º
    expect(ub4.elo).toBe(ub3.elo);
    expect(ua4.losses).toBe(4); // mas o contador segue
    expect(ub4.wins).toBe(4);
  });
});

describe("PvP ranqueado — ranking", () => {
  it("devolve top 50 e a posição do jogador (null antes de 10 partidas)", async () => {
    const a = await register(`ma${Date.now()}`);

    const r = await a.c.call("/api/pvp?ranking=1");
    expect(r.status, JSON.stringify(r.body)).toBe(200);

    const ranking = (r.body as {
      ranking: {
        weekId: string;
        top: Array<{ position: number; username: string; elo: number; matches: number }>;
        you: { username: string; elo: number; matches: number; position: number | null };
      };
    }).ranking;

    expect(ranking.weekId).toMatch(/^\d{4}-W\d{2}$/);
    expect(Array.isArray(ranking.top)).toBe(true);
    expect(ranking.you.username).toBe(a.username);
    expect(ranking.you.elo).toBe(1000);
    expect(ranking.you.matches).toBe(0);
    expect(ranking.you.position).toBeNull();
  });
});

describe("PvP ranqueado — temporada semanal", () => {
  it("fecha a semana anterior preguiçosamente e paga o top 10", async () => {
    const a = await register(`na${Date.now()}`);
    const b = await register(`nb${Date.now()}`);
    const c = await register(`nc${Date.now()}`);

    await db.update(users).set({ elo: 1500 }).where(eq(users.username, a.username));
    await db.update(users).set({ elo: 1400 }).where(eq(users.username, b.username));
    await db.update(users).set({ elo: 1300 }).where(eq(users.username, c.username));

    const ids = {
      a: await userIdOf(a.username),
      b: await userIdOf(b.username),
      c: await userIdOf(c.username),
    };

    // 10 partidas ranqueadas encerradas por conta (mínimo para o top).
    for (const [username, uid] of Object.entries(ids)) {
      for (let i = 0; i < 10; i++) {
        await db.insert(pvpBattles).values({
          roomCode: `RK-${uid}-${i}-${Date.now()}`,
          mode: "ranked",
          player1Id: uid,
          player1Username: username,
          status: "FINISHED",
          battleState: {},
        });
      }
    }

    // O fechamento preguiçoso dispara no ranking (1ª chamada da semana nova).
    const r = await a.c.call("/api/pvp?ranking=1");
    expect(r.status).toBe(200);

    const prev = previousWeekId(new Date());
    const rows = await db.select().from(pvpSeasons).where(eq(pvpSeasons.weekId, prev));
    expect(rows.length).toBe(3);

    const rankOf = (uid: number) => rows.find((s) => s.userId === uid)?.rank;
    expect(rankOf(ids.a)).toBe(1);
    expect(rankOf(ids.b)).toBe(2);
    expect(rankOf(ids.c)).toBe(3);

    // Recompensas entregues (pódio): Pk$ + Cura Total + Restaurador Total.
    const [ua] = await db.select().from(users).where(eq(users.id, ids.a));
    const [ub] = await db.select().from(users).where(eq(users.id, ids.b));
    const [uc] = await db.select().from(users).where(eq(users.id, ids.c));

    expect(ua.money).toBe(3000 + 50_000);
    expect(ua.fullHeals).toBe(5);
    expect(ua.fullRestores).toBe(5);

    expect(ub.money).toBe(3000 + 30_000);
    expect(uc.money).toBe(3000 + 20_000);

    // Idempotente: uma segunda chamada não paga de novo.
    const [ua2] = await db.select().from(users).where(eq(users.id, ids.a));
    await a.c.call("/api/pvp?ranking=1");
    const [ua3] = await db.select().from(users).where(eq(users.id, ids.a));
    expect(ua3.money).toBe(ua2.money);
    expect(ua3.fullHeals).toBe(ua2.fullHeals);
  });
});
