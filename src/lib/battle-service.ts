import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { battles, bossFights, gameMaps, gymLeaders, userBadges, userPokemon, users } from "@/db/schema";
import {
  computeDelugeStats,
  getPokemonSpecies,
  rollRandomDelugeVariant,
  type DelugeVariant,
} from "@/lib/pokedex";
import { chooseOpponentMove, endOfTurn, performStrike } from "@/lib/engine/turn";
import { STATUS_NOUN, effectiveSpeed, normalizeStatus } from "@/lib/engine/status";
import { STATUS_ITEMS, itemCures, statusItemByUseKey } from "@/lib/status-items";
import type { BattleItem } from "@/lib/validation";
import {
  encounterPoolAt,
  hasEncounterAt,
  isWalkableAt,
  pickWeighted,
  rollEncounterLevel,
} from "@/lib/map-rules";
import {
  moveNamesForDb,
  refreshMovesForLevel,
  sideFromSpecies,
  sideFromUserPokemon,
  type SideState,
} from "@/lib/engine/combatant";
import { applyXp, battleXpGain, xpToNextLevel, MAX_LEVEL } from "@/lib/engine/xp";
import { rollStoneDrop } from "@/lib/engine/drops";
import { EVOLUTION_ITEM_LABEL } from "@/lib/evolution-items";
import {
  BOSS_DAILY_ATTEMPTS,
  BOSS_LEGENDARY_CHANCE,
  bossFor,
  bossMoneyForLevel,
  dayIdOf,
  isBossArena,
  weekIdOf,
  type BossArena,
} from "@/lib/boss-rotation";
import { applyEvolution } from "@/lib/engine/evolution";
import { BALL_LABEL, captureChance, rollCapture, type BallKey } from "@/lib/engine/capture";
import { badRequest, forbidden, notFound } from "@/lib/api";
import { ensureDefaultMapsSeeded } from "@/lib/seed-maps";
import { ensureGymSeeded } from "@/lib/seed-gym";

/**
 * Motor de batalha autoritativo (Fase 2).
 *
 * Toda regra que antes vivia no cliente agora é resolvida aqui: ordem de turno,
 * dano, efetividade de tipos, XP, level up, captura e o resultado do ginásio.
 * O cliente só escolhe uma ação e desenha o que o servidor devolver.
 */

export type BattleStatus = "ACTIVE" | "WON" | "LOST" | "FLED" | "CAUGHT";

export interface BattleState {
  player: SideState;
  opponent: SideState;
  turn: number;
  log: string[];
  /** Restante do time do líder (ginásio). */
  gymQueue: Array<{ pokedexId: number; level: number; variant: DelugeVariant }>;
  gymLeaderId: number | null;
  /** Linha de `boss_fights` (arena) — null fora da Arena Boss. */
  bossFightId: number | null;
}

export interface BattleView {
  id: number;
  kind: string;
  status: string;
  state: BattleState;
  /** Recompensas concedidas no último turno (para a UI exibir). */
  rewards?: {
    xp?: number;
    levelsGained?: number;
    money?: number;
    badge?: string;
    stone?: string;
    /** Vitória no boss: há uma pedra à escolha para retirar (`claim_stone`). */
    bossStoneChoice?: boolean;
    /** Nome do lendário nv 5 ganho no 1/1200 (quando acontece). */
    bossLegendary?: string;
  };
  party?: unknown[];
  user?: unknown;
}

const MAX_LOG = 40;

function pushLog(log: string[], ...lines: string[]): string[] {
  return [...log, ...lines].slice(-MAX_LOG);
}

function totalBaseStats(pokedexId: number): number {
  const s = getPokemonSpecies(pokedexId);
  return s.baseHp + s.baseAtk + s.baseDef + s.baseSpAtk + s.baseSpDef + s.baseSpd;
}

/** Dinheiro por vitória selvagem: escala com o nível do oponente. */
function wildWinMoney(opponentLevel: number): number {
  return Math.floor(opponentLevel * 12 + 40);
}

// ─── Início de batalha ────────────────────────────────────────────────────

async function loadActivePokemon(userId: number) {
  const party = await db
    .select()
    .from(userPokemon)
    .where(and(eq(userPokemon.userId, userId), isNotNull(userPokemon.partySlot)));

  if (party.length === 0) {
    throw badRequest("Você não tem nenhum Pokémon no time.");
  }

  const ordered = party.sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99));
  const firstAlive = ordered.find((p) => p.hp > 0);
  if (!firstAlive) {
    throw badRequest("Toda a sua equipe está desmaiada. Cure-a num Centro Pokémon (✚).");
  }
  return firstAlive;
}

/**
 * Batalha selvagem. O encontro é sorteado **aqui**, a partir da tabela do mapa.
 *
 * `playerX`/`playerY` vêm do cliente, mas são validados contra as camadas
 * gravadas no mapa (Fase 6.2-A): a célula precisa ser ocupável **e** estar na
 * área de caça. O cliente poderia escolher outra célula de caça do mesmo mapa
 * — o que não dá vantagem, porque a tabela de encontros é a mesma no mapa.
 */
