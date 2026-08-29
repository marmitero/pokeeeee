import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client, type CallResult } from "./client";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { userPokemon, users } from "@/db/schema";

/**
 * PvP assíncrono (Fase 4).
 *
 * Os testes mais importantes aqui são os de **segurança do modelo**:
 *  - a ação travada do oponente nunca é exposta;
 *  - envio simultâneo resolve a troca exatamente uma vez;
 *  - os status vêm do banco, nunca do cliente;
 *  - amistoso não toca em ELO (decisão do mantenedor).
 */

beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string) {
  const c = client();
  const r = await c.call("/api/auth", {
    body: { action: "register", username, password: "senhaSegura123", starterId: 4 },
  });
  expect(r.status, `registro falhou: ${JSON.stringify(r.body)}`).toBe(200);
  const party = (r.body as { party: Array<{ id: number }> }).party;
  return { c, username, pokemonId: party[0].id };
}

const state = (r: CallResult) => (r.body as { battle: Record<string, never> }).battle;

async function addTeammate(
  player: Awaited<ReturnType<typeof register>>,
  partySlot: number
): Promise<number> {
  const [user] = await db.select().from(users).where(eq(users.username, player.username));
  const [starter] = await db.select().from(userPokemon).where(eq(userPokemon.id, player.pokemonId));
  const { id: _id, caughtAt: _caughtAt, ...copy } = starter;
  const [created] = await db
    .insert(userPokemon)
    .values({ ...copy, userId: user.id, partySlot, isStarter: false })
    .returning({ id: userPokemon.id });
  return created.id;
}

async function openRoom(a: Awaited<ReturnType<typeof register>>, b: Awaited<ReturnType<typeof register>>) {
  const created = await a.c.call("/api/pvp", {
    body: { action: "create_room", pokemonIds: [a.pokemonId] },
  });
  expect(created.status, JSON.stringify(created.body)).toBe(200);
  const roomCode = (created.body as { roomCode: string }).roomCode;

  const joined = await b.c.call("/api/pvp", {
    body: { action: "join_room", roomCode, pokemonIds: [b.pokemonId] },
  });
  expect(joined.status, JSON.stringify(joined.body)).toBe(200);

  return roomCode;
}

