/**
 * Backfill do rebalanceamento da Fase 6.1.
 *
 *   npm run db:rebalance -- --dry-run     # só mostra o que mudaria
 *   npm run db:rebalance                  # aplica
 *
 * Por que existe: a 6.1 introduziu o **learnset por nível**, mas os Pokémon já
 * capturados têm `move1..move4` gravados no banco com os antigos golpes de fim
 * de jogo (poder 80–110). Sem este backfill, um jogador de produção continuaria
 * com um inicial nível 5 segurando Lança-Chamas, e o balanceamento novo só
 * valeria para contas criadas depois do deploy.
 *
 * Também corrige os níveis dos times de ginásio, porque `ensureGymSeeded()` só
 * insere quando a tabela está vazia — em produção ela já está populada com os
 * níveis antigos.
 *
 * Seguro de rodar mais de uma vez: só escreve onde o valor difere do esperado.
 * Não apaga Pokémon, não mexe em XP, nível, HP nem em qualquer outro dado.
 */

import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { gymLeaders, userPokemon } from "../src/db/schema";
import { getPokemonSpecies, moveSlots, movesAtLevel } from "../src/lib/pokedex";
import { GYM_TEAMS, type GymTeamMember } from "../src/lib/gym-teams";

const dryRun = process.argv.includes("--dry-run");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL não definida. Copie .env.example para .env.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

async function backfillMovesets(): Promise<void> {
  const rows = await db
    .select({
      id: userPokemon.id,
      pokedexId: userPokemon.pokedexId,
      name: userPokemon.name,
      level: userPokemon.level,
      move1: userPokemon.move1,
      move2: userPokemon.move2,
      move3: userPokemon.move3,
      move4: userPokemon.move4,
    })
    .from(userPokemon);

  let changed = 0;
  let skipped = 0;

  for (const row of rows) {
    let species;
    try {
      species = getPokemonSpecies(row.pokedexId);
    } catch {
      // Pokédex não conhece a espécie: dado legado, não é papel deste script
      // decidir o que fazer com ele. Fica registrado e intocado.
      console.warn(`  ! #${row.id} ${row.name}: espécie ${row.pokedexId} fora da Pokédex — ignorado`);
      skipped += 1;
      continue;
    }

    const next = moveSlots(movesAtLevel(species, row.level));

    const same =
      row.move1 === next.move1 &&
      row.move2 === next.move2 &&
      row.move3 === next.move3 &&
      row.move4 === next.move4;

    if (same) continue;

    console.log(
      `  #${row.id} ${row.name} (lvl ${row.level}): ` +
        `[${row.move1}, ${row.move2}, ${row.move3}, ${row.move4}] → ` +
        `[${next.move1}, ${next.move2}, ${next.move3}, ${next.move4}]`
    );

    if (!dryRun) {
      await db.update(userPokemon).set(next).where(eq(userPokemon.id, row.id));
    }
    changed += 1;
  }

  console.log(
    `Movesets: ${changed} de ${rows.length} Pokémon ${dryRun ? "mudariam" : "atualizados"}` +
      (skipped > 0 ? ` · ${skipped} ignorado(s)` : "")
  );
}

async function backfillGymLevels(): Promise<void> {
  const leaders = await db
    .select({ id: gymLeaders.id, name: gymLeaders.name, team: gymLeaders.team })
    .from(gymLeaders);

  let changed = 0;

  for (const leader of leaders) {
    const expected = GYM_TEAMS[leader.name];
    if (!expected) continue;
    const levels = expected.map((member) => member.level);

    const team = (leader.team ?? []) as GymTeamMember[];
    if (team.length !== levels.length) {
      console.warn(
        `  ! ${leader.name}: time tem ${team.length} membros, esperado ${levels.length} — ignorado`
      );
      continue;
    }

    const next = team.map((member, index) => ({ ...member, level: levels[index] }));
    const same = team.every((member, index) => member.level === levels[index]);
    if (same) continue;

    console.log(
      `  ${leader.name}: níveis [${team.map((m) => m.level).join(", ")}] → [${levels.join(", ")}]`
    );

    if (!dryRun) {
      await db.update(gymLeaders).set({ team: next }).where(eq(gymLeaders.id, leader.id));
    }
    changed += 1;
  }

  console.log(`Ginásios: ${changed} líder(es) ${dryRun ? "mudariam" : "atualizado(s)"}`);
}

async function main(): Promise<void> {
  console.log(dryRun ? "Modo simulação (--dry-run): nada será escrito.\n" : "Aplicando backfill 6.1...\n");
  await backfillMovesets();
  await backfillGymLevels();
  console.log("\nConcluído.");
}

main()
  .catch((err) => {
    console.error("Falha:", err);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
