import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPokemon, users } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { battleActionSchema, battleQuerySchema } from "@/lib/validation";
import { parse, publicUser, routeError } from "@/lib/api";
import {
  attack,
  attemptCatch,
  flee,
  getBattle,
  startGymBattle,
  startWildBattle,
  switchPokemon,
} from "@/lib/battle-service";

/**
 * Batalhas (Fase 2).
 *
 * Substitui o modelo em que o cliente calculava o dano, decidia o resultado e
 * mandava `won: true` pronto para o servidor — o que tornava insígnias e
 * dinheiro farmáveis com um único curl.
 *
 * Aqui o servidor é a fonte da verdade em tudo: ordem de turno, dano,
 * efetividade de tipos, XP, level up, rolagem de captura e o resultado do
 * ginásio. O cliente só escolhe a ação e desenha o que vier.
 */

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const { battleId } = parse(
      battleQuerySchema,
      Object.fromEntries(new URL(req.url).searchParams)
    );

    const battle = await getBattle(user.id, battleId);
    return NextResponse.json({ battle });
  } catch (err: unknown) {
    return routeError(err, "battle:get", "Erro ao carregar a batalha.");
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "battle", 60, 60_000);

    const input = parse(battleActionSchema, await req.json().catch(() => ({})));

    let battle;

    switch (input.action) {
      case "start_wild":
        battle = await startWildBattle(user.id, input.mapId, input.playerX, input.playerY);
        break;
      case "start_gym":
        battle = await startGymBattle(user.id, input.gymLeaderId);
        break;
      case "attack":
        battle = await attack(user.id, input.battleId, input.moveIndex);
        break;
      case "switch":
        battle = await switchPokemon(user.id, input.battleId, input.pokemonId);
        break;
      case "catch":
        battle = await attemptCatch(user.id, input.battleId, input.ball);
        break;
      case "flee":
        battle = await flee(user.id, input.battleId);
        break;
    }

    // Devolve o usuário e o time atualizados para a UI refletir XP/HP/dinheiro.
    const [freshUser] = await db.select().from(users).where(eq(users.id, user.id));
    const party = await db
      .select()
      .from(userPokemon)
      .where(eq(userPokemon.userId, user.id));

    return NextResponse.json({
      battle,
      user: freshUser ? publicUser(freshUser) : null,
      party,
    });
  } catch (err: unknown) {
    return routeError(err, "battle:action", "Erro na batalha.");
  }
}

export const dynamic = "force-dynamic";
