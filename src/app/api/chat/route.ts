import { NextResponse } from "next/server";
import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { chatQuerySchema, chatSendSchema } from "@/lib/validation";
import { parse, routeError } from "@/lib/api";

/**
 * Chat no jogo — Fase 8.8 (decisão B: Pokédex completa em 649).
 *
 * 3 canais:
 * - global: servidor todo (channel='global')
 * - local: mesmo mapa (channel='local' + map_id)
 * - whisper: privado (channel='whisper' + recipient_id)
 *
 * Polling simples (5s no cliente), sem WebSocket.
 * Reusa tabela chat_messages + moderação existente (/api/admin).
 */

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);

    const parsed = chatQuerySchema.safeParse({
      channel: searchParams.get("channel") ?? undefined,
      mapId: searchParams.get("mapId") ?? undefined,
      withUser: searchParams.get("withUser") ?? undefined,
      afterId: searchParams.get("afterId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parâmetros inválidos" }, { status: 400 });
    }

    const { channel, mapId, withUser, afterId, limit } = parsed.data;

    // ── GLOBAL ─────────────────────────────────────────────────────────
    if (channel === "global") {
      const conditions = [eq(chatMessages.channel, "global")];
      if (afterId) conditions.push(gt(chatMessages.id, afterId));

      const rows = await db
        .select()
        .from(chatMessages)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);

      return NextResponse.json({ messages: rows.reverse() });
    }

    // ── LOCAL ──────────────────────────────────────────────────────────
    if (channel === "local") {
      if (!mapId) {
        return NextResponse.json({ error: "mapId obrigatório para canal local" }, { status: 400 });
      }
      const conditions = [eq(chatMessages.channel, "local"), eq(chatMessages.mapId, mapId)];
      if (afterId) conditions.push(gt(chatMessages.id, afterId));

      const rows = await db
        .select()
        .from(chatMessages)
        .where(and(...conditions))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);

      return NextResponse.json({ messages: rows.reverse() });
    }

    // ── WHISPER ────────────────────────────────────────────────────────
    if (channel === "whisper") {
      if (withUser) {
        // conversa com usuário específico
        const [other] = await db.select().from(users).where(eq(users.username, withUser)).limit(1);
        if (!other) {
          return NextResponse.json({ error: "Treinador não encontrado" }, { status: 404 });
        }

        const conditions = [
          eq(chatMessages.channel, "whisper"),
          or(
            and(eq(chatMessages.userId, user.id), eq(chatMessages.recipientId, other.id)),
            and(eq(chatMessages.userId, other.id), eq(chatMessages.recipientId, user.id))
          ),
        ];
        if (afterId) conditions.push(gt(chatMessages.id, afterId));

        const rows = await db
          .select()
          .from(chatMessages)
          .where(and(...conditions.filter(Boolean) as any))
          .orderBy(desc(chatMessages.createdAt))
          .limit(limit);

        return NextResponse.json({ messages: rows.reverse(), withUser: other.username });
      } else {
        // lista de whispers envolvendo o usuário (últimos 50)
        const conditions = [
          eq(chatMessages.channel, "whisper"),
          or(eq(chatMessages.userId, user.id), eq(chatMessages.recipientId, user.id)),
        ];
        if (afterId) conditions.push(gt(chatMessages.id, afterId));

        const rows = await db
          .select()
          .from(chatMessages)
          .where(and(...conditions))
          .orderBy(desc(chatMessages.createdAt))
          .limit(limit);

        // conversas recentes: agrupar por outro participante
        const convMap = new Map<string, { username: string; lastMessage: string; lastAt: Date | null; lastId: number }>();
        for (const r of rows) {
          // determina o outro lado
          const isSender = r.userId === user.id;
          const otherUsername = isSender
            ? // precisa buscar username do recipient — vamos usar query extra se necessário
              // por simplicidade, fazemos lookup lazy abaixo
              null
            : r.username;

          // Para evitar N queries, vamos buscar recipient usernames em lote
          // Aqui só marcamos; o preenchimento real vem depois
        }

        // Buscar usernames dos recipientIds envolvidos
        const recipientIds = [...new Set(rows.map((r) => r.recipientId).filter(Boolean) as number[])];
        const senderIds = [...new Set(rows.map((r) => r.userId).filter((id) => id !== user.id))];
        const allIds = [...new Set([...recipientIds, ...senderIds])];
        let idToUsername = new Map<number, string>();
        if (allIds.length > 0) {
          const usersFound = await db
            .select({ id: users.id, username: users.username })
            .from(users)
            .where(sql`${users.id} IN ${allIds}`);
          idToUsername = new Map(usersFound.map((u) => [u.id, u.username]));
        }

        for (const r of rows.slice().reverse()) {
          // reverse para processar do mais antigo ao mais novo e manter último
          const otherId = r.userId === user.id ? r.recipientId : r.userId;
          if (!otherId) continue;
          const otherUsername = idToUsername.get(otherId) ?? (r.userId !== user.id ? r.username : "desconhecido");
          if (!convMap.has(otherUsername)) {
            convMap.set(otherUsername, {
              username: otherUsername,
              lastMessage: r.message,
              lastAt: r.createdAt,
              lastId: r.id,
            });
          } else {
            // atualiza para a mais recente (como iteramos do antigo ao novo, sobrescreve)
            convMap.set(otherUsername, {
              username: otherUsername,
              lastMessage: r.message,
              lastAt: r.createdAt,
              lastId: r.id,
            });
          }
        }

        const conversations = Array.from(convMap.values()).sort((a, b) => (b.lastId ?? 0) - (a.lastId ?? 0));

        return NextResponse.json({ messages: rows.reverse(), conversations });
      }
    }

    return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
  } catch (err: unknown) {
    return routeError(err, "chat:get", "Erro ao carregar chat.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "chat", 30, 60_000);

    const body = await req.json().catch(() => ({}));
    const parsed = chatSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const { channel, message, mapId, recipientUsername } = parsed.data;
    const trimmed = message.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    // ── GLOBAL ─────────────────────────────────────────────────────────
    if (channel === "global") {
      const [inserted] = await db
        .insert(chatMessages)
        .values({
          userId: user.id,
          username: user.username,
          message: trimmed,
          channel: "global",
        })
        .returning();

      return NextResponse.json({ message: inserted });
    }

    // ── LOCAL ──────────────────────────────────────────────────────────
    if (channel === "local") {
      if (!mapId) {
        return NextResponse.json({ error: "mapId obrigatório para canal local" }, { status: 400 });
      }

      const [inserted] = await db
        .insert(chatMessages)
        .values({
          userId: user.id,
          username: user.username,
          message: trimmed,
          channel: "local",
          mapId,
        })
        .returning();

      return NextResponse.json({ message: inserted });
    }

    // ── WHISPER ────────────────────────────────────────────────────────
    if (channel === "whisper") {
      if (!recipientUsername) {
        return NextResponse.json({ error: "Destinatário obrigatório para sussurro" }, { status: 400 });
      }
      if (recipientUsername.toLowerCase() === user.username.toLowerCase()) {
        return NextResponse.json({ error: "Você não pode sussurrar para si mesmo" }, { status: 400 });
      }

      const [recipient] = await db
        .select()
        .from(users)
        .where(eq(users.username, recipientUsername))
        .limit(1);

      if (!recipient) {
        return NextResponse.json({ error: "Treinador não encontrado" }, { status: 404 });
      }

      const [inserted] = await db
        .insert(chatMessages)
        .values({
          userId: user.id,
          username: user.username,
          message: trimmed,
          channel: "whisper",
          recipientId: recipient.id,
        })
        .returning();

      return NextResponse.json({ message: inserted });
    }

    return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
  } catch (err: unknown) {
    return routeError(err, "chat:send", "Erro ao enviar mensagem.");
  }
}

export const dynamic = "force-dynamic";
