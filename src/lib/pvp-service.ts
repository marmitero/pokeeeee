import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { pvpBattles, userPokemon, users } from "@/db/schema";
import { getPokemonSpecies, getMoveByName } from "@/lib/pokedex";
import { computeDamage } from "@/lib/engine/damage";
import { sideFromUserPokemon, toCombatant, type SideState } from "@/lib/engine/combatant";
import { badRequest, forbidden, notFound } from "@/lib/api";

/**
 * PvP assíncrono por turnos (Fase 4).
 *
 * Modelo: os dois jogadores travam a ação do turno **às cegas**; quando ambos
 * travaram, o servidor resolve a troca de uma vez. O cliente descobre o
 * resultado consultando o estado.
 *
 * Decisões do mantenedor (docs/pvp-design.md §10):
 *  - Amistoso NÃO mexe em ELO nem entra em ranking. `users.elo` existe mas
 *    nenhum código aqui escreve nele — só a futura Arena ranqueada escreverá.
 *  - `wins`/`losses` são atualizados (contador misto, decisão A).
 *  - O dano PERSISTE em `user_pokemon` ao fim de cada turno.
 *
 * Concorrência: os dois podem enviar no mesmo milissegundo. Toda mutação roda
 * dentro de uma transação com `SELECT ... FOR UPDATE` na linha da sala, então a
 * troca é resolvida exatamente uma vez.
 */

export type PvpStatus = "WAITING" | "ACTIVE" | "FINISHED" | "ABANDONED";
export type PvpPhase = "ACTION" | "SWITCH";
export type PvpMode = "friendly" | "ranked";

export type CommittedAction =
  | { kind: "attack"; moveIndex: number }
  | { kind: "switch"; userPokemonId: number };

export interface PvpSide {
  userId: number;
  username: string;
  userPokemonId: number;
  snapshot: SideState;
  committed: CommittedAction | null;
  needsSwitch: boolean;
}

export interface PvpState {
  turn: number;
  phase: PvpPhase;
  p1: PvpSide;
  p2: PvpSide;
  log: string[];
  version: number;
  /** ISO. Usado pelo timeout preguiçoso — não há cron no projeto. */
  turnStartedAt: string;
}

export type SideKey = "p1" | "p2";

/** Segundos até o turno ser resolvido automaticamente para o lado ausente. */
export const TURN_TIMEOUT_SEC = 60;
const MAX_LOG = 60;

// ─── Visão pública ────────────────────────────────────────────────────────

export interface PvpPublicView {
  roomCode: string;
  mode: PvpMode;
  status: PvpStatus;
  turn: number;
  phase: PvpPhase;
  youAre: SideKey;
  you: SideState;
  opponent: { name: string; level: number; hp: number; maxHp: number; variant: string; pokedexId: number };
  opponentUsername: string;
  /** Só o booleano. Expor a ação em si quebraria o jogo. */
  opponentCommitted: boolean;
  youCommitted: boolean;
  yourNeedsSwitch: boolean;
  winnerId: number | null;
  log: string[];
  version: number;
  /** Sua party, para permitir troca. */
  party: Array<{ id: number; name: string; pokedexId: number; level: number; hp: number; maxHp: number }>;
}

function pushLog(log: string[], ...lines: string[]): string[] {
  return [...log, ...lines].slice(-MAX_LOG);
}

// ─── Helpers de acesso ────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadSideSnapshot(userId: number, pokemonId: number): Promise<SideState> {
  const rows = await db
    .select()
    .from(userPokemon)
    .where(and(eq(userPokemon.id, pokemonId), eq(userPokemon.userId, userId)));

  if (rows.length === 0) throw notFound("Pokémon não encontrado.");
  const mon = rows[0];
  if (mon.hp <= 0) throw badRequest("Esse Pokémon está desmaiado.");
  if (mon.partySlot === null) throw badRequest("Esse Pokémon está no PC, não no time.");

  return sideFromUserPokemon(mon);
}

async function loadParty(userId: number) {
  const rows = await db
    .select()
    .from(userPokemon)
    .where(and(eq(userPokemon.userId, userId), isNotNull(userPokemon.partySlot)));

  return rows
    .sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99))
    .map((m) => ({
      id: m.id,
      name: m.nickname || m.name,
      pokedexId: m.pokedexId,
      level: m.level,
      hp: m.hp,
      maxHp: m.maxHp,
    }));
}

