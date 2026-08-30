import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gymLeaders, userBadges } from "@/db/schema";
import { ensureGymSeeded } from "@/lib/seed-gym";
import { getSessionUser } from "@/lib/session";
import { gymQuerySchema } from "@/lib/validation";
import { parse, routeError } from "@/lib/api";

/**
 * Ginásios e insígnias.
 *
 * Fase 1 — o que mudou:
 *  - `userId` vem da **sessão** (V2).
 *  - O pré-requisito de insígnias (`requiredBadges`) agora é **verificado no
 *    servidor**; antes só a interface checava, então bastava um curl para
 *    enfrentar o Lance sem nenhuma insígnia.
 *  - Dinheiro e contadores atualizados com incremento atômico
 *    (antes era read-then-write, perdendo atualização em concorrência).
 *  - Insígnia duplicada protegida por checagem prévia dentro da transação.
 *
 * ⚠️ Ainda pendente (Fase 2): `won` continua vindo do cliente. Enquanto a
 * luta não for resolvida no servidor, a recompensa do ginásio segue
 * "farmável" por curl — não há como blindar isso só com autenticação.
 * O bug B1 (`GymModal` pede `?mapId=0`) é da Fase 3 e permanece.
 */

const LOSS_PENALTY = 300;

export async function GET(req: Request) {
  try {
    await ensureGymSeeded();

    const { mapId } = parse(
      gymQuerySchema,
      Object.fromEntries(new URL(req.url).searchParams)
    );

    const leaders =
      mapId !== undefined
        ? await db.select().from(gymLeaders).where(eq(gymLeaders.mapId, mapId))
        : await db.select().from(gymLeaders);

    // Insígnias só do usuário dono da sessão — nunca de um id vindo do cliente.
    const sessionUser = await getSessionUser(req);
    const badges = sessionUser
      ? await db
          .select()
          .from(userBadges)
          .where(eq(userBadges.userId, sessionUser.id))
      : [];

    return NextResponse.json({ gymLeaders: leaders, badges });
  } catch (err: unknown) {
    return routeError(err, "gym:list", "Erro ao carregar o Ginásio.");
  }
}

// O `POST {action:"battle_result", won}` foi REMOVIDO na Fase 2.
//
// Ele aceitava o resultado pronto do cliente: bastava um curl com `won: true`
// para ganhar a insígnia e o dinheiro sem lutar — e repetível à vontade.
// Agora a batalha de ginásio corre em /api/battle, e é o servidor que decide
// o resultado, concede a insígnia e credita a recompensa.
