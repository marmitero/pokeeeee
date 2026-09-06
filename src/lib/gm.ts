import {
  computeDelugeStats,
  getPokemonSpecies,
  movesAtLevel,
  moveSlots,
  type DelugeVariant,
} from "./pokedex";
import { xpToNextLevel } from "./engine/xp";
import {
  moveNamesForDb,
  refreshMovesForLevel,
  sideFromUserPokemon,
} from "./engine/combatant";
import { applyEvolution, evolutionAtLevel } from "./engine/evolution";

/**
 * Lógica dos comandos GM do painel admin (ferramenta de teste).
 *
 * Objetivo: agilizar a validação manual do jogo (checklist de pendências)
 * sem depender de grind — subir nível, dar Pokémon, dar item, dar dinheiro,
 * curar e teletransportar um treinador.
 *
 * Regras de design:
 * - **Mesmo caminho do motor de batalha**: level up recalcula status com
 *   `computeDelugeStats`, aprende golpes do learnset com `refreshMovesForLevel`
 *   e aplica a evolução com `applyEvolution` — o GM não cria um segundo
 *   conjunto de regras que possa divergir do que a vitória de verdade faz.
 * - Nível direto **cura o Pokémon** (HP cheio): estado previsível para teste.
 * - Evoluir por salto grande segue a cadeia até o estágio final (mesma
 *   semântica do catch-up da 6.3); descer de nível **nunca** desevolui.
 * - Funções puras: o banco é tocado apenas na rota (`/api/admin`), que é
 *   onde o papel `admin` é exigido e a ação auditada.
 */

/** Linha `user_pokemon` no formato que o motor de batalha consome. */
export type GmPokemonRow = Parameters<typeof sideFromUserPokemon>[0];

export interface GmLevelResult {
  pokedexId: number;
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
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
  /** Preenchido quando o level up cruzou um gatilho de evolução. */
  evolved: { fromName: string; toName: string } | null;
  /** Golpes novos aprendidos neste level up (para a mensagem da UI). */
  newMoves: string[];
}

/**
 * O que o banco precisa receber para um `gm_set_level`: status do novo nível
 * (HP cheio), evolução pendente resolvida e golpes do learnset.
 */
export function gmSetLevel(row: GmPokemonRow, targetLevel: number): GmLevelResult {
  const side = sideFromUserPokemon(row);

  side.level = targetLevel;

  // Status do nível novo com a espécie e a variante reais, HP cheio.
  const stats = computeDelugeStats(
    getPokemonSpecies(side.pokedexId),
    targetLevel,
    side.variant as DelugeVariant
  );
  side.hp = stats.hp;
  side.maxHp = stats.maxHp;
  side.attack = stats.attack;
  side.defense = stats.defense;
  side.spAttack = stats.spAttack;
  side.spDefense = stats.spDefense;
  side.speed = stats.speed;

  // Evolução por nível (catch-up): ratio de HP = 1, então evoluir continua
  // com HP cheio. Sem gatilho atingido = no-op.
  const evolution = applyEvolution(side);

  // Golpes do learnset no nível alcançado (aprende o que faltou, esquece o
  // mais antigo — a mesma regra da batalha real).
  const newMoves = refreshMovesForLevel(side, targetLevel);
  const { move1, move2, move3, move4 } = moveNamesForDb(side);

  return {
    pokedexId: side.pokedexId,
    name: side.name,
    level: side.level,
    // XP reinicia no nível novo: barra previsível, sem carry-over de curva.
    xp: 0,
    xpToNextLevel: xpToNextLevel(side.level),
    hp: side.hp,
    maxHp: side.maxHp,
    attack: side.attack,
    defense: side.defense,
    spAttack: side.spAttack,
    spDefense: side.spDefense,
    speed: side.speed,
    move1,
    move2,
    move3,
    move4,
    evolved: evolution ? { fromName: evolution.fromName, toName: evolution.toName } : null,
    newMoves,
  };
}

export interface GmNewPokemon {
  pokedexId: number;
  name: string;
  nickname: string | null;
  variant: DelugeVariant;
  level: number;
  xp: number;
  xpToNextLevel: number;
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
  isStarter: boolean;
  /** Espécie pedida, quando ela já teria evoluído no nível solicitado. */
  evolvedFrom: string | null;
}

/**
 * Monta a linha de um `gm_give_pokemon` (pronta para INSERT, sem o `userId`).
 *
 * Se o nível pedido já satisfaz gatilhos de evolução, o Pokémon chega no
 * estágio correspondente (Charmander pedido no nível 40 vira Charizard) —
 * estado de banco que o motor consideraria impossível, então melhor não
 * criá-lo.
 */
export function gmCreatePokemon(
  pokedexId: number,
  level: number,
  variant: DelugeVariant,
  nickname: string | null
): GmNewPokemon {
  const finalId = evolutionAtLevel(pokedexId, level) ?? pokedexId;
  const species = getPokemonSpecies(finalId);
  const stats = computeDelugeStats(species, level, variant);
  const { move1, move2, move3, move4 } = moveSlots(movesAtLevel(species, level));

  return {
    pokedexId: species.id,
    name: species.name,
    nickname,
    variant,
    level,
    xp: 0,
    xpToNextLevel: xpToNextLevel(level),
    hp: stats.hp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    spAttack: stats.spAttack,
    spDefense: stats.spDefense,
    speed: stats.speed,
    move1,
    move2,
    move3,
    move4,
    isStarter: false,
    evolvedFrom: finalId !== pokedexId ? getPokemonSpecies(pokedexId).name : null,
  };
}
