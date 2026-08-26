import {
  computeDelugeStats,
  getPokemonSpecies,
  getMoveByName,
  type DelugeVariant,
} from "../pokedex";
import type { Combatant } from "./damage";

/**
 * Construção dos combatentes de uma batalha (Fase 2).
 *
 * Ponto central da correção **B4**: quando o combatente é gerado do zero
 * (selvagem ou ginásio), os status são calculados com a variante **real**.
 * Antes a captura gravava `variant: "Shiny"` mas chamava
 * `computeDelugeStats(..., "Normal")` — o jogador via o selo dourado e a aura,
 * mas recebia status de um Normal.
 */

export interface BattleMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  category: string;
  description: string;
}

export interface SideState extends Combatant {
  displayName: string;
  variant: string;
  /** XP acumulado dentro do nível atual. Só faz sentido para o jogador. */
  xp: number;
  moves: BattleMove[];
  /** Id em `user_pokemon`; `null` para oponente (selvagem / ginásio). */
  userPokemonId: number | null;
}

type UserPokemonRow = {
  id: number;
  pokedexId: number;
  nickname: string | null;
  name: string;
  variant: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  xp: number;
};

function movesOf(row: UserPokemonRow): BattleMove[] {
  return [row.move1, row.move2, row.move3, row.move4]
    .filter(Boolean)
    .map((name) => {
      const move = getMoveByName(name);
      return {
        name: move.name,
        type: move.type,
        power: move.power,
        accuracy: move.accuracy,
        category: move.category,
        description: move.description,
      };
    });
}

/** Combatente a partir de um Pokémon do jogador (status já persistidos). */
export function sideFromUserPokemon(row: UserPokemonRow): SideState {
  const species = getPokemonSpecies(row.pokedexId);

  return {
    pokedexId: row.pokedexId,
    name: species.name,
    displayName: row.nickname || row.name,
    variant: row.variant,
    types: [...species.types],
    level: row.level,
    xp: row.xp,
    hp: row.hp,
    maxHp: row.maxHp,
    attack: row.attack,
    defense: row.defense,
    spAttack: row.spAttack,
    spDefense: row.spDefense,
    speed: row.speed,
    moves: movesOf(row),
    userPokemonId: row.id,
  };
}

/**
 * Combatente gerado do zero (selvagem ou líder de ginásio).
 * A variante **afeta os status** — é a correção do B4.
 */
export function sideFromSpecies(
  pokedexId: number,
  level: number,
  variant: DelugeVariant,
  opts?: { displayName?: string }
): SideState {
  const species = getPokemonSpecies(pokedexId);
  const stats = computeDelugeStats(species, level, variant);

  return {
    pokedexId: species.id,
    name: species.name,
    displayName: opts?.displayName || species.name,
    variant,
    types: [...species.types],
    level,
    xp: 0,
    hp: stats.hp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    spAttack: stats.spAttack,
    spDefense: stats.spDefense,
    speed: stats.speed,
    moves: species.moves.map((m) => ({
      name: m.name,
      type: m.type,
      power: m.power,
      accuracy: m.accuracy,
      category: m.category,
      description: m.description,
    })),
    userPokemonId: null,
  };
}

/** Reduz um `SideState` ao contrato de `computeDamage`. */
export function toCombatant(side: SideState): Combatant {
  return {
    pokedexId: side.pokedexId,
    name: side.name,
    types: side.types,
    level: side.level,
    hp: side.hp,
    maxHp: side.maxHp,
    attack: side.attack,
    defense: side.defense,
    spAttack: side.spAttack,
    spDefense: side.spDefense,
    speed: side.speed,
  };
}
