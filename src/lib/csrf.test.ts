import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin } from "./csrf";
import { ApiError } from "./api";

/**
 * Proteção CSRF por validação de Origin.
 *
 * Existe porque o cookie de sessão roda com `SameSite=None` no preview
 * (iframe cross-site), o que desliga a proteção CSRF do navegador.
 */

function req(init: { method?: string; origin?: string; host?: string; fetchSite?: string; authorization?: string } = {}): Request {
  const headers: Record<string, string> = { host: init.host ?? "app.example.com" };
  if (init.origin) headers.origin = init.origin;
  if (init.fetchSite) headers["sec-fetch-site"] = init.fetchSite;
  if (init.authorization) headers.authorization = init.authorization;

  return new Request(`http://${headers.host}/api/pvp`, {
    method: init.method ?? "POST",
    headers,
    body: init.method && ["GET", "HEAD"].includes(init.method) ? undefined : "{}",
  });
}

describe("assertSameOrigin", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("aceita Origin igual ao Host (o caso normal, inclusive no preview)", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://app.example.com", host: "app.example.com" }))
    ).not.toThrow();
  });

  it("BLOQUEIA Origin de outro site — o ataque CSRF clássico", () => {
    let caught: unknown;
    try {
      assertSameOrigin(req({ origin: "https://evil.example.com", host: "app.example.com" }));
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(403);
  });

  it("bloqueia também quando só a porta difere", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://app.example.com:8443", host: "app.example.com" }))
    ).toThrow(ApiError);
  });

  it("aceita requisição sem Origin (curl, testes, clientes não-navegador)", () => {
    // O vetor clássico depende do navegador enviar o Origin; sem ele não há ataque.
    expect(() => assertSameOrigin(req({ origin: undefined }))).not.toThrow();
  });

  it("não interfere em métodos seguros", () => {
    expect(() =>
      assertSameOrigin(req({ method: "GET", origin: "https://evil.example.com" }))
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(req({ method: "HEAD", origin: "https://evil.example.com" }))
    ).not.toThrow();
  });

  it("aplica a checagem em PUT e DELETE também", () => {
    for (const method of ["PUT", "DELETE"]) {
      expect(() =>
        assertSameOrigin(req({ method, origin: "https://evil.example.com" }))
      ).toThrow(ApiError);
    }
  });

  it("não quebra com Origin malformado fora de produção", () => {
    expect(() => assertSameOrigin(req({ origin: "não-é-uma-url" }))).not.toThrow();
  });

  it("bloqueia Sec-Fetch-Site cross-site mesmo sem Origin", () => {
    expect(() => assertSameOrigin(req({ fetchSite: "cross-site" }))).toThrow(ApiError);
  });

  it("em produção exige Origin para mutação autenticada por cookie", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertSameOrigin(req())).toThrow(ApiError);
  });

  it("em produção mantém cliente Bearer não-navegador compatível", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() =>
      assertSameOrigin(req({ authorization: "Bearer token-de-teste" }))
    ).not.toThrow();
  });
});
