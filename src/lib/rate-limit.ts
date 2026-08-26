import { tooManyRequests } from "./api";

/**
 * Rate limiting em memória (janela fixa).
 *
 * ⚠️ LIMITAÇÃO CONHECIDA: o estado vive no processo Node. Funciona para uma
 * instância única (o caso atual), mas **não** compartilha contagem entre
 * réplicas nem sobrevive a restart. Quando o projeto for para um deploy
 * multi-instância (Fase 5/6), trocar por Redis/Upstash mantendo esta mesma
 * assinatura de função.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

/** Remove entradas vencidas para o Map não crescer indefinidamente. */
function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function consume(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfterSec: 0 };
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
 * @param scope    agrupador lógico ("auth", "catch"...), para um limite não
 *                 interferir no outro
 */
export function enforceRateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
  extraKey?: string
): void {
  const key = extraKey ? `${scope}:${clientIp(req)}:${extraKey}` : `${scope}:${clientIp(req)}`;
  const { ok, retryAfterSec } = consume(key, limit, windowMs);

  if (!ok) {
    throw tooManyRequests(
      `Muitas tentativas. Aguarde ${retryAfterSec}s e tente novamente.`
    );
  }
}
