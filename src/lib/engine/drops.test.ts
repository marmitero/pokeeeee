import { describe, expect, it } from "vitest";
import { EVOLUTION_ITEM_VALUES } from "../evolution-items";
import { STONE_DROP_MIN_LEVEL, STONE_DROP_RATE, rollStoneDrop } from "./drops";

describe("rollStoneDrop (Etapa C — drop de pedras)", () => {
  it("constantes: nv 40+, taxa 0,2%", () => {
    expect(STONE_DROP_MIN_LEVEL).toBe(40);
    expect(STONE_DROP_RATE).toBe(0.002);
  });

  it("selvagem abaixo do nv 40 nunca dropa", () => {
    expect(rollStoneDrop(39, () => 0)).toBeNull();
    expect(rollStoneDrop(1, () => 0)).toBeNull();
  });

  it("nv 40+ com sorte máxima dropa uma pedra válida", () => {
    const drop = rollStoneDrop(40, () => 0);
    expect(drop).not.toBeNull();
    expect(EVOLUTION_ITEM_VALUES).toContain(drop);
  });

  it("nv 40+ sem sorte não dropa", () => {
    expect(rollStoneDrop(100, () => 0.999)).toBeNull();
  });

  it("o sorteio da pedra cobre o catálogo (uniforme pelos 21)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < EVOLUTION_ITEM_VALUES.length; i++) {
      let calls = 0;
      const drop = rollStoneDrop(50, () => {
        calls += 1;
        return calls === 1 ? 0 : (i + 0.5) / EVOLUTION_ITEM_VALUES.length;
      });
      seen.add(drop!);
    }
    expect(seen.size).toBe(EVOLUTION_ITEM_VALUES.length);
  });
});