export async function startWildBattle(
  userId: number,
  mapId: number,
  playerX: number,
  playerY: number
): Promise<BattleView> {
  // Garante o seed antes de ler. Sem isso, chamar start_wild antes de
  // GET /api/maps devolve "Mapa não encontrado" num banco recém-criado —
  // o mesmo padrão do bug da loja corrigido na Fase 5.
  await ensureDefaultMapsSeeded();

  const maps = await db.select().from(gameMaps).where(eq(gameMaps.id, mapId));
  if (maps.length === 0) throw notFound("Mapa não encontrado.");
  const map = maps[0];

  // Fase 6.2-A: quem responde "dá para estar aqui?" e "aqui aparece bicho?" é
  // `map-rules`, a partir das camadas gravadas no mapa. O cliente não informa
  // tile nem espécie — continua valendo a autoridade do servidor da Fase 2.
  if (!isWalkableAt(map, playerX, playerY)) {
    throw badRequest("Não dá para estar nesse tile.");
  }
  if (!hasEncounterAt(map, playerX, playerY)) {
    throw badRequest("Não há encontros nesse tile.");
  }

  const usable = encounterPoolAt(map, playerX, playerY);
  if (usable.length === 0) throw badRequest("Este mapa não tem Pokémon selvagens.");

  const chosen = pickWeighted(usable);
  if (!chosen) throw badRequest("Este mapa não tem Pokémon selvagens.");

  const level = rollEncounterLevel(chosen, MAX_LEVEL);
  const variant = rollRandomDelugeVariant();

  const active = await loadActivePokemon(userId);
  const opponent = sideFromSpecies(chosen.pokedexId, level, variant);

  const state: BattleState = {
    player: sideFromUserPokemon(active),
    opponent,
    turn: 1,
    log: [
      `Um ${variant !== "Normal" ? `★ ${variant} ` : ""}${opponent.name} selvagem (LV. ${level}) saltou do matinho!`,
    ],
    gymQueue: [],
    gymLeaderId: null,
    bossFightId: null,
  };

  const [battle] = await db
    .insert(battles)
    .values({
      userId,
      kind: "wild",
      mapId,
      activePokemonId: active.id,
      state: state as unknown as Record<string, unknown>,
      status: "ACTIVE",
    })
    .returning();

  // A posição passa a ser a real, já que o encontro foi validado nela.
  await db
    .update(users)
    .set({ currentMapId: mapId, playerX, playerY })
    .where(eq(users.id, userId));

  return view(battle);
}

/** Batalha de ginásio. */
export async function startGymBattle(
  userId: number,
  gymLeaderId: number
): Promise<BattleView> {
  // Idem: garante o seed antes de procurar o líder.
  await ensureGymSeeded();

  const leaders = await db.select().from(gymLeaders).where(eq(gymLeaders.id, gymLeaderId));
  if (leaders.length === 0) throw notFound("Líder de ginásio não encontrado.");
  const leader = leaders[0];

  // Pré-requisito de insígnias, no servidor.
  const badges = await db
    .select({ id: userBadges.id })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  if (badges.length < leader.requiredBadges) {
    throw forbidden(
      `Você precisa de ${leader.requiredBadges} insígnia(s) para desafiar ${leader.name}. Você tem ${badges.length}.`
    );
  }

  const team = (leader.team ?? []) as Array<{
    pokedexId: number;
    level: number;
    variant?: DelugeVariant;
  }>;
  if (team.length === 0) throw badRequest("Este ginásio não tem time configurado.");

  const active = await loadActivePokemon(userId);
  const [first, ...rest] = team;
  const opponent = sideFromSpecies(first.pokedexId, first.level, first.variant ?? "Normal");

  const state: BattleState = {
    player: sideFromUserPokemon(active),
    opponent,
    turn: 1,
    log: [
      `${leader.name} desafiou você!`,
      `${leader.name} enviou ${opponent.name} (LV. ${opponent.level})!`,
    ],
    gymQueue: rest.map((m) => ({
      pokedexId: m.pokedexId,
      level: m.level,
      variant: m.variant ?? ("Normal" as DelugeVariant),
    })),
    gymLeaderId: leader.id,
    bossFightId: null,
  };

  const [battle] = await db
    .insert(battles)
    .values({
      userId,
      kind: "gym",
      gymLeaderId: leader.id,
      activePokemonId: active.id,
      state: state as unknown as Record<string, unknown>,
      status: "ACTIVE",
    })
    .returning();

  return view(battle);
}

/**
 * Batalha da Arena Boss (Etapa C, 8.3).
 *
 * Regras (espec do mantenedor): 2 tentativas por dia por arena; vitória trava
 * a semana naquela arena; derrota pode tentar de novo. O boss (espécie + nv
 * 80–100) vem de `bossFor` — determinístico, calculado aqui, nunca do cliente.
 * A tentativa é registrada no início (fugir/desconectar não devolve).
 */
