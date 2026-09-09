import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { pvpBattles } from "@/db/schema";

/**
 * Higiene da fila ranqueada (#19) — salas `WAITING` fantasmas.
 *
 * O sintoma "duas contas do mesmo nível não se acham" vinha de salas `WAITING`
 * órfãs: sair da tela de espera (sem cancelar) deixava a sala na fila, e uma
 * nova busca criava UMA SEGUNDA sala (o `joinRanked` pulava a própria sala).
 * O rival seguinte caía na sala antiga contra um dono ausente, enquanto o
 * dono ficava preso na sala nova.
 *
 * Correção (mantém o antifarm de mesmo-IP):
 *  1. reentrar fecha as salas `WAITING` antigas do próprio usuário;
 *  2. `leave_queue` cancela a fila ao sair da tela de espera;
 *  3. expiração preguiçosa de salas sem heartbeat recente (dono sumiu).
 */

beforeEach(async () => {
  await resetRateLimits();
  // O banco de teste é compartilhado entre os `it` do arquivo; sem limpar,
  // uma sala `WAITING` de um teste anterior vira rival do próximo.
  await db.delete(pvpBattles);
});

async function register(username: string) {
  const { c, r } = await registerVerified(username);
  const party = (r.body as { party: Array<{ id: number }> }).party;
  return { c, username, pokemonId: party[0].id };
}

async function joinRanked(player: Awaited<ReturnType<typeof register>>, ip: string) {
  return player.c.call("/api/pvp", {
    body: { action: "join_ranked", pokemonIds: [player.pokemonId] },
    headers: { "x-forwarded-for": ip },
  });
}

async function leaveQueue(player: Awaited<ReturnType<typeof register>>) {
  return player.c.call("/api/pvp", { body: { action: "leave_queue" } });
}

const roomCodeOf = (r: Awaited<ReturnType<typeof joinRanked>>) =>
  (r.body as { roomCode: string }).roomCode;

async function statusOf(roomCode: string) {
  const [row] = await db
    .select({ status: pvpBattles.status })
    .from(pvpBattles)
    .where(eq(pvpBattles.roomCode, roomCode));
  return row?.status ?? null;
}

describe("Fila ranqueada — higiene de salas WAITING (#19)", () => {
  it("reentrar sem cancelar NÃO cria sala fantasma: B pareia com a sala viva", async () => {
    const a = await register(`qa${Date.now()}`);
    const b = await register(`qb${Date.now()}`);

    const room1 = roomCodeOf(await joinRanked(a, "11.0.0.1"));
    // A "sai" (sem cancelar) e busca de novo.
    const room2 = roomCodeOf(await joinRanked(a, "11.0.0.1"));

    // A sala antiga foi fechada — não fica de tocaia para prender o rival.
    expect(await statusOf(room1)).toBe("ABANDONED");

    // B (IP diferente) pareia com a sala ATUAL de A, não com a fantasma.
    const roomB = roomCodeOf(await joinRanked(b, "11.0.0.2"));
    expect(roomB).toBe(room2);
    expect(await statusOf(room2)).toBe("ACTIVE");
  });

  it("leave_queue cancela a sala WAITING e não deixa fantasma", async () => {
    const a = await register(`qc${Date.now()}`);
    const b = await register(`qd${Date.now()}`);

    const room = roomCodeOf(await joinRanked(a, "11.0.0.3"));
    const lr = await leaveQueue(a);
    expect(lr.status, JSON.stringify(lr.body)).toBe(200);
    expect((lr.body as { cancelled: number }).cancelled).toBe(1);
    expect(await statusOf(room)).toBe("ABANDONED");

    // B não entra na sala abandonada; abre a própria.
    const roomB = roomCodeOf(await joinRanked(b, "11.0.0.4"));
    expect(roomB).not.toBe(room);
    expect(await statusOf(roomB)).toBe("WAITING");
  });

  it("sala sem heartbeat recente (dono sumiu) é ignorada e abandonada", async () => {
    const a = await register(`qe${Date.now()}`);
    const b = await register(`qf${Date.now()}`);

    const room1 = roomCodeOf(await joinRanked(a, "11.0.0.5"));

    // Simula o dono que fechou a aba sem cancelar: nenhum poll por 2 min.
    await db
      .update(pvpBattles)
      .set({ updatedAt: new Date(Date.now() - 120_000) })
      .where(eq(pvpBattles.roomCode, room1));

    const roomB = roomCodeOf(await joinRanked(b, "11.0.0.6"));
    expect(roomB).not.toBe(room1); // não caiu na fantasma
    expect(await statusOf(room1)).toBe("ABANDONED");
    expect(await statusOf(roomB)).toBe("WAITING");
  });
});
