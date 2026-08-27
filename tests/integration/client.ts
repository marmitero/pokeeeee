import type { Handler } from "./routes";
import { ROUTES } from "./routes";

export interface CallResult {
  status: number;
  body: never;
  headers: Headers;
}

/**
 * Cliente de teste com jar de cookie, invocando os Route Handlers diretamente
 * (sem servidor HTTP) — o mesmo contrato que o Next usa internamente.
 *
 * Quando a rota não exporta o método pedido, devolve 405, como o Next faria.
 */
export function client() {
  let cookie = "";

  async function call(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<CallResult> {
    const [pathname, query] = path.split("?");
    const method = init.method ?? (init.body ? "POST" : "GET");

    const routeKey = Object.keys(ROUTES).find((k) =>
      pathname.replace(/\/\d+$/, "/:id") === k ? true : pathname === k
    );

    const handler: Handler | undefined = routeKey ? ROUTES[routeKey]?.[method] : undefined;
    if (!handler) return { status: 405, body: {} as never, headers: new Headers() };

    const req = new Request(`http://test.local${pathname}${query ? `?${query}` : ""}`, {
      method,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const res = await handler(req, {
      params: Promise.resolve({ id: pathname.split("/").pop() ?? "" }),
    });

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
