import { NextResponse } from "next/server";
import { db } from "@/db";
import { gameMaps } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const mapId = Number(params.id);
    const body = await req.json();
    const { name, description, tileGrid, encounterTable, portals } = body;

    const [updated] = await db
      .update(gameMaps)
      .set({
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
        ...(tileGrid ? { tileGrid } : {}),
        ...(encounterTable ? { encounterTable } : {}),
        ...(portals ? { portals } : {}),
        updatedAt: new Date(),
      })
      .where(eq(gameMaps.id, mapId))
      .returning();

    const allMaps = await db.select().from(gameMaps).orderBy(asc(gameMaps.id));
    return NextResponse.json({ updated, maps: allMaps });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar mapa";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
