import { describe, expect, it } from "vitest";
import { mapsConnectedTo } from "@/lib/map-navigation";

type MapFixture = { id: number; portals: Array<{ targetMapId: number }> };

const maps: MapFixture[] = [
  { id: 1, portals: [{ targetMapId: 2 }, { targetMapId: 3 }] },
  { id: 2, portals: [{ targetMapId: 1 }] },
  { id: 3, portals: [] },
  { id: 4, portals: [{ targetMapId: 1 }] },
];

describe("mapsConnectedTo", () => {
  it("inclui o atual e somente os destinos diretos dos portais", () => {
    expect(mapsConnectedTo(maps, 1).map((map) => map.id)).toEqual([1, 2, 3]);
    expect(mapsConnectedTo(maps, 2).map((map) => map.id)).toEqual([2, 1]);
    expect(mapsConnectedTo(maps, 3).map((map) => map.id)).toEqual([3]);
  });

  it("não transforma um mapa com portal de entrada em destino implícito", () => {
    expect(mapsConnectedTo(maps, 1).map((map) => map.id)).not.toContain(4);
  });

  it("mantém o mundo intacto e usa o primeiro mapa como fallback", () => {
    expect(mapsConnectedTo(maps, 999).map((map) => map.id)).toEqual([1]);
    expect(maps.map((map) => map.id)).toEqual([1, 2, 3, 4]);
  });
});
