import { describe, expect, it, vi } from "vitest";
import { BALL_BONUS, captureChance, rollCapture } from "./capture";

/**
 * Referência medida e documentada no docstring (Pokébola, catchRate 45, maxHp 36):
 *   HP cheio (36/36) → 11.94% · metade (18/36) → 20.09% · hp 4/36 → 25.70%
 *
 * A primeira implementação usava `a/255` linear e dava ~6% com HP cheio —
 * punitivo demais. Estes números travam a fórmula de chacoalhada clássica.
 */
describe("captureChance", () => {
  it("Master Ball é sempre 100%", () => {
    expect(captureChance(45, 36, 36, "masterballs")).toBe(1);
    expect(captureChance(3, 500, 500, "masterballs")).toBe(1);
    expect(captureChance(255, 1, 1, "masterballs")).toBe(1);
  });

  it("bate com os valores de referência", () => {
    expect(captureChance(45, 36, 36, "pokeballs")).toBeCloseTo(0.1194, 3);
    expect(captureChance(45, 18, 36, "pokeballs")).toBeCloseTo(0.2009, 3);
    expect(captureChance(45, 4, 36, "pokeballs")).toBeCloseTo(0.257, 3);
  });

  it("quanto menos HP, maior a chance", () => {
    const cheio = captureChance(45, 36, 36, "pokeballs");
    const metade = captureChance(45, 18, 36, "pokeballs");
    const quaseMorto = captureChance(45, 1, 36, "pokeballs");

    expect(metade).toBeGreaterThan(cheio);
    expect(quaseMorto).toBeGreaterThan(metade);
  });

  it("bolas melhores aumentam a chance, na ordem certa", () => {
    const poke = captureChance(45, 18, 36, "pokeballs");
    const great = captureChance(45, 18, 36, "greatballs");
    const ultra = captureChance(45, 18, 36, "ultraballs");

    expect(BALL_BONUS.greatballs).toBeGreaterThan(BALL_BONUS.pokeballs);
    expect(BALL_BONUS.ultraballs).toBeGreaterThan(BALL_BONUS.greatballs);
    expect(great).toBeGreaterThan(poke);
    expect(ultra).toBeGreaterThan(great);
  });

  it("catchRate maior facilita a captura", () => {
    const raro = captureChance(10, 18, 36, "pokeballs"); // Rayquaza
    const comum = captureChance(45, 18, 36, "pokeballs"); // Eevee
    const trivial = captureChance(255, 18, 36, "pokeballs");

    expect(comum).toBeGreaterThan(raro);
    expect(trivial).toBeGreaterThanOrEqual(comum);
  });

  it("nunca sai da faixa [3%, 95%] (exceto Master Ball)", () => {
    const casos: Array<[number, number, number, "pokeballs" | "greatballs" | "ultraballs"]> = [
      [3, 500, 500, "pokeballs"],
      [255, 1, 500, "ultraballs"],
      [1, 1, 1, "pokeballs"],
      [45, 0, 36, "ultraballs"],
    ];

    for (const [rate, hp, maxHp, ball] of casos) {
      const c = captureChance(rate, hp, maxHp, ball);
      expect(c).toBeGreaterThanOrEqual(0.03);
      expect(c).toBeLessThanOrEqual(0.95);
    }
  });

  it("HP zero não quebra a fórmula", () => {
    const c = captureChance(45, 0, 36, "pokeballs");
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThanOrEqual(0.95);
  });

  it("HP negativo é tratado como zero (não gera chance > 1)", () => {
    const c = captureChance(45, -50, 36, "ultraballs");
    expect(c).toBeLessThanOrEqual(0.95);
  });

  it("maxHp zero não divide por zero", () => {
    const c = captureChance(45, 0, 0, "pokeballs");
    expect(Number.isFinite(c)).toBe(true);
    expect(c).toBe(0.95);
  });
});

describe("rollCapture", () => {
  it("chance 1 sempre captura", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(rollCapture(1)).toBe(true);
    vi.restoreAllMocks();
  });

  it("chance 0 nunca captura", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollCapture(0)).toBe(false);
    vi.restoreAllMocks();
  });

  it("respeita o limiar", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(rollCapture(0.6)).toBe(true);
    expect(rollCapture(0.4)).toBe(false);
    vi.restoreAllMocks();
  });
});
