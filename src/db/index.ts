import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Conexão de runtime. Em Vercel, DATABASE_URL deve usar o Session Pooler do
 * Supabase (porta 5432); DIRECT_DATABASE_URL fica reservada às migrations.
 */
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

function envInteger(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function shouldUseSsl(url: string): boolean {
  const override = process.env.DATABASE_SSL?.toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  const lower = url.toLowerCase();
  return (
    lower.includes("sslmode=require") ||
    lower.includes("sslmode=verify-full") ||
    lower.includes("supabase.com") ||
    lower.includes("neon.tech") ||
    lower.includes("render.com")
  );
}

function warnIfTransactionPooler(url: string): void {
  try {
    const parsed = new URL(url);
    if (parsed.port === "6543") {
      console.warn(
        "[db] DATABASE_URL usa o Transaction Pooler (porta 6543). " +
          "Este projeto usa o driver pg/Drizzle e deve apontar o runtime para " +
          "o Session Pooler do Supabase (porta 5432)."
      );
    }
  } catch {
    // URL malformada: o driver pg produzirá a mensagem apropriada.
  }
}

warnIfTransactionPooler(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __delugeRpgPool?: Pool;
};

function databaseCaCertificate(): string | undefined {
  const value = process.env.DATABASE_CA_CERT?.trim();
  if (!value) return undefined;
  // A Vercel pode preservar quebras reais ou armazená-las como "\\n".
  return value.replace(/\\n/g, "\n");
}

const ssl = shouldUseSsl(databaseUrl)
  ? {
      // O Session Pooler apresenta uma cadeia assinada pela CA do projeto.
      // Fornecer essa CA mantém verificação forte sem aceitar self-signed.
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
      ca: databaseCaCertificate(),
    }
  : undefined;

export const pool =
  globalForDb.__delugeRpgPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl,
    // Uma instância serverless não deve consumir todo o limite do Supabase.
    max: envInteger("DATABASE_POOL_MAX", process.env.NODE_ENV === "production" ? 3 : 10),
    connectionTimeoutMillis: envInteger("DATABASE_CONNECTION_TIMEOUT_MS", 10_000),
    idleTimeoutMillis: envInteger("DATABASE_IDLE_TIMEOUT_MS", 30_000),
    allowExitOnIdle: process.env.NODE_ENV !== "production",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__delugeRpgPool = pool;
}

export const db = drizzle(pool);
