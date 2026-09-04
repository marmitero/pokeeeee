/**
 * Conexão compartilhada pelos scripts de mundo (Fase 6.2-D).
 *
 * Prefere `DIRECT_DATABASE_URL` (conexão direta, como as migrations) e cai em
 * `DATABASE_URL`. SSL segue a mesma regra do runtime: liga em hosts gerenciados
 * ou quando a URL pede `sslmode=require`.
 */
import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export const WORLD_DIR = new URL("../content/world/", import.meta.url);

export function connect() {
  const url = process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL (ou DIRECT_DATABASE_URL) não definida.");
    process.exit(1);
  }

  const lower = url.toLowerCase();
  const override = process.env.DATABASE_SSL?.toLowerCase();
  const useSsl =
    override === "true" ||
    (override !== "false" &&
      (lower.includes("sslmode=require") ||
        lower.includes("sslmode=verify-full") ||
        lower.includes("supabase.com") ||
        lower.includes("neon.tech") ||
        lower.includes("render.com")));

  const ca = process.env.DATABASE_CA_CERT?.trim().replace(/\\n/g, "\n");
  const pool = new Pool({
    connectionString: url,
    max: 2,
    ssl: useSsl
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false", ca: ca || undefined }
      : undefined,
  });

  return { pool, db: drizzle(pool) };
}

/** Nome do banco, só para o log — nunca imprime usuário nem senha. */
export function describeTarget(): string {
  const url = process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? ":" + u.port : ""}${u.pathname}`;
  } catch {
    return "(URL ilegível)";
  }
}
