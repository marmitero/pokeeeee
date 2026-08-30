import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { battles, gameMaps, gymLeaders, userBadges, userPokemon, users } from "@/db/schema";
import {
  computeDelugeStats,
  getPokemonSpecies,
  rollRandomDelugeVariant,
  type DelugeVariant,
} from "@/lib/pokedex";
import { computeDamage } from "@/lib/engine/damage";
import { toCombatant } from "@/lib/engine/combatant";
import { sideFromSpecies, sideFromUserPokemon, type SideState } from "@/lib/engine/combatant";
import { applyXp, battleXpGain, xpToNextLevel, MAX_LEVEL } from "@/lib/engine/xp";
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
}

export interface BattleView {
  id: number;
  kind: string;
  status: string;
  state: BattleState;
  /** Recompensas concedidas no último turno (para a UI exibir). */
  rewards?: { xp?: number; levelsGained?: number; money?: number; badge?: string };
  party?: unknown[];
  user?: unknown;
}

const ENCOUNTER_TILES = ["tall_grass", "water"];
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
 * `playerX`/`playerY` vêm do cliente, mas são validados contra a grade gravada:
 * o tile naquela coordenada precisa ser um tile de encontro. O cliente poderia
 * escolher outra coordenada de encontro do mesmo mapa — o que não dá vantagem,
 * porque a tabela de encontros é a mesma para o mapa inteiro.
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

  const grid = map.tileGrid as string[][];
  const tile = grid?.[playerY]?.[playerX];
  if (!tile || !ENCOUNTER_TILES.includes(tile)) {
    throw badRequest("Não há encontros nesse tile.");
  }

  const table = (map.encounterTable ?? []) as Array<{
    pokedexId: number;
    weight: number;
    minLevel: number;
    maxLevel: number;
    tileTypes: string[];
  }>;

  const pool = table.filter((e) => Array.isArray(e.tileTypes) && e.tileTypes.includes(tile));
  const usable = pool.length > 0 ? pool : table;
  if (usable.length === 0) throw badRequest("Este mapa não tem Pokémon selvagens.");

  const totalWeight = usable.reduce((acc, e) => acc + Math.max(0, e.weight || 10), 0);
  let roll = Math.random() * totalWeight;
  let chosen = usable[usable.length - 1];
  for (const entry of usable) {
    const w = Math.max(0, entry.weight || 10);
    if (roll < w) {
      chosen = entry;
      break;
    }
    roll -= w;
  }

  const minLvl = Math.max(1, Math.min(chosen.minLevel, chosen.maxLevel));
  const maxLvl = Math.max(minLvl, Math.min(chosen.maxLevel, MAX_LEVEL));
  const level = Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;
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

// ─── Turno ────────────────────────────────────────────────────────────────