export async function startBossBattle(
  userId: number,
  arenaMapId: number
): Promise<BattleView> {
  if (!isBossArena(arenaMapId)) {
    throw badRequest("Arena Boss inexistente.");
  }
  // Garante que game_maps existe (mesmo padrão de startWild/startGym).
  // Em produção, após a renumeração dos ids, o workflow World activation
  // recria os 40 mapas — mas se o banco estiver vazio (teste) ou se a
  // FK de battles.map_id for validada, o SELECT de mapas precisa existir.
  await ensureDefaultMapsSeeded();
  const arena = arenaMapId as BossArena;
  const now = new Date();
  const weekId = weekIdOf(now);
  const day = dayIdOf(now);
  const boss = bossFor(arena, now);

  const active = await loadActivePokemon(userId);
  const opponent = sideFromSpecies(boss.pokedexId, boss.level, "Normal");

  // Transação com lock nas linhas do jogador: dois cliques simultâneos não
  // furam o limite diário (o segundo espera o primeiro e reconta).
  const battle = await db.transaction(async (tx) => {
    const mine = await tx
      .select()
      .from(bossFights)
      .where(
        and(
          eq(bossFights.userId, userId),
          eq(bossFights.arenaMapId, arena),
          eq(bossFights.weekId, weekId)
        )
      )
      .for("update");

    if (mine.some((f) => f.status === "WON")) {
      throw badRequest("Você já venceu esta arena nesta semana. Volte segunda-feira!");
    }
    const today = mine.filter((f) => f.day === day);
    if (today.length >= BOSS_DAILY_ATTEMPTS) {
      throw badRequest(
        `Você já enfrentou este lendário ${BOSS_DAILY_ATTEMPTS} vezes hoje. Volte amanhã!`
      );
    }

    const [fight] = await tx
      .insert(bossFights)
      .values({
        userId,
        arenaMapId: arena,
        weekId,
        day,
        status: "ACTIVE",
        bossPokedexId: boss.pokedexId,
        bossLevel: boss.level,
      })
      .returning();

    const state: BattleState = {
      player: sideFromUserPokemon(active),
      opponent,
      turn: 1,
      log: [
        `⚔️ A Arena Boss ruge! Um ${opponent.name} selvagem (LV. ${boss.level}) desce à arena!`,
        "Vença para ganhar Pk$, uma pedra de evolução à sua escolha e uma chance no lendário!",
      ],
      gymQueue: [],
      gymLeaderId: null,
      bossFightId: fight!.id,
    };

    const [created] = await tx
      .insert(battles)
      .values({
        userId,
        kind: "boss",
        mapId: arena,
        activePokemonId: active.id,
        state: state as unknown as Record<string, unknown>,
        status: "ACTIVE",
      })
      .returning();
    return created!;
  });

  return view(battle);
}

/** Sorteio do lendário nv 5 (1/1200). `rand` injetável para teste. */
export function rollBossLegendary(rand: () => number = Math.random): boolean {
  return rand() < BOSS_LEGENDARY_CHANCE;
}

// ─── Turno ────────────────────────────────────────────────────────────────

export async function attack(
  userId: number,
  battleId: number,
  moveIndex: number
): Promise<BattleView> {
  const { battle, state } = await loadActive(userId, battleId);

  const move = state.player.moves[moveIndex];
  if (!move) throw badRequest("Golpe inválido.");

  const rewards: BattleView["rewards"] = {};
  const { log, status } = await runRound(state, userId, rewards, { kind: "move", move });

  state.log = log;
  state.turn += 1;

  await persistTurn(userId, battle.id, state, status);

  return { ...view(await reload(battle.id)), rewards };
}

/**
 * Ação do jogador num turno: um golpe, ou um item (8.4) — o item é aplicado
 * antes de o oponente agir, como no GBA, e consome o turno.
 */
type PlayerAction =
  | { kind: "move"; move: SideState["moves"][number] }
  | { kind: "item"; apply: (log: string[]) => string[] };

/**
 * Um turno completo (Fase 8.4): ordem pela velocidade **efetiva** (paralisia
 * ×0,25), golpes via `performStrike` (sono/gelo/paralisia, efeitos de status,
 * descongelar), desmaios entre as ações e o dano residual de veneno/queimadura
 * **depois** de os dois agirem (Gen III). Item do jogador sempre vai primeiro.
 */
