import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameMaps } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { mapUpdateSchema } from "@/lib/validation";
import { parse, badRequest, notFound, routeError } from "@/lib/api";

/**
 * Atualização de um mapa.
 *
 * Fase 1 — o que mudou (V6):
 *  - **Exige sessão.** Antes era um `PUT` totalmente anônimo: qualquer
 *    visitante podia sobrescrever o mundo inteiro de todos os jogadores.
 *  - Grade validada contra as dimensões já gravadas.
 *
 * Complemento pós-Fase 1 — **edição exclusiva de `admin`**.
 *
 * Isso elimina o risco residual que a Fase 1 documentou: enquanto a regra era
 * "o dono edita o próprio mapa", os 3 mapas de sistema (`creatorId = null`)
 * continuavam editáveis por qualquer usuário autenticado. Agora nenhum jogador
 * comum altera o mundo, e `creatorId` passa a ser autoria/auditoria.
 */

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(req, "admin");
    await enforceRateLimit(req, "maps", 15, 60_000);

    const params = await context.params;
    const mapId = Number(params.id);
    if (!Number.isInteger(mapId) || mapId <= 0) {
      throw badRequest("Id de mapa inválido.");
    }

    const input = parse(mapUpdateSchema, await req.json().catch(() => ({})));

    const rows = await db.select().from(gameMaps).where(eq(gameMaps.id, mapId));
    if (rows.length === 0) throw notFound("Mapa não encontrado.");
    const map = rows[0];

    if (input.tileGrid) {
      if (input.tileGrid.length !== map.height) {
        throw badRequest(
          `A grade tem ${input.tileGrid.length} linhas, mas o mapa tem altura ${map.height}.`
        );
      }
      if (input.tileGrid.some((row) => row.length !== map.width)) {
        throw badRequest(`Toda linha da grade deve ter ${map.width} colunas.`);
      }
    }

    const [updated] = await db
      .update(gameMaps)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.tileGrid ? { tileGrid: input.tileGrid } : {}),
        ...(input.encounterTable ? { encounterTable: input.encounterTable } : {}),
        ...(input.portals ? { portals: input.portals } : {}),
        ...(input.npcs ? { npcs: input.npcs } : {}),
        updatedAt: new Date(),
      })
      .where(eq(gameMaps.id, mapId))
      .returning();

    const maps = await db.select().from(gameMaps).orderBy(asc(gameMaps.id));

    return NextResponse.json({ updated, maps });
  } catch (err: unknown) {
    return routeError(err, "maps:update", "Erro ao atualizar o mapa.");
  }
}

export const dynamic = "force-dynamic";
