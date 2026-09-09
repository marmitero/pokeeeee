import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { friendActionSchema } from "@/lib/validation";
import { parse, routeError } from "@/lib/api";
import { addFriend, listFriends, removeFriend } from "@/lib/presence";

/**
 * Amizades (8.9) — guarda a relação para o menu de interação do mapa.
 *
 * POST `{ action: "add" | "remove", username }`:
 *  - `add`    → cria a amizade (idempotente; par canônico, sem pedido/aceite);
 *  - `remove` → apaga a amizade.
 * GET devolve a lista de amigos (para o futuro painel).
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const friends = await listFriends(user.id);
    return NextResponse.json({ friends });
  } catch (err: unknown) {
    return routeError(err, "friends:list", "Erro ao listar amigos.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "friends", 30, 60_000);

    const input = parse(friendActionSchema, await req.json().catch(() => ({})));

    const [target] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.username, input.username))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Treinador não encontrado" }, { status: 404 });
    }
    if (target.id === user.id) {
      return NextResponse.json(
        { error: "Você não pode adicionar ou remover a si mesmo" },
        { status: 400 }
      );
    }

    if (input.action === "add") {
      await addFriend(user.id, target.id);
      return NextResponse.json({ added: target.username, isFriend: true });
    }

    await removeFriend(user.id, target.id);
    return NextResponse.json({ removed: target.username, isFriend: false });
  } catch (err: unknown) {
    return routeError(err, "friends:action", "Erro ao atualizar amizade.");
  }
}

export const dynamic = "force-dynamic";
