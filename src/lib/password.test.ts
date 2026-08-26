import { describe, expect, it } from "vitest";
import { hashPassword, isLegacyPlaintext, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("round-trip: a senha correta valida", () => {
    const hash = hashPassword("senhaSegura123");
    expect(verifyPassword("senhaSegura123", hash)).toBe(true);
  });

  it("rejeita senha errada", () => {
    const hash = hashPassword("senhaSegura123");
    expect(verifyPassword("senhaSegura124", hash)).toBe(false);
    expect(verifyPassword("", hash)).toBe(false);
    expect(verifyPassword("SENHASEGURA123", hash)).toBe(false);
  });

  it("NUNCA guarda a senha em texto puro", () => {
    const senha = "senhaSegura123";
    const hash = hashPassword(senha);

    expect(hash).not.toBe(senha);
    expect(hash).not.toContain(senha);
    expect(hash.startsWith("scrypt$")).toBe(true);
  });

  it("o mesmo password gera hashes diferentes (salt aleatório)", () => {
    const a = hashPassword("mesmasenha");
    const b = hashPassword("mesmasenha");

    expect(a).not.toBe(b);
    expect(verifyPassword("mesmasenha", a)).toBe(true);
    expect(verifyPassword("mesmasenha", b)).toBe(true);
  });

  it("normaliza composição unicode (mesma senha, formas diferentes)", () => {
    // "ç" pré-composto vs. "c" + combining cedilla
    const pre = hashPassword("senha\u00E7a");
    expect(verifyPassword("senha\u0063\u0327a", pre)).toBe(true);
  });

  it("o hash carrega os próprios parâmetros de custo", () => {
    const parts = hashPassword("x12345678").split("$");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("scrypt");
    expect(Number(parts[1])).toBeGreaterThan(1000); // N
  });
});

describe("verifyPassword contra entrada malformada", () => {
  it("não lança e devolve false para qualquer lixo", () => {
    for (const bad of ["", "scrypt", "scrypt$1$2$3$4$5", "bcrypt$abc", "senha123", "$$$$$"]) {
      expect(() => verifyPassword("qualquer", bad)).not.toThrow();
      expect(verifyPassword("qualquer", bad)).toBe(false);
    }
  });

  it("devolve false para valor não-string (dado corrompido no banco)", () => {
    expect(verifyPassword("x", undefined as unknown as string)).toBe(false);
    expect(verifyPassword("x", null as unknown as string)).toBe(false);
    expect(verifyPassword("x", 123 as unknown as string)).toBe(false);
  });
});

describe("isLegacyPlaintext", () => {
  it("detecta senha antiga em texto puro", () => {
    expect(isLegacyPlaintext("senha123")).toBe(true);
    expect(isLegacyPlaintext("")).toBe(true);
  });

  it("não marca hash scrypt como legado", () => {
    expect(isLegacyPlaintext(hashPassword("senha123"))).toBe(false);
  });
});
