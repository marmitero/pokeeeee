import type { PokemonMove } from "../pokedex";
import { effectivenessLabel, typeMultiplier } from "./types";
import { BURN_PHYSICAL_MULT, type StatusCondition } from "./status";

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
  /** Presente nos golpes de Status com efeito real (8.4); ausente em dado legado. */
  effect?: unknown;
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
  /** Fase 8.4: queimadura corta o dano físico pela metade. Opcional para chamadores antigos. */
  status?: StatusCondition;
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

// ── Amortecimento de dano em níveis baixos (Fase 6.1 → aposentado na 6.2-C) ─
//
// Entre a 6.1 e a 6.2-C existiu um teto de dano por golpe: no nível 5 um golpe
// não podia arrancar mais que 30% do HP máximo do alvo, soltando linearmente
// até 100% no nível 30. Era um remédio para a ausência de learnset. Com o
// learnset maduro e os golpes fracos confinados à faixa 15–35 (6.2-C), o teto
// passou a **saturar em quase qualquer golpe** e a apagar a diferença entre um
// golpe fraco e um forte — medida em `scripts/balance-report.mts`, qualquer
// poder acima de ~8 batia no máximo já no nível 5. A proteção do início do
// jogo agora é conteúdo (golpes 15–35 + mapa 1 com criaturas de nível 2–7 sem
// vantagem de elemento), não motor. Não reintroduzir sem remensurar tudo.

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

  // Golpe de Status (Fase 8.4): não causa dano — o efeito é aplicado pelo
  // motor de turno (`battle-service`/`pvp-service`) via `applyMoveEffect`.
  // Sem efeito declarado (dado legado), continua sendo "nada aconteceu".
  if (move.category === "Status") {
    return {
      damage: 0, missed: false, critical: false, multiplier: 1,
      label: move.effect ? null : "Mas nada aconteceu...",
    };
  }

  const critical = rollCritical(rng);
  const atk = move.category === "Special" ? attacker.spAttack : attacker.attack;
  const def = move.category === "Special" ? defender.spDefense : defender.defense;

  const stab = attacker.types.includes(move.type) ? STAB_MULT : 1;
  const multiplier = typeMultiplier(move.type, defender.types);
  const random = MIN_RANDOM + rng() * (MAX_RANDOM - MIN_RANDOM);
  // Fase 8.4 (Gen III): atacante queimado causa metade do dano físico.
  const burn = attacker.status === "BRN" && move.category === "Physical" ? BURN_PHYSICAL_MULT : 1;

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
    burn *
    random;

  return {
    damage: Math.max(1, Math.floor(base)),
    missed: false,
    critical,
    multiplier,
    label: effectivenessLabel(multiplier),
  };
}
