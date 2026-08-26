import { tooManyRequests } from "./api";
import { MemoryStore, PostgresStore, type RateLimitStore } from "./rate-limit-store";

/**
 * Rate limiting (Fase 5).
 *
 * A versão da Fase 1 era uma janela fixa **em memória**: não sobrevivia a
 * restart e não era compartilhada entre réplicas — bastava reiniciar o
 * processo para zerar o contador. Agora o store padrão é o **Postgres**, que
 * resolve os dois problemas sem adicionar dependência.
 *
 * Seleção do store:
 *   - `RATE_LIMIT_STORE=memory`    → força o store em memória
 *   - `RATE_LIMIT_STORE=postgres`  → força o store no banco
 *   - (ausente)                    → postgres se houver `DATABASE_URL`, senão memory
 *
 * **Falha aberta de propósito:** se o banco estiver indisponível, o limite é
 * ignorado e o erro vai para o log. Derrubar o jogo inteiro por causa do
 * rate limit seria pior; o risco é registrado. Redis é o upgrade natural se o
 * acesso ao banco ficar quente.
 */

function createStore(): RateLimitStore {
  const forced = process.env.RATE_LIMIT_STORE;

  if (forced === "memory") return new MemoryStore();
  if (forced === "postgres") return new PostgresStore();

  return process.env.DATABASE_URL ? new PostgresStore() : new MemoryStore();
}

const store = createStore();

/** Store em uso — exposto para diagnóstico e testes. */
export function rateLimitStoreName(): string {
  return store.name;
}

/**
 * Zera os contadores. Usado pelos testes de integração; não é chamado em
 * produção.
 */
export async function resetRateLimits(): Promise<void> {
  await store.reset();
}

/** Identifica o cliente por IP (respeita proxies via X-Forwarded-For). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "ip-desconhecido"
  );
}

/**
 * Aplica o limite e lança `ApiError(429)` quando estourado.
 *
 * @param scope    agrupador lógico ("auth", "battle"...), para um limite não
 *                 interferir no outro
 * @param extraKey discriminador adicional (ex.: a ação), opcional
 */
export async function enforceRateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
  extraKey?: string
): Promise<void> {
  const key = extraKey
    ? `${scope}:${clientIp(req)}:${extraKey}`
    : `${scope}:${clientIp(req)}`;

  let hit;
  try {
    hit = await store.hit(key, limit, windowMs);
  } catch (err) {
    // Falha aberta: não derruba a request por causa do rate limit.
    console.error(`[rate-limit] store "${store.name}" falhou; limite ignorado`, err);
    return;
  }

  if (!hit.ok) {
    throw tooManyRequests(
      `Muitas tentativas. Aguarde ${hit.retryAfterSec}s e tente novamente.`
    );
  }
}
