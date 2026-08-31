import { describe, expect, it } from "vitest";
import { MAX_LEVEL, applyXp, battleXpGain, xpToNextLevel } from "./xp";

/**
 * Curva (Fase 6.1): xpFloor(l) = floor(l^2.5 * 2.5);
 * xpToNextLevel(l) = xpFloor(l+1) - xpFloor(l).
 * Referência: xpToNextLevel(10) = 906 - 693 = 213.
 *
 * Era `l³ * 0.8`, que pedia 2,7 batalhas para sair do nível 5 e 11,2 para sair
 * do 25 — começo raso, meio de jogo em grind.
 */
describe("xpToNextLevel", () => {
  it("bate com a curva documentada", () => {
    expect(xpToNextLevel(10)).toBe(213);
    expect(xpToNextLevel(18)).toBe(497);
  });

  it("nunca decresce em nenhum nível", () => {
    for (let level = 1; level < MAX_LEVEL - 1; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThanOrEqual(xpToNextLevel(level));
    }
  });

  it("é estritamente crescente acima do piso (nível 2 em diante)", () => {
    // A curva tem piso de 20 XP; só o nível 1 cai nele.
    expect(xpToNextLevel(1)).toBe(20);
    expect(xpToNextLevel(2)).toBeGreaterThan(20);

    for (let level = 2; level < MAX_LEVEL - 1; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThan(xpToNextLevel(level));
    }
  });

  it("é positiva em todo nível jogável", () => {
    for (let level = 1; level < MAX_LEVEL; level++) {
      expect(xpToNextLevel(level)).toBeGreaterThan(0);
    }
  });

  it("é zero no nível máximo", () => {
    expect(xpToNextLevel(MAX_LEVEL)).toBe(0);
  });
});

describe("applyXp", () => {
  it("não sobe de nível quando o ganho é insuficiente", () => {
    const r = applyXp(10, 0, 100);

    expect(r.levelsGained).toBe(0);
    expect(r.newLevel).toBe(10);
    expect(r.newXp).toBe(100);
    expect(r.newXpToNext).toBe(213);
  });

  it("sobe um nível e carrega o excedente", () => {
    // 200 + 43 = 243; limiar 213 → sobra 30
    const r = applyXp(10, 200, 43);

    expect(r.levelsGained).toBe(1);
    expect(r.newLevel).toBe(11);
    expect(r.newXp).toBe(30);
    expect(r.newXpToNext).toBe(xpToNextLevel(11));
  });

  it("sobe vários níveis de uma vez quando o ganho é grande", () => {
    const r = applyXp(5, 0, 5000);

    expect(r.levelsGained).toBeGreaterThan(1);
    expect(r.newLevel).toBe(5 + r.levelsGained);
    expect(r.newXp).toBeLessThan(xpToNextLevel(r.newLevel));
  });

  it("acumula a partir do XP atual, não de zero", () => {
    const deZero = applyXp(10, 0, 100);
    const acumulando = applyXp(10, 200, 100);

    expect(deZero.newXp).toBe(100);
    expect(acumulando.newXp).toBe(300 - 213); // subiu de nível
    expect(acumulando.levelsGained).toBe(1);
  });

  it("não passa do nível máximo e zera o XP excedente", () => {
    const r = applyXp(MAX_LEVEL - 1, 0, 10_000_000);

    expect(r.newLevel).toBe(MAX_LEVEL);
    expect(r.newXp).toBe(0);
  });

  it("não sobe de nível já estando no máximo", () => {
    const r = applyXp(MAX_LEVEL, 0, 10_000_000);

    expect(r.levelsGained).toBe(0);
    expect(r.newLevel).toBe(MAX_LEVEL);
    expect(r.newXp).toBe(0);
  });

  it("ganho zero não altera nada", () => {
    const r = applyXp(12, 40, 0);

    expect(r.levelsGained).toBe(0);
    expect(r.newLevel).toBe(12);
    expect(r.newXp).toBe(40);
  });
});

describe("battleXpGain", () => {
  it("é sempre pelo menos 1", () => {
    expect(battleXpGain(10, 1, 100)).toBeGreaterThanOrEqual(1);
  });

  it("cresce com o nível do oponente", () => {
    const fraco = battleXpGain(300, 5, 10);
    const forte = battleXpGain(300, 50, 10);

    expect(forte).toBeGreaterThan(fraco);
  });

  it("cresce com o total de status-base da espécie", () => {
    const comum = battleXpGain(300, 20, 20);
    const lendario = battleXpGain(680, 20, 20);

    expect(lendario).toBeGreaterThan(comum);
  });

  it("dá bônus por enfrentar oponente acima do seu nível", () => {
    const mesmoNivel = battleXpGain(300, 20, 20);
    const maisForte = battleXpGain(300, 40, 20);

    expect(maisForte).toBeGreaterThan(mesmoNivel);
  });

  it("não dá bônus contra oponente mais fraco", () => {
    const mesmoNivel = battleXpGain(300, 20, 20);
    const maisFraco = battleXpGain(300, 5, 20);

    expect(maisFraco).toBeLessThanOrEqual(mesmoNivel);
  });

  it("o bônus de diferença de nível tem teto (não explode)", () => {
    const diff20 = battleXpGain(300, 40, 20);
    const diff80 = battleXpGain(300, 100, 20);
    // O multiplicador é limitado a +100% (diff 20); acima disso só o nível pesa.
    expect(diff80 / diff20).toBeLessThan(3);
  });
});