async function runRound(
  state: BattleState,
  userId: number,
  rewards: NonNullable<BattleView["rewards"]>,
  action: PlayerAction
): Promise<{ log: string[]; status: BattleStatus }> {
  let log = state.log;

  const playerSpeed = effectiveSpeed(state.player);
  const opponentSpeed = effectiveSpeed(state.opponent);
  const playerFirst =
    action.kind === "item" ||
    (playerSpeed > opponentSpeed ? true : playerSpeed < opponentSpeed ? false : Math.random() < 0.5);

  const actPlayer = (): void => {
    if (action.kind === "item") {
      log = action.apply(log);
      return;
    }
    const r = performStrike(state.player, state.opponent, action.move);
    log = pushLog(log, ...r.log);
  };
  const actOpponent = (): void => {
    const oppMove = chooseOpponentMove(state.opponent, state.player);
    const r = performStrike(state.opponent, state.player, oppMove);
    log = pushLog(log, ...r.log);
  };

  // ── Primeira ação ──────────────────────────────────────────────────────
  if (playerFirst) actPlayer(); else actOpponent();

  let outcome = await resolveFaint(playerFirst ? "opponent" : "player", state, log, rewards, userId);
  log = outcome.log;
  if (!outcome.continue) return { log, status: outcome.status };

  // ── Segunda ação, se ambos seguem de pé ────────────────────────────────
  if (state.player.hp > 0 && state.opponent.hp > 0) {
    if (playerFirst) actOpponent(); else actPlayer();

    outcome = await resolveFaint(playerFirst ? "player" : "opponent", state, log, rewards, userId);
    log = outcome.log;
    if (!outcome.continue) return { log, status: outcome.status };
  }

  // ── Fim de turno: veneno / queimadura (mais rápido primeiro) ───────────
  const order = playerFirst ? [state.player, state.opponent] : [state.opponent, state.player];
  const residual = endOfTurn(order);
  log = pushLog(log, ...residual.log);

  for (const side of residual.fainted) {
    outcome = await resolveFaint(side === state.player ? "player" : "opponent", state, log, rewards, userId);
    log = outcome.log;
    if (!outcome.continue) return { log, status: outcome.status };
  }

  return { log, status: "ACTIVE" };
}

// ─── Item em batalha (8.4) ─────────────────────────────────────────────────

const BATTLE_POTION: Record<string, { column: "potions" | "superPotions" | "maxPotions"; label: string; heal: number | "max" }> = {
  potion: { column: "potions", label: "Poção", heal: 20 },
  superPotion: { column: "superPotions", label: "Super Poção", heal: 50 },
  maxPotion: { column: "maxPotions", label: "Hiper Poção", heal: "max" },
};

/**
 * Usa um item no Pokémon ativo durante a batalha. Regras do GBA: o item age
 * antes do oponente e **gasta o turno** — o oponente ataca em seguida. Só
 * poções e curas de status (`BATTLE_ITEM_VALUES`); o débito é atômico e
 * acontece antes de qualquer efeito, como nas bolas.
 */
export async function applyBattleItem(
  userId: number,
  battleId: number,
  item: BattleItem
): Promise<BattleView> {
  const { battle, state } = await loadActive(userId, battleId);
  const me = state.player;

  const potion = BATTLE_POTION[item];
  const cureKey = statusItemByUseKey(item);
  const column = potion ? potion.column : cureKey;
  if (!column) throw badRequest("Item inválido.");

  const label = potion ? potion.label : STATUS_ITEMS[cureKey!].name;

  // Valida o efeito ANTES de debitar: item sem efeito não é consumido nem gasta turno.
  let apply: (log: string[]) => string[];
  if (potion) {
    if (me.hp >= me.maxHp) throw badRequest(`${me.displayName} já está com o HP cheio!`);
    apply = (log) => {
      const before = me.hp;
      me.hp = potion.heal === "max" ? me.maxHp : Math.min(me.maxHp, me.hp + potion.heal);
      return pushLog(log, `Você usou ${label}! ${me.displayName} recuperou ${me.hp - before} de HP.`);
    };
  } else {
    const spec = STATUS_ITEMS[cureKey!];
    const cures = itemCures(cureKey!, me.status);
    const fillsHp = Boolean(spec.fullHp) && me.hp < me.maxHp;
    if (!cures && !fillsHp) {
      throw badRequest(
        me.status === "NONE"
          ? `${me.displayName} não tem nenhum problema de status!`
          : `${spec.name} não cura ${STATUS_NOUN[me.status]}!`
      );
    }
    apply = (log) => {
      const parts = [`Você usou ${label}!`];
      if (cures && me.status !== "NONE") {
        parts.push(`${me.displayName} se curou de ${STATUS_NOUN[me.status]}!`);
        me.status = "NONE";
        me.statusTurns = 0;
      }
      if (fillsHp) {
        me.hp = me.maxHp;
        parts.push("HP restaurado por completo.");
      }
      return pushLog(log, parts.join(" "));
    };
  }

  const deducted = await db
    .update(users)
    .set({ [column]: sql`${users[column]} - 1` })
    .where(and(eq(users.id, userId), sql`${users[column]} > 0`))
    .returning({ id: users.id });
  if (deducted.length === 0) throw badRequest(`Você não possui ${label}.`);

  const rewards: BattleView["rewards"] = {};
  const { log, status } = await runRound(state, userId, rewards, { kind: "item", apply });

  state.log = log;
  state.turn += 1;
  await persistTurn(userId, battle.id, state, status);

  return { ...view(await reload(battle.id)), rewards };
}

