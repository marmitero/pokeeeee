import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gameMaps } from "@/db/schema";
import { ensureDefaultMapsSeeded } from "@/lib/seed-maps";
import { requireRole } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import {   mapCreateSchema   } from "@/lib/validation";
import type { PortalConnection } from "@/db/schema";
import { parse, badRequest, routeError } from "@/lib/api";

/**
 * Mapas do mundo.
 *
 * Fase 1 — o que mudou:
 *  - `GET` segue público (o mundo é visível a todos).
 *  - `POST` agora **exige sessão**. Antes qualquer visitante anônimo podia
 *    criar mapas e, pior, reescrever o `tileGrid` de um mapa existente via
 *    `linkFromMapId` — era a V6 da auditoria.
 *  - A grade é checada contra `width`/`height` declarados.
 *  - Vincular um portal a um mapa existente exige permissão sobre ele.
 *
 * Complemento pós-Fase 1 — **criação de mapas é exclusiva de `admin`**.
 * O mundo é um recurso compartilhado por todos os jogadores, então sua
 * estrutura deixa de ser editável por jogadores comuns. O `creatorId` continua
 * sendo gravado, mas agora serve de **autoria/auditoria**, não de autorização.
 */

export async function GET() {
  try {
    await ensureDefaultMapsSeeded();
    const maps = await db.select().from(gameMaps).orderBy(asc(gameMaps.id));
    return NextResponse.json({ maps });
  } catch (err: unknown) {
    return routeError(err, "maps:list", "Erro ao carregar os mapas.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(req, "admin");
    enforceRateLimit(req, "maps", 15, 60_000);

    const input = parse(mapCreateSchema, await req.json().catch(() => ({})));

    if (input.tileGrid.length !== input.height) {
      throw badRequest(
        `A grade tem ${input.tileGrid.length} linhas, mas a altura declarada é ${input.height}.`
      );
    }
    if (input.tileGrid.some((row) => row.length !== input.width)) {
      throw badRequest(
        `Toda linha da grade deve ter ${input.width} colunas.`
      );
    }

    const safeSlug =
      input.slug ||
      `${input.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}-${Date.now()}`;

    const [createdMap] = await db
      .insert(gameMaps)
      .values({
        name: input.name,
        slug: safeSlug,
        description:
          input.description || "Novo mapa criado no Editor de Mundos DelugeRPG.",
        width: input.width,
        height: input.height,
        tileGrid: input.tileGrid,
        encounterTable: input.encounterTable,
        portals: input.portals,
        npcs: input.npcs ?? [],
        creatorUsername: user.username,
        creatorId: user.id,
        isPublished: true,
      })
      .returning();

    // Vincula um tile do mapa de origem a este novo mapa.
    const { linkFromMapId, linkFromX, linkFromY, linkTargetX, linkTargetY } = input;

    if (
      linkFromMapId !== undefined &&
      linkFromX !== undefined &&
      linkFromY !== undefined
    ) {
      const sourceRows = await db
        .select()
        .from(gameMaps)
        .where(eq(gameMaps.id, linkFromMapId));

      if (sourceRows.length === 0) throw badRequest("Mapa de origem não encontrado.");
      const sourceMap = sourceRows[0];

      // A partir daqui só chega `admin` (requireRole acima), que tem
      // autoridade sobre qualquer mapa — inclusive os criados por outros.

      const grid = sourceMap.tileGrid as string[][];
      if (!grid[linkFromY] || grid[linkFromY][linkFromX] === undefined) {
        throw badRequest("Coordenada de origem fora da grade do mapa.");
      }
      grid[linkFromY][linkFromX] = "portal";

      const portals = (
        Array.isArray(sourceMap.portals) ? sourceMap.portals : []
      ) as PortalConnection[];

      portals.push({
        id: `warp-${Date.now()}`,
        sourceX: linkFromX,
        sourceY: linkFromY,
        targetMapId: createdMap.id,
        targetMapName: createdMap.name,
        targetX: linkTargetX,
        targetY: linkTargetY,
        label: `Warp → ${createdMap.name}`,
      });

      await db
        .update(gameMaps)
        .set({ tileGrid: grid, portals, updatedAt: new Date() })
        .where(eq(gameMaps.id, sourceMap.id));
    }

    const maps = await db.select().from(gameMaps).orderBy(asc(gameMaps.id));

    return NextResponse.json({ createdMap, maps });
  } catch (err: unknown) {
    return routeError(err, "maps:create", "Erro ao salvar o mapa.");
  }
}

export const dynamic = "force-dynamic";
