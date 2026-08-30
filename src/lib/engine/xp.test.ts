import { describe, expect, it } from "vitest";
import { MAX_LEVEL, applyXp, battleXpGain, xpToNextLevel } from "./xp";

/**
 * Curva: xpFloor(l) = floor(l³ * 0.8); xpToNextLevel(l) = xpFloor(l+1) - xpFloor(l).
 * Referência: xpToNextLevel(10) = 1064 - 800 = 264.
 */
describe("xpToNextLevel", () => {
  it("bate com a curva cúbica documentada", () => {
    expect(xpToNextLevel(10)).toBe(264);
    expect(xpToNextLevel(18)).toBe(822);
  });

  it("nunca decresce em nenhum nível", () => {
    for (let level = 1; level < MAX_LEVEL - 1; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThanOrEqual(xpToNextLevel(level));
    }
  });

  it("é estritamente crescente acima do piso (nível 3 em diante)", () => {
    // A curva tem piso de 20 XP, então níveis 1 e 2 empatam por construção.
    expect(xpToNextLevel(1)).toBe(20);
    expect(xpToNextLevel(2)).toBe(20);
    expect(xpToNextLevel(3)).toBeGreaterThan(20);

    for (let level = 3; level < MAX_LEVEL - 1; level++) {
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
    expect(r.newXpToNext).toBe(264);
  });

  it("sobe um nível e carrega o excedente", () => {
    // 250 + 43 = 293; limiar 264 → sobra 29
    const r = applyXp(10, 250, 43);

    expect(r.levelsGained).toBe(1);
    expect(r.newLevel).toBe(11);
    expect(r.newXp).toBe(29);
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
    expect(acumulando.newXp).toBe(300 - 264); // subiu de nível
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
