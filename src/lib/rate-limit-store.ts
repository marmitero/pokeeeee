import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Stores de rate limit (Fase 5).
 *
 * Dois backends atrás da mesma interface:
 *
 *  - **postgres** (padrão): compartilhado entre réplicas e sobrevive a restart.
 *    Era a pendência explícita da Fase 1 — o limite em memória podia ser
 *    zerado reiniciando o processo.
 *  - **memory**: por processo. Usado quando não há banco (testes unitários) ou
 *    como fallback se o banco falhar.
 *
 * Redis seria o upgrade natural se o volume tornar o acesso ao banco quente;
 * a interface já está pronta para receber um terceiro store.
 */

export interface Hit {
  ok: boolean;
  retryAfterSec: number;
}

export interface RateLimitStore {
  readonly name: string;
  hit(key: string, limit: number, windowMs: number): Promise<Hit>;
  reset(): Promise<void>;
}

// ─── Memory ───────────────────────────────────────────────────────────────

interface Bucket {
  count: number;
  resetAt: number;
}

export class MemoryStore implements RateLimitStore {
  readonly name = "memory";
  private buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  async hit(key: string, limit: number, windowMs: number): Promise<Hit> {
    const now = Date.now();
    this.sweep(now);

    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfterSec: 0 };
    }

    bucket.count += 1;

    if (bucket.count > limit) {
      return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    return { ok: true, retryAfterSec: 0 };
  }

  async reset(): Promise<void> {
    this.buckets.clear();
    this.lastSweep = Date.now();
  }

  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

// ─── Postgres ─────────────────────────────────────────────────────────────

export class PostgresStore implements RateLimitStore {
  readonly name = "postgres";

  async hit(key: string, limit: number, windowMs: number): Promise<Hit> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    // UPSERT atômico: cria com count=1 ou incrementa. Retorna o estado novo,
    // então duas requests concorrentes não podem ambas achar que estão dentro.
    const rows = await db
      .insert(rateLimits)
      .values({ key, count: 1, resetAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          // Janela vencida? Reinicia a contagem em vez de somar.
          count: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN 1 ELSE ${rateLimits.count} + 1 END`,
          resetAt: sql`CASE WHEN ${rateLimits.resetAt} <= ${now} THEN ${resetAt} ELSE ${rateLimits.resetAt} END`,
        },
      })
      .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

    const row = rows[0];
    if (row.count > limit) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
      };
    }

    return { ok: true, retryAfterSec: 0 };
  }

  async reset(): Promise<void> {
    await db.delete(rateLimits);
  }
}