describe("PvP — salas", () => {
  it("cria e entra numa sala", async () => {
    const a = await register(`pa${Date.now()}`);
    const b = await register(`pb${Date.now()}`);

    const roomCode = await openRoom(a, b);

    const view = await a.c.call(`/api/pvp?roomCode=${roomCode}`);
    expect(view.status).toBe(200);

    const s = state(view) as unknown as {
      status: string;
      opponentUsername: string;
      you: { level: number; hp: number };
    };
    expect(s.status).toBe("ACTIVE");
    expect(s.opponentUsername).toBe(b.username);
    expect(s.you.hp).toBeGreaterThan(0);
  });

  it("não aceita stats forjados — só o id do Pokémon", async () => {
    const a = await register(`pc${Date.now()}`);

    // O schema antigo aceitava {hp: 9999, attack: 9999}. Agora não existe esse campo.
    const r = await a.c.call("/api/pvp", {
      body: {
        action: "create_room",
        pokemonIds: [a.pokemonId],
        player1Pokemon: { name: "Hack", hp: 9999, maxHp: 9999, attack: 9999, level: 99 },
      },
    });

    expect(r.status).toBe(200);
    const roomCode = (r.body as { roomCode: string }).roomCode;
    const view = await a.c.call(`/api/pvp?roomCode=${roomCode}`);
    const s = state(view) as unknown as { you: { hp: number; maxHp: number; level: number } };

    // Precisa ser o valor real do banco (Charmander lvl 5), não 9999.
    expect(s.you.hp).toBeLessThan(100);
    expect(s.you.level).toBe(5);
  });

  it("não deixa entrar na própria sala nem em sala cheia", async () => {
    const a = await register(`pd${Date.now()}`);
    const b = await register(`pe${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const selfJoin = await a.c.call("/api/pvp", {
      body: { action: "join_room", roomCode, pokemonIds: [a.pokemonId] },
    });
    expect(selfJoin.status).toBe(400);

    const c = await register(`pf${Date.now()}`);
    const full = await c.c.call("/api/pvp", {
      body: { action: "join_room", roomCode, pokemonIds: [c.pokemonId] },
    });
    expect(full.status).toBe(400);
  });

  it("quem não participa não lê nem age na sala", async () => {
    const a = await register(`pg${Date.now()}`);
    const b = await register(`ph${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const intruso = await register(`pi${Date.now()}`);

    const read = await intruso.c.call(`/api/pvp?roomCode=${roomCode}`);
    expect(read.status).toBe(403);

    const act = await intruso.c.call("/api/pvp", {
      body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
    });
    expect(act.status).toBe(403);
  });
});

describe("PvP — código de sala", () => {
  it("não colide ao criar muitas salas seguidas", async () => {
    // Antes o código era DLG- + 4 dígitos (9 mil combinações): colidia com
    // frequência pelo paradoxo do aniversário e aparecia como falha
    // intermitente no CI.
    const a = await register(`rc${Date.now()}`);
    const codes = new Set<string>();

    for (let i = 0; i < 40; i++) {
      const r = await a.c.call("/api/pvp", {
        body: { action: "create_room", pokemonIds: [a.pokemonId] },
      });
      expect(r.status, `sala ${i} falhou: ${JSON.stringify(r.body)}`).toBe(200);
      codes.add((r.body as { roomCode: string }).roomCode);
    }

    expect(codes.size).toBe(40); // nenhum duplicado
  });

  it("código escolhido pelo usuário que já existe é rejeitado", async () => {
    const a = await register(`rd${Date.now()}`);
    const code = `TST-${Date.now().toString(36).toUpperCase()}`;

    const first = await a.c.call("/api/pvp", {
      body: { action: "create_room", roomCode: code, pokemonIds: [a.pokemonId] },
    });
    expect(first.status).toBe(200);

    const second = await a.c.call("/api/pvp", {
      body: { action: "create_room", roomCode: code, pokemonIds: [a.pokemonId] },
    });
    expect(second.status).toBe(400);
  });
});

describe("PvP — sigilo da ação travada", () => {
  it("o estado NÃO expõe qual golpe o oponente escolheu", async () => {
    const a = await register(`sa${Date.now()}`);
    const b = await register(`sb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    // A trava a ação.
    const submitted = await a.c.call("/api/pvp", {
      body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 2 } },
    });
    expect(submitted.status).toBe(200);

    // B consulta o estado.
    const view = await b.c.call(`/api/pvp?roomCode=${roomCode}`);
    const raw = JSON.stringify(view.body);
    const s = state(view) as unknown as { opponentCommitted: boolean };

    // B sabe QUE o oponente travou...
    expect(s.opponentCommitted).toBe(true);

    // ...mas nunca O QUÊ. Nenhum campo pode vazar moveIndex/kind da ação alheia.
    expect(raw).not.toContain('"moveIndex"');
    expect(raw).not.toContain('"turnAction"');
    // `you` tem moves (é o próprio jogador); o oponente não pode ter.
    const parsed = view.body as { battle: { opponent: Record<string, unknown> } };
    expect(parsed.battle.opponent.moves).toBeUndefined();
  });
});

describe("PvP — resolução do turno", () => {
  it("resolve quando ambos travam e aplica dano real", async () => {
    const a = await register(`ra${Date.now()}`);
    const b = await register(`rb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const antes = state(await a.c.call(`/api/pvp?roomCode=${roomCode}`)) as unknown as {
      turn: number;
      opponent: { hp: number };
    };

    await a.c.call("/api/pvp", {
      body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
    });
    await b.c.call("/api/pvp", {
      body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
    });

    const depois = state(await a.c.call(`/api/pvp?roomCode=${roomCode}`)) as unknown as {
      turn: number;
      opponent: { hp: number };
      you: { hp: number };
      log: string[];
    };

    expect(depois.turn).toBe(antes.turn + 1);
    // Alguém tomou dano (pode ser empate de velocidade, mas ambos atacam).
    const alguemTomouDano =
      depois.opponent.hp < antes.opponent.hp || depois.you.hp < antes.opponent.hp;
    expect(alguemTomouDano).toBe(true);
    expect(depois.log.join(" ")).toMatch(/usou/);
  });

  it("envio SIMULTÂNEO resolve a troca exatamente uma vez", async () => {
    const a = await register(`ca${Date.now()}`);
    const b = await register(`cb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const antes = state(await a.c.call(`/api/pvp?roomCode=${roomCode}`)) as unknown as {
      turn: number;
    };

    // Os dois disparam no mesmo instante — o caso de corrida do desenho.
    const [ra, rb] = await Promise.all([
      a.c.call("/api/pvp", {
        body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
      }),
      b.c.call("/api/pvp", {
        body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 1 } },
      }),
    ]);

    // As DUAS precisam ter sido aceitas — senão o teste passaria trivialmente
    // por uma das requests ter falhado em vez de ter sido serializada.
    expect(ra.status, `request A falhou: ${JSON.stringify(ra.body)}`).toBe(200);
    expect(rb.status, `request B falhou: ${JSON.stringify(rb.body)}`).toBe(200);

    const depois = state(await a.c.call(`/api/pvp?roomCode=${roomCode}`)) as unknown as {
      turn: number;
    };

    // Se resolvesse duas vezes, o turno avançaria 2.
    expect(depois.turn).toBe(antes.turn + 1);
  });

  it("o dano PERSISTE em user_pokemon (decisão do mantenedor)", async () => {
    const a = await register(`ha${Date.now()}`);
    const b = await register(`hb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    for (let i = 0; i < 3; i++) {
      await a.c.call("/api/pvp", {
        body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
      });
      await b.c.call("/api/pvp", {
        body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
      });
    }

    const [monA] = await db.select().from(userPokemon).where(eq(userPokemon.id, a.pokemonId));
    const [monB] = await db.select().from(userPokemon).where(eq(userPokemon.id, b.pokemonId));

    const view = state(await a.c.call(`/api/pvp?roomCode=${roomCode}`)) as unknown as {
      you: { hp: number };
      opponent: { hp: number };
    };

    // O banco e o estado da sala precisam concordar.
    expect(monA.hp).toBe(view.you.hp);
    expect(monB.hp).toBe(view.opponent.hp);
  });

  it("rejeita golpe inválido", async () => {
    const a = await register(`ia${Date.now()}`);
    const b = await register(`ib${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const r = await a.c.call("/api/pvp", {
      body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 9 } },
    });

    expect(r.status).toBe(400);
  });
});

describe("PvP — equipes e revanche", () => {
  it("restringe a batalha aos até 3 Pokémon escolhidos e permite troca forçada", async () => {
    const a = await register(`ta${Date.now()}`);
    const b = await register(`tb${Date.now()}`);
    const backupB = await addTeammate(b, 2);

    // O ativo de B entra debilitado para exercitar a troca forçada.
    await db.update(userPokemon).set({ hp: 1 }).where(eq(userPokemon.id, b.pokemonId));

    const created = await a.c.call("/api/pvp", {
      body: { action: "create_room", pokemonIds: [a.pokemonId] },
    });
    const roomCode = (created.body as { roomCode: string }).roomCode;
    const joined = await b.c.call("/api/pvp", {
      body: { action: "join_room", roomCode, pokemonIds: [b.pokemonId, backupB] },
    });
    expect(joined.status).toBe(200);

    await a.c.call("/api/pvp", {
      body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
    });
    await b.c.call("/api/pvp", {
      body: { action: "submit_turn", roomCode, turnAction: { kind: "attack", moveIndex: 0 } },
    });

    const beforeSwitch = state(await b.c.call(`/api/pvp?roomCode=${roomCode}`)) as unknown as {
      status: string;
      yourNeedsSwitch: boolean;
      party: Array<{ id: number }>;
    };
    expect(beforeSwitch.status).toBe("ACTIVE");
    expect(beforeSwitch.yourNeedsSwitch).toBe(true);
    expect(beforeSwitch.party.map((m) => m.id)).toEqual([b.pokemonId, backupB]);

    const switched = await b.c.call("/api/pvp", {
      body: { action: "switch", roomCode, userPokemonId: backupB },
    });
    expect(switched.status).toBe(200);
  });

  it("só reinicia com aceite dos dois e cura completamente os times", async () => {
    const a = await register(`va${Date.now()}`);
    const b = await register(`vb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    await a.c.call("/api/pvp", { body: { action: "forfeit", roomCode } });
    const first = await a.c.call("/api/pvp", { body: { action: "rematch", roomCode } });
    const waiting = state(first) as unknown as { status: string; youRequestedRematch: boolean };
    expect(waiting.status).toBe("FINISHED");
    expect(waiting.youRequestedRematch).toBe(true);

    const second = await b.c.call("/api/pvp", { body: { action: "rematch", roomCode } });
    const restarted = state(second) as unknown as {
      status: string;
      turn: number;
      you: { hp: number; maxHp: number };
    };
    expect(restarted.status).toBe("ACTIVE");
    expect(restarted.turn).toBe(1);
    expect(restarted.you.hp).toBe(restarted.you.maxHp);
  });
});

describe("PvP — resultado e recompensas", () => {
  it("forfeit dá a vitória ao outro e registra wins/losses", async () => {
    const a = await register(`fa${Date.now()}`);
    const b = await register(`fb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const r = await a.c.call("/api/pvp", { body: { action: "forfeit", roomCode } });
    expect(r.status).toBe(200);

    const [ua] = await db.select().from(users).where(eq(users.username, a.username));
    const [ub] = await db.select().from(users).where(eq(users.username, b.username));

    expect(ub.wins).toBe(1);
    expect(ua.losses).toBe(1);
  });

  it("amistoso NÃO mexe em users.elo (decisão do mantenedor)", async () => {
    const a = await register(`ea${Date.now()}`);
    const b = await register(`eb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const [antes] = await db.select().from(users).where(eq(users.username, a.username));
    expect(antes.elo).toBe(1000);

    await a.c.call("/api/pvp", { body: { action: "forfeit", roomCode } });

    const [depoisA] = await db.select().from(users).where(eq(users.username, a.username));
    const [depoisB] = await db.select().from(users).where(eq(users.username, b.username));

    // Nem vencedor nem perdedor têm o ELO alterado em amistoso.
    expect(depoisA.elo).toBe(1000);
    expect(depoisB.elo).toBe(1000);
  });

  it("a sala nasce como friendly", async () => {
    const a = await register(`ma${Date.now()}`);
    const b = await register(`mb${Date.now()}`);
    const roomCode = await openRoom(a, b);

    const view = state(await a.c.call(`/api/pvp?roomCode=${roomCode}`)) as unknown as { mode: string };
    expect(view.mode).toBe("friendly");
  });
});
