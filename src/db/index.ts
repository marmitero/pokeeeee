import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Conexão com o PostgreSQL.
 *
 * Funciona com PostgreSQL local **e com Supabase** sem mudança de código —
 * basta trocar `DATABASE_URL`. Mas há duas armadilhas do Supabase tratadas
 * aqui:
 *
 * **1. SSL é obrigatório no Supabase.** `new Pool({ connectionString })` não
 * negocia SSL sozinho; é preciso passar `ssl`. Sem isso a conexão falha com
 * "no pg_hba.conf entry ... no encryption". Detectamos pelo host/`sslmode` e
 * ligamos automaticamente, com override por `DATABASE_SSL`.
 *
 * **2. A conexão pooled (porta 6543) usa transaction pooling**, que não
 * suporta prepared statements — várias operações do Drizzle/drizzle-kit
 * quebram. Por isso o recomendado é a conexão **direta (porta 5432)**.
 * Se a URL apontar para a 6543, avisamos no log em vez de falhar de forma
 * críptica.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

function shouldUseSsl(url: string): boolean {
  const override = process.env.DATABASE_SSL?.toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  const lower = url.toLowerCase();
  if (lower.includes("sslmode=require") || lower.includes("sslmode=verify-full")) {
    return true;
  }
  // Hosts gerenciados que exigem TLS.
  return lower.includes("supabase.com") || lower.includes("neon.tech") || lower.includes("render.com");
}

function warnIfPooled(url: string): void {
  try {
    const u = new URL(url);
    if (u.port === "6543" || u.host.includes("pooler.supabase.com")) {
      console.warn(
        "[db] DATABASE_URL aponta para a conexão POOLED do Supabase (6543). " +
          "Ela usa transaction pooling, que não suporta prepared statements e " +
          "quebra parte do Drizzle e do drizzle-kit. Use a conexão DIRETA " +
          "(porta 5432) em Project Settings → Database → Connection string."
      );
    }
  } catch {
    /* URL malformada: o pg vai reclamar com mensagem própria */
  }
}

warnIfPooled(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __delugeRpgPool?: Pool;
};

export const pool =
  globalForDb.__delugeRpgPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__delugeRpgPool = pool;
}

export const db = drizzle(pool);
