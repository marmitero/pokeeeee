import { afterEach, describe, expect, it, vi } from "vitest";
import { computeDamage, CRIT_CHANCE, type Combatant } from "./damage";
import { FALLBACK_MOVE, type PokemonMove } from "../pokedex";

/**
 * `Math.random` é fixado em constante para os testes serem determinísticos.
 * Como o valor é sempre o mesmo, não importa quantas vezes a função o consome
 * (accuracy ≥ 100 nem chega a chamar) — a sequência deixa de ser relevante.
 */
function fixRandom(value: number) {
  vi.spyOn(Math, "random").mockReturnValue(value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

const fireMove: PokemonMove = {
  name: "Lança-Chamas",
  type: "Fire",
  power: 90,
  accuracy: 100,
  category: "Special",
  description: "",
  sfx: "flame",
};

const tackleMove: PokemonMove = {
  name: "Investida",
  type: "Normal",
  power: 40,
  accuracy: 100,
  category: "Physical",
  description: "",
  sfx: "slash",
};

const statusMove: PokemonMove = {
  name: "Recuperar",
  type: "Normal",
  power: 0,
  accuracy: 100,
  category: "Status",
  description: "",
  sfx: "heal",
};

function side(overrides: Partial<Combatant> = {}): Combatant {
  return {
    pokedexId: 1,
    name: "Teste",
    types: ["Normal"],
    level: 20,
    hp: 50,
    maxHp: 50,
    attack: 30,
    defense: 30,
    spAttack: 30,
    spDefense: 30,
    speed: 30,
    ...overrides,
  };
}

/**
 * Cálculo de referência (Math.random = 0.5 ⇒ sem crítico, variância 0.925):
 *   base = (((2*20)/5 + 2) * 90 * (35/26)) / 50 + 2 = 26.23076923
 *   STAB 1.5 · tipos 2 (Fire→Grass) · crítico 1 · variância 0.925
 *   26.23076923 * 1.5 * 2 * 0.925 = 72.79  →  72
 */
describe("computeDamage", () => {
  it("aplica a fórmula completa com STAB e efetividade", () => {
    fixRandom(0.5);
    const attacker = side({ types: ["Fire"], spAttack: 35 });
    const defender = side({ types: ["Grass", "Poison"], spDefense: 26 });

    const r = computeDamage(attacker, defender, fireMove);

    expect(r.missed).toBe(false);
    expect(r.critical).toBe(false);
    expect(r.multiplier).toBe(2);
    expect(r.label).toBe("É super efetivo!");
    expect(r.damage).toBe(72);
  });

  it("STAB vale exatamente 1.5x (mesmo golpe, mesmo alvo, só o tipo do atacante muda)", () => {
    fixRandom(0.5);
    const defender = side({ types: ["Grass", "Poison"], spDefense: 26 });

    const comStab = computeDamage(side({ types: ["Fire"], spAttack: 35 }), defender, fireMove);
    const semStab = computeDamage(side({ types: ["Water"], spAttack: 35 }), defender, fireMove);

    // 72.79 → 72  e  48.53 → 48
    expect(comStab.damage).toBe(72);
    expect(semStab.damage).toBe(48);
  });

  it("golpe físico usa attack/defense, não spAttack/spDefense", () => {
    fixRandom(0.5);
    const defender = side({ defense: 25, spDefense: 25 });

    const base = computeDamage(side({ attack: 32, spAttack: 32 }), defender, tackleMove);
    const spAttackAbsurdo = computeDamage(
      side({ attack: 32, spAttack: 9999 }),
      defender,
      tackleMove
    );
    const attackMaior = computeDamage(side({ attack: 64, spAttack: 32 }), defender, tackleMove);

    expect(spAttackAbsurdo.damage).toBe(base.damage); // spAttack irrelevante
    expect(attackMaior.damage).toBeGreaterThan(base.damage); // attack importa
  });

  it("golpe especial usa spAttack/spDefense, não attack/defense", () => {
    fixRandom(0.5);
    const defender = side({ types: ["Grass"], defense: 25, spDefense: 26 });

    const base = computeDamage(side({ types: ["Fire"], attack: 32, spAttack: 35 }), defender, fireMove);
    const attackAbsurdo = computeDamage(
      side({ types: ["Fire"], attack: 9999, spAttack: 35 }),
      defender,
      fireMove
    );

    expect(attackAbsurdo.damage).toBe(base.damage);
  });

  it("crítico multiplica por 1.5", () => {
    // 0.01 < CRIT_CHANCE ⇒ crítico; variância 0.85 + 0.01*0.15 = 0.8515
    fixRandom(0.01);
    expect(0.01).toBeLessThan(CRIT_CHANCE);

    const attacker = side({ types: ["Fire"], spAttack: 35 });
    const defender = side({ types: ["Grass", "Poison"], spDefense: 26 });
    const r = computeDamage(attacker, defender, fireMove);

    // 26.23076923 * 1.5 * 2 * 1.5 * 0.8515 = 100.51 → 100
    expect(r.critical).toBe(true);
    expect(r.damage).toBe(100);
  });

  it("erra quando o sorteio de precisão falha", () => {
    fixRandom(0.99); // 99 < 50 é falso
    const move: PokemonMove = { ...tackleMove, accuracy: 50 };

    const r = computeDamage(side(), side(), move);

    expect(r.missed).toBe(true);
    expect(r.damage).toBe(0);
  });

  it("não erra quando accuracy é 100", () => {
    fixRandom(0.99);
    const r = computeDamage(side(), side(), tackleMove);
    expect(r.missed).toBe(false);
    expect(r.damage).toBeGreaterThan(0);
  });

  it("imunidade zera o dano", () => {
    fixRandom(0.5);
    const r = computeDamage(side({ types: ["Normal"] }), side({ types: ["Ghost"] }), tackleMove);

    expect(r.multiplier).toBe(0);
    expect(r.damage).toBe(0);
    expect(r.label).toBe("Não afeta o oponente...");
  });

  it("golpe de status não causa dano", () => {
    fixRandom(0.5);
    const r = computeDamage(side(), side(), statusMove);

    expect(r.damage).toBe(0);
    expect(r.missed).toBe(false);
    expect(r.label).toBe("Mas nada aconteceu...");
  });

  it("dano nunca é zero quando há efetividade (mínimo 1)", () => {
    fixRandom(0.5);
    const fraco: PokemonMove = { ...tackleMove, power: 1 };
    const r = computeDamage(side({ attack: 1 }), side({ defense: 9999 }), fraco);

    expect(r.damage).toBeGreaterThanOrEqual(1);
  });

  it("defesa zero não derruba a função (divisão protegida)", () => {
    fixRandom(0.5);
    const r = computeDamage(side(), side({ defense: 0 }), tackleMove);

    expect(Number.isFinite(r.damage)).toBe(true);
    expect(r.damage).toBeGreaterThan(0);
  });

  it("FALLBACK_MOVE é um golpe utilizável", () => {
    expect(FALLBACK_MOVE.power).toBeGreaterThan(0);
    expect(FALLBACK_MOVE.accuracy).toBe(100);
  });
});
