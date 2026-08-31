import type { PokemonMove } from "../pokedex";
import { effectivenessLabel, typeMultiplier } from "./types";

/**
 * O mínimo que a fórmula de dano precisa de um golpe.
 *
 * Declarado estruturalmente (e não como `PokemonMove`) para que o PvP possa
 * passar os golpes vindos do `SideState`, que não carregam `sfx`.
 */
export interface DamageMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  category: string;
}

/**
 * Fórmula de dano (Fase 2).
 *
 * Substitui `(level * 2.4 + 14) * crit`, que ignorava `power`, `accuracy`,
 * `category`, STAB, tipos e os próprios status — os 4 golpes de um Pokémon
 * causavam dano idêntico e o nome do golpe era só texto.
 *
 * Baseada na fórmula clássica:
 *   base = ((2*level/5 + 2) * power * (Atk/Def)) / 50 + 2
 *   dano = base * STAB * tipos * crítico * aleatório(0.85–1.00)
 */

export interface Combatant {
  pokedexId: number;
  name: string;
  types: string[];
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface DamageResult {
  damage: number;
  missed: boolean;
  critical: boolean;
  multiplier: number;
  label: string | null;
}

export const CRIT_CHANCE = 1 / 16;
export const CRIT_MULT = 1.5;
const STAB_MULT = 1.5;
const MIN_RANDOM = 0.85;
const MAX_RANDOM = 1.0;

/**
 * Fonte de aleatoriedade injetável (Fase 6.1).
 *
 * O motor sorteava `Math.random()` direto, o que tornava impossível testar
 * balanceamento com semente fixa sem espionar o global. Agora todo sorteio
 * passa por aqui; o padrão continua sendo `Math.random`.
 */
export type Rng = () => number;

const defaultRng: Rng = () => Math.random();

// ── Amortecimento de dano em níveis baixos (Fase 6.1) ─────────────────────
//
// A fórmula clássica assume o pool de HP do meio/fim de jogo. No nível 5 um
// Pokémon tem ~20 de HP, e qualquer golpe com STAB e vantagem de tipo passa
// disso sozinho. Em vez de distorcer a fórmula, limitamos quanto **uma única
// pancada** pode arrancar do HP máximo do alvo, e soltamos esse limite
// conforme o nível sobe. A partir de `DAMAGE_CAP_END_LEVEL` não há teto algum
// e o combate volta a ser 100% a fórmula clássica.
export const DAMAGE_CAP_START_LEVEL = 5;
export const DAMAGE_CAP_END_LEVEL = 30;
export const DAMAGE_CAP_MIN_FRACTION = 0.3;

/** Fração máxima do HP máximo que um golpe pode tirar, dado o nível do alvo. */
export function maxHitFraction(defenderLevel: number): number {
  if (defenderLevel >= DAMAGE_CAP_END_LEVEL) return 1;
  if (defenderLevel <= DAMAGE_CAP_START_LEVEL) return DAMAGE_CAP_MIN_FRACTION;

  const span = DAMAGE_CAP_END_LEVEL - DAMAGE_CAP_START_LEVEL;
  const progress = (defenderLevel - DAMAGE_CAP_START_LEVEL) / span;
  return DAMAGE_CAP_MIN_FRACTION + (1 - DAMAGE_CAP_MIN_FRACTION) * progress;
}

/** Aplica o teto de dano por golpe. Nunca reduz o dano abaixo de 1. */
export function capDamage(damage: number, defender: Combatant): number {
  const fraction = maxHitFraction(defender.level);
  if (fraction >= 1) return damage;

  const cap = Math.max(1, Math.ceil(defender.maxHp * fraction));
  return Math.min(damage, cap);
}

export function rollHit(move: DamageMove, rng: Rng = defaultRng): boolean {
  if (move.accuracy >= 100) return true;
  return rng() * 100 < move.accuracy;
}

export function rollCritical(rng: Rng = defaultRng): boolean {
  return rng() < CRIT_CHANCE;
}

export function computeDamage(
  attacker: Combatant,
  defender: Combatant,
  move: DamageMove,
  rng: Rng = defaultRng
): DamageResult {
  if (!rollHit(move, rng)) {
    return { damage: 0, missed: true, critical: false, multiplier: 1, label: null };
  }

  // Golpes de status existem no catálogo, mas ainda não têm efeito próprio.
  if (move.category === "Status") {
    return {
      damage: 0, missed: false, critical: false, multiplier: 1,
      label: "Mas nada aconteceu...",
    };
  }

  const critical = rollCritical(rng);
  const atk = move.category === "Special" ? attacker.spAttack : attacker.attack;
  const def = move.category === "Special" ? defender.spDefense : defender.defense;

  const stab = attacker.types.includes(move.type) ? STAB_MULT : 1;
  const multiplier = typeMultiplier(move.type, defender.types);
  const random = MIN_RANDOM + rng() * (MAX_RANDOM - MIN_RANDOM);

  if (multiplier === 0) {
    return { damage: 0, missed: false, critical: false, multiplier: 0,
             label: effectivenessLabel(0) };
  }

  const base =
    ((((2 * attacker.level) / 5 + 2) * move.power * (atk / Math.max(1, def))) /
      50 +
      2) *
    stab *
    multiplier *
    (critical ? CRIT_MULT : 1) *
    random;

  return {
    damage: capDamage(Math.max(1, Math.floor(base)), defender),
    missed: false,
    critical,
    multiplier,
    label: effectivenessLabel(multiplier),
  };
}
