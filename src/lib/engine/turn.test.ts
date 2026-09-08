import { describe, expect, it } from "vitest";
import { ALL_MOVES } from "../pokedex";
import { sideFromSpecies, toBattleMove, type SideState } from "./combatant";
import { computeDamage, type Rng } from "./damage";
import { chooseOpponentMove, endOfTurn, performStrike, statusMoveUsable } from "./turn";

/**
 * Motor de golpe compartilhado (Fase 8.4): impedimento → dano → descongelar →
 * efeito. RNG determinístico por sequência para não depender de sorte.
 */

/** RNG que devolve a sequência dada e depois 0.5. */
function seq(values: number[]): Rng {
  let i = 0;
  return () => (i < values.length ? values[i++]! : 0.5);
}

function side(id: number, level = 30, over: Partial<SideState> = {}): SideState {
  return { ...sideFromSpecies(id, level, "Normal"), ...over };
}

describe("performStrike", () => {
  it("golpe de Status aplica o efeito sem causar dano", () => {
    const pikachu = side(25);
    const squirtle = side(7);
    const r = performStrike(pikachu, squirtle, toBattleMove(ALL_MOVES.ThunderWave), seq([0.5, 0.5]));
    expect(r.acted).toBe(true);
    expect(r.damage).toBe(0);
    expect(r.inflicted).toBe("PAR");
    expect(squirtle.status).toBe("PAR");
    expect(squirtle.hp).toBe(squirtle.maxHp);
    expect(r.log).toContain("Pikachu usou Onda Trovão!");
    expect(r.log.some((l) => l.includes("paralisado"))).toBe(true);
  });

  it("Onda Trovão não afeta tipo Terra (typeChart) e avisa", () => {
    const pikachu = side(25);
    const geodude = side(74); // Rock/Ground
    const r = performStrike(pikachu, geodude, toBattleMove(ALL_MOVES.ThunderWave), seq([0.5]));
    expect(r.inflicted).toBeNull();
    expect(geodude.status).toBe("NONE");
    expect(r.log).toContain("Não afeta Geodude...");
  });

  it("golpe de Status contra alvo já afetado falha com aviso", () => {
    const pikachu = side(25);
    const squirtle = side(7, 30, { status: "BRN" });
    const r = performStrike(pikachu, squirtle, toBattleMove(ALL_MOVES.ThunderWave), seq([0.5]));
    expect(r.inflicted).toBeNull();
    expect(r.log).toContain("Squirtle já está queimado!");
  });

  it("efeito secundário: Brasa queima quando a rolagem cai na chance (10%)", () => {
    const charmander = side(4);
    const bulbasaur = side(1);
    // rng: acerto (acc 100 → não consome), crítico 0.9, aleatório 0.5, efeito 0.05 (< 10%)
    const r = performStrike(charmander, bulbasaur, toBattleMove(ALL_MOVES.Ember), seq([0.9, 0.5, 0.05]));
    expect(r.damage).toBeGreaterThan(0);
    expect(r.inflicted).toBe("BRN");
    expect(bulbasaur.status).toBe("BRN");
  });

  it("efeito secundário: rolagem acima da chance não aplica e fica em silêncio", () => {
    const charmander = side(4);
    const bulbasaur = side(1);
    const r = performStrike(charmander, bulbasaur, toBattleMove(ALL_MOVES.Ember), seq([0.9, 0.5, 0.95]));
    expect(r.damage).toBeGreaterThan(0);
    expect(r.inflicted).toBeNull();
    expect(r.log.some((l) => l.includes("queimado"))).toBe(false);
  });

  it("efeito secundário bloqueado por imunidade é silencioso (Brasa em tipo Fogo)", () => {
    const a = side(4);
    const vulpix = side(37);
    const r = performStrike(a, vulpix, toBattleMove(ALL_MOVES.Ember), seq([0.9, 0.5, 0.0]));
    expect(r.inflicted).toBeNull();
    expect(vulpix.status).toBe("NONE");
    expect(r.log.some((l) => l.includes("Não afeta"))).toBe(false);
  });

  it("alvo nocauteado não recebe status", () => {
    const a = side(4, 60);
    const target = side(1, 5, { hp: 1 });
    const r = performStrike(a, target, toBattleMove(ALL_MOVES.Ember), seq([0.9, 0.5, 0.0]));
    expect(target.hp).toBe(0);
    expect(r.inflicted).toBeNull();
  });

  it("dormindo não age; acorda e age no mesmo turno quando o contador zera", () => {
    const a = side(4, 30, { status: "SLP", statusTurns: 2 });
    const b = side(1);
    const r1 = performStrike(a, b, toBattleMove(ALL_MOVES.Ember), seq([0.9, 0.5, 0.9]));
    expect(r1.acted).toBe(false);
    expect(b.hp).toBe(b.maxHp);
    expect(r1.log[0]).toContain("dormindo");

    const r2 = performStrike(a, b, toBattleMove(ALL_MOVES.Ember), seq([0.9, 0.5, 0.9]));
    expect(r2.acted).toBe(true);
    expect(r2.log[0]).toBe("Charmander acordou!");
    expect(b.hp).toBeLessThan(b.maxHp);
  });

  it("paralisia total (25%) impede o golpe", () => {
    const a = side(4, 30, { status: "PAR" });
    const b = side(1);
    const r = performStrike(a, b, toBattleMove(ALL_MOVES.Ember), seq([0.1]));
    expect(r.acted).toBe(false);
    expect(r.log[0]).toContain("Não consegue se mover");
  });

  it("golpe de Fogo com dano descongela o alvo", () => {
    const a = side(4);
    const b = side(1, 30, { status: "FRZ" });
    const r = performStrike(a, b, toBattleMove(ALL_MOVES.Ember), seq([0.9, 0.5, 0.95]));
    expect(r.damage).toBeGreaterThan(0);
    expect(b.status).toBe("NONE");
    expect(r.log.some((l) => l.includes("descongelou"))).toBe(true);
  });

  it("queimadura corta o dano físico pela metade, mas não o especial", () => {
    const rngA = seq([0.9, 0.5]);
    const rngB = seq([0.9, 0.5]);
    const attacker = side(4, 40);
    const defender = side(1, 40);
    const tackle = toBattleMove(ALL_MOVES.Tackle);
    const clean = computeDamage({ ...attacker }, defender, tackle, rngA).damage;
    const burned = computeDamage({ ...attacker, status: "BRN" }, defender, tackle, rngB).damage;
    expect(burned).toBeLessThan(clean);
    expect(burned).toBeGreaterThanOrEqual(Math.floor(clean / 2) - 1);

    const ember = toBattleMove(ALL_MOVES.Ember);
    const cleanSp = computeDamage({ ...attacker }, defender, ember, seq([0.9, 0.5])).damage;
    const burnedSp = computeDamage({ ...attacker, status: "BRN" }, defender, ember, seq([0.9, 0.5])).damage;
    expect(burnedSp).toBe(cleanSp);
  });
});

