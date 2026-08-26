import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { gymLeaders, userBadges, users } from "@/db/schema";
import { ensureGymSeeded } from "@/lib/seed-gym";
import { getSessionUser, requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import {   gymActionSchema, gymQuerySchema   } from "@/lib/validation";
import {   parse, notFound, publicUser, routeError   } from "@/lib/api";

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

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    enforceRateLimit(req, "gym", 20, 60_000);

    const input = parse(gymActionSchema, await req.json().catch(() => ({})));
    const uid = user.id;

    const leaderRows = await db
      .select()
      .from(gymLeaders)
      .where(eq(gymLeaders.id, input.gymLeaderId));

    if (leaderRows.length === 0) throw notFound("Gym leader não encontrado.");
    const gl = leaderRows[0];

    const earned = await db
      .select({ id: userBadges.id })
      .from(userBadges)
      .where(
        and(eq(userBadges.userId, uid), eq(userBadges.gymLeaderId, gl.id))
      );
    const alreadyHasBadge = earned.length > 0;

    // Pré-requisito de insígnias, agora também no servidor.
    const badgeCount = await db
      .select({ id: userBadges.id })
      .from(userBadges)
      .where(eq(userBadges.userId, uid));

    if (badgeCount.length < gl.requiredBadges) {
      return NextResponse.json(
        {
          error: `Você precisa de ${gl.requiredBadges} insígnia(s) para desafiar ${gl.name}. Você tem ${badgeCount.length}.`,
        },
        { status: 403 }
      );
    }

    // ── DERROTA ──────────────────────────────────────────────────────────
    if (!input.won) {
      await db
        .update(users)
        .set({
          losses: sql`${users.losses} + 1`,
          money: sql`GREATEST(0, ${users.money} - ${LOSS_PENALTY})`,
        })
        .where(eq(users.id, uid));

      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, uid));

      return NextResponse.json({
        user: publicUser(updatedUser),
        message: `${gl.name} derrotou você! Perdeu ${LOSS_PENALTY} Pk$.`,
      });
    }

    // ── VITÓRIA ──────────────────────────────────────────────────────────
    await db.transaction(async (tx) => {
      if (!alreadyHasBadge) {
        await tx.insert(userBadges).values({
          userId: uid,
          gymLeaderId: gl.id,
          badgeName: gl.badgeName,
          badgeEmoji: gl.badgeEmoji,
        });
      }

      await tx
        .update(users)
        .set({
          money: sql`${users.money} + ${gl.rewardMoney}`,
          wins: sql`${users.wins} + 1`,
        })
        .where(eq(users.id, uid));
    });

    const badges = await db
      .select()
      .from(userBadges)
      .where(eq(userBadges.userId, uid));
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, uid));

    return NextResponse.json({
      user: publicUser(updatedUser),
      badges,
      newBadge: alreadyHasBadge
        ? null
        : { name: gl.badgeName, emoji: gl.badgeEmoji },
      message: `Você derrotou ${gl.name} e ganhou a Insígnia ${gl.badgeName}! +${gl.rewardMoney} Pk$`,
    });
  } catch (err: unknown) {
    return routeError(err, "gym:battle", "Erro no Ginásio.");
  }
}

export const dynamic = "force-dynamic";
