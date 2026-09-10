import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { registerVerified } from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { pvpBattles, pvpChallenges, users } from "@/db/schema";

/** Fluxo persistente de convite: status/corridas são exercitados via HTTP. */
beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  const { c, r } = await registerVerified(username);
  const party = (r.body as { party: Array<{ id: number }> }).party;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  return { c, username, userId: user.id, pokemonId: party[0].id };
}

async function challenge(
  challenger: Awaited<ReturnType<typeof register>>,
  target: Awaited<ReturnType<typeof register>>
) {
  // Simula o heartbeat que a página envia a cada 2,5 s.
  await Promise.all([
    db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, challenger.userId)),
    db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, target.userId)),
  ]);
  return challenger.c.call("/api/pvp", {
    body: { action: "challenge", targetUserId: target.userId },
  });
}

describe("PvP — convite direto persistente", () => {
  it("entrega o convite pendente no heartbeat de presença do alvo", async () => {
    const a = await register(`pha${Date.now()}`);
    const b = await register(`phb${Date.now()}`);

    const sent = await challenge(a, b);
    expect(sent.status, JSON.stringify(sent.body)).toBe(200);

    const beat = await b.c.call("/api/presence", {
      body: { currentMapId: 1, playerX: 8, playerY: 8 },
    });
    expect(beat.status, JSON.stringify(beat.body)).toBe(200);
    expect(
      (beat.body as { challenges: { incoming: { status: string; challengerId: number } | null } }).challenges.incoming
    ).toMatchObject({ status: "PENDING", challengerId: a.userId });
  });

  it("cria a batalha no aceite e transporta os dois para a mesma arena", async () => {
    const a = await register(`cha${Date.now()}`);
    const b = await register(`chb${Date.now()}`);

    const sent = await challenge(a, b);
    expect(sent.status, JSON.stringify(sent.body)).toBe(200);
    const incoming = await b.c.call("/api/pvp?challenges=1");
    const incomingChallenge = (incoming.body as { challenges: { incoming: { id: number } } }).challenges.incoming;
    expect(incomingChallenge).toMatchObject({ status: "PENDING", challengerId: a.userId });

    const accepted = await b.c.call("/api/pvp", {
      body: { action: "accept_challenge", challengeId: incomingChallenge.id },
    });
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    const roomCode = (accepted.body as { roomCode: string }).roomCode;

    const [viewA, viewB] = await Promise.all([
      a.c.call(`/api/pvp?roomCode=${roomCode}`),
      b.c.call(`/api/pvp?roomCode=${roomCode}`),
    ]);
    expect(viewA.status).toBe(200);
    expect(viewB.status).toBe(200);
    expect((viewA.body as { battle: { status: string; opponentUsername: string } }).battle).toMatchObject({
      status: "ACTIVE",
      opponentUsername: b.username,
    });
    expect((viewB.body as { battle: { opponentUsername: string } }).battle.opponentUsername).toBe(a.username);
  });

  it("recusa e aplica cooldown de 10 segundos ao mesmo par", async () => {
    const a = await register(`cda${Date.now()}`);
    const b = await register(`cdb${Date.now()}`);
    const sent = await challenge(a, b);
    const id = (sent.body as { challenge: { id: number } }).challenge.id;

    const declined = await b.c.call("/api/pvp", {
      body: { action: "decline_challenge", challengeId: id },
    });
    expect(declined.status).toBe(200);

    const outgoing = await a.c.call("/api/pvp?challenges=1");
    expect((outgoing.body as { challenges: { outgoing: { status: string; cooldownUntil: string } } }).challenges.outgoing)
      .toMatchObject({ status: "DECLINED" });

    const blocked = await challenge(a, b);
    expect(blocked.status).toBe(400);

    // O cooldown é uma regra de servidor; avançar o relógio da linha torna o
    // teste determinístico sem esperar dez segundos reais.
    await db.update(pvpChallenges)
      .set({ cooldownUntil: new Date(Date.now() - 1_000) })
      .where(eq(pvpChallenges.id, id));
    const retry = await challenge(a, b);
    expect(retry.status).toBe(200);
  });

  it("expira preguiçosamente um convite sem resposta", async () => {
    const a = await register(`exa${Date.now()}`);
    const b = await register(`exb${Date.now()}`);
    const sent = await challenge(a, b);
    const id = (sent.body as { challenge: { id: number } }).challenge.id;

    await db.update(pvpChallenges)
      .set({ expiresAt: new Date(Date.now() - 1_000) })
      .where(eq(pvpChallenges.id, id));

    const polled = await b.c.call("/api/pvp?challenges=1");
    expect((polled.body as { challenges: { incoming: null } }).challenges.incoming).toBeNull();
    const row = await db.select({ status: pvpChallenges.status }).from(pvpChallenges).where(eq(pvpChallenges.id, id));
    expect(row[0].status).toBe("EXPIRED");
  });

  it("serializa desafio duplicado e dois aceites concorrentes", async () => {
    const a = await register(`coa${Date.now()}`);
    const b = await register(`cob${Date.now()}`);

    const [first, duplicate] = await Promise.all([challenge(a, b), challenge(a, b)]);
    expect([first.status, duplicate.status].sort()).toEqual([200, 400]);
    const acceptedSource = first.status === 200 ? first : duplicate;
    const id = (acceptedSource.body as { challenge: { id: number } }).challenge.id;
    const acceptView = await b.c.call("/api/pvp?challenges=1");
    const incoming = (acceptView.body as { challenges: { incoming: { id: number } } }).challenges.incoming;
    expect(incoming.id).toBe(id);

    const [one, two] = await Promise.all([
      b.c.call("/api/pvp", { body: { action: "accept_challenge", challengeId: id } }),
      b.c.call("/api/pvp", { body: { action: "accept_challenge", challengeId: id } }),
    ]);
    expect([one.status, two.status].sort()).toEqual([200, 400]);

    const [challengeRow] = await db.select().from(pvpChallenges).where(eq(pvpChallenges.id, id));
    expect(challengeRow.status).toBe("ACCEPTED");
    const battles = await db.select({ id: pvpBattles.id })
      .from(pvpBattles)
      .where(and(eq(pvpBattles.player1Id, a.userId), eq(pvpBattles.player2Id, b.userId)));
    expect(battles).toHaveLength(1);
  });
});