/** Lê a sala com lock de linha. Só usar dentro de transação. */
async function lockRoom(tx: Tx, roomCode: string) {
  const rows = await tx
    .select()
    .from(pvpBattles)
    .where(eq(pvpBattles.roomCode, roomCode))
    .for("update");

  if (rows.length === 0) throw notFound("Sala PvP não encontrada.");
  return rows[0];
}

function sideKeyFor(state: PvpState, userId: number): SideKey {
  if (state.p1.userId === userId) return "p1";
  if (state.p2.userId === userId) return "p2";
  throw forbidden("Você não participa desta sala.");
}

function otherKey(key: SideKey): SideKey {
  return key === "p1" ? "p2" : "p1";
}

function opponentPublic(side: PvpSide) {
  return {
    name: side.snapshot.displayName,
    level: side.snapshot.level,
    hp: side.snapshot.hp,
    maxHp: side.snapshot.maxHp,
    variant: side.snapshot.variant,
    pokedexId: side.snapshot.pokedexId,
  };
}

// ─── Criação e entrada ────────────────────────────────────────────────────

export async function createRoom(
  userId: number,
  username: string,
  roomCodeInput: string | undefined,
  pokemonId: number
) {
  const snapshot = await loadSideSnapshot(userId, pokemonId);

  const roomCode = roomCodeInput || `DLG-${Math.floor(1000 + Math.random() * 9000)}`;

  const existing = await db
    .select({ id: pvpBattles.id })
    .from(pvpBattles)
    .where(eq(pvpBattles.roomCode, roomCode));
  if (existing.length > 0) throw badRequest("Já existe uma sala com esse código.");

  const state: PvpState = {
    turn: 1,
    phase: "ACTION",
    p1: {
      userId,
      username,
      userPokemonId: pokemonId,
      snapshot,
      committed: null,
      needsSwitch: false,
    },
    // p2 é preenchido no join; o tipo exige algo, então espelha p1 com hp 0.
    p2: {
      userId: 0,
      username: "",
      userPokemonId: 0,
      snapshot: { ...snapshot, hp: 0, userPokemonId: null },
      committed: null,
      needsSwitch: false,
    },
    log: [`${username} abriu a sala ${roomCode} e aguarda um rival!`],
    version: 1,
    turnStartedAt: new Date().toISOString(),
  };

  const [room] = await db
    .insert(pvpBattles)
    .values({
      roomCode,
      mode: "friendly", // Fase 4 só produz amistoso
      player1Id: userId,
      player1Username: username,
      status: "WAITING",
      currentTurnPlayerId: userId,
      battleState: state as unknown as Record<string, unknown>,
    })
    .returning();

  return room;
}

