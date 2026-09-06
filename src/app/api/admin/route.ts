import { NextResponse } from "next/server";
import { and, asc, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  chatMessages,
  gameMaps,
  gymLeaders,
  userBadges,
  userPokemon,
  users,
} from "@/db/schema";
import { ROLES, toRole, type Role } from "@/db/schema";
import { requireRole } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { adminActionSchema } from "@/lib/validation";
import { badRequest, forbidden, notFound, parse, publicUser, routeError } from "@/lib/api";
import { gmCreatePokemon, gmSetLevel } from "@/lib/gm";
import { ensureDefaultMapsSeeded } from "@/lib/seed-maps";
import { ensureGymSeeded } from "@/lib/seed-gym";

/**
 * Painel administrativo (Fase 5 + ferramentas GM de teste).
 *
 * Antes, promover alguém exigia acesso direto ao banco
 * (`npm run db:set-role`) e o papel `moderator` não tinha nenhuma capacidade
 * concreta — existia na hierarquia mas não fazia nada.
 *
 * Hierarquia aplicada aqui:
 *  - `set_role` / `list_staff` / `gm_*` → só `admin`
 *  - `list_chat` / `delete_chat`        → `moderator` ou superior
 *
 * Os comandos `gm_*` são a ferramenta de agilização de testes (o agente não
 * tem navegador; o mantenedor valida no jogo): subir nível, dar Pokémon,
 * dar item, dar dinheiro, curar e teletransportar um treinador. Todos:
 *  - exigem `admin` (moderador não mexe em estado de jogo);
 *  - agem SOMENTE sobre o usuário alvo indicado por username;
 *  - usam a mesma lógica do motor de batalha (`src/lib/gm.ts` reusa
 *    `computeDelugeStats`/`applyEvolution`/`refreshMovesForLevel`);
 *  - são auditados em log (`[gm] quem → alvo → o quê`).
 */