interface FaintOutcome {
  log: string[];
  status: BattleStatus;
  continue: boolean;
}

/**
 * Trata um desmaio: concede XP/nível/dinheiro se foi o oponente, avança o time
 * do ginásio, ou encerra a batalha se foi o jogador.
 */
async function resolveFaint(
  who: "player" | "opponent",
  state: BattleState,
  logIn: string[],
  rewards: NonNullable<BattleView["rewards"]>,
  userId: number
): Promise<FaintOutcome> {
  let log = logIn;

  if (who === "player") {
    if (state.player.hp > 0) return { log, status: "ACTIVE", continue: true };

    log = pushLog(log, `${state.player.displayName} desmaiou!`);

    if (state.bossFightId !== null) {
      await db
        .update(bossFights)
        .set({ status: "LOST", updatedAt: new Date() })
        .where(and(eq(bossFights.id, state.bossFightId), eq(bossFights.userId, userId)));
      log = pushLog(log, "O lendário te derrotou… a arena espera sua volta.");
      return { log, status: "LOST", continue: false };
    }

    if (state.gymLeaderId !== null) {
      log = pushLog(log, "Você perdeu a batalha de ginásio.");
      return { log, status: "LOST", continue: false };
    }

    log = pushLog(
      log,
      "Você voltou para a base. Cure sua equipe num Centro Pokémon (✚)."
    );
    return { log, status: "LOST", continue: false };
  }

  // Oponente desmaiou.
  if (state.opponent.hp > 0) return { log, status: "ACTIVE", continue: true };

  log = pushLog(log, `${state.opponent.displayName} desmaiou!`);

  const species = getPokemonSpecies(state.opponent.pokedexId);

  // ── XP e level up (bug B5) ─────────────────────────────────────────────
  const gain = battleXpGain(
    totalBaseStats(state.opponent.pokedexId),
    state.opponent.level,
    state.player.level
  );

  // O XP ACUMULA: parte do xp atual do Pokémon, não de zero.
  const outcome = applyXp(state.player.level, state.player.xp, gain);
  state.player.xp = outcome.newXp;
  rewards.xp = gain;
  rewards.levelsGained = outcome.levelsGained;
  log = pushLog(
    log,
    `${state.player.displayName} ganhou ${gain} de XP! (${outcome.newXp}/${outcome.newXpToNext} para o próximo nível)`
  );

  if (outcome.levelsGained > 0) {
    const newLevel = outcome.newLevel;
    const stats = computeDelugeStats(
      speciesOf(state.player.pokedexId),
      newLevel,
      state.player.variant as DelugeVariant
    );

    state.player.level = newLevel;
    state.player.maxHp = stats.maxHp;
    state.player.hp = Math.min(stats.maxHp, state.player.hp + (stats.maxHp - state.player.maxHp > 0 ? stats.maxHp - state.player.maxHp : 0));
    state.player.hp = Math.max(1, Math.min(stats.maxHp, state.player.hp));
    state.player.attack = stats.attack;
    state.player.defense = stats.defense;
    state.player.spAttack = stats.spAttack;
    state.player.spDefense = stats.spDefense;
    state.player.speed = stats.speed;

    log = pushLog(
      log,
      `★ ${state.player.displayName} subiu para o nível ${newLevel}!`
    );

    // Fase 6.1: subir de nível também ensina os golpes do learnset. Sem isto
    // o Pokémon ficaria preso nos golpes fracos do nível inicial.
    const learned = refreshMovesForLevel(state.player, newLevel);
    for (const moveName of learned) {
      log = pushLog(log, `${state.player.displayName} aprendeu ${moveName}!`);
    }

    // ── Fase 6.3: evolução por nível ──────────────────────────────────────
    // Avaliada aqui, no servidor, dentro do level up — nunca por chamada do
    // cliente. Stats recalculados pela nova espécie preservando o percentual
    // de HP; apelido mantido; tipos trocam já nesta batalha; golpes são
    // rederivados do learnset da forma nova.
    const evolution = applyEvolution(state.player);
    if (evolution) {
      log = pushLog(
        log,
        `★ O quê?! ${evolution.fromName} está evoluindo!… evoluiu para ${evolution.toName}!`
      );
      const aprendidosNaEvolucao = refreshMovesForLevel(state.player, state.player.level);
      for (const moveName of aprendidosNaEvolucao) {
        log = pushLog(log, `${state.player.displayName} aprendeu ${moveName}!`);
      }
    }
  }

  // ── Ginásio: próximo do time ───────────────────────────────────────────
  if (state.gymQueue.length > 0) {
    const next = state.gymQueue.shift()!;
    state.opponent = sideFromSpecies(next.pokedexId, next.level, next.variant);
    log = pushLog(log, `O oponente enviou ${state.opponent.name} (LV. ${state.opponent.level})!`);
    return { log, status: "ACTIVE", continue: false };
  }

  // ── Ginásio: vitória definitiva (decidida AQUI, não pelo cliente) ──────
  if (state.gymLeaderId !== null) {
    const leaders = await db
      .select()
      .from(gymLeaders)
      .where(eq(gymLeaders.id, state.gymLeaderId));
    const leader = leaders[0];

    const already = await db
      .select({ id: userBadges.id })
      .from(userBadges)
      .where(
        and(eq(userBadges.userId, userId), eq(userBadges.gymLeaderId, leader.id))
      );

    await db.transaction(async (tx) => {
      if (already.length === 0) {
        await tx.insert(userBadges).values({
          userId,
          gymLeaderId: leader.id,
          badgeName: leader.badgeName,
          badgeEmoji: leader.badgeEmoji,
        });
      }
      await tx
        .update(users)
        .set({
          money: sql`${users.money} + ${leader.rewardMoney}`,
          wins: sql`${users.wins} + 1`,
        })
        .where(eq(users.id, userId));
    });

    rewards.money = leader.rewardMoney;
    if (already.length === 0) rewards.badge = leader.badgeName;

    log = pushLog(
      log,
      leader.winDialog,
      already.length === 0
        ? `Você conquistou a ${leader.badgeName}! +${leader.rewardMoney} Pk$`
        : `+${leader.rewardMoney} Pk$`
    );
    return { log, status: "WON", continue: false };
  }

  // ── Arena Boss: vitória definitiva ───────────────────────────────────────
  if (state.bossFightId !== null) {
    const money = bossMoneyForLevel(state.opponent.level);
    const gotLegendary = rollBossLegendary();

    await db.transaction(async (tx) => {
      await tx
        .update(bossFights)
        .set({
          status: "WON",
          legendaryGranted: gotLegendary,
          updatedAt: new Date(),
        })
        .where(and(eq(bossFights.id, state.bossFightId!), eq(bossFights.userId, userId)));
      await tx
        .update(users)
        .set({
          money: sql`${users.money} + ${money}`,
          wins: sql`${users.wins} + 1`,
        })
        .where(eq(users.id, userId));
    });

    rewards.money = money;
    rewards.bossStoneChoice = true;
    log = pushLog(
      log,
      `🏆 VITÓRIA NA ARENA! +${money} Pk$ — e uma pedra de evolução à sua escolha te espera!`
    );

    if (gotLegendary) {
      const granted = await grantBossLegendary(userId, state.opponent.pokedexId);
      rewards.bossLegendary = granted;
      log = pushLog(
        log,
        `✨✨✨ MILAGRE DE 1 EM 1200! O ${state.opponent.name} se juntou a você (NV. 5)! ✨✨✨`
      );
    }
    return { log, status: "WON", continue: false };
  }

  // ── Selvagem: vitória ──────────────────────────────────────────────────
  const money = wildWinMoney(state.opponent.level);

  // ── Etapa C (8.1): drop de pedra de evolução (nv 40+, 0,2%) ─────────────
  const stone = rollStoneDrop(state.opponent.level);
  if (stone) {
    await db
      .update(users)
      .set({
        money: sql`${users.money} + ${money}`,
        wins: sql`${users.wins} + 1`,
        [stone]: sql`${users[stone]} + 1`,
      })
      .where(eq(users.id, userId));
  } else {
    await db
      .update(users)
      .set({
        money: sql`${users.money} + ${money}`,
        wins: sql`${users.wins} + 1`,
      })
      .where(eq(users.id, userId));
  }

  rewards.money = money;
  log = pushLog(log, `Você venceu a batalha! +${money} Pk$`);
  if (stone) {
    rewards.stone = EVOLUTION_ITEM_LABEL[stone];
    log = pushLog(log, `✨ O selvagem derrubou ${EVOLUTION_ITEM_LABEL[stone]}!`);
  }
  return { log, status: "WON", continue: false };
}

