import { db } from "@/db";
import { gameMaps } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { buildDefaultMaps } from "@/lib/default-world";

/**
 * Semeia o mundo padrão (40 mapas, Fase 7.1) num banco vazio.
 *
 * Banco com mapas? Este seed não toca em nada — use `npm run world:seed`
 * (scripts/world-seed.mts) para aplicar de forma idempotente num banco que
 * já tem os 3 mapas antigos, ou `world:import` para restaurar `content/world`.
 *
 * Os dados vivem em `src/lib/default-world.ts` (módulo puro, sem banco).
 */
export async function ensureDefaultMapsSeeded() {
  const existingCount = await db.select({ value: count() }).from(gameMaps);
  if (existingCount[0].value > 0) return;

  const defaults = buildDefaultMaps();

  await db.insert(gameMaps).values(
    defaults.map((m) => ({
      slug: m.slug,
      name: m.name,
      description: m.description,
      width: m.width,
      height: m.height,
      tileGrid: m.tileGrid,
      encounterTable: m.encounterTable,
      portals: [],
      npcs: m.npcs,
    }))
  );

  // Portais referenciam o id do mapa de destino: resolve por slug agora que
  // todos existem (mesma estratégia do world:import).
  const rows = await db.select({ id: gameMaps.id, slug: gameMaps.slug }).from(gameMaps);
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));

  for (const m of defaults) {
    const portals = m.portals.map((p) => {
      const { targetSlug, ...rest } = p;
      return { ...rest, targetMapId: idBySlug.get(targetSlug) };
    });
    await db.update(gameMaps).set({ portals }).where(eq(gameMaps.slug, m.slug));
  }
}
