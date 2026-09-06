import { describe, expect, it } from "vitest";
import { MAX_LEVEL, applyXp, battleXpGain, xpToNextLevel } from "./xp";

/**
 * Curva (Fase 6.2-C): xpFloor(l) = floor(l³ × 0,8);
 * xpToNextLevel(l) = xpFloor(l+1) - xpFloor(l).
 * Referência: xpToNextLevel(10) = 1064 - 800 = 264.
 *
 * História: a curva original era `l³ × 0,8`. A 6.1 trocou por `l^2.5 × 2,5`
 * temendo o grind do meio de jogo; a 6.2-C **voltou à original por decisão do
 * mantenedor** — o jogo deve ser um pouco difícil de evoluir, e o mapa 1
 * arrumado (criaturas 2–7, golpes 15–35) faz o treino até o primeiro ginásio
 * ser progressão. Medição em `scripts/balance-report.mts`.
 */
describe("xpToNextLevel", () => {
  it("bate com a curva documentada", () => {
    expect(xpToNextLevel(10)).toBe(264);
    expect(xpToNextLevel(18)).toBe(822);
  });

  it("nunca decresce em nenhum nível", () => {
    for (let level = 1; level < MAX_LEVEL - 1; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThanOrEqual(xpToNextLevel(level));
    }
  });

  it("o piso de 20 XP vale nos níveis 1 e 2; do 3 em diante é estritamente crescente", () => {
    // floor(2³×0,8) - floor(1³×0,8) = 6 e floor(3³×0,8) - floor(2³×0,8) = 15:
    // ambos abaixo do piso. A partir daí a diferença cúbica só cresce.
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
    // 200 + 100 = 300; limiar 264 → sobra 36
    const r = applyXp(10, 200, 100);

    expect(r.levelsGained).toBe(1);
    expect(r.newLevel).toBe(11);
    expect(r.newXp).toBe(36);
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
