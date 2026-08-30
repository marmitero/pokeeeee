/**
 * PostgreSQL local embutido, para desenvolvimento e testes de integração.
 *
 *   npm run db:local
 *
 * Os dados ficam em `.pgdata/` (gitignored). Na primeira execução o cluster é
 * inicializado e o banco `app_db` é criado; depois só sobe o servidor.
 *
 * Existe para os testes de integração não dependerem de um Postgres instalado
 * na máquina nem de Docker.
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import { Pool } from "pg";

const PORT = Number(process.env.PGPORT ?? 5432);
const DATA_DIR = new URL("../.pgdata/", import.meta.url).pathname;
const DB_NAME = process.env.PGDATABASE ?? "app_db";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

if (!fs.existsSync(`${DATA_DIR}PG_VERSION`)) {
  console.log("[db:local] inicializando cluster em .pgdata/ ...");
  await pg.initialise();
}

await pg.start();
console.log(`[db:local] PostgreSQL ouvindo em 127.0.0.1:${PORT}`);

const pool = new Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`,
});
try {
  await pool.query(`CREATE DATABASE ${DB_NAME}`);
  console.log(`[db:local] banco "${DB_NAME}" criado`);
} catch (err) {
  if (err.code !== "42P04") throw err; // 42P04 = já existe
}
await pool.end();

console.log(
  `[db:local] pronto. DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/${DB_NAME}"`
);

setInterval(() => {}, 1 << 30);