describe("endOfTurn", () => {
  it("aplica veneno/queimadura na ordem dada e reporta quem caiu", () => {
    const a = side(1, 30, { status: "PSN" });
    const b = side(4, 30, { status: "BRN", hp: 3 });
    const c = side(7, 30);
    const r = endOfTurn([a, b, c]);
    expect(a.hp).toBe(a.maxHp - Math.floor(a.maxHp / 8));
    expect(b.hp).toBe(0);
    expect(r.fainted).toEqual([b]);
    expect(c.hp).toBe(c.maxHp);
    expect(r.log).toHaveLength(2);
  });

  it("veneno grave cresce turno a turno", () => {
    const a = side(1, 50, { status: "TOX" });
    endOfTurn([a]);
    const first = a.maxHp - a.hp;
    endOfTurn([a]);
    const second = a.maxHp - a.hp - first;
    expect(second).toBeGreaterThan(first);
    expect(a.statusTurns).toBe(2);
  });
});

describe("chooseOpponentMove (IA)", () => {
  it("usa golpe de status útil em 40% das vezes, golpe de dano no resto", () => {
    const paras = side(46, 30); // Esporo no learnset
    const target = side(1, 30);
    expect(paras.moves.some((m) => m.name === "Esporo")).toBe(true);

    const st = chooseOpponentMove(paras, target, seq([0.1, 0.0]));
    expect(st.name).toBe("Esporo");

    const dmg = chooseOpponentMove(paras, target, seq([0.9, 0.0]));
    expect(dmg.category).not.toBe("Status");
  });

  it("não usa golpe de status contra alvo que já tem status", () => {
    const paras = side(46, 30);
    const target = side(1, 30, { status: "PAR" });
    expect(statusMoveUsable(paras.moves.find((m) => m.name === "Esporo")!, target)).toBe(false);
    for (let i = 0; i < 20; i++) {
      const m = chooseOpponentMove(paras, target, seq([i / 20, 0.0]));
      expect(m.category).not.toBe("Status");
    }
  });
});
