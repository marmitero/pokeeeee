import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, clearToken, getToken, setToken, sessionDiagnostics } from "@/lib/api-client";

/**
 * Sessão do cliente dentro de iframe (bug achado na validação da Fase 6.2-B).
 *
 * Sintoma relatado: o passo na área de caça tocava o som do encontro e a
 * batalha nunca começava. Causa: no iframe cross-site o navegador não bloqueia
 * só o cookie — o `localStorage` também é particionado ou negado. `setToken`
 * gravava no vazio, `getToken` devolvia `null`, nenhuma request levava
 * `Authorization` e o servidor respondia 401 a tudo.
 *
 * Estes testes fixam as duas garantias que impedem a volta disso:
 *
 * 1. o token sobrevive **sem** `localStorage` (cópia em memória);
 * 2. quem chama `/api/auth` não precisa lembrar de guardar o token.
 */

/** `localStorage` que nega tudo, como o navegador faz no iframe. */
function blockedStorage() {
  return {
    getItem: () => {
      throw new Error("storage bloqueado");
    },
    setItem: () => {
      throw new Error("storage bloqueado");
    },
    removeItem: () => {
      throw new Error("storage bloqueado");
    },
  };
}

/** `localStorage` funcional, como numa aba normal. */
function workingStorage() {
  const bag = new Map<string, string>();
  return {
    getItem: (k: string) => bag.get(k) ?? null,
    setItem: (k: string, v: string) => void bag.set(k, v),
    removeItem: (k: string) => void bag.delete(k),
  };
}

function installWindow(storage: unknown) {
  const win = { localStorage: storage, location: { origin: "https://preview.e2b.app" } };
  vi.stubGlobal("window", { ...win, self: win, top: {} });
}

function stubFetch(handler: (url: string, init: RequestInit) => Response) {
  const spy = vi.fn(async (url: string, init: RequestInit) => handler(url, init));
  vi.stubGlobal("fetch", spy);
  return spy;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * Timeout folgado nos testes assíncronos: eles não esperam nada de verdade
 * (o `fetch` é stub), mas em worker frio — logo após `npm install`, ou com o
 * sandbox ocupado compilando — a primeira `Response` já passou de 5s e até de
 * 15s uma vez. Nas execuções seguintes o arquivo inteiro leva ~300ms. Melhor
 * folga que flake.
 */
const LENTO = 30_000;

beforeEach(() => {
  clearToken();
  vi.unstubAllGlobals();
});

afterEach(() => {
  clearToken();
  vi.unstubAllGlobals();
});

describe("token com armazenamento bloqueado (iframe)", () => {
  it("guarda e devolve o token mesmo sem localStorage", () => {
    installWindow(blockedStorage());

    setToken("tok-iframe");

    expect(getToken()).toBe("tok-iframe");
  });

  it("envia Authorization na request seguinte — era o passo que faltava", async () => {
    installWindow(blockedStorage());
    const spy = stubFetch(() => json({ battle: { id: 1 } }));

    setToken("tok-iframe");
    await api("/api/battle", { method: "POST", body: JSON.stringify({ action: "start_wild" }) });

    const headers = new Headers(spy.mock.calls[0][1].headers);
    expect(headers.get("Authorization")).toBe("Bearer tok-iframe");
  }, LENTO);

  it("clearToken derruba a sessão mesmo sem storage", () => {
    installWindow(blockedStorage());
    setToken("tok-iframe");

    clearToken();

    expect(getToken()).toBeNull();
  });
});

describe("token com armazenamento disponível", () => {
  it("persiste no localStorage para sobreviver ao F5", () => {
    const storage = workingStorage();
    installWindow(storage);

    setToken("tok-normal");

    expect(storage.getItem("deluge_token")).toBe("tok-normal");
  });

  it("lê o token gravado numa carga anterior da página", () => {
    const storage = workingStorage();
    storage.setItem("deluge_token", "tok-antigo");
    installWindow(storage);

    expect(getToken()).toBe("tok-antigo");
  });
});

describe("captura automática do token em /api/auth", () => {
  it("guarda o token do login sem a tela precisar lembrar", async () => {
    installWindow(blockedStorage());
    stubFetch(() => json({ user: { username: "ash" }, token: "tok-login" }));

    await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "login" }) });

    expect(getToken()).toBe("tok-login");
  }, LENTO);

  it("não guarda nada quando o login falha", async () => {
    installWindow(blockedStorage());
    stubFetch(() => json({ error: "Credenciais inválidas." }, 400));

    await api("/api/auth", { method: "POST", body: JSON.stringify({ action: "login" }) });

    expect(getToken()).toBeNull();
  }, LENTO);

  it("ignora resposta de outra rota que traga um campo token", async () => {
    installWindow(blockedStorage());
    stubFetch(() => json({ token: "nao-e-sessao" }));

    await api("/api/shop");

    expect(getToken()).toBeNull();
  }, LENTO);

  it("não estraga a resposta para quem chamou (corpo ainda legível)", async () => {
    installWindow(blockedStorage());
    stubFetch(() => json({ user: { username: "ash" }, token: "tok-login" }));

    const res = await api("/api/auth", { method: "POST", body: "{}" });
    const body = (await res.json()) as { user: { username: string } };

    expect(body.user.username).toBe("ash");
  }, LENTO);
});

describe("sessionDiagnostics", () => {
  it("informa que há token, para o painel de depuração", () => {
    installWindow(blockedStorage());
    setToken("tok-diag");

    const info = sessionDiagnostics();

    expect(info.hasToken).toBe(true);
    expect(info.tokenPrefix).toBe("tok-diag");
  });
});
