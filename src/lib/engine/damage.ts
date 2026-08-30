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

export function rollHit(move: DamageMove): boolean {
  if (move.accuracy >= 100) return true;
  return Math.random() * 100 < move.accuracy;
}

export function rollCritical(): boolean {
  return Math.random() < CRIT_CHANCE;
}

export function computeDamage(
  attacker: Combatant,
  defender: Combatant,
  move: DamageMove
): DamageResult {
  if (!rollHit(move)) {
    return { damage: 0, missed: true, critical: false, multiplier: 1, label: null };
  }

  // Golpes de status existem no catálogo, mas ainda não têm efeito próprio.
  if (move.category === "Status") {
    return {
      damage: 0, missed: false, critical: false, multiplier: 1,
      label: "Mas nada aconteceu...",
    };
  }

  const critical = rollCritical();
  const atk = move.category === "Special" ? attacker.spAttack : attacker.attack;
  const def = move.category === "Special" ? defender.spDefense : defender.defense;

  const stab = attacker.types.includes(move.type) ? STAB_MULT : 1;
  const multiplier = typeMultiplier(move.type, defender.types);
  const random = MIN_RANDOM + Math.random() * (MAX_RANDOM - MIN_RANDOM);

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
    damage: Math.max(1, Math.floor(base)),
    missed: false,
    critical,
    multiplier,
    label: effectivenessLabel(multiplier),
  };
}
