import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  battles,
  chatMessages,
  pvpBattles,
  rateLimits,
  sessions,
} from "@/db/schema";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface MaintenanceResult {
  expiredSessions: number;
  expiredRateLimits: number;
  staleWaitingRooms: number;
  staleActiveRooms: number;
  staleBattles: number;
  oldChatMessages: number;
}

/**
 * Limpeza idempotente de dados efêmeros. Não toca em usuários, Pokémon,
 * inventário, mapas, insígnias ou resultados encerrados.
 */
export async function runMaintenance(now = new Date()): Promise<MaintenanceResult> {
  const roomCutoff = new Date(now.getTime() - DAY_MS);
  const battleCutoff = new Date(now.getTime() - DAY_MS);
  const chatCutoff = new Date(now.getTime() - 90 * DAY_MS);

  return db.transaction(async (tx) => {
    const expiredSessions = await tx
      .delete(sessions)
      .where(lt(sessions.expiresAt, now))
      .returning({ id: sessions.id });

    const expiredRateLimits = await tx
      .delete(rateLimits)
      .where(lt(rateLimits.resetAt, now))
      .returning({ key: rateLimits.key });

    const staleWaitingRooms = await tx
      .update(pvpBattles)
      .set({ status: "ABANDONED", updatedAt: now })
      .where(
        and(
          eq(pvpBattles.status, "WAITING"),
          lt(pvpBattles.updatedAt, roomCutoff)
        )
      )
      .returning({ id: pvpBattles.id });

    const staleActiveRooms = await tx
      .update(pvpBattles)
      .set({ status: "ABANDONED", updatedAt: now })
      .where(
        and(eq(pvpBattles.status, "ACTIVE"), lt(pvpBattles.updatedAt, roomCutoff))
      )
      .returning({ id: pvpBattles.id });

    const staleBattles = await tx
      .update(battles)
      .set({ status: "FLED", updatedAt: now })
      .where(and(eq(battles.status, "ACTIVE"), lt(battles.updatedAt, battleCutoff)))
      .returning({ id: battles.id });

    const oldChatMessages = await tx
      .delete(chatMessages)
      .where(lt(chatMessages.createdAt, chatCutoff))
      .returning({ id: chatMessages.id });

    return {
      expiredSessions: expiredSessions.length,
      expiredRateLimits: expiredRateLimits.length,
      staleWaitingRooms: staleWaitingRooms.length,
      staleActiveRooms: staleActiveRooms.length,
      staleBattles: staleBattles.length,
      oldChatMessages: oldChatMessages.length,
    };
  });
}
