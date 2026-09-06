import {
  computeDelugeStats,
  getPokemonSpecies,
  type DelugeVariant,
  type EvolvesTo,
  type PokemonSpecies,
} from "../pokedex";
import { evolutionItemId } from "../evolution-items";
import type { SideState } from "./combatant";

/**
 * Evolução por nível (Fase 6.3).
 *
 * As regras vivem no catálogo (`PokemonSpecies.evolvesTo`), dirigidas por
 * dados como o learnset da 6.1 — adicionar uma linha evolutiva nova é editar
 * conteúdo, não o motor.
 *
 * O gatilho é avaliado **aqui, no servidor**, dentro do fluxo de level up de
 * `battle-service.ts`. Não existe endpoint de "evoluir" chamável pelo cliente:
 * um cliente adulterado não pode pular o requisito de nível.
 */

/** Segue a cadeia enquanto o nível satisfaz o gatilho. `null` = não evolui. */
export function evolutionAtLevel(pokedexId: number, level: number): number | null {
  let current = pokedexId;
  const visited = new Set<number>([pokedexId]);

  // Duas evoluções encadeadas num salto de nível único (15 → 37) têm que
  // terminar no estágio final. O conjunto de visitados garante término mesmo
  // se um dado futuro criar um ciclo — o teste de sanidade proíbe, mas o
  // motor não pode travar por causa de conteúdo.
  for (let hop = 0; hop < 10; hop++) {
    const species = getPokemonSpecies(current);
    const rule = levelTrigger(species, level);
    if (!rule) return current === pokedexId ? null : current;

    if (visited.has(rule.speciesId)) return current === pokedexId ? null : current;
    visited.add(rule.speciesId);
    current = rule.speciesId;
  }

  return current === pokedexId ? null : current;
}

/** O gatilho de nível da espécie, se o nível alcançado o satisfaz. */
function levelTrigger(species: PokemonSpecies, level: number) {
  const candidates = (species.evolvesTo ?? []).filter(
    (e) => e.trigger === "level" && e.level !== undefined && level >= e.level
  );
  if (candidates.length === 0) return null;
  // Mais de um gatilho de nível satisfeito simultaneamente é dado inválido
  // (o teste de sanidade proíbe); aqui o primeiro vence por determinismo.
  return candidates[0];
}

export interface EvolutionOutcome {
  fromPokedexId: number;
  toPokedexId: number;
  fromName: string;
  toName: string;
}

/**
 * Evolução por item (Fase 6.4-B).
 *
 * O item é consumido na rota `/api/pokemon/manage`, **fora de batalha**. Aqui
 * só existe a regra pura: um item de evolução casa com um gatilho `"item"` da
 * espécie e transforma o combatente. Retorna `null` quando o item não evolui
 * aquela espécie — a rota converte em 400 e **não consome** o item.
 */
export function evolutionWithItem(
  pokedexId: number,
  itemKey: string
): EvolvesTo | null {
  const itemId = evolutionItemId(itemKey);
  if (itemId === null) return null;
  const species = getPokemonSpecies(pokedexId);
  return (species.evolvesTo ?? []).find(
    (e) => e.trigger === "item" && e.itemId === itemId
  ) ?? null;
}

/**
 * Aplica evolução por item ao combatente, no mesmo espírito de `applyEvolution`:
 * stats recalculados, % de HP preservado, apelido mantido, tipos atualizados.
 * Não muda golpes — quem chama deve rodar `refreshMovesForLevel` em seguida.
 */
export function applyItemEvolution(
  side: SideState,
  itemKey: string
): EvolutionOutcome | null {
  const rule = evolutionWithItem(side.pokedexId, itemKey);
  if (!rule) return null;

  const from = getPokemonSpecies(side.pokedexId);
  const to = getPokemonSpecies(rule.speciesId);
  const hpFraction = side.maxHp > 0 ? side.hp / side.maxHp : 1;
  const stats = computeDelugeStats(to, side.level, side.variant as DelugeVariant);
  const hadNickname = side.displayName !== from.name;

  side.pokedexId = to.id;
  side.name = to.name;
  side.types = [...to.types];
  side.displayName = hadNickname ? side.displayName : to.name;
  side.maxHp = stats.maxHp;
  side.hp = Math.max(1, Math.floor(stats.maxHp * hpFraction));
  side.attack = stats.attack;
  side.defense = stats.defense;
  side.spAttack = stats.spAttack;
  side.spDefense = stats.spDefense;
  side.speed = stats.speed;

  return { fromPokedexId: from.id, toPokedexId: to.id, fromName: from.name, toName: to.name };
}

/**
 * Aplica a evolução ao combatente **no lugar**, se o nível atual pedir.
 *
 * Convenções (plano da 6.3):
 * - status recalculados pela nova espécie e variante reais;
 * - **percentual de HP preservado** (evoluir ferido não cura nem mata);
 * - apelido mantido — `displayName` só troca quando não é um apelido;
 * - tipos atualizados (o combatente passa a levar desvantagens da nova forma
 *   ainda na mesma batalha);
 * - falha nunca é silenciosa: espécie alvo fora do catálogo lança
 *   (`getPokemonSpecies`), em vez de deixar o Pokémon meio-evoluído.
 *
 * Retorna o par (de → para) para o log da batalha, ou `null` se não evoluiu.
 */
export function applyEvolution(side: SideState): EvolutionOutcome | null {
  const target = evolutionAtLevel(side.pokedexId, side.level);
  if (target === null || target === side.pokedexId) return null;

  const from = getPokemonSpecies(side.pokedexId);
  const to = getPokemonSpecies(target);

  const hpFraction = side.maxHp > 0 ? side.hp / side.maxHp : 1;
  const stats = computeDelugeStats(to, side.level, side.variant as DelugeVariant);

  const hadNickname = side.displayName !== from.name;

  side.pokedexId = to.id;
  side.name = to.name;
  side.types = [...to.types];
  side.displayName = hadNickname ? side.displayName : to.name;
  side.maxHp = stats.maxHp;
  side.hp = Math.max(1, Math.floor(stats.maxHp * hpFraction));
  side.attack = stats.attack;
  side.defense = stats.defense;
  side.spAttack = stats.spAttack;
  side.spDefense = stats.spDefense;
  side.speed = stats.speed;

  return { fromPokedexId: from.id, toPokedexId: to.id, fromName: from.name, toName: to.name };
}
