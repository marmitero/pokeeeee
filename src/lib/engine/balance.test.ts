import { describe, expect, it } from "vitest";
import {
  capDamage,
  computeDamage,
  maxHitFraction,
  DAMAGE_CAP_END_LEVEL,
  DAMAGE_CAP_MIN_FRACTION,
  type Combatant,
  type Rng,
} from "./damage";
import {
  moveNamesForDb,
  refreshMovesForLevel,
  sideFromSpecies,
  toCombatant,
} from "./combatant";
import { STARTER_LEVEL, battleXpGain, xpToNextLevel } from "./xp";
import { POKEDEX, getPokemonSpecies, moveSlots, movesAtLevel, MOVE_SLOTS } from "../pokedex";

/**
 * Testes de balanceamento da Fase 6.1.
 *
 * O defeito que originou esta fase: um inicial nível 5 nocauteava outro inicial
 * nível 5 em **um golpe** (100% de OHKO com vantagem de tipo, medido). A causa
 * não era a fórmula de dano — era não existir learnset: toda espécie carregava
 * 4 golpes de fim de jogo (poder 80–110) desde o nível 1.
 *
 * Estes testes travam as duas metades da correção (learnset e teto de dano) com
 * RNG determinístico, para que um ajuste futuro de conteúdo não reintroduza o
 * one-shot sem que o CI perceba.
 */

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

describe("teto de dano em níveis baixos", () => {
  it("é mais apertado no começo e some no fim da rampa", () => {
    expect(maxHitFraction(STARTER_LEVEL)).toBe(DAMAGE_CAP_MIN_FRACTION);
    expect(maxHitFraction(DAMAGE_CAP_END_LEVEL)).toBe(1);
    expect(maxHitFraction(DAMAGE_CAP_END_LEVEL + 30)).toBe(1);
    expect(maxHitFraction(12)).toBeGreaterThan(maxHitFraction(8));
  });

  it("não interfere no meio e fim de jogo", () => {
    const alvo: Combatant = {
      pokedexId: 1, name: "x", types: ["Normal"], level: 40,
      hp: 100, maxHp: 100, attack: 50, defense: 50,
      spAttack: 50, spDefense: 50, speed: 50,
    };

    expect(capDamage(999, alvo)).toBe(999);
  });

  it("nunca reduz o dano abaixo de 1", () => {
    const alvo: Combatant = {
      pokedexId: 1, name: "x", types: ["Normal"], level: 2,
      hp: 1, maxHp: 1, attack: 5, defense: 5,
      spAttack: 5, spDefense: 5, speed: 5,
    };

    expect(capDamage(50, alvo)).toBeGreaterThanOrEqual(1);
  });
});

describe("início do jogo (o defeito que abriu a Fase 6.1)", () => {
  it("nenhum inicial nocauteia outro em um golpe no nível 5", () => {
    const rng = seeded(6100);

    for (const attacker of STARTERS) {
      for (const defender of STARTERS) {
        if (attacker === defender) continue;
        const { biggestHit, defenderMaxHp } = turnsToKo(attacker, defender, STARTER_LEVEL, rng);

        expect(biggestHit).toBeLessThan(defenderMaxHp);
      }
    }
  });

  it("todo duelo entre iniciais dura pelo menos 3 turnos no nível 5", () => {
    const rng = seeded(6101);

    for (const attacker of STARTERS) {
      for (const defender of STARTERS) {
        if (attacker === defender) continue;
        const { turns } = turnsToKo(attacker, defender, STARTER_LEVEL, rng);

        expect(turns).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("vantagem de tipo encurta a luta sem decidi-la sozinha", () => {
    const rng = seeded(6102);
    // Charmander (Fogo) contra Bulbasaur (Grama) é a vantagem clássica.
    const comVantagem = turnsToKo(4, 1, STARTER_LEVEL, rng).turns;
    const semVantagem = turnsToKo(4, 7, STARTER_LEVEL, rng).turns;

    expect(comVantagem).toBeLessThan(semVantagem);
    expect(comVantagem).toBeGreaterThanOrEqual(3);
  });

  it("nenhum selvagem do primeiro mapa nocauteia o inicial em um golpe", () => {
    const rng = seeded(6103);
    // Faixa do mapa 1 em seed-maps: níveis 3 a 10.
    for (const wild of [1, 4, 7, 25, 133]) {
      for (const wildLevel of [3, 8, 10]) {
        for (const starter of STARTERS) {
          const attacker = sideFromSpecies(wild, wildLevel, "Normal");
          const defender = sideFromSpecies(starter, STARTER_LEVEL, "Normal");

          for (const move of attacker.moves) {
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

describe("curva de progressão", () => {
  it("subir do nível inicial custa entre 2 e 4 vitórias", () => {
    const bulbasaur = getPokemonSpecies(1);
    const total =
      bulbasaur.baseHp + bulbasaur.baseAtk + bulbasaur.baseDef +
      bulbasaur.baseSpAtk + bulbasaur.baseSpDef + bulbasaur.baseSpd;

    const battles = xpToNextLevel(STARTER_LEVEL) / battleXpGain(total, STARTER_LEVEL, STARTER_LEVEL);

    expect(battles).toBeGreaterThanOrEqual(2);
    expect(battles).toBeLessThanOrEqual(4);
  });

  it("o meio de jogo não vira grind (nunca mais que 8 vitórias por nível)", () => {
    const total = 318;

    for (const level of [10, 15, 20, 25, 30, 40]) {
      const battles = xpToNextLevel(level) / battleXpGain(total, level, level);
      expect(battles).toBeLessThanOrEqual(8);
    }
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