function speciesOf(pokedexId: number) {
  return getPokemonSpecies(pokedexId);
}

/**
 * Concede o lendário nv 5 do 1/1200 (Etapa C, 8.3). Sempre Normal nv 5, com
 * os golpes do nível; vai para o time se houver vaga, senão para o PC.
 * Retorna o nome da espécie para o log.
 */
export async function grantBossLegendary(userId: number, pokedexId: number): Promise<string> {
  const species = getPokemonSpecies(pokedexId);
  const stats = computeDelugeStats(species, 5, "Normal");
  const side = sideFromSpecies(pokedexId, 5, "Normal");

  const party = await db
    .select({ id: userPokemon.id })
    .from(userPokemon)
    .where(and(eq(userPokemon.userId, userId), isNotNull(userPokemon.partySlot)));

  await db.insert(userPokemon).values({
    userId,
    pokedexId: species.id,
    name: species.name,
    variant: "Normal",
    isPremiumSkin: false,
    level: 5,
    xp: 0,
    xpToNextLevel: xpToNextLevel(5),
    hp: stats.hp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    spAttack: stats.spAttack,
    spDefense: stats.spDefense,
    speed: stats.speed,
    ...moveNamesForDb(side),
    partySlot: party.length < 6 ? party.length + 1 : null,
    isStarter: false,
  });
  return species.name;
}

