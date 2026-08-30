import { describe, expect, it } from "vitest";
import { ValidationError, parse } from "./api";
import { battleActionSchema, roleSchema, shopActionSchema } from "./validation";

/**
 * Estes schemas são a fronteira que fechou os exploits V3/V4 da auditoria.
 * São testados aqui porque um relaxamento acidental reabre o buraco.
 */
describe("shopActionSchema — V3 (quantity negativa duplicava dinheiro)", () => {
  const buy = (quantity: unknown) =>
    shopActionSchema.safeParse({ action: "buy", itemId: 1, quantity });

  it("rejeita quantidade negativa", () => {
    expect(buy(-50).success).toBe(false);
    expect(buy(-1).success).toBe(false);
  });

  it("rejeita zero e fracionado", () => {
    expect(buy(0).success).toBe(false);
    expect(buy(1.7).success).toBe(false);
  });

  it("rejeita quantidade acima do teto", () => {
    expect(buy(100).success).toBe(false);
    expect(buy(100000).success).toBe(false);
  });

  it("aceita o intervalo válido", () => {
    expect(buy(1).success).toBe(true);
    expect(buy(99).success).toBe(true);
  });

  it("converte string numérica (query/form) mas mantém as regras", () => {
    expect(buy("5").success).toBe(true);
    expect(buy("-5").success).toBe(false);
  });
});

describe("battleActionSchema", () => {
  it("rejeita level fora de 1-100 (V4 era level arbitrário)", () => {
    // moveIndex é o único inteiro livre da ação attack
    expect(
      battleActionSchema.safeParse({ action: "attack", battleId: 1, moveIndex: 4 }).success
    ).toBe(false);
    expect(
      battleActionSchema.safeParse({ action: "attack", battleId: 1, moveIndex: -1 }).success
    ).toBe(false);
    expect(
      battleActionSchema.safeParse({ action: "attack", battleId: 1, moveIndex: 3 }).success
    ).toBe(true);
  });

  it("rejeita bola fora do enum", () => {
    expect(
      battleActionSchema.safeParse({ action: "catch", battleId: 1, ball: "masterball" }).success
    ).toBe(false);
    expect(
      battleActionSchema.safeParse({ action: "catch", battleId: 1, ball: "ultraballs" }).success
    ).toBe(true);
  });

  it("rejeita coordenada fora da grade", () => {
    const w = (playerX: number, playerY: number) =>
      battleActionSchema.safeParse({ action: "start_wild", mapId: 1, playerX, playerY }).success;

    expect(w(64, 0)).toBe(false);
    expect(w(-1, 0)).toBe(false);
    expect(w(0, 99)).toBe(false);
    expect(w(3, 9)).toBe(true);
  });

  it("rejeita action desconhecida", () => {
    expect(battleActionSchema.safeParse({ action: "reward_win" }).success).toBe(false);
  });
});

describe("roleSchema", () => {
  it("aceita apenas os três papéis", () => {
    for (const ok of ["player", "moderator", "admin"]) {
      expect(roleSchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ["superuser", "ADMIN", "", "owner"]) {
      expect(roleSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("parse", () => {
  it("devolve o dado tipado quando válido", () => {
    const r = parse(shopActionSchema, { action: "buy", itemId: "3", quantity: "2" });
    expect(r).toMatchObject({ action: "buy", itemId: 3, quantity: 2 });
  });

  it("lança ValidationError com os campos problemáticos", () => {
    let caught: unknown;
    try {
      parse(shopActionSchema, { action: "buy", itemId: 1, quantity: -5 });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(ValidationError);
    const err = caught as ValidationError;
    expect(err.issues.length).toBeGreaterThan(0);
    expect(err.issues[0].path).toBe("quantity");
    // A mensagem interna não pode vazar SQL/stack
    expect(err.message).toBe("Dados inválidos.");
  });
});
