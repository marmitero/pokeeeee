import { describe, expect, it } from "vitest";
import { computeDamage, type Rng } from "./damage";
import { typeMultiplier } from "./types";
import {
  moveNamesForDb,
  refreshMovesForLevel,
  sideFromSpecies,
  toCombatant,
} from "./combatant";
import { STARTER_LEVEL, battleXpGain, xpToNextLevel } from "./xp";
import { POKEDEX, getPokemonSpecies, moveSlots, movesAtLevel, MOVE_SLOTS } from "../pokedex";

/**
 * Testes de balanceamento (Fase 6.1, ajustados na 6.2-C).
 *
 * O defeito que originou a 6.1: um inicial nível 5 nocauteava outro inicial
 * nível 5 em **um golpe** (100% de OHKO com vantagem de tipo, medido). A causa
 * não era a fórmula de dano — era não existir learnset: toda espécie carregava
 * 4 golpes de fim de jogo (poder 80–110) desde o nível 1.
 *
 * A 6.1 corrigiu com learnset + teto de dano proporcional ao HP. A 6.2-C
 * **aposentou o teto** (ele saturava em quase qualquer golpe e apagava a
 * diferença entre fraco e forte) e transferiu a proteção do início para o
 * conteúdo: golpes fracos na faixa 15–35 para iniciais e bichos dos primeiros
 * mapas, e mapa 1 planejado com criaturas de nível 2–7 sem vantagem de
 * elemento contra os iniciais. Estes testes travam esse contrato com RNG
 * determinístico — um ajuste futuro de conteúdo não pode reintroduzir o
 * one-shot sem que o CI perceba.
 */

/** Espécies da tabela de encontro do primeiro mapa (seed-maps: vale-pallet). */
const MAP1_SPECIES = [1, 4, 7, 25, 133];

/** Mulberry32: mesma semente, mesma sequência — sem espionar `Math.random`. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARTERS = [1, 4, 7];

/** Turnos para nocautear, sempre com o golpe mais forte disponível. */
function turnsToKo(attackerId: number, defenderId: number, level: number, rng: Rng) {
  const attacker = sideFromSpecies(attackerId, level, "Normal");
  const defender = sideFromSpecies(defenderId, level, "Normal");

  let worst = Infinity;
  let biggestHit = 0;

  for (const move of attacker.moves) {
    if (move.category === "Status") continue;

    let hp = defender.maxHp;
    let turns = 0;

    while (hp > 0 && turns < 100) {
      const result = computeDamage(toCombatant(attacker), toCombatant(defender), move, rng);
      biggestHit = Math.max(biggestHit, result.damage);
      hp -= result.damage;
      turns += 1;
    }

    worst = Math.min(worst, turns);
  }

  return { turns: worst, biggestHit, defenderMaxHp: defender.maxHp };
}

