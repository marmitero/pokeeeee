import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { POST as authPost, GET as authGet } from "@/app/api/auth/route";
import { POST as battlePost, GET as battleGet } from "@/app/api/battle/route";
import { POST as shopPost, GET as shopGet } from "@/app/api/shop/route";
import { POST as mapPost, GET as mapGet } from "@/app/api/maps/route";
import { PUT as mapPut } from "@/app/api/maps/[id]/route";
import { GET as gymGet } from "@/app/api/gym/route";
import { POST as managePost } from "@/app/api/pokemon/manage/route";
import { POST as healPost } from "@/app/api/pokemon/heal/route";
import { POST as adminPost } from "@/app/api/admin/route";
import { db } from "@/db";
import { userPokemon, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Testes de integração das invariantes de segurança (Fases 1 e 2).
 *
 * Cada caso corresponde a um exploit real reproduzido na auditoria: se um deles
 * voltar a passar, o buraco reabriu.
 *
 * Os handlers são invocados diretamente, sem servidor HTTP — é o mesmo contrato
 * que o Next usa internamente. Quando uma rota não exporta o método pedido, o
 * dispatcher devolve 405, exatamente como o Next faria.
 */

type Ctx = { params: Promise<{ id: string }> };
type Handler = (req: Request, ctx: Ctx) => Promise<Response> | Response;

const ROUTES: Record<string, Record<string, Handler>> = {
  "/api/auth": { POST: authPost, GET: authGet },
  "/api/battle": { POST: battlePost, GET: battleGet },
  "/api/shop": { POST: shopPost, GET: shopGet },
  "/api/maps": { POST: mapPost, GET: mapGet },
  "/api/maps/:id": { PUT: mapPut },
  "/api/gym": { GET: gymGet }, // sem POST de propósito — ver teste V5
  "/api/pokemon/manage": { POST: managePost },
  "/api/pokemon/heal": { POST: healPost },
  "/api/admin": { POST: adminPost },
};

interface CallResult {
  status: number;
  body: never;
  headers: Headers;
}

/** Cliente com jar de cookie, como um navegador. */
function client() {
  let cookie = "";

  async function call(path: string, init: { method?: string; body?: unknown } = {}): Promise<CallResult> {
    const [pathname, query] = path.split("?");
    const method = init.method ?? (init.body ? "POST" : "GET");

    const routeKey = Object.keys(ROUTES).find((k) =>
      pathname.replace(/\/\d+$/, "/:id") === k ? true : pathname === k
    );

    const handler = routeKey ? ROUTES[routeKey]?.[method] : undefined;
    if (!handler) {
      return { status: 405, body: {} as never, headers: new Headers() };
    }

    const req = new Request(`http://test.local${pathname}${query ? `?${query}` : ""}`, {
      method,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const res = await handler(req, { params: Promise.resolve({ id: pathname.split("/").pop() ?? "" }) });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];

    const text = await res.text();
    let parsed: unknown = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    return { status: res.status, body: parsed as never, headers: res.headers };
  }

  return { call, get cookie() { return cookie; } };
}

// Cada teste parte de contadores zerados: todos vêm do mesmo "IP" e o limite
// real (10 auth/10min) seria atingido pelos próprios testes.
beforeEach(async () => {
  await resetRateLimits();
});

async function register(username: string, password = "senhaSegura123", starterId = 4) {
  const c = client();
  const r = await c.call("/api/auth", { body: { action: "register", username, password, starterId } });
  expect(r.status, `registro de ${username} falhou: ${JSON.stringify(r.body)}`).toBe(200);
  return { c, r, username };
}

async function promote(username: string, role: "moderator" | "admin") {
  await db.update(users).set({ role }).where(eq(users.username, username));
}

const uname = (r: CallResult) => (r.body as { user: { username: string } }).user.username;
const money = (r: CallResult) => (r.body as { user: { money: number } }).user.money;

describe("autenticação (V1)", () => {
  it("não devolve passwordHash no corpo", async () => {
    const { r } = await register(`auth${Date.now()}`);
    const raw = JSON.stringify(r.body);

    // Esta é a propriedade de segurança real da Fase 1.
    expect(raw).not.toContain("passwordHash");

    // O token de sessão É devolvido de propósito: é a credencial do próprio
    // usuário logado, e é o que permite o fluxo Bearer dentro de iframe
    // cross-site, onde o cookie não é reenviado. Não é vazamento.
    expect((r.body as { token?: string }).token).toBeTruthy();
  });

  it("grava a senha com hash scrypt, nunca em texto puro", async () => {
    const username = `hash${Date.now()}`;
    await register(username, "senhaSegura123");

    const [row] = await db.select().from(users).where(eq(users.username, username));

    expect(row.passwordHash).not.toBe("senhaSegura123");
    expect(row.passwordHash.startsWith("scrypt$")).toBe(true);
  });

  it("emite cookie httpOnly", async () => {
    const { r } = await register(`ck${Date.now()}`);
    const setCookie = r.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("deluge_session=");
    expect(setCookie.toLowerCase()).toContain("httponly");
  });

  it("GET /api/auth sem sessão devolve 401", async () => {
    const c = client();
    const r = await c.call("/api/auth");

    expect(r.status).toBe(401);
  });
});

describe("cookie de sessão", () => {
  it("é HttpOnly e tem Max-Age de 30 dias", async () => {
    const { r } = await register(`ck${Date.now()}`);
    const setCookie = r.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("deluge_session=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie).toContain("Max-Age=2592000");
    expect(setCookie.toLowerCase()).toContain("path=/");
  });

  it("SameSite segue COOKIE_SAME_SITE, e None vem sempre com Secure", async () => {
    const { sessionCookie } = await import("@/lib/session");
    const mode = process.env.COOKIE_SAME_SITE?.toLowerCase();
    const cookie = sessionCookie("token-de-teste");

    if (mode === "none") {
      expect(cookie).toContain("SameSite=None");
      // Sem Secure o navegador recusa o cookie — é obrigatório junto com None.
      expect(cookie).toContain("Secure");
    } else {
      expect(cookie).toContain("SameSite=Lax");
    }
  });
});

describe("autorização (V2)", () => {
  it("toda rota que escreve exige sessão", async () => {
    const c = client();
    const alvos: Array<[string, unknown]> = [
      ["/api/pokemon/manage", { action: "sell", pokemonId: 1 }],
      ["/api/shop", { action: "buy", itemId: 1, quantity: 1 }],
      ["/api/battle", { action: "start_wild", mapId: 1, playerX: 3, playerY: 9 }],
      ["/api/maps", { name: "x", tileGrid: [["grass"]] }],
      ["/api/pokemon/heal", {}],
    ];

    for (const [path, body] of alvos) {
      const r = await c.call(path, { body });
      expect(r.status, `${path} deveria exigir sessão`).toBe(401);
    }
  });

  it("um jogador não pode vender o Pokémon de outro (e não descobre que existe)", async () => {
    const vitima = await register(`vt${Date.now()}`);
    const atacante = await register(`at${Date.now()}`);

    const party = (vitima.r.body as { party: Array<{ id: number }> }).party;
    const alvoId = party[0].id;

    const r = await atacante.c.call("/api/pokemon/manage", {
      body: { action: "sell", pokemonId: alvoId },
    });

    // 404, não 403: não revela que o Pokémon existe
    expect(r.status).toBe(404);

    const ainda = await db.select().from(userPokemon).where(eq(userPokemon.id, alvoId));
    expect(ainda).toHaveLength(1);
  });

  it("criar mapa exige papel admin", async () => {
    const { c } = await register(`pl${Date.now()}`);
    const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "grass"));

    const r = await c.call("/api/maps", {
      body: { name: "Mapa Invasor", width: 16, height: 16, tileGrid: grid },
    });

    expect(r.status).toBe(403);
  });
});

describe("loja (V3)", () => {
  it("quantity negativa é rejeitada e não cria dinheiro", async () => {
    const { c, r, username } = await register(`lj${Date.now()}`);
    const antes = money(r);

    const tentativa = await c.call("/api/shop", {
      body: { action: "buy", itemId: 1, quantity: -50 },
    });
    expect(tentativa.status).toBe(400);

    const [row] = await db.select().from(users).where(eq(users.username, username));
    expect(row.money).toBe(antes);
  });

  it("compra legítima debita o valor exato", async () => {
    const { c, r, username } = await register(`cp${Date.now()}`);
    const antes = (r.body as { user: { money: number; pokeballs: number } }).user;

    const compra = await c.call("/api/shop", { body: { action: "buy", itemId: 1, quantity: 2 } });
    expect(compra.status).toBe(200);

    const [row] = await db.select().from(users).where(eq(users.username, username));
    expect(row.money).toBe(antes.money - 400); // 2 × 200
    expect(row.pokeballs).toBe(antes.pokeballs + 2);
  });
});

describe("ginásio (V5)", () => {
  it("não existe mais o atalho battle_result (405)", async () => {
    const { c } = await register(`gy${Date.now()}`);

    const r = await c.call("/api/gym", {
      body: { action: "battle_result", gymLeaderId: 1, won: true },
    });

    expect(r.status).toBe(405);
  });

  it("GET /api/gym é público e lista os 3 líderes", async () => {
    const c = client();
    await c.call("/api/maps"); // garante o seed

    const r = await c.call("/api/gym");

    expect(r.status).toBe(200);
    expect((r.body as { gymLeaders: unknown[] }).gymLeaders).toHaveLength(3);
  });
});

describe("batalha (Fase 2)", () => {
  it("rejeita encontro em tile que não é de encontro", async () => {
    const { c } = await register(`tl${Date.now()}`);
    await c.call("/api/maps");

    const r = await c.call("/api/battle", {
      body: { action: "start_wild", mapId: 1, playerX: 7, playerY: 0 },
    });

    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain("Não há encontros");
  });

  it("vitória concede XP persistido no banco (o bug da Fase 2)", async () => {
    const { c, username } = await register(`xp${Date.now()}`);
    await c.call("/api/maps");

    const [me] = await db.select().from(users).where(eq(users.username, username));
    const moneyAntes = me.money;

    // Sobe o inicial para vencer os selvagens do mapa 1
    await db.execute(
      sql`UPDATE user_pokemon SET level=25, hp=70, max_hp=70, attack=45, defense=38,
          sp_attack=48, sp_defense=42, speed=48, xp=0 WHERE user_id=${me.id}`
    );

    const inicio = await c.call("/api/battle", {
      body: { action: "start_wild", mapId: 1, playerX: 3, playerY: 9 },
    });
    expect(inicio.status).toBe(200);
    const battleId = (inicio.body as { battle: { id: number } }).battle.id;

    let status = "ACTIVE";
    let last: CallResult | null = null;
    for (let i = 0; i < 15 && status === "ACTIVE"; i++) {
      last = await c.call("/api/battle", { body: { action: "attack", battleId, moveIndex: 0 } });
      status = (last.body as { battle: { status: string } }).battle.status;
    }

    expect(["WON", "LOST"]).toContain(status);
    if (status !== "WON") return; // derrota legítima: nada a asserting

    const rewards = (last!.body as { battle: { rewards?: { xp?: number } } }).battle.rewards;
    expect(rewards?.xp).toBeGreaterThan(0);

    const [poke] = await db.select().from(userPokemon).where(eq(userPokemon.userId, me.id));
    const [userDepois] = await db.select().from(users).where(eq(users.username, username));

    // O XP precisa estar gravado — foi exatamente o bug encontrado na Fase 2.
    expect(poke.xpToNextLevel).toBeGreaterThan(0);
    expect(poke.xp).toBeGreaterThanOrEqual(0);
    expect(poke.xp).toBeLessThan(poke.xpToNextLevel);
    expect(userDepois.money).toBeGreaterThan(moneyAntes);
  });

  it("não permite agir numa batalha de outro jogador", async () => {
    const a = await register(`ba${Date.now()}`);
    const b = await register(`bb${Date.now()}`);
    await a.c.call("/api/maps");

    const inicio = await a.c.call("/api/battle", {
      body: { action: "start_wild", mapId: 1, playerX: 3, playerY: 9 },
    });
    const battleId = (inicio.body as { battle: { id: number } }).battle.id;

    const invasao = await b.c.call("/api/battle", { body: { action: "attack", battleId, moveIndex: 0 } });

    expect(invasao.status).toBe(404);
  });

  it("GET /api/battle não expõe batalha alheia", async () => {
    const a = await register(`ga${Date.now()}`);
    const b = await register(`gb${Date.now()}`);
    await a.c.call("/api/maps");

    const inicio = await a.c.call("/api/battle", {
      body: { action: "start_wild", mapId: 1, playerX: 3, playerY: 9 },
    });
    const battleId = (inicio.body as { battle: { id: number } }).battle.id;

    const r = await b.c.call(`/api/battle?battleId=${battleId}`);
    expect(r.status).toBe(404);
  });
});

describe("gestão de Pokémon", () => {
  it("não deixa soltar o inicial", async () => {
    const { c, r } = await register(`in${Date.now()}`);
    const party = (r.body as { party: Array<{ id: number; isStarter: boolean }> }).party;
    const inicial = party.find((p) => p.isStarter)!;

    const res = await c.call("/api/pokemon/manage", {
      body: { action: "release", pokemonId: inicial.id },
    });

    expect(res.status).toBe(400);
  });

  it("cura a equipe", async () => {
    const { c } = await register(`hl${Date.now()}`);
    const r = await c.call("/api/pokemon/heal", { body: {} });

    expect(r.status).toBe(200);
  });
});

describe("rate limit compartilhado (Fase 5)", () => {
  it("o store padrão é o Postgres, não a memória", async () => {
    const { rateLimitStoreName } = await import("@/lib/rate-limit");
    expect(rateLimitStoreName()).toBe("postgres");
  });

  it("estoura o limite de login e devolve 429", async () => {
    const { username } = await register(`rl${Date.now()}`);
    const c = client();

    let ultimo = 0;
    for (let i = 0; i < 14; i++) {
      const r = await c.call("/api/auth", {
        body: { action: "login", username, password: "senhaErrada" },
      });
      ultimo = r.status;
      if (r.status === 429) break;
    }

    expect(ultimo).toBe(429);
  });

  it("o contador fica no banco (sobrevive a restart e vale entre réplicas)", async () => {
    const { rateLimits } = await import("@/db/schema");
    const { count } = await import("drizzle-orm");

    const antes = (await db.select({ n: count() }).from(rateLimits))[0].n;

    const c = client();
    await c.call("/api/auth", {
      body: { action: "login", username: "naoexiste", password: "x" },
    });

    const depois = (await db.select({ n: count() }).from(rateLimits))[0].n;

    expect(depois).toBeGreaterThan(antes);
  });

  it("senha errada não revela se o usuário existe", async () => {
    const { username } = await register(`sc${Date.now()}`);
    const c = client();

    const existe = await c.call("/api/auth", {
      body: { action: "login", username, password: "senhaErrada" },
    });
    const naoExiste = await c.call("/api/auth", {
      body: { action: "login", username: `ghost${Date.now()}`, password: "senhaErrada" },
    });

    expect(existe.status).toBe(400);
    expect(naoExiste.status).toBe(400);
    expect(JSON.stringify(existe.body)).toBe(JSON.stringify(naoExiste.body));
  });
});

describe("painel admin (Fase 5)", () => {
  it("jogador comum não acessa nada", async () => {
    const { c } = await register(`ap${Date.now()}`);

    const r = await c.call("/api/admin", { body: { action: "list_chat" } });

    expect(r.status).toBe(403);
  });

  it("moderador modera o chat mas não altera papéis", async () => {
    const { c, username } = await register(`am${Date.now()}`);
    await promote(username, "moderator");

    const chat = await c.call("/api/admin", { body: { action: "list_chat" } });
    expect(chat.status).toBe(200);

    const setRole = await c.call("/api/admin", {
      body: { action: "set_role", username, role: "admin" },
    });
    expect(setRole.status).toBe(403);

    const listStaff = await c.call("/api/admin", { body: { action: "list_staff" } });
    expect(listStaff.status).toBe(403);
  });

  it("admin promove outro treinador", async () => {
    const admin = await register(`aa${Date.now()}`);
    const alvo = await register(`ab${Date.now()}`);
    await promote(admin.username, "admin");

    const r = await admin.c.call("/api/admin", {
      body: { action: "set_role", username: alvo.username, role: "moderator" },
    });

    expect(r.status).toBe(200);

    const [row] = await db.select().from(users).where(eq(users.username, alvo.username));
    expect(row.role).toBe("moderator");
  });

  it("admin não pode rebaixar a si mesmo (não tranca a porta)", async () => {
    const admin = await register(`ac${Date.now()}`);
    await promote(admin.username, "admin");

    const r = await admin.c.call("/api/admin", {
      body: { action: "set_role", username: admin.username, role: "player" },
    });

    expect(r.status).toBe(400);

    const [row] = await db.select().from(users).where(eq(users.username, admin.username));
    expect(row.role).toBe("admin");
  });

  it("moderador remove mensagem do chat", async () => {
    const mod = await register(`ad${Date.now()}`);
    await promote(mod.username, "moderator");

    const lista = await mod.c.call("/api/admin", { body: { action: "list_chat", limit: 5 } });
    expect(lista.status).toBe(200);

    const mensagens = (lista.body as { messages: Array<{ id: number }> }).messages;
    if (mensagens.length === 0) return; // nada para moderar neste run

    const alvo = mensagens[0].id;
    const del = await mod.c.call("/api/admin", { body: { action: "delete_chat", messageId: alvo } });
    expect(del.status).toBe(200);

    const depois = await mod.c.call("/api/admin", { body: { action: "list_chat", limit: 50 } });
    const ids = (depois.body as { messages: Array<{ id: number }> }).messages.map((m) => m.id);
    expect(ids).not.toContain(alvo);
  });

  it("set_role rejeita papel inexistente", async () => {
    const admin = await register(`ae${Date.now()}`);
    await promote(admin.username, "admin");

    const r = await admin.c.call("/api/admin", {
      body: { action: "set_role", username: admin.username, role: "superuser" },
    });

    expect(r.status).toBe(400);
  });
});

describe("mapas", () => {
  it("GET é público e semeia os 3 mapas", async () => {
    const c = client();
    const r = await c.call("/api/maps");

    expect(r.status).toBe(200);
    expect((r.body as { maps: unknown[] }).maps.length).toBeGreaterThanOrEqual(3);
  });

  it("PUT exige sessão", async () => {
    const c = client();
    const r = await c.call("/api/maps/1", { method: "PUT", body: { name: "hack" } });

    expect(r.status).toBe(401);
  });
});
