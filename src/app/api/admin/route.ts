import { NextResponse } from "next/server";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, users } from "@/db/schema";
import { ROLES, toRole, type Role } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { adminActionSchema } from "@/lib/validation";
import { badRequest, notFound, parse, publicUser, routeError } from "@/lib/api";

/**
 * Painel administrativo (Fase 5).
 *
 * Antes, promover alguém exigia acesso direto ao banco
 * (`npm run db:set-role`) e o papel `moderator` não tinha nenhuma capacidade
 * concreta — existia na hierarquia mas não fazia nada.
 *
 * Hierarquia aplicada aqui:
 *  - `set_role`            → só `admin`
 *  - `list_staff`          → só `admin`
 *  - `list_chat`           → `moderator` ou superior
 *  - `delete_chat`         → `moderator` ou superior
 */

export async function POST(req: Request) {
  try {
    // O gate mínimo é moderator; `set_role`/`list_staff` refinam para admin.
    const me = await requireRole(req, "moderator");
    await enforceRateLimit(req, "admin", 30, 60_000);

    const input = parse(adminActionSchema, await req.json().catch(() => ({})));

    // ── set_role (admin) ─────────────────────────────────────────────────
    if (input.action === "set_role") {
      if (toRole(me.role) !== "admin") {
        return NextResponse.json(
          { error: "Apenas administradores podem alterar papéis." },
          { status: 403 }
        );
      }

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username));

      if (rows.length === 0) throw notFound("Treinador não encontrado.");
      const target = rows[0];

      // Protege contra o admin trancar a si mesmo fora do painel.
      if (target.id === me.id && input.role !== "admin") {
        throw badRequest("Você não pode rebaixar a si mesmo.");
      }

      const before = toRole(target.role);
      await db.update(users).set({ role: input.role }).where(eq(users.id, target.id));

      console.info(`[admin] ${me.username} alterou ${target.username}: ${before} -> ${input.role}`);

      return NextResponse.json({
        user: publicUser({ ...target, role: input.role }),
        message: `${target.username}: "${before}" → "${input.role}"`,
        roles: ROLES,
      });
    }

    // ── list_staff (admin) ───────────────────────────────────────────────
    if (input.action === "list_staff") {
      if (toRole(me.role) !== "admin") {
        return NextResponse.json(
          { error: "Apenas administradores podem ver a equipe." },
          { status: 403 }
        );
      }

      const staff = await db
        .select({
          id: users.id,
          username: users.username,
          role: users.role,
          lastOnlineAt: users.lastOnlineAt,
        })
        .from(users)
        .where(ne(users.role, "player"));

      return NextResponse.json({ staff, roles: ROLES });
    }

    // ── list_chat (moderator+) ───────────────────────────────────────────
    if (input.action === "list_chat") {
      const messages = await db
        .select({
          id: chatMessages.id,
          username: chatMessages.username,
          message: chatMessages.message,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .orderBy(desc(chatMessages.createdAt))
        .limit(input.limit);

      return NextResponse.json({ messages });
    }

    // ── delete_chat (moderator+) ─────────────────────────────────────────
    const rows = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(eq(chatMessages.id, input.messageId));

    if (rows.length === 0) throw notFound("Mensagem não encontrada.");

    await db.delete(chatMessages).where(eq(chatMessages.id, input.messageId));
    console.info(`[moderação] ${me.username} removeu a mensagem #${input.messageId}`);

    return NextResponse.json({ ok: true, message: "Mensagem removida." });
  } catch (err: unknown) {
    return routeError(err, "admin", "Erro na administração.");
  }
}

export const dynamic = "force-dynamic";