export async function attack(
  userId: number,
  battleId: number,
  moveIndex: number
): Promise<BattleView> {
  const { battle, state } = await loadActive(userId, battleId);

  const move = state.player.moves[moveIndex];
  if (!move) throw badRequest("Golpe inválido.");

  let log = state.log;
  const rewards: BattleView["rewards"] = {};

  // Ordem do turno decidida pela velocidade.
  const playerFirst =
    state.player.speed >= state.opponent.speed ? true : Math.random() < 0.5;

  const first = playerFirst ? state.player : state.opponent;
  const second = playerFirst ? state.opponent : state.player;
  const isFirstPlayer = playerFirst;

  // ── Primeiro ataque ────────────────────────────────────────────────────
  const firstMove = isFirstPlayer
    ? move
    : pickOpponentMove(state.opponent);

  let firstResult = computeDamage(toCombatant(first), toCombatant(second), firstMove as never);
  log = pushLog(
    log,
    `${first.displayName} usou ${firstMove.name}!` +
      (firstResult.missed ? " Mas errou!" : "")
  );

  if (!firstResult.missed) {
    if (firstResult.critical) log = pushLog(log, "Golpe crítico!");
    if (firstResult.label) log = pushLog(log, firstResult.label);
    log = pushLog(log, `Causou ${firstResult.damage} de dano.`);
    second.hp = Math.max(0, second.hp - firstResult.damage);
  }

  // ── O primeiro desmaiou? ───────────────────────────────────────────────
  let outcome = await resolveFaint(
    isFirstPlayer ? "opponent" : "player",
    state,
    log,
    rewards,
    userId
  );
  log = outcome.log;

  // ── Segundo ataque, se ambos seguem de pé ──────────────────────────────
  if (outcome.continue && second.hp > 0 && first.hp > 0) {
    const secondMove = isFirstPlayer ? pickOpponentMove(state.opponent) : move;
    const secondResult = computeDamage(
      toCombatant(second),
      toCombatant(first),
      secondMove as never
    );

    log = pushLog(
      log,
      `${second.displayName} usou ${secondMove.name}!` +
        (secondResult.missed ? " Mas errou!" : "")
    );

    if (!secondResult.missed) {
      if (secondResult.critical) log = pushLog(log, "Golpe crítico!");
      if (secondResult.label) log = pushLog(log, secondResult.label);
      log = pushLog(log, `Causou ${secondResult.damage} de dano.`);
      first.hp = Math.max(0, first.hp - secondResult.damage);
    }

    outcome = await resolveFaint(
      isFirstPlayer ? "player" : "opponent",
      state,
      log,
      rewards,
      userId
    );
    log = outcome.log;
  }

  const status = outcome.status;
  state.log = log;
  state.turn += 1;

  await persistTurn(userId, battle.id, state, status);

  return { ...view(await reload(battle.id)), rewards };
}

function pickOpponentMove(opponent: SideState) {
  const damaging = opponent.moves.filter((m) => m.category !== "Status");
  const pool = damaging.length > 0 ? damaging : opponent.moves;
  return pool[Math.floor(Math.random() * pool.length)] ?? opponent.moves[0];
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

  // ── Selvagem: vitória ──────────────────────────────────────────────────
  const money = wildWinMoney(state.opponent.level);
  await db
    .update(users)
    .set({
      money: sql`${users.money} + ${money}`,
      wins: sql`${users.wins} + 1`,
    })
    .where(eq(users.id, userId));

  rewards.money = money;
  log = pushLog(log, `Você venceu a batalha! +${money} Pk$`);
  return { log, status: "WON", continue: false };
}

function speciesOf(pokedexId: number) {
  return getPokemonSpecies(pokedexId);
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

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user[ball] <= 0) throw badRequest(`Você não possui ${BALL_LABEL[ball]}.`);

  const species = getPokemonSpecies(state.opponent.pokedexId);
  const chance = captureChance(
    species.catchRate,
    state.opponent.hp,
    state.opponent.maxHp,
    ball
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
      move1: state.opponent.moves[0]?.name ?? "Investida",
      move2: state.opponent.moves[1]?.name ?? "Investida",
      move3: state.opponent.moves[2]?.name ?? "Investida",
      move4: state.opponent.moves[3]?.name ?? "Investida",
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

    // O selvagem contra-ataca após a falha.
    const move = pickOpponentMove(state.opponent);
    const result = computeDamage(
      toCombatant(state.opponent),
      toCombatant(state.player),
      move as never
    );
    log = pushLog(log, `${state.opponent.displayName} usou ${move.name}!`);
    if (!result.missed) {
      log = pushLog(log, `Causou ${result.damage} de dano.`);
      state.player.hp = Math.max(0, state.player.hp - result.damage);
      if (state.player.hp <= 0) {
        log = pushLog(
          log,
          `${state.player.displayName} desmaiou! Você voltou para a base.`
        );
        status = "LOST";
      }
    } else {
      log = pushLog(log, "Mas errou!");
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
          hp: state.player.hp,
          level: state.player.level,
          xp: state.player.xp,
          xpToNextLevel: xpToNextLevel(state.player.level),
          maxHp: state.player.maxHp,
          attack: state.player.attack,
          defense: state.player.defense,
          spAttack: state.player.spAttack,
          spDefense: state.player.spDefense,
          speed: state.player.speed,
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
