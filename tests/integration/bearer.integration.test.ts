import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { client } from "./client";

/**
 * Autenticação por Bearer token.
 *
 * Existe porque o cookie httpOnly NÃO é reenviado quando o app roda dentro de
 * iframe cross-site e o navegador aplica bloqueio de cookies de terceiros —
 * nenhum atributo de cookie contorna isso, nem `SameSite=None; Secure`. Foi o
 * que quebrou o preview: login ok, toda request seguinte 401.
 */

beforeEach(async () => {
  await resetRateLimits();
});

async function login(username: string) {
  const c = client();
  const r = await c.call("/api/auth", {
    body: { action: "register", username, password: "senhaSegura123", starterId: 4 },
  });
  expect(r.status).toBe(200);
  const body = r.body as { token?: string; party: Array<{ id: number }> };
  return { token: body.token, pokemonId: body.party[0].id, username };
}

/**
 * Cliente que NÃO manda cookie — só o header Authorization.
 * É exatamente a situação do iframe com cookies de terceiro bloqueados.
 */
function bearerClient(token: string) {
  const c = client();
  return (path: string, init: { method?: string; body?: unknown } = {}) =>
    c.call(path, { ...init, headers: { Authorization: `Bearer ${token}` } });
}

describe("Bearer token", () => {
  it("o login devolve o token no corpo", async () => {
    const { token } = await login(`bt${Date.now()}`);

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(20);
  });

  it("autentica SEM cookie, só com Authorization", async () => {
    const { token } = await login(`bn${Date.now()}`);
    const call = bearerClient(token!);

    const me = await call("/api/auth");
    expect(me.status).toBe(200);
  });

  it("os fluxos que falhavam no preview funcionam com Bearer", async () => {
    const { token, pokemonId } = await login(`bf${Date.now()}`);
    const call = bearerClient(token!);

    // Sala PvP
    const room = await call("/api/pvp", {
      body: { action: "create_room", pokemonId },
    });
    expect(room.status).toBe(200);

    // Ginásio
    const gym = await call("/api/battle", {
      body: { action: "start_gym", gymLeaderId: 1 },
    });
    expect(gym.status).toBe(200);

    // Cura
    const heal = await call("/api/pokemon/heal", { body: {} });
    expect(heal.status).toBe(200);
  });

  it("token inválido é recusado", async () => {
    const call = bearerClient("token-completamente-falso");
    const r = await call("/api/auth");

    expect(r.status).toBe(401);
  });

  it("sem cookie E sem token continua 401", async () => {
    const c = client();
    const r = await c.call("/api/auth");
    expect(r.status).toBe(401);
  });

  it("o cookie continua funcionando (deploy normal não regressa)", async () => {
    // client() guarda o Set-Cookie no jar e o reenvia — sem usar Bearer.
    const c = client();
    const username = `bc${Date.now()}`;
    const reg = await c.call("/api/auth", {
      body: { action: "register", username, password: "senhaSegura123", starterId: 4 },
    });
    expect(reg.status).toBe(200);

    const me = await c.call("/api/auth");
    expect(me.status).toBe(200);
  });

  it("o token não substitui a checagem de dono (IDOR continua bloqueado)", async () => {
    const a = await login(`ba${Date.now()}`);
    const b = await login(`bb${Date.now()}`);

    const callB = bearerClient(b.token!);
    const intrusao = await callB("/api/pokemon/manage", {
      body: { action: "sell", pokemonId: a.pokemonId },
    });

    expect(intrusao.status).toBe(404);
  });
});
