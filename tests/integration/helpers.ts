import { client, type CallResult } from "./client";

/**
 * Fluxo de cadastro compartilhado (2026-09-06): e-mail real + código de 6
 * dígitos.
 *
 * O ambiente de teste não tem SMTP configurado → a rota devolve `devCode`
 * na resposta (NODE_ENV=test ≠ production). `registerVerified` roda o fluxo
 * completo: register → verify_email (devCode) → o cliente volta já logado
 * (o cookie de sessão é emitido no verify, que faz o login). `r` é a
 * resposta do verify — `user`/`party`/`token` (dev) —, o mesmo shape que
 * os testes usavam quando o register logava direto.
 */

export const TEST_PASSWORD = "senhaSegura123";

export interface RegisterOpts {
  password?: string;
  starterId?: number;
  email?: string;
  avatarSprite?: string;
}

/** E-mail de teste único por username (`.test` é TLD reservado para teste). */
export function testEmail(username: string): string {
  return `${username.toLowerCase()}@jogador.test`;
}

/** Somente o cadastro (conta fica NÃO verificada). */
export async function registerClient(
  username: string,
  opts: RegisterOpts = {}
): Promise<{ c: ReturnType<typeof client>; email: string; r: CallResult }> {
  const c = client();
  const email = opts.email ?? testEmail(username);

  const r = await c.call("/api/auth", {
    body: {
      action: "register",
      username,
      email,
      password: opts.password ?? TEST_PASSWORD,
      starterId: opts.starterId ?? 4,
      ...(opts.avatarSprite ? { avatarSprite: opts.avatarSprite } : {}),
    },
  });

  if (r.status !== 200) {
    throw new Error(
      `Registro de ${username} falhou (${r.status}): ${JSON.stringify(r.body)}`
    );
  }

  return { c, email, r };
}

/** Confirma a conta com o código; o cookie de sessão é emitido aqui. */
export async function verifyClient(
  c: ReturnType<typeof client>,
  email: string,
  code: string
): Promise<CallResult> {
  const r = await c.call("/api/auth", {
    body: { action: "verify_email", email, code },
  });

  if (r.status !== 200) {
    throw new Error(
      `Verificação de ${email} falhou (${r.status}): ${JSON.stringify(r.body)}`
    );
  }

  return r;
}

/** Cadastro + verificação completa: devolve o cliente já logado. */
export async function registerVerified(
  username: string,
  opts: RegisterOpts = {}
): Promise<{ c: ReturnType<typeof client>; email: string; r: CallResult }> {
  const reg = await registerClient(username, opts);
  const body = reg.r.body as { verified?: boolean; devCode?: string };

  if (body.verified === true) return reg; // conta já verificada (grandfather)
  if (!body.devCode) {
    throw new Error(
      `Sem devCode para ${username} — o ambiente de teste configurou SMTP?`
    );
  }

  const r = await verifyClient(reg.c, reg.email, body.devCode);
  return { ...reg, r };
}
