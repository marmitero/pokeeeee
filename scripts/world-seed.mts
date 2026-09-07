/**
 * Aplica o mundo padrão (40 mapas, Fase 7.1 — Etapa B) num banco que JÁ tem mapas.
 *
 *   DATABASE_URL=... npm run world:seed
 *
 * Idempotente por slug: cria o que falta, atualiza o que difere, nunca apaga.
 * Preserva `encounterGrid`/`collisionGrid` (camadas pintadas no Editor) e
 * `creatorId`/`isPublished` de mapas existentes — o que muda num mapa que já
 * existia é o conteúdo da semente: nome, descrição, grade de tiles, tabela de
 * encontros, portais e NPCs. Portais são resolvidos por slug num segundo
 * passo, quando todos os mapas já têm id no banco de destino.
 *
 * Num banco vazio o efeito é o mesmo do seed da aplicação
 * (`ensureDefaultMapsSeeded`); depois rode `npm run world:export` para
 * versionar o resultado em `content/world/` (MUNDO-COMO-CODIGO).
 */
import { eq } from "drizzle-orm";
import { gameMaps } from "../src/db/schema";
import { buildDefaultMaps } from "../src/lib/default-world";
import { connect, describeTarget } from "./world-db.mts";

const { pool, db } = connect();

try {
  console.log(`[world:seed] destino: ${describeTarget()}`);

  const defaults = buildDefaultMaps();
  const existing = await db.select({ id: gameMaps.id, slug: gameMaps.slug }).from(gameMaps);
  const idBySlug = new Map(existing.map((r) => [r.slug, r.id]));

  let criados = 0;
  let atualizados = 0;

  // 1ª passada: insere os que faltam (sem portais ainda).
  for (const m of defaults) {
    if (idBySlug.has(m.slug)) continue;
    await db.insert(gameMaps).values({
      slug: m.slug,
      name: m.name,
      description: m.description,
      width: m.width,
      height: m.height,
      tileGrid: m.tileGrid,
      encounterTable: m.encounterTable,
      portals: [],
      npcs: m.npcs,
    });
    criados += 1;
  }

  // Recarrega os ids (os novos entraram).
  const rows = await db.select({ id: gameMaps.id, slug: gameMaps.slug }).from(gameMaps);
  const freshIds = new Map(rows.map((r) => [r.slug, r.id]));

  // 2ª passada: atualiza conteúdo da semente (preserva camadas do Editor) e
  // resolve os portais por slug.
  for (const m of defaults) {
    const portals = m.portals.map((p) => {
      const { targetSlug, ...rest } = p;
      return { ...rest, targetMapId: freshIds.get(targetSlug) };
    });
    await db
      .update(gameMaps)
      .set({
        name: m.name,
        description: m.description,
        width: m.width,
        height: m.height,
        tileGrid: m.tileGrid,
        encounterTable: m.encounterTable,
        portals,
        npcs: m.npcs,
      })
      .where(eq(gameMaps.slug, m.slug));
    if (idBySlug.has(m.slug)) atualizados += 1;
  }

  const total = await db.select({ id: gameMaps.id }).from(gameMaps);
  console.log(`[world:seed] ${criados} criado(s), ${atualizados} atualizado(s), ${total.length} mapa(s) no total`);
} catch (err) {
  console.error("[world:seed] falhou:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
