import { describe, expect, it } from "vitest";
import {
  BURN_PHYSICAL_MULT,
  FULL_PARALYSIS_CHANCE,
  STATUS_VALUES,
  THAW_CHANCE,
  beforeMove,
  canReceiveStatus,
  captureStatusBonus,
  clearStatus,
  effectiveSpeed,
  inflictStatus,
  normalizeStatus,
  residualDamage,
  rollSleepTurns,
  statusBlockReason,
  thawIfHitByFire,
  type StatusBearer,
} from "./status";

/**
 * Status de batalha (Fase 8.4) — números da Gen III (GBA) fixados por teste.
 *
 * Fonte: Bulbapedia "Status condition" + tabelas de efeito secundário dos
 * golpes (ver `docs/FASE-8-STATUS.md`). Qualquer ajuste de balanceamento
 * precisa mexer aqui de propósito.
 */

function bearer(over: Partial<StatusBearer> = {}): StatusBearer {
  return {
    displayName: "Pikachu",
    types: ["Normal"],
    hp: 160,
    maxHp: 160,
    speed: 100,
    status: "NONE",
    statusTurns: 0,
    ...over,
  };
}

const always = () => 0; // rng que sempre "acerta" o sorteio (< chance)
const never = () => 0.999; // rng que nunca acerta

describe("aplicação e imunidades", () => {
  it("aplica cada status num alvo limpo e anuncia no log", () => {
    for (const status of ["PSN", "TOX", "BRN", "PAR", "SLP", "FRZ"] as const) {
      const b = bearer();
      const r = inflictStatus(b, status, always);
      expect(r.applied).toBe(true);
      expect(b.status).toBe(status);
      expect(r.log).toHaveLength(1);
      expect(r.log[0]).toContain("Pikachu");
    }
  });

  it("um status por vez: o segundo é recusado com aviso", () => {
    const b = bearer({ status: "BRN" });
    const r = inflictStatus(b, "PAR");
    expect(r.applied).toBe(false);
    expect(b.status).toBe("BRN");
    expect(r.log[0]).toBe("Pikachu já está queimado!");
    expect(statusBlockReason(b, "PAR")).toBe("already");
  });

  it("imunidades de tipo da Gen III (+ Elétrico↔PAR da Gen VI)", () => {
    expect(canReceiveStatus(bearer({ types: ["Fire"] }), "BRN")).toBe(false);
    expect(canReceiveStatus(bearer({ types: ["Poison"] }), "PSN")).toBe(false);
    expect(canReceiveStatus(bearer({ types: ["Steel", "Rock"] }), "TOX")).toBe(false);
    expect(canReceiveStatus(bearer({ types: ["Ice"] }), "FRZ")).toBe(false);
    expect(canReceiveStatus(bearer({ types: ["Electric"] }), "PAR")).toBe(false);
    // Sono não tem imunidade de tipo.
    expect(canReceiveStatus(bearer({ types: ["Electric"] }), "SLP")).toBe(true);

    const fire = bearer({ types: ["Fire"] });
    const r = inflictStatus(fire, "BRN");
    expect(r.applied).toBe(false);
    expect(r.log[0]).toBe("Não afeta Pikachu...");
  });

  it("efeito secundário bloqueado fica em silêncio (silentIfBlocked)", () => {
    const b = bearer({ status: "PSN" });
    const r = inflictStatus(b, "BRN", always, { silentIfBlocked: true });
    expect(r.applied).toBe(false);
    expect(r.log).toEqual([]);
  });

  it("alvo desmaiado não recebe status", () => {
    const b = bearer({ hp: 0 });
    expect(statusBlockReason(b, "PSN")).toBe("fainted");
    expect(inflictStatus(b, "PSN").log).toEqual([]);
  });

  it("sono sorteia 1–3 turnos e limpa o contador ao curar", () => {
    expect(rollSleepTurns(() => 0)).toBe(1);
    expect(rollSleepTurns(() => 0.5)).toBe(2);
    expect(rollSleepTurns(() => 0.999)).toBe(3);

    const b = bearer();
    inflictStatus(b, "SLP", () => 0.999);
    expect(b.statusTurns).toBe(3);
    clearStatus(b);
    expect(b).toMatchObject({ status: "NONE", statusTurns: 0 });
  });

  it("normalizeStatus aceita legado (undefined/lixo) sem quebrar", () => {
    expect(normalizeStatus(undefined)).toBe("NONE");
    expect(normalizeStatus("banana")).toBe("NONE");
    expect(normalizeStatus("PAR")).toBe("PAR");
    expect(STATUS_VALUES).toHaveLength(7);
  });
});

