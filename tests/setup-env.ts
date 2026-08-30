/**
 * Garante que `DATABASE_URL` aponte para o banco de teste ANTES de qualquer
 * módulo importar `@/db` — o pool é criado na carga do módulo.
 */
const ADMIN_URL = process.env.TEST_PG_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const TEST_DB = process.env.TEST_DB_NAME ?? "app_db_test";

const u = new URL(ADMIN_URL);
u.pathname = `/${TEST_DB}`;
process.env.DATABASE_URL = u.toString();