export async function POST(req: Request) {
  try {
    // O gate mínimo é moderator; `set_role`/`list_staff`/`gm_*` refinam para admin.
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
    if (input.action === "delete_chat") {
      const rows = await db
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(eq(chatMessages.id, input.messageId));

      if (rows.length === 0) throw notFound("Mensagem não encontrada.");

      await db.delete(chatMessages).where(eq(chatMessages.id, input.messageId));
      console.info(`[moderação] ${me.username} removeu a mensagem #${input.messageId}`);

      return NextResponse.json({ ok: true, message: "Mensagem removida." });
    }

    // ═══ FERRAMENTAS GM (só admin) ═══════════════════════════════════════
    //
    // A partir daqui tudo exige `admin` e age apenas sobre um alvo por
    // username. O alvo é sempre resolvido com `loadGmTarget`, que também é o
    // ponto único de 404 para treinador inexistente.

    const assertAdmin = () => {
      if (toRole(me.role) !== "admin") {
        throw forbidden("As ferramentas GM exigem papel admin.");
      }
    };

    const loadGmTarget = async (username: string) => {
      const rows = await db.select().from(users).where(eq(users.username, username));
      if (rows.length === 0) throw notFound(`Treinador "${username}" não encontrado.`);
      return rows[0];
    };

    // ── gm_list: visão do alvo (dinheiro, inventário, time + PC Box) ─────
    if (input.action === "gm_list") {
      assertAdmin();
      const target = await loadGmTarget(input.username);

      const pokemon = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, target.id))
        .orderBy(asc(userPokemon.id));

      return NextResponse.json({ user: publicUser(target), pokemon });
    }

    // ── gm_set_level: nível de um Pokémon (id) ou de todo o time ─────────
    if (input.action === "gm_set_level") {
      assertAdmin();
      const target = await loadGmTarget(input.username);

      let rows = await db
        .select()
        .from(userPokemon)
        .where(eq(userPokemon.userId, target.id));

      if (input.pokemonId !== undefined) {
        rows = rows.filter((p) => p.id === input.pokemonId);
        if (rows.length === 0) {
          throw notFound(`Pokémon id ${input.pokemonId} não pertence a ${target.username}.`);
        }
      }
      if (rows.length === 0) throw badRequest(`${target.username} não tem nenhum Pokémon.`);

      // Calcula tudo ANTES de tocar no banco: qualquer espécie inválida já
      // gravada vira erro 400 sem alteração parcial.
      const results = rows.map((row) => {
        try {
          return { id: row.id, ...gmSetLevel(row, input.level) };
        } catch {
          throw badRequest(
            `Falha ao processar ${row.name} (id ${row.id}): espécie fora da Pokédex.`
          );
        }
      });

      await db.transaction(async (tx) => {
        for (const r of results) {
          await tx
            .update(userPokemon)
            .set({
              pokedexId: r.pokedexId,
              name: r.name,
              level: r.level,
              xp: r.xp,
              xpToNextLevel: r.xpToNextLevel,
              hp: r.hp,
              maxHp: r.maxHp,
              attack: r.attack,
              defense: r.defense,
              spAttack: r.spAttack,
              spDefense: r.spDefense,
              speed: r.speed,
              move1: r.move1,
              move2: r.move2,
              move3: r.move3,
              move4: r.move4,
            })
            .where(eq(userPokemon.id, r.id));
        }
      });

      const evolucoes = results
        .filter((r) => r.evolved)
        .map((r) => `${r.evolved!.fromName}→${r.evolved!.toName}`);
      console.info(
        `[gm] ${me.username} → ${target.username}: nível ${input.level} em ${rows.length} Pokémon` +
          (evolucoes.length ? ` (evoluíram: ${evolucoes.join(", ")})` : "")
      );

      return NextResponse.json({
        target: target.username,
        level: input.level,
        updated: results.map(({ id, name, pokedexId, evolved, newMoves }) => ({
          id,
          name,
          pokedexId,
          evolved,
          newMoves,
        })),
      });
    }

    // ── gm_give_pokemon: dá uma espécie no time (ou PC Box se cheio) ─────
    if (input.action === "gm_give_pokemon") {
      assertAdmin();
      const target = await loadGmTarget(input.username);

      let payload;
      try {
        payload = gmCreatePokemon(
          input.pokedexId,
          input.level,
          input.variant,
          input.nickname ?? null
        );
      } catch {
        throw badRequest(`Espécie desconhecida na Pokédex (id ${input.pokedexId}).`);
      }

      const party = await db
        .select({ id: userPokemon.id })
        .from(userPokemon)
        .where(and(eq(userPokemon.userId, target.id), isNotNull(userPokemon.partySlot)));
      const partySlot = party.length < 6 ? party.length + 1 : null;

      const [row] = await db
        .insert(userPokemon)
        .values({ userId: target.id, ...payload, partySlot })
        .returning();

      console.info(
        `[gm] ${me.username} → ${target.username}: ${payload.name} (id ${payload.pokedexId}) nv ${payload.level}` +
          ` em ${partySlot ? `time (slot ${partySlot})` : "PC Box"}` +
          (payload.evolvedFrom ? ` [pedido como ${payload.evolvedFrom}]` : "")
      );

      return NextResponse.json({
        pokemon: row,
        placement: partySlot ? `time (slot ${partySlot})` : "PC Box",
        evolvedFrom: payload.evolvedFrom,
      });
    }

    // ── gm_give_item: creditar item de inventário ────────────────────────
    if (input.action === "gm_give_item") {
      assertAdmin();
      const target = await loadGmTarget(input.username);
      const { item, quantity } = input;

      await db
        .update(users)
        .set({ [item]: sql`${users[item]} + ${quantity}` })
        .where(eq(users.id, target.id));

      const [updated] = await db.select().from(users).where(eq(users.id, target.id));
      console.info(`[gm] ${me.username} → ${target.username}: +${quantity} ${item}`);

      return NextResponse.json({
        user: publicUser(updated),
        message: `+${quantity} ${item} para ${target.username}.`,
      });
    }

    // ── gm_give_money: creditar dinheiro ─────────────────────────────────
    if (input.action === "gm_give_money") {
      assertAdmin();
      const target = await loadGmTarget(input.username);

      await db
        .update(users)
        .set({ money: sql`${users.money} + ${input.amount}` })
        .where(eq(users.id, target.id));

      const [updated] = await db.select().from(users).where(eq(users.id, target.id));
      console.info(`[gm] ${me.username} → ${target.username}: +${input.amount} de dinheiro`);

      return NextResponse.json({
        user: publicUser(updated),
        message: `+${input.amount} de dinheiro para ${target.username} (total: ${updated.money}).`,
      });
    }

    // ── gm_heal: curar todo o time + PC Box (idem Centro Pokémon) ─────────
    if (input.action === "gm_heal") {
      assertAdmin();
      const target = await loadGmTarget(input.username);

      const healed = await db
        .update(userPokemon)
        .set({ hp: sql`${userPokemon.maxHp}` })
        .where(eq(userPokemon.userId, target.id))
        .returning({ id: userPokemon.id });

      console.info(`[gm] ${me.username} → ${target.username}: time curado (${healed.length} Pokémon)`);

      return NextResponse.json({
        ok: true,
        message: `Equipe de ${target.username} curada 100% (${healed.length} Pokémon).`,
      });
    }

    // ── gm_teleport: mover o treinador para um mapa (x/y = centro) ───────
    if (input.action === "gm_teleport") {
      assertAdmin();
      const target = await loadGmTarget(input.username);

      // Banco recém-criado ainda sem mapas: semeia os padrão (idempotente) —
      // o mesmo que o GET /api/maps faz.
      await ensureDefaultMapsSeeded();

      const maps = await db
        .select()
        .from(gameMaps)
        .where(eq(gameMaps.id, input.mapId));
      if (maps.length === 0) throw notFound(`Mapa ${input.mapId} não encontrado.`);
      const map = maps[0];

      const x = input.x ?? Math.floor(map.width / 2);
      const y = input.y ?? Math.floor(map.height / 2);
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
        throw badRequest(
          `Posição (${x},${y}) fora do mapa "${map.name}" (${map.width}×${map.height}).`
        );
      }

      await db
        .update(users)
        .set({ currentMapId: map.id, playerX: x, playerY: y })
        .where(eq(users.id, target.id));

      console.info(
        `[gm] ${me.username} → ${target.username}: teleportado para "${map.name}" (id ${map.id}) em (${x},${y})`
      );

      return NextResponse.json({
        target: target.username,
        map: { id: map.id, name: map.name },
        x,
        y,
      });
    }

    // ── gm_give_badge: conceder insígnia (desbloqueia pré-requisito) ─────
    if (input.action === "gm_give_badge") {
      assertAdmin();
      const target = await loadGmTarget(input.username);

      // Banco recém-criado ainda sem ginásios: semeia os três padrão
      // (idempotente) — o mesmo que o GET /api/gym faz no jogo.
      await ensureGymSeeded();

      const gyms = await db
        .select()
        .from(gymLeaders)
        .where(eq(gymLeaders.id, input.gymLeaderId));
      if (gyms.length === 0) throw notFound(`Líder de ginásio ${input.gymLeaderId} não encontrado.`);
      const gym = gyms[0];

      await db
        .insert(userBadges)
        .values({
          userId: target.id,
          gymLeaderId: gym.id,
          badgeName: gym.badgeName,
          badgeEmoji: gym.badgeEmoji,
        })
        .onConflictDoNothing({ target: [userBadges.userId, userBadges.gymLeaderId] });

      const badges = await db
        .select({ id: userBadges.id })
        .from(userBadges)
        .where(eq(userBadges.userId, target.id));

      console.info(
        `[gm] ${me.username} → ${target.username}: insígnia de ${gym.name} (total: ${badges.length})`
      );

      return NextResponse.json({
        target: target.username,
        badge: `${gym.badgeEmoji} ${gym.badgeName}`,
        badges: badges.length,
      });
    }

    // Ação desconhecida (não bateu em nenhum branch discriminado).
    throw badRequest("Ação não reconhecida.");
  } catch (err: unknown) {
    return routeError(err, "admin", "Erro na administração.");
  }
}

export const dynamic = "force-dynamic";
