import { describe, expect, it } from "vitest";
import {
  TYPE_NAMES,
  effectiveness,
  effectivenessLabel,
  isKnownType,
  typeMultiplier,
} from "./types";

describe("typeMultiplier", () => {
  it("é 1 para um pareamento neutro", () => {
    expect(typeMultiplier("Normal", ["Normal"])).toBe(1);
    expect(typeMultiplier("Fire", ["Normal"])).toBe(1);
    expect(typeMultiplier("Water", ["Normal"])).toBe(1);
  });

  it("é 0.5 contra um único tipo resistente", () => {
    expect(typeMultiplier("Fire", ["Dragon"])).toBe(0.5);
  });

  it("aplica ×2 em super efetivo simples", () => {
    expect(typeMultiplier("Fire", ["Grass"])).toBe(2);
    expect(typeMultiplier("Water", ["Fire"])).toBe(2);
    expect(typeMultiplier("Electric", ["Water"])).toBe(2);
    expect(typeMultiplier("Grass", ["Water"])).toBe(2);
  });

  it("acumula ×4 contra dois tipos fracos ao mesmo golpe", () => {
    // Água é 2x contra Fire e 2x contra Ground → 4x
    expect(typeMultiplier("Water", ["Fire", "Ground"])).toBe(4);
    // Gelo é 2x contra Ground e 2x contra Flying → 4x
    expect(typeMultiplier("Ice", ["Ground", "Flying"])).toBe(4);
  });

  it("aplica ×0.5 e ×0.25 em resistência", () => {
    expect(typeMultiplier("Fire", ["Fire"])).toBe(0.5);
    expect(typeMultiplier("Fire", ["Fire", "Dragon"])).toBe(0.25);
  });

  it("anula completamente contra imunidade", () => {
    expect(typeMultiplier("Normal", ["Ghost"])).toBe(0);
    expect(typeMultiplier("Electric", ["Ground"])).toBe(0);
    expect(typeMultiplier("Fighting", ["Ghost"])).toBe(0);
    expect(typeMultiplier("Psychic", ["Dark"])).toBe(0);
    expect(typeMultiplier("Dragon", ["Fairy"])).toBe(0);
    expect(typeMultiplier("Poison", ["Steel"])).toBe(0);
    expect(typeMultiplier("Ground", ["Flying"])).toBe(0);
  });

  it("imunidade vence a fraqueza do outro tipo (Ghost de Normal em Ghost/Flying)", () => {
    // Normal vs Ghost = 0; o segundo tipo não pode "desanular"
    expect(typeMultiplier("Normal", ["Ghost", "Flying"])).toBe(0);
  });

  it("é neutro para lista de tipos vazia (não derruba a batalha)", () => {
    expect(typeMultiplier("Fire", [])).toBe(1);
  });

  it("é neutro para tipo inexistente em qualquer lado", () => {
    expect(typeMultiplier("TipoQueNaoExiste", ["Fire"])).toBe(1);
    expect(typeMultiplier("Fire", ["TipoQueNaoExiste"])).toBe(1);
  });
});

describe("effectiveness", () => {
  it("devolve 1 para pares ausentes da tabela esparsa", () => {
    expect(effectiveness("Normal", ["Normal"][0])).toBe(1);
    expect(effectiveness("Fire", "Normal")).toBe(1);
  });
});

describe("isKnownType", () => {
  it("reconhece os 18 tipos", () => {
    expect(TYPE_NAMES).toHaveLength(18);
    for (const t of TYPE_NAMES) expect(isKnownType(t)).toBe(true);
  });

  it("rejeita tipo desconhecido", () => {
    expect(isKnownType("Cosmic")).toBe(false);
    expect(isKnownType("")).toBe(false);
  });
});

describe("effectivenessLabel", () => {
  it("rotula cada faixa", () => {
    expect(effectivenessLabel(0)).toBe("Não afeta o oponente...");
    expect(effectivenessLabel(2)).toBe("É super efetivo!");
    expect(effectivenessLabel(4)).toBe("É super efetivo!");
    expect(effectivenessLabel(0.5)).toBe("Não é muito efetivo...");
    expect(effectivenessLabel(0.25)).toBe("Não é muito efetivo...");
    expect(effectivenessLabel(1)).toBeNull();
  });
});
