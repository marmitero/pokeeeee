import { and, eq, gte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { friendships, users } from "@/db/schema";

/**
 * Presença multiplayer (8.9) — polling simples, sem WebSocket.
 *
 * Cada cliente faz `POST /api/presence` a cada 2–3 s com a própria posição;
 * a rota grava `users.last_seen_at` (heartbeat) e devolve os outros jogadores
 * do MESMO mapa que estão "vivos" (heartbeat recente). Jogador que fechou a
 * aba simplesmente para de bater o heartbeat e some do mapa de todo mundo —
 * o mesmo padrão preguiçoso, sem cron, usado no PvP e no boss.
 */

/** Janela de "online": heartbeat mais recente que isto = visível no mapa. */
export const PRESENCE_ONLINE_MS = 30_000;

export interface NearbyPlayer {
  id: number;
  username: string;
  avatarSprite: string;
  playerX: number;
  playerY: number;
  elo: number;
  /** Se o jogador atual já tem esta pessoa na lista de amigos. */
  isFriend: boolean;
}

export interface FriendView {
  id: number;
  username: string;
  avatarSprite: string;
  elo: number;
  currentMapId: number;
  lastSeenAt: string | null;
}

/** Grava a posição e renova o heartbeat de presença do jogador. */
export async function heartbeat(
  userId: number,
  mapId: number,
  x: number,
  y: number
): Promise<void> {
  await db
    .update(users)
    .set({ currentMapId: mapId, playerX: x, playerY: y, lastSeenAt: new Date() })
    .where(eq(users.id, userId));
}

/** Ids dos amigos do jogador (ambos os lados da tabela canônica). */
async function friendIdsOf(userId: number): Promise<Set<number>> {
  const rows = await db
    .select({ a: friendships.userAId, b: friendships.userBId })
    .from(friendships)
    .where(or(eq(friendships.userAId, userId), eq(friendships.userBId, userId)));

  const ids = new Set<number>();
  for (const r of rows) ids.add(r.a === userId ? r.b : r.a);
  return ids;
}

/** Outros jogadores no mesmo mapa com heartbeat recente (exclui o próprio). */
export async function nearbyPlayers(mapId: number, selfId: number): Promise<NearbyPlayer[]> {
  const since = new Date(Date.now() - PRESENCE_ONLINE_MS);

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      avatarSprite: users.avatarSprite,
      playerX: users.playerX,
      playerY: users.playerY,
      elo: users.elo,
    })
    .from(users)
    .where(
      and(
        eq(users.currentMapId, mapId),
        ne(users.id, selfId),
        gte(users.lastSeenAt, since)
      )
    );

  const friends = await friendIdsOf(selfId);
  return rows.map((r) => ({ ...r, isFriend: friends.has(r.id) }));
}

/** Lista de amigos do jogador (para o futuro painel de amigos). */
export async function listFriends(userId: number): Promise<FriendView[]> {
  const pairs = await db
    .select({ a: friendships.userAId, b: friendships.userBId })
    .from(friendships)
    .where(or(eq(friendships.userAId, userId), eq(friendships.userBId, userId)));

  const otherIds = pairs.map((p) => (p.a === userId ? p.b : p.a));
  if (otherIds.length === 0) return [];

  const friends = await db
    .select({
      id: users.id,
      username: users.username,
      avatarSprite: users.avatarSprite,
      elo: users.elo,
      currentMapId: users.currentMapId,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(sql`${users.id} IN ${otherIds}`);

  return friends
    .map((u) => ({
      id: u.id,
      username: u.username,
      avatarSprite: u.avatarSprite,
      elo: u.elo,
      currentMapId: u.currentMapId,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    }))
    .sort((a, b) => a.username.localeCompare(b.username));
}

/**
 * Adiciona amizade (idempotente). Par em ordem canônica (`a < b`), então o
 * unique index segura duplicata e a direção do pedido não importa.
 */
export async function addFriend(userId: number, targetId: number): Promise<boolean> {
  const [a, b] = userId < targetId ? [userId, targetId] : [targetId, userId];
  const inserted = await db
    .insert(friendships)
    .values({ userAId: a, userBId: b })
    .onConflictDoNothing()
    .returning();
  return inserted.length > 0;
}

/** Remove amizade (idempotente, mesma ordem canônica). */
export async function removeFriend(userId: number, targetId: number): Promise<boolean> {
  const [a, b] = userId < targetId ? [userId, targetId] : [targetId, userId];
  const removed = await db
    .delete(friendships)
    .where(and(eq(friendships.userAId, a), eq(friendships.userBId, b)))
    .returning();
  return removed.length > 0;
}
