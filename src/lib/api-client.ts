/**
 * Cliente de API do jogo.
 *
 * Resolve duas coisas de uma vez:
 *
 * **1. Sessão que funciona dentro de iframe.** O cookie `httpOnly` não é
 * reenviado quando o navegador aplica bloqueio de cookies de terceiros — e o
 * preview roda num iframe cross-site. Por isso o token também é guardado em
 * `localStorage` e enviado como `Authorization: Bearer`. O servidor aceita os
 * dois (ver `src/lib/session.ts`).
 *
 * **2. Visibilidade de erros.** Toda chamada passa por aqui e fica registrada
 * em `debugLog`, que o `DebugPanel` exibe na tela. Sem isso, uma request que
 * falha parece "carregar e parar" — foi o que aconteceu na validação manual.
 */

const TOKEN_KEY = "deluge_token";

// ─── Token ────────────────────────────────────────────────────────────────

/**
 * Cópia em memória do token.
 *
 * **Por que existe** (bug encontrado na validação da Fase 6.2-B): dentro de um
 * iframe cross-site o navegador não bloqueia só o cookie — ele também
 * particiona ou nega o `localStorage`. Quando isso acontece, `setToken`
 * gravava no vazio, `getToken` devolvia `null`, nenhuma request levava
 * `Authorization` e **toda** chamada autenticada voltava 401: o passo tocava o
 * som do encontro e a batalha nunca começava.
 *
 * A memória do módulo não depende de permissão nenhuma e dura o que dura a
 * página, que é exatamente o tempo de uma sessão de jogo. O `localStorage`
 * continua sendo tentado, para sobreviver a um F5 quando o navegador permite.
 */
let memoryToken: string | null = null;

export function getToken(): string | null {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") {
    return null;
  }
  if (memoryToken) return memoryToken;
  try {
    memoryToken = window.localStorage.getItem(TOKEN_KEY);
    return memoryToken;
  } catch {
    return null; // armazenamento bloqueado (iframe particionado, modo privado)
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
  memoryToken = token;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignora: a cópia em memória já garante a sessão desta página */
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  memoryToken = null;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignora */
  }
}

// ─── Log de depuração ─────────────────────────────────────────────────────

export interface DebugEntry {
  id: number;
  at: string;
  method: string;
  path: string;
  status: number | null;
  ms: number;
  ok: boolean;
  /** Corpo do erro, quando houve. */
  error?: string;
}

const MAX_ENTRIES = 60;
let seq = 0;
let entries: DebugEntry[] = [];
const listeners = new Set<() => void>();

export function getDebugLog(): DebugEntry[] {
  return entries;
}

export function subscribeDebug(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function clearDebugLog(): void {
  entries = [];
  notify();
}

function record(entry: Omit<DebugEntry, "id" | "at">): void {
  entries = [
    { ...entry, id: ++seq, at: new Date().toLocaleTimeString() },
    ...entries,
  ].slice(0, MAX_ENTRIES);
  notify();
}

/** Diagnóstico de sessão, para o painel mostrar por que algo falhou. */
export function sessionDiagnostics() {
  return {
    hasToken: getToken() !== null,
    tokenPrefix: getToken()?.slice(0, 8) ?? null,
    cookieEnabled: typeof navigator !== "undefined" ? navigator.cookieEnabled : null,
    inIframe: typeof window !== "undefined" && window.self !== window.top,
    origin: typeof window !== "undefined" ? window.location.origin : null,
  };
}

// ─── Fetch ────────────────────────────────────────────────────────────────

export interface ApiResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * `fetch` com token, `Content-Type` e registro de depuração.
 * Devolve a `Response` crua, para quem precisa dos headers.
 */
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const started = performance.now();
  const method = (init.method ?? "GET").toUpperCase();

  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(path, { ...init, headers, credentials: "same-origin" });

    // Guarda o token de qualquer resposta que traga um, em vez de depender de
    // cada tela lembrar de chamar `setToken`. Foi assim que a sessão se perdeu
    // uma vez; a captura central evita a próxima.
    if (res.ok && path.startsWith("/api/auth")) {
      try {
        const parsed = (await res.clone().json()) as { token?: unknown };
        if (typeof parsed?.token === "string" && parsed.token) setToken(parsed.token);
      } catch {
        /* resposta sem JSON: nada a capturar */
      }
    }

    let errorBody: string | undefined;
    if (!res.ok) {
      // Lê uma cópia: o corpo só pode ser consumido uma vez.
      const clone = res.clone();
      try {
        const parsed = (await clone.json()) as { error?: string };
        errorBody = parsed?.error ?? `HTTP ${res.status}`;
      } catch {
        errorBody = `HTTP ${res.status}`;
      }
    }

    record({
      method,
      path,
      status: res.status,
      ms: Math.round(performance.now() - started),
      ok: res.ok,
      error: errorBody,
    });

    return res;
  } catch (err) {
    record({
      method,
      path,
      status: null,
      ms: Math.round(performance.now() - started),
      ok: false,
      error: err instanceof Error ? err.message : "Falha de rede",
    });
    throw err;
  }
}

/**
 * Versão que já faz o parse do JSON e normaliza o erro.
 * É a forma recomendada nas telas: nunca lança, sempre devolve `{ ok, data }`.
 */
export async function apiJson<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResult<T>> {
  const res = await api(path, init);
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data: data as T };
}
