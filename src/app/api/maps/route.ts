import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameMaps } from "@/db/schema";
import { ensureDefaultMapsSeeded } from "@/lib/seed-maps";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  try {
    await ensureDefaultMapsSeeded();
    const maps = await db.select().from(gameMaps).orderBy(asc(gameMaps.id));
    return NextResponse.json({ maps });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao carregar mapas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      slug,
      description,
      width = 16,
      height = 16,
      tileGrid,
      encounterTable,
      portals = [],
      creatorUsername = "Treinador",
      linkFromMapId,
      linkFromX,
      linkFromY,
      linkTargetX = 7,
      linkTargetY = 1,
    } = body;

    const safeSlug =
      slug ||
      `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    const [createdMap] = await db
      .insert(gameMaps)
      .values({
        name,
        slug: safeSlug,
        description: description || "Novo mapa criado no Editor de Mundos DelugeRPG.",
        width,
        height,
        tileGrid,
        encounterTable: encounterTable || [],
        portals: portals || [],
        creatorUsername,
        isPublished: true,
      })
      .returning();

    // Se o usuário solicitou vincular um tile de um mapa existente a este novo mapa:
    if (linkFromMapId && typeof linkFromX === "number" && typeof linkFromY === "number") {
      const sourceMapRows = await db
        .select()
        .from(gameMaps)
        .where(eq(gameMaps.id, Number(linkFromMapId)));

      if (sourceMapRows.length > 0) {
        const sourceMap = sourceMapRows[0];
        const existingPortals = Array.isArray(sourceMap.portals)
          ? (sourceMap.portals as Array<{
              id: string;
              sourceX: number;
              sourceY: number;
              targetMapId: number;
              targetMapName?: string;
              targetX: number;
              targetY: number;
              label?: string;
            }>)
          : [];

        // Atualiza o tileGrid da origem para ter um portal ("portal") no X/Y
        const currentGrid = sourceMap.tileGrid as string[][];
        if (
          currentGrid &&
          currentGrid[linkFromY] &&
          currentGrid[linkFromY][linkFromX] !== undefined
        ) {
          currentGrid[linkFromY][linkFromX] = "portal";
        }

        existingPortals.push({
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
          .set({
            tileGrid: currentGrid,
            portals: existingPortals,
            updatedAt: new Date(),
          })
          .where(eq(gameMaps.id, sourceMap.id));
      }
    }

    const allMaps = await db.select().from(gameMaps).orderBy(asc(gameMaps.id));
    return NextResponse.json({
      createdMap,
      maps: allMaps,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar mapa";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
