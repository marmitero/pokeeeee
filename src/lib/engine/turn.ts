import { computeDamage, type Rng } from "./damage";
import { toBattleMove, toCombatant, type BattleMove, type SideState } from "./combatant";
import { typeMultiplier } from "./types";
import {
  beforeMove,
  inflictStatus,
  residualDamage,
  statusBlockReason,
  thawIfHitByFire,
  type ActiveStatus,
} from "./status";
import type { MoveEffect } from "../pokedex";

/**
 * Um golpe, do começo ao fim (Fase 8.4) — compartilhado por PvE
 * (`battle-service`) e PvP (`pvp-service`), para que as regras de status não
 * divirjam entre os dois motores.
 *
 * Sequência (Gen III):
 *   1. impedimento: sono / congelado / paralisia total (`beforeMove`);
 *   2. acerto e dano (`computeDamage`, com queimadura ×0,5 no físico);
 *   3. golpe de Fogo com dano descongela o alvo;
 *   4. efeito secundário (chance%) ou efeito principal do golpe de Status;
 *   5. quem foi nocauteado não recebe status.
 *
 * O dano residual (veneno/queimadura) fica em `endOfTurn`, aplicado **depois**
 * de os dois lados agirem, como nos jogos.
 */

export interface StrikeResult {
  log: string[];
  /** O atacante conseguiu executar o golpe (não dormia/congelado/paralisado). */
  acted: boolean;
  missed: boolean;
  damage: number;
  /** Status aplicado ao defensor neste golpe, se houve. */
  inflicted: ActiveStatus | null;
}

const defaultRng: Rng = () => Math.random();

/** Golpe de Status pode afetar este alvo agora? (para a IA e para a mensagem de falha) */
export function statusMoveUsable(move: BattleMove, target: SideState): boolean {
  const effect = move.effect;
  if (!effect || move.category !== "Status") return false;
  if (effect.typeChart && typeMultiplier(move.type, target.types) === 0) return false;
  return statusBlockReason(target, effect.status) === null;
}

function applyEffect(
  effect: MoveEffect,
  move: BattleMove,
  defender: SideState,
  rng: Rng,
  isStatusMove: boolean
): { log: string[]; inflicted: ActiveStatus | null } {
  if (defender.hp <= 0) return { log: [], inflicted: null };

  if (isStatusMove) {
    if (effect.typeChart && typeMultiplier(move.type, defender.types) === 0) {
      return { log: [`Não afeta ${defender.displayName}...`], inflicted: null };
    }
    const r = inflictStatus(defender, effect.status, rng);
    return { log: r.log, inflicted: r.applied ? effect.status : null };
  }

  // Efeito secundário de golpe de dano: sorteia a chance; bloqueio é silencioso.
  if (rng() * 100 >= effect.chance) return { log: [], inflicted: null };
  const r = inflictStatus(defender, effect.status, rng, { silentIfBlocked: true });
  return { log: r.log, inflicted: r.applied ? effect.status : null };
}

export function performStrike(
  attacker: SideState,
  defender: SideState,
  move: BattleMove,
  rng: Rng = defaultRng
): StrikeResult {
  const gate = beforeMove(attacker, rng);
  if (!gate.canAct) {
    return { log: gate.log, acted: false, missed: false, damage: 0, inflicted: null };
  }
  let log = [...gate.log];

  const result = computeDamage(toCombatant(attacker), toCombatant(defender), move, rng);
  log.push(`${attacker.displayName} usou ${move.name}!` + (result.missed ? " Mas errou!" : ""));
  if (result.missed) {
    return { log, acted: true, missed: true, damage: 0, inflicted: null };
  }

  const isStatusMove = move.category === "Status";
  if (!isStatusMove) {
    if (result.critical) log.push("Golpe crítico!");
    if (result.label) log.push(result.label);
    log.push(`Causou ${result.damage} de dano.`);
    defender.hp = Math.max(0, defender.hp - result.damage);

    if (result.damage > 0) {
      const thawed = thawIfHitByFire(defender, move.type);
      if (thawed) log.push(thawed);
    }
    // Golpe sem efeito no alvo (imune ao tipo) não aplica status.
    if (result.multiplier === 0) {
      return { log, acted: true, missed: false, damage: 0, inflicted: null };
    }
  } else if (result.label) {
    log.push(result.label);
  }

  let inflicted: ActiveStatus | null = null;
  if (move.effect) {
    const applied = applyEffect(move.effect, move, defender, rng, isStatusMove);
    log = log.concat(applied.log);
    inflicted = applied.inflicted;
  }

  return { log, acted: true, missed: false, damage: result.damage, inflicted };
}

export interface EndOfTurnResult {
  log: string[];
  /** Lados que chegaram a 0 de HP pelo dano residual, na ordem em que caíram. */
  fainted: SideState[];
}

/**
 * Dano residual de fim de turno para os lados informados (na ordem dada —
 * o chamador passa o mais rápido primeiro, como na Gen III).
 */
export function endOfTurn(sides: readonly SideState[]): EndOfTurnResult {
  let log: string[] = [];
  const fainted: SideState[] = [];
  for (const side of sides) {
    if (side.hp <= 0) continue;
    const r = residualDamage(side);
    if (r.damage === 0) continue;
    log = log.concat(r.log);
    if (side.hp <= 0) fainted.push(side);
  }
  return { log, fainted };
}

/**
 * Escolha de golpe do oponente controlado pelo servidor (selvagem, ginásio,
 * boss). Com um golpe de status **útil** (alvo sem status e sem imunidade),
 * usa-o em 40% das vezes — o resto do tempo, um golpe de dano aleatório. Sem
 * golpe de dano (não acontece no catálogo atual), usa o que tiver.
 */
export const STATUS_MOVE_AI_CHANCE = 0.4;

export function chooseOpponentMove(
  opponent: SideState,
  target: SideState,
  rng: Rng = defaultRng
): BattleMove {
  const damaging = opponent.moves.filter((m) => m.category !== "Status" && m.power > 0);
  const useful = opponent.moves.filter((m) => statusMoveUsable(m, target));

  if (useful.length > 0 && (damaging.length === 0 || rng() < STATUS_MOVE_AI_CHANCE)) {
    return useful[Math.floor(rng() * useful.length)]!;
  }
  const pool = damaging.length > 0 ? damaging : opponent.moves;
  return pool[Math.floor(rng() * pool.length)] ?? opponent.moves[0]!;
}

/** Reexport de conveniência para quem monta golpes de teste. */
export { toBattleMove };
