import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { client } from "./client";
import {
  registerClient,
  registerVerified,
  testEmail,
  TEST_PASSWORD,
  verifyClient,
} from "./helpers";
import { resetRateLimits } from "@/lib/rate-limit";
import { db } from "@/db";
import { emailVerificationCodes, userPokemon, users } from "@/db/schema";

/**
 * Confirmação de e-mail do cadastro (2026-09-06) — fluxo completo pela rota.
 *
 * O ambiente de teste não tem SMTP → a rota devolve `devCode` (NODE_ENV=test),
 * o que permite exercitar o ciclo inteiro sem enviar e-mail real:
 * cadastro não verificado → código → verificação que já faz o login.
 */

beforeEach(async () => {
  await resetRateLimits();
});

describe("cadastro", () => {
  it("cria conta NÃO verificada, sem sessão nem token, com o inicial no time", async () => {
    const username = `evmix${Date.now()}`;
    const email = `EVMIX${Date.now()}@Jogador.TEST`; // misturado de propósito
    const { c, r } = await registerClient(username, { email });

    const body = r.body as {
      verified: boolean;
      devCode: string;
      token?: string;
      message: string;
    };
    expect(body.verified).toBe(false);
    expect(body.devCode).toMatch(/^\d{6}$/);
    expect(body.token).toBeUndefined();
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(body.message).toContain("Código enviado");

    // E-mail normalizado (minúsculo) e conta pendente de confirmação.
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    expect(user.email).toBe(email.toLowerCase());
    expect(user.emailVerified).toBe(false);

    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, user.id));
    expect(party).toHaveLength(1);

    // Sem sessão: /me ainda responde 401.
    const me = await c.call("/api/auth");
    expect(me.status).toBe(401);
  });

  it("recusa e-mail duplicado (mesmo e-mail, outro treinador)", async () => {
    const first = `evdup1${Date.now()}`;
    const { email } = await registerVerified(first);

    const r = await client().call("/api/auth", {
      body: {
        action: "register",
        username: `evdup2${Date.now()}`,
        email,
        password: TEST_PASSWORD,
        starterId: 4,
      },
    });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain("e-mail");
  });

  it("recusa e-mail malformado (validação antes de tocar o banco)", async () => {
    const r = await client().call("/api/auth", {
      body: {
        action: "register",
        username: `evbad${Date.now()}`,
        email: "nao-é-email",
        password: TEST_PASSWORD,
        starterId: 4,
      },
    });
    expect(r.status).toBe(400);
  });
});

describe("login de conta não confirmada", () => {
  it("cadastro repetido de conta PENDENTE (mesmo usuário/e-mail/senha) só reenvia o código", async () => {
    // Cenário do incidente de produção (2026-09-06): jogador não recebeu o
    // código (ou o cadastro falhou no meio) e tenta CRIAR CONTA de novo.
    const username = `evagain${Date.now()}`;
    const { email, r } = await registerClient(username);
    const firstCode = (r.body as { devCode: string }).devCode;

    // Ainda dentro do cooldown de 60 s → 429, sem criar conta duplicada.
    const tooSoon = await client().call("/api/auth", {
      body: { action: "register", username, email, password: TEST_PASSWORD, starterId: 4 },
    });
    expect(tooSoon.status).toBe(429);
    expect(JSON.stringify(tooSoon.body)).toContain("aguarda confirmação");

    await db
      .update(emailVerificationCodes)
      .set({ lastSentAt: new Date(Date.now() - 61_000) })
      .where(eq(emailVerificationCodes.email, email));

    const again = await client().call("/api/auth", {
      body: { action: "register", username, email, password: TEST_PASSWORD, starterId: 4 },
    });
    expect(again.status).toBe(200);
    const body = again.body as { verified: boolean; devCode: string; message: string };
    expect(body.verified).toBe(false);
    expect(body.devCode).toMatch(/^\d{6}$/);
    expect(body.devCode).not.toBe(firstCode);
    expect(body.message).toContain("já existia");

    // Uma única conta e um único inicial.
    const rows = await db.select().from(users).where(eq(users.username, username));
    expect(rows).toHaveLength(1);
    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, rows[0].id));
    expect(party).toHaveLength(1);

    // Senha errada NÃO ganha o atalho: é tratado como nome já registrado.
    const wrongPass = await client().call("/api/auth", {
      body: { action: "register", username, email, password: "outraSenha123", starterId: 4 },
    });
    expect(wrongPass.status).toBe(400);
    expect(JSON.stringify(wrongPass.body)).toContain("já está registrado");

    // O novo código confirma e loga.
    const c = client();
    const ok = await c.call("/api/auth", {
      body: { action: "verify_email", email, code: body.devCode },
    });
    expect(ok.status).toBe(200);
  });

  it("trava com 403 e orienta a confirmar o e-mail", async () => {
    const username = `evpend${Date.now()}`;
    await registerClient(username);

    const r = await client().call("/api/auth", {
      body: { action: "login", username, password: TEST_PASSWORD },
    });
    expect(r.status).toBe(403);
    expect(JSON.stringify(r.body)).toContain("confirmou o e-mail");
  });
});

