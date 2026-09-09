import { describe, expect, it } from "vitest";
import {
  applyElo,
  eloMatchWindow,
  expectedScore,
  hashIp,
  kFactor,
  ELO_FLOOR,
  ELO_K,
  ELO_K_HIGH,
} from "./elo";

/**
 * ELO da Arena ranqueada (8.5) — propriedades puras:
 * simetria, K-factor (32 / 24 acima de 2000), piso 100, vitória reduzida
 * (½ K) e a janela de pareamento crescente.
 */

describe("ELO — simetria", () => {
  it("num duelo parelho, o que um ganha é o que o outro perde", () => {
    const a = applyElo(1000, 1000);
    expect(a.winner).toBe(1000 + ELO_K / 2); // 1016
    expect(a.loser).toBe(1000 - ELO_K / 2); // 984
    expect(a.winner - 1000).toBe(1000 - a.loser);
  });

  it("a simetria se mantém em ELOs distintos (mesmo K)", () => {
    const up = applyElo(1200, 1100);
    const gain = up.winner - 1200;
    const loss = 1100 - up.loser;
    expect(Math.abs(gain - loss)).toBeLessThanOrEqual(1); // arredondamento
  });

  it("expectedScore soma 1 nos dois sentidos", () => {
    const p = expectedScore(1500, 1300);
    const q = expectedScore(1300, 1500);
    expect(p + q).toBeCloseTo(1, 10);
  });
});

describe("ELO — K-factor", () => {
  it("32 até 2000, 24 acima de 2000", () => {
    expect(kFactor(1000)).toBe(ELO_K);
    expect(kFactor(2000)).toBe(ELO_K);
    expect(kFactor(2001)).toBe(ELO_K_HIGH);
    expect(kFactor(2500)).toBe(ELO_K_HIGH);
  });

  it("jogador acima de 2000 move menos que o de baixo", () => {
    // Vencedor 2100 (K24) vs perdedor 1000 (K32): o ganho do favorito é pequeno.
    const a = applyElo(2100, 1000);
    expect(a.winner - 2100).toBeLessThanOrEqual(2);
  });
});

describe("ELO — piso e vitória reduzida", () => {
  it("ninguém desce abaixo do piso 100", () => {
    const a = applyElo(2500, 100);
    expect(a.winner).toBeGreaterThanOrEqual(ELO_FLOOR);
    expect(a.loser).toBe(ELO_FLOOR);
  });

  it("forfeit antes do turno 3 dá ½ K ao vencedor e derrota cheia", () => {
    const full = applyElo(1000, 1000);
    const half = applyElo(1000, 1000, { halfKForWinner: true });

    // Vencedor com ½ K: metade do ganho normal (16 vs 32).
    expect(half.winner).toBe(1000 + ELO_K / 4); // 1008
    expect(half.winner - 1000).toBe((full.winner - 1000) / 2);
    // Perdedor perde o K cheio — igual ao caso normal.
    expect(half.loser).toBe(full.loser);
  });
});

describe("ELO — janela de pareamento", () => {
  it("começa em 150 e cresce 50 a cada 30 s", () => {
    expect(eloMatchWindow(0)).toBe(150);
    expect(eloMatchWindow(29)).toBe(150);
    expect(eloMatchWindow(30)).toBe(200);
    expect(eloMatchWindow(59)).toBe(200);
    expect(eloMatchWindow(60)).toBe(250);
    expect(eloMatchWindow(120)).toBe(350);
  });

  it("tempo negativo é tratado como zero", () => {
    expect(eloMatchWindow(-5)).toBe(150);
  });
});

describe("ELO — hash de IP", () => {
  it("é determinístico e pequeno", () => {
    const a = hashIp("203.0.113.7");
    const b = hashIp("203.0.113.7");
    expect(a).toBe(b);
    expect(a.length).toBeLessThanOrEqual(8);
  });

  it("distingue IPs diferentes", () => {
    expect(hashIp("203.0.113.7")).not.toBe(hashIp("203.0.113.8"));
  });
});
