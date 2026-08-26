/**
 * Define o papel de um treinador.
 *
 *   npm run db:set-role -- <username> <papel>
 *
 * Exemplos:
 *   npm run db:set-role -- ash admin          # promove a administrador
 *   npm run db:set-role -- gary moderator     # promove a moderador
 *   npm run db:set-role -- gary player        # rebaixa a jogador
 *   npm run db:set-role                       # sem argumentos: lista a equipe
 *
 * Papéis (do menor para o maior):
 *   player    → padrão. Joga; não altera nada do mundo compartilhado.
 *   moderator → modera a comunidade (chat). Não edita mapas.
 *   admin     → tudo, incluindo o Editor de Mundos e a gestão de papéis.
 *
 * ⚠️  Este script é hoje o **único** caminho para promover alguém. Não existe
 *     endpoint HTTP de gestão de papéis — e isso é deliberado: criar um
 *     endpoint assim abriria exatamente o tipo de superfície que a Fase 1
 *     fechou. Um painel administrativo é item de roadmap, não desta etapa.
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, ne } from "drizzle-orm";
import { ROLES, toRole, users } from "../src/db/schema";
import type { Role } from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL não definida. Copie .env.example para .env.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function listStaff(): Promise<void> {
  const staff = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      lastOnlineAt: users.lastOnlineAt,
    })
    .from(users)
    .where(ne(users.role, "player"));

  if (staff.length === 0) {
    console.log("Nenhum moderador ou admin cadastrado ainda.");
    console.log('Promova alguém com: npm run db:set-role -- <username> admin');
    return;
  }

  console.log("Equipe (papéis acima de player):");
  for (const s of staff) {
    const visto = s.lastOnlineAt ? s.lastOnlineAt.toISOString() : "nunca";
    console.log(`  #${s.id} ${s.username.padEnd(20)} ${toRole(s.role).padEnd(10)} último acesso: ${visto}`);
  }
}

async function setRole(username: string, role: Role): Promise<void> {
  const rows = await db
    .select({ id: users.id, username: users.username, role: users.role })
    .from(users)
    .where(eq(users.username, username));

  if (rows.length === 0) {
    console.error(`✗ Treinador "${username}" não encontrado.`);
    process.exitCode = 1;
    return;
  }

  const before = toRole(rows[0].role);

  if (before === role) {
    console.log(`= ${username} já é "${role}". Nada a fazer.`);
    return;
  }

  await db.update(users).set({ role }).where(eq(users.id, rows[0].id));

  console.log(`✔ ${username} (id ${rows[0].id}): "${before}" → "${role}"`);
}

async function main(): Promise<void> {
  const [username, rawRole] = process.argv.slice(2);

  if (!username) {
    await listStaff();
    return;
  }

  if (!rawRole || !ROLES.includes(rawRole as Role)) {
    console.error(`✗ Papel inválido: ${rawRole ?? "(ausente)"}`);
    console.error(`  Papéis aceitos: ${ROLES.join(" | ")}`);
    process.exitCode = 1;
    return;
  }

  await setRole(username, rawRole as Role);
}

main()
  .catch((err) => {
    console.error("Falha:", err);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