describe("learnset", () => {
  it("toda espécie conhece pelo menos um golpe no nível 1", () => {
    for (const species of POKEDEX) {
      expect(movesAtLevel(species, 1).length).toBeGreaterThan(0);
    }
  });

  it("nenhuma espécie começa com golpe de fim de jogo", () => {
    for (const species of POKEDEX) {
      for (const move of movesAtLevel(species, STARTER_LEVEL)) {
        // Era exatamente isto que quebrava o início: poder 80–110 no nível 5.
        expect(move.power).toBeLessThanOrEqual(60);
      }
    }
  });

  it("nunca devolve mais golpes do que os slots disponíveis", () => {
    for (const species of POKEDEX) {
      for (const level of [1, 5, 20, 50, 100]) {
        expect(movesAtLevel(species, level).length).toBeLessThanOrEqual(MOVE_SLOTS);
      }
    }
  });

  it("iniciais e bichos do primeiro mapa: golpes até o nível 7 na faixa 15–35 (6.2-C)", () => {
    // A faixa foi medida contra o "+2" constante da fórmula: abaixo de 15 o
    // dano é achatado (5/10/15 são quase iguais); acima de ~35 um golpe tipado
    // com STAB + vantagem nocauteia um inicial de nível 5 num crítico.
    for (const id of MAP1_SPECIES) {
      const species = getPokemonSpecies(id);
      for (const entry of species.learnset) {
        if (entry.level > 7) continue;
        expect(entry.move.power, `${species.name} lvl ${entry.level}: ${entry.move.name}`).toBeGreaterThanOrEqual(15);
        expect(entry.move.power, `${species.name} lvl ${entry.level}: ${entry.move.name}`).toBeLessThanOrEqual(35);
      }
    }
  });

  it("o conjunto de golpes só melhora com o nível", () => {
    for (const species of POKEDEX) {
      const early = movesAtLevel(species, STARTER_LEVEL);
      const late = movesAtLevel(species, 100);
      const bestEarly = Math.max(...early.map((m) => m.power));
      const bestLate = Math.max(...late.map((m) => m.power));

      expect(bestLate).toBeGreaterThanOrEqual(bestEarly);
    }
  });

  it("nível abaixo do primeiro aprendizado ainda devolve um golpe", () => {
    const species = getPokemonSpecies(1);
    const inventado = { learnset: species.learnset.map((e) => ({ ...e, level: 10 })) };

    expect(movesAtLevel(inventado, 1)).toHaveLength(1);
  });

  it("todo golpe do learnset existe de fato no catálogo", () => {
    for (const species of POKEDEX) {
      for (const entry of species.learnset) {
        expect(entry.move).toBeDefined();
        expect(entry.move.name.length).toBeGreaterThan(0);
        expect(entry.level).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe("início do jogo sem teto de dano (proteção é conteúdo, 6.2-C)", () => {
  it("nenhum inicial nocauteia outro em um golpe no nível 5 (nem com crítico)", () => {
    const rng = seeded(6100);

    for (const attacker of STARTERS) {
      for (const defender of STARTERS) {
        if (attacker === defender) continue;
        const { biggestHit, defenderMaxHp } = turnsToKo(attacker, defender, STARTER_LEVEL, rng);

        expect(biggestHit).toBeLessThan(defenderMaxHp);
      }
    }
  });

  it("todo duelo entre iniciais dura pelo menos 2 turnos no nível 5", () => {
    const rng = seeded(6101);

    for (const attacker of STARTERS) {
      for (const defender of STARTERS) {
        if (attacker === defender) continue;
        const { turns } = turnsToKo(attacker, defender, STARTER_LEVEL, rng);

        expect(turns).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("vantagem de tipo encurta a luta sem decidi-la sozinha", () => {
    const rng = seeded(6102);
    // Charmander (Fogo) contra Bulbasaur (Grama) é a vantagem clássica.
    // Sem o teto da 6.1, a vantagem volta a valer ~2 turnos contra ~7 —
    // era isso que o teto achatava (4,0 x 5,1 na medição antiga).
    const comVantagem = turnsToKo(4, 1, STARTER_LEVEL, rng).turns;
    const semVantagem = turnsToKo(4, 7, STARTER_LEVEL, rng).turns;

    expect(comVantagem).toBeLessThan(semVantagem);
    expect(comVantagem).toBeGreaterThanOrEqual(2);
  });

  it("selvagem 2–7 sem dupla vantagem não nocauteia o inicial de nível 5 (nem com crítico)", () => {
    const rng = seeded(6103);
    // Faixa planejada para o mapa 1 na 6.2-C: níveis 2–7. Sem o teto, o que
    // protege o jogador é conteúdo: golpes 15–35 e nenhuma espécie com STAB +
    // vantagem de tipo contra os iniciais no mapa 1. Este teste cobre a parte
    // que o motor garante sozinho: fora STAB+super (multiplicador combinado
    // acima de 2), nenhum golpe vindo de um selvagem 2–7 derruba um inicial
    // de nível 5 em um golpe.
    for (const wild of MAP1_SPECIES) {
      for (let wildLevel = 2; wildLevel <= 7; wildLevel++) {
        const attacker = sideFromSpecies(wild, wildLevel, "Normal");

        for (const starter of STARTERS) {
          const defender = sideFromSpecies(starter, STARTER_LEVEL, "Normal");

          for (const move of attacker.moves) {
            if (move.category === "Status") continue;
            const stab = attacker.types.includes(move.type) ? 1.5 : 1;
            const multiplier = typeMultiplier(move.type, defender.types);
            if (stab * multiplier > 2) continue; // contrato de conteúdo do mapa 1

            let biggest = 0;
            for (let i = 0; i < 50; i++) {
              const r = computeDamage(toCombatant(attacker), toCombatant(defender), move, rng);
              biggest = Math.max(biggest, r.damage);
            }
            expect(biggest).toBeLessThan(defender.maxHp);
          }
        }
      }
    }
  });
});

describe("curva de progressão (nível³ × 0,8 — decisão 6.2-C)", () => {
  it("subir do nível inicial custa entre 2 e 4 vitórias", () => {
    const bulbasaur = getPokemonSpecies(1);
    const total =
      bulbasaur.baseHp + bulbasaur.baseAtk + bulbasaur.baseDef +
      bulbasaur.baseSpAtk + bulbasaur.baseSpDef + bulbasaur.baseSpd;

    const battles = xpToNextLevel(STARTER_LEVEL) / battleXpGain(total, STARTER_LEVEL, STARTER_LEVEL);

    expect(battles).toBeGreaterThanOrEqual(2);
    expect(battles).toBeLessThanOrEqual(4);
  });

  it("a progressão fica mais lenta conforme o nível sobe (o jogo é difícil de evoluir)", () => {
    // Decisão registrada do mantenedor na 6.2-C: a 6.1 achava que o meio de
    // jogo "virava grind" (>8 vitórias/nível) e achatou a curva. A 6.2-C
    // aceita o custo crescente como design — medido: lvl 10→4,8 · 25→11,2 ·
    // 40→17,7 batalhas contra alvos do próprio nível.
    const total = 318;
    const battles = (level: number) => xpToNextLevel(level) / battleXpGain(total, level, level);

    expect(battles(10)).toBeGreaterThan(battles(5));
    expect(battles(25)).toBeGreaterThan(battles(10));
    expect(battles(40)).toBeGreaterThan(2 * battles(10));
  });
});

describe("aprendizado de golpes ao subir de nível", () => {
  it("o Pokémon troca os golpes fracos pelos do novo nível", () => {
    const charmander = sideFromSpecies(4, STARTER_LEVEL, "Normal");
    const antes = charmander.moves.map((m) => m.name);

    const aprendidos = refreshMovesForLevel(charmander, 24);
    const depois = charmander.moves.map((m) => m.name);

    expect(antes.length).toBeLessThanOrEqual(MOVE_SLOTS);
    expect(aprendidos.length).toBeGreaterThan(0);
    expect(depois).not.toEqual(antes);
    // Todo golpe anunciado como novo está de fato no conjunto atual.
    for (const nome of aprendidos) expect(depois).toContain(nome);
  });

  it("não anuncia aprendizado quando o nível não desbloqueia nada", () => {
    const charmander = sideFromSpecies(4, STARTER_LEVEL, "Normal");

    expect(refreshMovesForLevel(charmander, STARTER_LEVEL + 1)).toEqual([]);
  });

  it("slot sem golpe fica vazio em vez de repetir o primeiro", () => {
    const charmander = sideFromSpecies(4, STARTER_LEVEL, "Normal");
    const slots = moveNamesForDb(charmander);

    expect(slots.move1.length).toBeGreaterThan(0);
    // No nível 5 o Charmander conhece 2 golpes: repetir encheria a interface
    // de golpes que ele não tem.
    expect(slots.move3).toBe("");
    expect(slots.move4).toBe("");
  });

  it("moveSlots nunca devolve mais que os 4 slots", () => {
    const muitos = movesAtLevel(getPokemonSpecies(6), 100);
    const slots = moveSlots([...muitos, ...muitos]);

    expect(Object.values(slots).filter((v) => v.length > 0).length).toBeLessThanOrEqual(MOVE_SLOTS);
  });
});