describe("verificação do código", () => {
  it("código certo confirma, apaga o código e já faz o login", async () => {
    const username = `evok${Date.now()}`;
    const { c, email, r } = await registerClient(username);
    const devCode = (r.body as { devCode: string }).devCode;

    const v = await verifyClient(c, email, devCode);
    const body = v.body as {
      user: { username: string };
      party: Array<{ id: number }>;
      token?: string;
      verified: boolean;
    };
    expect(body.verified).toBe(true);
    expect(body.party).toHaveLength(1);
    expect(body.token).toBeTruthy(); // dev
    expect(v.headers.get("set-cookie")).toContain("catchbound_session");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    expect(user.emailVerified).toBe(true);
    expect(user.username).toBe(body.user.username);

    const codes = await db
      .select()
      .from(emailVerificationCodes)
      .where(eq(emailVerificationCodes.email, email));
    expect(codes).toHaveLength(0);

    // Com a conta confirmada, o login por credenciais funciona.
    const login = await client().call("/api/auth", {
      body: { action: "login", username, password: TEST_PASSWORD },
    });
    expect(login.status).toBe(200);
  });

  it("código errado: 5×400 e a 6ª tentativa pede novo código (429)", async () => {
    const username = `evwrong${Date.now()}`;
    const { c, email, r } = await registerClient(username);
    const devCode = (r.body as { devCode: string }).devCode;
    const wrong = devCode === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i++) {
      const res = await c.call("/api/auth", {
        body: { action: "verify_email", email, code: wrong },
      });
      expect(res.status).toBe(400);
    }

    const sixth = await c.call("/api/auth", {
      body: { action: "verify_email", email, code: wrong },
    });
    expect(sixth.status).toBe(429);
    expect(JSON.stringify(sixth.body)).toContain("novo código");
  });

  it("código inexistente ou de outro e-mail: 400 genérico (sem vazar)", async () => {
    const c = client();
    const ghost = `ghost${Date.now()}@jogador.test`;

    const r = await c.call("/api/auth", {
      body: { action: "verify_email", email: ghost, code: "123456" },
    });
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toContain("inválido ou expirado");
  });
});

describe("reenvio do código", () => {
  it("respeita o cooldown de 60s e o novo código invalida o antigo", async () => {
    const username = `evres${Date.now()}`;
    const { c, email, r } = await registerClient(username);
    const firstCode = (r.body as { devCode: string }).devCode;

    const immediate = await c.call("/api/auth", {
      body: { action: "resend_code", email },
    });
    expect(immediate.status).toBe(429);
    expect(JSON.stringify(immediate.body)).toContain("Aguarde");

    // Simula o cooldown tendo passado.
    await db
      .update(emailVerificationCodes)
      .set({ lastSentAt: new Date(Date.now() - 61_000) })
      .where(eq(emailVerificationCodes.email, email));

    const resent = await c.call("/api/auth", {
      body: { action: "resend_code", email },
    });
    expect(resent.status).toBe(200);
    const newCode = (resent.body as { devCode: string }).devCode;
    expect(newCode).toMatch(/^\d{6}$/);

    const oldCode = await c.call("/api/auth", {
      body: { action: "verify_email", email, code: firstCode },
    });
    expect(oldCode.status).toBe(400);

    const newCodeRes = await c.call("/api/auth", {
      body: { action: "verify_email", email, code: newCode },
    });
    expect(newCodeRes.status).toBe(200);
  });

  it("e-mail sem conta ou já confirmado: resposta genérica, nada é enviado", async () => {
    const c = client();
    const ghost = `ghost2${Date.now()}@jogador.test`;

    const r = await c.call("/api/auth", {
      body: { action: "resend_code", email: ghost },
    });
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).toContain(
      "Se este e-mail estiver registrado"
    );

    const { email } = await registerVerified(`evdone${Date.now()}`);
    const done = await c.call("/api/auth", {
      body: { action: "resend_code", email },
    });
    expect(done.status).toBe(200);
    expect(JSON.stringify(done.body)).toContain(
      "Se este e-mail estiver registrado"
    );
  });
});