// ─── Captura ──────────────────────────────────────────────────────────────

export async function attemptCatch(
  userId: number,
  battleId: number,
  ball: BallKey
): Promise<BattleView> {
  const { battle, state } = await loadActive(userId, battleId);

  if (state.gymLeaderId !== null) {
    throw badRequest("Não é possível capturar o Pokémon de um líder de ginásio.");
  }
  if (state.bossFightId !== null) {
    throw badRequest("O lendário da Arena não se captura — vença para ter sua chance de 1 em 1200!");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user[ball] <= 0) throw badRequest(`Você não possui ${BALL_LABEL[ball]}.`);

  const species = getPokemonSpecies(state.opponent.pokedexId);
  // Fase 8.4: sono/gelo ×2, veneno/queimadura/paralisia ×1,5 (Gen III).
  const chance = captureChance(
    species.catchRate,
    state.opponent.hp,
    state.opponent.maxHp,
    ball,
    normalizeStatus(state.opponent.status)
  );

  // Debita a bola de forma atômica, antes de qualquer efeito.
  const deducted = await db
    .update(users)
    .set({ [ball]: sql`${users[ball]} - 1` })
    .where(and(eq(users.id, userId), sql`${users[ball]} > 0`))
    .returning({ id: users.id });

  if (deducted.length === 0) throw badRequest(`Você não possui ${BALL_LABEL[ball]}.`);

  let log = pushLog(state.log, `Você arremessou uma ${BALL_LABEL[ball]}!`);
  let status: BattleStatus = "ACTIVE";

  if (rollCapture(chance)) {
    const stats = computeDelugeStats(
      species,
      state.opponent.level,
      state.opponent.variant as DelugeVariant
    );

    const party = await db
      .select({ id: userPokemon.id })
      .from(userPokemon)
      .where(and(eq(userPokemon.userId, userId), isNotNull(userPokemon.partySlot)));

    await db.insert(userPokemon).values({
      userId,
      pokedexId: species.id,
      name: species.name,
      variant: state.opponent.variant,
      isPremiumSkin: false,
      level: state.opponent.level,
      xp: 0,
      xpToNextLevel: xpToNextLevel(state.opponent.level),
      hp: stats.hp,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: stats.defense,
      spAttack: stats.spAttack,
      spDefense: stats.spDefense,
      speed: stats.speed,
      // Fase 6.1: o Pokémon capturado guarda os golpes do nível dele.
      ...moveNamesForDb(state.opponent),
      partySlot: party.length < 6 ? party.length + 1 : null,
      isStarter: false,
    });

    log = pushLog(
      log,
      `★ Gotcha! ${state.opponent.variant !== "Normal" ? `${state.opponent.variant} ` : ""}${species.name} foi capturado!`
    );
    status = "CAUGHT";
  } else {
    log = pushLog(
      log,
      `Ah não! ${species.name} escapou! (chance era de ${Math.round(chance * 100)}%)`
    );

    // O selvagem contra-ataca após a falha (com status: pode dormir/paralisar,
    // pode aplicar status; veneno/queimadura correm no fim do turno).
    const move = chooseOpponentMove(state.opponent, state.player);
    const strike = performStrike(state.opponent, state.player, move);
    log = pushLog(log, ...strike.log);
    if (state.player.hp > 0) {
      const residual = endOfTurn([state.opponent, state.player]);
      log = pushLog(log, ...residual.log);
    }
    if (state.player.hp <= 0) {
      log = pushLog(
        log,
        `${state.player.displayName} desmaiou! Você voltou para a base.`
      );
      status = "LOST";
    }
    if (state.opponent.hp <= 0) {
      // O selvagem caiu pelo próprio veneno/queimadura: vitória normal.
      const rewards: NonNullable<BattleView["rewards"]> = {};
      const outcome = await resolveFaint("opponent", state, log, rewards, userId);
      log = outcome.log;
      status = outcome.status;
    }
  }

  state.log = log;
  await persistTurn(userId, battle.id, state, status);

  return view(await reload(battle.id));
}

// ─── Troca e fuga ─────────────────────────────────────────────────────────

