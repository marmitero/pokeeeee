import { NextResponse } from "next/server";
import { db } from "@/db";
import { gymLeaders, userBadges, users, userPokemon } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureGymSeeded } from "@/lib/seed-gym";

export async function GET(req: Request) {
  await ensureGymSeeded();
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  const userId = searchParams.get("userId");

  const leaders = mapId
    ? await db.select().from(gymLeaders).where(eq(gymLeaders.mapId, Number(mapId)))
    : await db.select().from(gymLeaders);

  const badges = userId
    ? await db.select().from(userBadges).where(eq(userBadges.userId, Number(userId)))
    : [];

  return NextResponse.json({ gymLeaders: leaders, badges });
}

export async function POST(req: Request) {
  try {
    await ensureGymSeeded();
    const body = await req.json();
    const { action, userId, gymLeaderId } = body;

    if (action === "battle_result") {
      const { won } = body;
      const uid = Number(userId);
      const gid = Number(gymLeaderId);

      const leader = await db.select().from(gymLeaders).where(eq(gymLeaders.id, gid));
      if (!leader.length) return NextResponse.json({ error: "Gym leader não encontrado" }, { status: 404 });

      const gl = leader[0];

      // Check if already has badge
      const existing = await db.select().from(userBadges).where(
        and(eq(userBadges.userId, uid), eq(userBadges.gymLeaderId, gid))
      );

      const uRows = await db.select().from(users).where(eq(users.id, uid));
      if (!uRows.length) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      const u = uRows[0];

      if (won) {
        // Award badge if not already earned
        if (!existing.length) {
          await db.insert(userBadges).values({
            userId: uid,
            gymLeaderId: gid,
            badgeName: gl.badgeName,
            badgeEmoji: gl.badgeEmoji,
          });
        }

        // Give reward money
        await db.update(users).set({
          money: u.money + gl.rewardMoney,
          wins: u.wins + 1,
        }).where(eq(users.id, uid));

        const allBadges = await db.select().from(userBadges).where(eq(userBadges.userId, uid));
        const updatedUser = await db.select().from(users).where(eq(users.id, uid));

        return NextResponse.json({
          user: updatedUser[0],
          badges: allBadges,
          newBadge: existing.length === 0 ? { name: gl.badgeName, emoji: gl.badgeEmoji } : null,
          message: won
            ? `Você derrotou ${gl.name} e ganhou a Insígnia ${gl.badgeName}! +${gl.rewardMoney} Pk$`
            : `${gl.name} derrotou você...`,
        });
      } else {
        // Lost - penalty
        await db.update(users).set({
          losses: u.losses + 1,
          money: Math.max(0, u.money - 300),
        }).where(eq(users.id, uid));

        const updatedUser = await db.select().from(users).where(eq(users.id, uid));
        return NextResponse.json({
          user: updatedUser[0],
          message: `${gl.name} derrotou você! Perdeu 300 Pk$.`,
        });
      }
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no Ginásio";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
