import { execFileSync } from "node:child_process";
import { Pool } from "pg";

/**
 * Prepara um banco de teste isolado antes dos testes de integração.
 *
 * Usa um database separado (`app_db_test`) para nunca tocar no de
 * desenvolvimento. Recria do zero a cada execução, então os testes são
 * reprodutíveis independente do estado anterior.
 *
 * Requer um PostgreSQL acessível em `TEST_PG_URL` (ou o padrão local).
 */
const ADMIN_URL = process.env.TEST_PG_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const TEST_DB = process.env.TEST_DB_NAME ?? "app_db_test";

function testUrl(): string {
  const u = new URL(ADMIN_URL);
  u.pathname = `/${TEST_DB}`;
  return u.toString();
}

export async function setup(): Promise<void> {
  const pool = new Pool({ connectionString: ADMIN_URL });

  await pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB]
  );
  await pool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await pool.query(`CREATE DATABASE ${TEST_DB}`);
  await pool.end();

  const url = testUrl();
  process.env.DATABASE_URL = url;

  // Aplica o schema real do projeto (o mesmo usado em produção).
  execFileSync("npx", ["drizzle-kit", "push", "--force"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

export async function teardown(): Promise<void> {
  const pool = new Pool({ connectionString: ADMIN_URL });
  await pool.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB]
  );
  await pool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await pool.end();
}
