import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { presenceHeartbeatSchema } from "@/lib/validation";
import { parse, routeError } from "@/lib/api";
import { heartbeat, nearbyPlayers } from "@/lib/presence";

/**
 * Presença multiplayer (8.9) — polling simples (2–3 s), sem WebSocket.
 *
 * POST `{ currentMapId, playerX, playerY }`:
 *  1. grava a posição + renova `users.last_seen_at` (heartbeat);
 *  2. devolve os outros jogadores do MESMO mapa com heartbeat recente
 *     (id, username, avatar, x/y, elo, isFriend) para o cliente desenhá-los.
 *
 * O rate limit é folgado de propósito: cada cliente batendo a cada 2,5 s dá
 * 24 req/min — o teto (60/min) cobre dois clientes por IP sem barra.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "presence", 60, 60_000);

    const input = parse(presenceHeartbeatSchema, await req.json().catch(() => ({})));

    await heartbeat(user.id, input.currentMapId, input.playerX, input.playerY);

    const players = await nearbyPlayers(input.currentMapId, user.id);

    return NextResponse.json({ players });
  } catch (err: unknown) {
    return routeError(err, "presence", "Erro ao atualizar presença.");
  }
}

export const dynamic = "force-dynamic";