export async function switchPokemon(
  userId: number,
  battleId: number,
  targetPokemonId: number
): Promise<BattleView> {
  const { battle, state } = await loadActive(userId, battleId);

  const rows = await db
    .select()
    .from(userPokemon)
    .where(and(eq(userPokemon.id, targetPokemonId), eq(userPokemon.userId, userId)));

  if (rows.length === 0) throw notFound("Pokémon não encontrado.");
  const target = rows[0];

  if (target.partySlot === null) throw badRequest("Esse Pokémon está no PC, não no time.");
  if (target.hp <= 0) throw badRequest("Esse Pokémon está desmaiado.");

  state.player = sideFromUserPokemon(target);
  state.log = pushLog(state.log, `Vai, ${state.player.displayName}!`);

  await db
    .update(battles)
    .set({
      activePokemonId: target.id,
      state: state as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(battles.id, battle.id));

  return view(await reload(battle.id));
}

export async function flee(userId: number, battleId: number): Promise<BattleView> {
  const { battle, state } = await loadActive(userId, battleId);

  if (state.gymLeaderId !== null) {
    throw badRequest("Não dá para fugir de uma batalha de ginásio.");
  }
  if (state.bossFightId !== null) {
    throw badRequest("Não dá para fugir da Arena Boss — é vencer ou cair!");
  }

  state.log = pushLog(state.log, "Você fugiu em segurança.");
  await persistTurn(userId, battle.id, state, "FLED");

  return view(await reload(battle.id));
}

// ─── Persistência ─────────────────────────────────────────────────────────

/**
 * Grava o turno: estado da batalha + HP/XP/nível do Pokémon do jogador.
 *
 * Regressão corrigida na Fase 4: `users.losses` **nunca era incrementado**.
 * O incremento vivia no `POST /api/gym {action:"battle_result"}`, removido na
 * Fase 2 por ser farmável; os caminhos `status: "LOST"` deste módulo não
 * assumiram o contador. Centralizado aqui para cobrir todas as derrotas
 * (ginásio, selvagem e falha de captura) num lugar só.
 */
async function persistTurn(
  userId: number,
  battleId: number,
  state: BattleState,
  status: BattleStatus
): Promise<void> {
  await db.transaction(async (tx) => {
    if (state.player.userPokemonId !== null) {
      await tx
        .update(userPokemon)
        .set({
          // Fase 6.3: a evolução troca a espécie — precisa persistir junto com
          // os status recalculados, senão o Pokémon "desvoluiria" no próximo
          // login. Sem evolução os valores são iguais aos atuais (no-op).
          pokedexId: state.player.pokedexId,
          name: state.player.name,
          hp: state.player.hp,
          // Fase 8.4: o status persiste depois da batalha até Centro Pokémon
          // ou item (GBA); desmaiar limpa. O contador do veneno grave não é
          // guardado — recomeça ao entrar em campo (sideFromUserPokemon).
          status: state.player.hp > 0 ? state.player.status : "NONE",
          statusTurns: state.player.hp > 0 && state.player.status === "SLP" ? state.player.statusTurns : 0,
          level: state.player.level,
          xp: state.player.xp,
          xpToNextLevel: xpToNextLevel(state.player.level),
          maxHp: state.player.maxHp,
          attack: state.player.attack,
          defense: state.player.defense,
          spAttack: state.player.spAttack,
          spDefense: state.player.spDefense,
          speed: state.player.speed,
          // Golpes aprendidos no level up (Fase 6.1) e na evolução (6.3)
          // precisam persistir.
          ...moveNamesForDb(state.player),
        })
        .where(
          and(
            eq(userPokemon.id, state.player.userPokemonId),
            eq(userPokemon.userId, userId)
          )
        );
    }

    if (status === "LOST") {
      await tx
        .update(users)
        .set({ losses: sql`${users.losses} + 1` })
        .where(eq(users.id, userId));
    }

    await tx
      .update(battles)
      .set({
        state: state as unknown as Record<string, unknown>,
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(battles.id, battleId), eq(battles.userId, userId)));
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

async function loadActive(userId: number, battleId: number) {
  const rows = await db
    .select()
    .from(battles)
    .where(and(eq(battles.id, battleId), eq(battles.userId, userId)));

  if (rows.length === 0) throw notFound("Batalha não encontrada.");
  const battle = rows[0];

  if (battle.status !== "ACTIVE") {
    throw badRequest("Esta batalha já terminou.");
  }

  return { battle, state: battle.state as unknown as BattleState };
}

async function reload(battleId: number) {
  const rows = await db.select().from(battles).where(eq(battles.id, battleId));
  return rows[0];
}

function view(battle: typeof battles.$inferSelect): BattleView {
  return {
    id: battle.id,
    kind: battle.kind,
    status: battle.status,
    state: battle.state as unknown as BattleState,
  };
}

/** Recarrega o estado da batalha (usado pela UI para retomar após refresh). */
export async function getBattle(userId: number, battleId: number): Promise<BattleView> {
  const rows = await db
    .select()
    .from(battles)
    .where(and(eq(battles.id, battleId), eq(battles.userId, userId)));
  if (rows.length === 0) throw notFound("Batalha não encontrada.");
  return view(rows[0]);
}