describe("antes de agir", () => {
  it("sono: conta turnos e acorda agindo no mesmo turno", () => {
    const b = bearer({ status: "SLP", statusTurns: 2 });
    const t1 = beforeMove(b);
    expect(t1.canAct).toBe(false);
    expect(b.statusTurns).toBe(1);
    const t2 = beforeMove(b);
    expect(t2.canAct).toBe(true);
    expect(t2.log[0]).toBe("Pikachu acordou!");
    expect(b.status).toBe("NONE");
  });

  it("congelado: 20% de descongelar por turno; senão não age", () => {
    const b = bearer({ status: "FRZ" });
    expect(beforeMove(b, never).canAct).toBe(false);
    expect(b.status).toBe("FRZ");
    expect(beforeMove(b, always).canAct).toBe(true);
    expect(b.status).toBe("NONE");
    expect(THAW_CHANCE).toBe(0.2);
  });

  it("paralisado: 25% de não se mover; a paralisia continua", () => {
    const b = bearer({ status: "PAR" });
    expect(beforeMove(b, always).canAct).toBe(false);
    expect(beforeMove(b, never).canAct).toBe(true);
    expect(b.status).toBe("PAR");
    expect(FULL_PARALYSIS_CHANCE).toBe(0.25);
  });

  it("veneno/queimadura não impedem de agir", () => {
    expect(beforeMove(bearer({ status: "PSN" })).canAct).toBe(true);
    expect(beforeMove(bearer({ status: "BRN" })).canAct).toBe(true);
    expect(beforeMove(bearer()).canAct).toBe(true);
  });

  it("paralisia corta a velocidade a 1/4", () => {
    expect(effectiveSpeed(bearer({ speed: 100, status: "PAR" }))).toBe(25);
    expect(effectiveSpeed(bearer({ speed: 2, status: "PAR" }))).toBe(1);
    expect(effectiveSpeed(bearer({ speed: 100, status: "BRN" }))).toBe(100);
  });

  it("golpe de Fogo com dano descongela", () => {
    const b = bearer({ status: "FRZ" });
    expect(thawIfHitByFire(b, "Water")).toBeNull();
    expect(b.status).toBe("FRZ");
    expect(thawIfHitByFire(b, "Fire")).toContain("descongelou");
    expect(b.status).toBe("NONE");
  });
});

describe("dano de fim de turno", () => {
  it("veneno e queimadura tiram 1/8 do HP máximo", () => {
    const psn = bearer({ status: "PSN" });
    expect(residualDamage(psn).damage).toBe(20);
    expect(psn.hp).toBe(140);

    const brn = bearer({ status: "BRN" });
    expect(residualDamage(brn).damage).toBe(20);
    expect(brn.hp).toBe(140);
  });

  it("veneno grave cresce 1/16 por turno", () => {
    const b = bearer({ status: "TOX" });
    expect(residualDamage(b).damage).toBe(10); // 1/16
    expect(residualDamage(b).damage).toBe(20); // 2/16
    expect(residualDamage(b).damage).toBe(30); // 3/16
    expect(b.statusTurns).toBe(3);
    expect(b.hp).toBe(100);
  });

  it("veneno grave satura em 15/16", () => {
    const b = bearer({ status: "TOX", statusTurns: 40, maxHp: 1600, hp: 1600 });
    expect(residualDamage(b).damage).toBe(1500);
    expect(b.statusTurns).toBe(15);
  });

  it("mínimo de 1 de dano e nunca abaixo de zero", () => {
    const tiny = bearer({ status: "PSN", maxHp: 4, hp: 4 });
    expect(residualDamage(tiny).damage).toBe(1);

    const dying = bearer({ status: "BRN", hp: 5 });
    expect(residualDamage(dying).damage).toBe(5);
    expect(dying.hp).toBe(0);
    // Desmaiado: sem dano adicional.
    expect(residualDamage(dying).damage).toBe(0);
  });

  it("sem status residual: nada acontece", () => {
    for (const status of ["NONE", "PAR", "SLP", "FRZ"] as const) {
      const b = bearer({ status });
      expect(residualDamage(b)).toEqual({ damage: 0, log: [] });
      expect(b.hp).toBe(160);
    }
  });
});

describe("captura e constantes", () => {
  it("bônus de captura Gen III: sono/gelo ×2, resto ×1,5", () => {
    expect(captureStatusBonus("NONE")).toBe(1);
    expect(captureStatusBonus("SLP")).toBe(2);
    expect(captureStatusBonus("FRZ")).toBe(2);
    expect(captureStatusBonus("PAR")).toBe(1.5);
    expect(captureStatusBonus("PSN")).toBe(1.5);
    expect(captureStatusBonus("TOX")).toBe(1.5);
    expect(captureStatusBonus("BRN")).toBe(1.5);
  });

  it("queimadura corta o dano físico pela metade (constante usada por damage.ts)", () => {
    expect(BURN_PHYSICAL_MULT).toBe(0.5);
  });
});