export async function joinRoom(userId: number, username: string, roomCode: string, pokemonId: number) {
  const snapshot = await loadSideSnapshot(userId, pokemonId);

  return db.transaction(async (tx) => {
    const room = await lockRoom(tx, roomCode);

    if (room.status !== "WAITING") throw badRequest("Esta sala não está mais aguardando.");
    if (room.player1Id === userId) throw badRequest("Você não pode entrar na própria sala.");
    if (room.player2Id !== null) throw badRequest("Sala já está cheia.");

    const state = room.battleState as unknown as PvpState;
    state.p2 = {
      userId,
      username,
      userPokemonId: pokemonId,
      snapshot,
      committed: null,
      needsSwitch: false,
    };
    state.log = pushLog(
      state.log,
      `⚡ ${username} entrou na arena! A batalha contra ${state.p1.username} começou.`
    );
    state.turnStartedAt = new Date().toISOString();
    state.version += 1;

    const [updated] = await tx
      .update(pvpBattles)
      .set({
        player2Id: userId,
        player2Username: username,
        status: "ACTIVE",
        battleState: state as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(pvpBattles.id, room.id))
      .returning();

    return updated;
  });
}

// ─── Resolução do turno ───────────────────────────────────────────────────

/**
 * Troca o Pokémon ativo de um lado (troca forçada após desmaio, ou troca
 * tática travada como ação do turno).
 */
async function applySwitch(tx: Tx, state: PvpState, key: SideKey, newPokemonId: number) {
  const side = state[key];

  const rows = await tx
    .select()
    .from(userPokemon)
    .where(and(eq(userPokemon.id, newPokemonId), eq(userPokemon.userId, side.userId)));

  if (rows.length === 0) throw notFound("Pokémon não encontrado.");
  const mon = rows[0];
  if (mon.hp <= 0) throw badRequest("Esse Pokémon está desmaiado.");
  if (mon.partySlot === null) throw badRequest("Esse Pokémon está no PC, não no time.");

  const outgoing = side.snapshot.displayName;
  side.userPokemonId = mon.id;
  side.snapshot = sideFromUserPokemon(mon);
  side.needsSwitch = false;

  state.log = pushLog(state.log, `${side.username} trocou ${outgoing} por ${side.snapshot.displayName}!`);
}

/**
 * Resolve a troca de golpes. Chamada só quando ambos travaram (ou quando o
 * timeout resolveu pelo lado ausente).
 */
async function resolveExchange(tx: Tx, state: PvpState) {
  // 1) Trocas acontecem antes dos golpes, e quem troca não ataca no turno.
  for (const key of ["p1", "p2"] as SideKey[]) {
    const action = state[key].committed;
    if (action?.kind === "switch") {
      await applySwitch(tx, state, key, action.userPokemonId);
      state[key].committed = null;
    }
  }

  // 2) Ordem dos golpes pela velocidade; empate → aleatório.
  const p1First =
    state.p1.snapshot.speed === state.p2.snapshot.speed
      ? Math.random() < 0.5
      : state.p1.snapshot.speed > state.p2.snapshot.speed;

  const order: Array<[SideKey, SideKey]> = p1First
    ? [["p1", "p2"], ["p2", "p1"]]
    : [["p2", "p1"], ["p1", "p2"]];

  for (const [atkKey, defKey] of order) {
    const attacker = state[atkKey];
    const defender = state[defKey];
    const action = attacker.committed;

    if (!action || action.kind !== "attack") continue;
    if (attacker.snapshot.hp <= 0) continue;
    if (defender.snapshot.hp <= 0) continue;

    const move = attacker.snapshot.moves[action.moveIndex];
    if (!move) continue;

    const result = computeDamage(
      toCombatant(attacker.snapshot),
      toCombatant(defender.snapshot),
      move
    );

    state.log = pushLog(
      state.log,
      `${attacker.snapshot.displayName} usou ${move.name}!` + (result.missed ? " Mas errou!" : "")
    );

    if (result.missed) continue;
    if (result.critical) state.log = pushLog(state.log, "Golpe crítico!");
    if (result.label) state.log = pushLog(state.log, result.label);
    state.log = pushLog(state.log, `Causou ${result.damage} de dano.`);

    defender.snapshot.hp = Math.max(0, defender.snapshot.hp - result.damage);

    if (defender.snapshot.hp <= 0) {
      state.log = pushLog(state.log, `${defender.snapshot.displayName} desmaiou!`);
      defender.needsSwitch = true;
    }
  }

  // 3) Limpa as ações travadas e avança o turno.
  state.p1.committed = null;
  state.p2.committed = null;
  state.turn += 1;
  state.version += 1;
  state.turnStartedAt = new Date().toISOString();

  const needsSwitch = state.p1.needsSwitch || state.p2.needsSwitch;
  state.phase = needsSwitch ? "SWITCH" : "ACTION";
}

/** Grava o HP dos dois lados em `user_pokemon` — o dano persiste (decisão 2). */
async function persistHp(tx: Tx, state: PvpState) {
  for (const key of ["p1", "p2"] as SideKey[]) {
    const side = state[key];
    if (side.userId === 0 || side.userPokemonId === 0) continue;

    await tx
      .update(userPokemon)
      .set({ hp: side.snapshot.hp })
      .where(
        and(eq(userPokemon.id, side.userPokemonId), eq(userPokemon.userId, side.userId))
      );
  }
}

/** Um lado ainda tem Pokémon de pé no time? */
async function hasUsablePokemon(tx: Tx, userId: number): Promise<boolean> {
  const party = await tx
    .select({ hp: userPokemon.hp })
    .from(userPokemon)
    .where(and(eq(userPokemon.userId, userId), isNotNull(userPokemon.partySlot)));

  return party.some((m) => m.hp > 0);
}

/**
 * Timeout preguiçoso: se o oponente não travou há mais de TURN_TIMEOUT_SEC,
 * resolve o turno escolhendo um golpe aleatório para ele.
 *
 * Existe para não depender de um job agendado — o projeto não tem cron.
 */
function applyTimeoutIfNeeded(state: PvpState): boolean {
  if (state.phase !== "ACTION") return false;
  if (state.p1.committed && state.p2.committed) return false;

  const elapsed = (Date.now() - new Date(state.turnStartedAt).getTime()) / 1000;
  if (elapsed < TURN_TIMEOUT_SEC) return false;

  for (const key of ["p1", "p2"] as SideKey[]) {
    if (state[key].committed) continue;
    const moves = state[key].snapshot.moves;
    const idx = moves.length > 0 ? Math.floor(Math.random() * moves.length) : 0;
    state[key].committed = { kind: "attack", moveIndex: idx };
    state.log = pushLog(
      state.log,
      `⏱ ${state[key].username} demorou demais; o turno foi decidido automaticamente.`
    );
  }
  return true;
}

// ─── Ações do jogador ─────────────────────────────────────────────────────

export async function submitTurn(
  userId: number,
  roomCode: string,
  action: CommittedAction
) {
  return db.transaction(async (tx) => {
    const room = await lockRoom(tx, roomCode);
    const state = room.battleState as unknown as PvpState;
    const key = sideKeyFor(state, userId);

    if (room.status !== "ACTIVE") throw badRequest("Esta batalha não está ativa.");
    if (state[key].needsSwitch) {
      throw badRequest("Seu Pokémon desmaiou — troque antes de escolher um golpe.");
    }
    if (action.kind === "attack") {
      if (action.moveIndex < 0 || action.moveIndex >= state[key].snapshot.moves.length) {
        throw badRequest("Golpe inválido.");
      }
    }

    applyTimeoutIfNeeded(state);

    state[key].committed = action;
    state.version += 1;

    let status: PvpStatus = "ACTIVE";
    let winnerId: number | null = null;
    let loserId: number | null = null;

    // Ambos travaram? Resolve.
    if (state.p1.committed && state.p2.committed) {
      await resolveExchange(tx, state);
      await persistHp(tx, state);

      // Alguém ficou sem Pokémon de pé?
      const p1Ok = await hasUsablePokemon(tx, state.p1.userId);
      const p2Ok = await hasUsablePokemon(tx, state.p2.userId);

      if (!p1Ok || !p2Ok) {
        status = "FINISHED";
        winnerId = !p1Ok ? state.p2.userId : state.p1.userId;
        loserId = !p1Ok ? state.p1.userId : state.p2.userId;
        const loser = !p1Ok ? state.p1 : state.p2;
        state.log = pushLog(
          state.log,
          `🏆 ${state[winnerId === state.p1.userId ? "p1" : "p2"].username} venceu a batalha!`,
          `${loser.username} ficou sem Pokémon em condições de lutar.`
        );
        state.phase = "ACTION";
      }
    }

    if (status === "FINISHED" && winnerId !== null && loserId !== null) {
      await awardResult(tx, winnerId, loserId, room.mode as PvpMode);
    }

    await tx
      .update(pvpBattles)
      .set({
        status,
        winnerId,
        battleState: state as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(pvpBattles.id, room.id));

    return { state, status };
  });
}

/**
 * Registra o resultado: `wins` para o vencedor, `losses` para o perdedor.
 *
 * Amistoso **não** toca em `users.elo` (decisão do mantenedor — o ELO só será
 * atualizado pela futura Arena ranqueada). Há teste garantindo isso.
 *
 * `mode` é aceito e deliberadamente não usado ainda: quando a Arena chegar, o
 * ramo `"ranked"` atualiza `elo` aqui, sem tocar em mais nada.
 */
async function awardResult(tx: Tx, winnerId: number, loserId: number, mode: PvpMode) {
  await tx
    .update(users)
    .set({ wins: sql`${users.wins} + 1` })
    .where(eq(users.id, winnerId));

  await tx
    .update(users)
    .set({ losses: sql`${users.losses} + 1` })
    .where(eq(users.id, loserId));

  if (mode === "ranked") {
    // Intencionalmente vazio na Fase 4: amistoso não mexe em ELO.
    // A Arena ranqueada implementará o cálculo aqui.
  }
}

export async function switchPokemon(userId: number, roomCode: string, pokemonId: number) {
  return db.transaction(async (tx) => {
    const room = await lockRoom(tx, roomCode);
    const state = room.battleState as unknown as PvpState;
    const key = sideKeyFor(state, userId);

    if (room.status !== "ACTIVE") throw badRequest("Esta batalha não está ativa.");
    if (!state[key].needsSwitch) {
      throw badRequest("Só é possível trocar quando seu Pokémon está desmaiado.");
    }

    await applySwitch(tx, state, key, pokemonId);
    state.version += 1;

    // Os dois já trocaram? Volta para fase de ação.
    if (!state.p1.needsSwitch && !state.p2.needsSwitch) {
      state.phase = "ACTION";
      state.turnStartedAt = new Date().toISOString();
    }

    await persistHp(tx, state);

    await tx
      .update(pvpBattles)
      .set({
        battleState: state as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(pvpBattles.id, room.id));

    return { state };
  });
}

export async function forfeit(userId: number, roomCode: string) {
  return db.transaction(async (tx) => {
    const room = await lockRoom(tx, roomCode);
    const state = room.battleState as unknown as PvpState;
    const key = sideKeyFor(state, userId);

    if (room.status !== "ACTIVE") throw badRequest("Esta batalha não está ativa.");

    const winnerKey = otherKey(key);
    const winnerId = state[winnerKey].userId;
    const loserId = state[key].userId;

    state.log = pushLog(
      state.log,
      `🏳️ ${state[key].username} desistiu. ${state[winnerKey].username} venceu!`
    );
    state.version += 1;

    await awardResult(tx, winnerId, loserId, room.mode as PvpMode);

    await tx
      .update(pvpBattles)
      .set({
        status: "FINISHED",
        winnerId,
        battleState: state as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(pvpBattles.id, room.id));

    return { state, winnerId };
  });
}

// ─── Leitura ──────────────────────────────────────────────────────────────

export async function getState(userId: number, roomCode: string): Promise<PvpPublicView> {
  return db.transaction(async (tx) => {
    const room = await lockRoom(tx, roomCode);
    const state = room.battleState as unknown as PvpState;
    const key = sideKeyFor(state, userId);

    // Timeout preguiçoso também roda na leitura: se ninguém mais abrir a tela,
    // a sala não fica pendurada para sempre.
    if (room.status === "ACTIVE" && applyTimeoutIfNeeded(state)) {
      if (state.p1.committed && state.p2.committed) {
        await resolveExchange(tx, state);
        await persistHp(tx, state);

        const p1Ok = await hasUsablePokemon(tx, state.p1.userId);
        const p2Ok = await hasUsablePokemon(tx, state.p2.userId);
        if (!p1Ok || !p2Ok) {
          const winnerId = !p1Ok ? state.p2.userId : state.p1.userId;
          const loserId = !p1Ok ? state.p1.userId : state.p2.userId;
          await awardResult(tx, winnerId, loserId, room.mode as PvpMode);
          await tx
            .update(pvpBattles)
            .set({
              status: "FINISHED",
              winnerId,
              battleState: state as unknown as Record<string, unknown>,
              updatedAt: new Date(),
            })
            .where(eq(pvpBattles.id, room.id));
        }
      }
      await tx
        .update(pvpBattles)
        .set({ battleState: state as unknown as Record<string, unknown>, updatedAt: new Date() })
        .where(eq(pvpBattles.id, room.id));
    }

    const me = state[key];
    const foe = state[otherKey(key)];
    const party = await loadParty(userId);

    return {
      roomCode,
      mode: (room.mode as PvpMode) ?? "friendly",
      status: room.status as PvpStatus,
      turn: state.turn,
      phase: state.phase,
      youAre: key,
      you: me.snapshot,
      opponent: opponentPublic(foe),
      opponentUsername: foe.username,
      opponentCommitted: foe.committed !== null,
      youCommitted: me.committed !== null,
      yourNeedsSwitch: me.needsSwitch,
      winnerId: room.winnerId,
      log: state.log,
      version: state.version,
      party,
    };
  });
}

export async function listWaitingRooms() {
  const rows = await db
    .select({
      roomCode: pvpBattles.roomCode,
      player1Username: pvpBattles.player1Username,
      createdAt: pvpBattles.createdAt,
    })
    .from(pvpBattles)
    .where(eq(pvpBattles.status, "WAITING"));

  return rows;
}

// ─── Utilidades para o cliente montar o combatente local ──────────────────

/** Resolve os golpes gravados como nome exibido para o objeto de golpe. */
export function resolveMove(displayName: string) {
  return getMoveByName(displayName);
}

export function speciesOf(pokedexId: number) {
  return getPokemonSpecies(pokedexId);
}
