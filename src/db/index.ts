import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

/**
 * Conexão de runtime.
 *
 * Produção prefere parâmetros separados (`DATABASE_HOST`, `DATABASE_USER`,
 * `DATABASE_PASSWORD`), evitando problemas de encoding de senha em URI. A
 * `DATABASE_URL` continua suportada para desenvolvimento local.
 */
const databaseUrl = process.env.DATABASE_URL?.trim();
const databaseHost = process.env.DATABASE_HOST?.trim();
const databaseUser = process.env.DATABASE_USER?.trim();
const databasePassword = process.env.DATABASE_PASSWORD;
const databaseName = process.env.DATABASE_NAME?.trim() || "postgres";

const hasSeparateParameters = Boolean(
  databaseHost && databaseUser && databasePassword
);

if (!databaseUrl && !hasSeparateParameters) {
  throw new Error(
    "Database configuration is required: use DATABASE_URL or separate DATABASE_HOST/DATABASE_USER/DATABASE_PASSWORD"
  );
}

function envInteger(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function shouldUseSsl(target: string): boolean {
  const override = process.env.DATABASE_SSL?.toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  const lower = target.toLowerCase();
  return (
    lower.includes("sslmode=require") ||
    lower.includes("sslmode=verify-full") ||
    lower.includes("supabase.com") ||
    lower.includes("neon.tech") ||
    lower.includes("render.com")
  );
}

function warnIfTransactionPooler(port: number): void {
  if (port === 6543) {
    console.warn(
      "[db] configuração usa o Transaction Pooler (porta 6543). " +
        "Use o Session Pooler do Supabase (porta 5432)."
    );
  }
}

const port = envInteger(
  "DATABASE_PORT",
  databaseUrl
    ? (() => {
        try {
          return Number(new URL(databaseUrl).port) || 5432;
        } catch {
          return 5432;
        }
      })()
    : 5432
);
warnIfTransactionPooler(port);

function databaseCaCertificate(): string | undefined {
  const value = process.env.DATABASE_CA_CERT?.trim();
  if (!value) return undefined;
  return value.replace(/\\n/g, "\n");
}

const sslTarget = databaseHost || databaseUrl || "";
const ssl = shouldUseSsl(sslTarget)
  ? {
      rejectUnauthorized:
        process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
      ca: databaseCaCertificate(),
    }
  : undefined;

const connection: PoolConfig = hasSeparateParameters
  ? {
      host: databaseHost!,
      port,
      database: databaseName,
      user: databaseUser!,
      password: databasePassword!,
    }
  : { connectionString: databaseUrl! };

const globalForDb = globalThis as typeof globalThis & {
  __delugeRpgPool?: Pool;
};

export const pool =
  globalForDb.__delugeRpgPool ??
  new Pool({
    ...connection,
    ssl,
    max: envInteger(
      "DATABASE_POOL_MAX",
      process.env.NODE_ENV === "production" ? 3 : 10
    ),
    connectionTimeoutMillis: envInteger(
      "DATABASE_CONNECTION_TIMEOUT_MS",
      10_000
    ),
    idleTimeoutMillis: envInteger("DATABASE_IDLE_TIMEOUT_MS", 30_000),
    allowExitOnIdle: process.env.NODE_ENV !== "production",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__delugeRpgPool = pool;
}

export const db = drizzle(pool);
