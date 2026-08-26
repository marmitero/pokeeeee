/**
 * Migra senhas legadas (texto puro, anteriores à Fase 1) para scrypt.
 *
 *   npm run db:migrate-passwords
 *
 * Idempotente: só toca nas linhas cujo `password_hash` não começa com
 * "scrypt$". Pode ser reexecutado à vontade.
 *
 * Observação: isto só é possível porque as senhas antigas estavam em texto
 * puro — dá para reler o valor e re-hashear. É uma reparação única do passivo
 * deixado pela V1 da auditoria; contas novas já nascem com hash.
 *
 * Além disso, o próprio `POST /api/auth` (login) faz a migração transparente
 * de cada conta no primeiro login bem-sucedido, então rodar este script é
 * opcional — ele serve para converter de uma vez quem ainda não logou.
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { users } from "../src/db/schema";
import { hashPassword, isLegacyPlaintext } from "../src/lib/password";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL não definida. Copie .env.example para .env.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function main(): Promise<void> {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
    })
    .from(users);

  const legacy = rows.filter((r) => isLegacyPlaintext(r.passwordHash));

  console.log(`Usuários no banco: ${rows.length}`);
  console.log(`Senhas em texto puro: ${legacy.length}`);

  for (const row of legacy) {
    await db
      .update(users)
      .set({ passwordHash: hashPassword(row.passwordHash) })
      .where(eq(users.id, row.id));
    console.log(`  ✔ migrada: ${row.username} (id ${row.id})`);
  }

  console.log(
    legacy.length
      ? `Concluído: ${legacy.length} senha(s) migrada(s) para scrypt.`
      : "Nada a migrar — todas as senhas já estão com hash."
  );
}

main()
  .catch((err) => {
    console.error("Falha na migração:", err);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
