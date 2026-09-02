import { describe, expect, it } from "vitest";
import {
  WORLD_FORMAT,
  gymKey,
  mapToFile,
  parseMapFile,
  parseShopFile,
  resolveMapRefs,
  shopsToFiles,
  stringifyContent,
  type GymRow,
  type MapRow,
  type ShopRow,
  type WorldMapFile,
} from "./world-content";

// ─── Fixtures: um mundo mínimo com dois mapas ligados e um ginásio ────────

function mapRow(over: Partial<MapRow> & Pick<MapRow, "id" | "slug">): MapRow {
  return {
    name: `Mapa ${over.slug}`,
    description: "",
    width: 2,
    height: 2,
    tileGrid: [
      ["grass", "grass"],
      ["grass", "tall_grass"],
    ],
    encounterTable: [],
    encounterGrid: [],
    collisionGrid: [],
    encounterRate: 22,
    portals: [],
    npcs: [],
    creatorUsername: "GameMaster",
    isPublished: true,
    ...over,
  };
}

const gymBrock: GymRow = {
  id: 40,
  mapId: 10,
  name: "Brock",
  title: "Líder",
  badgeName: "Pedra",
  badgeEmoji: "🪨",
  specialty: "Rock",
  requiredBadges: 0,
  rewardMoney: 1500,
  team: [{ pokedexId: 74, level: 10, variant: "Normal" }],
  npcDialog: "oi",
  defeatDialog: "perdi",
  winDialog: "ganhei",
  shopId: 1,
};

const pallet = mapRow({
  id: 10,
  slug: "vale-pallet",
  portals: [{ id: "p1", sourceX: 0, sourceY: 0, targetMapId: 20, targetMapName: "Floresta", targetX: 1, targetY: 1, label: "Norte" }],
  npcs: [
    { id: "shop", x: 0, y: 1, type: "shop", name: "Loja", shopId: 1, dialog: "compre" },
    { id: "gym", x: 1, y: 0, type: "gym", name: "Brock", gymId: 40, dialog: "lute" },
  ],
});

const floresta = mapRow({
  id: 20,
  slug: "floresta-viridian",
  portals: [{ id: "p2", sourceX: 1, sourceY: 1, targetMapId: 10, targetX: 0, targetY: 0 }],
});

const allMaps = [pallet, floresta];
const allGyms = [gymBrock];

// ─── Exportação ───────────────────────────────────────────────────────────

describe("mapToFile — nada sai por id serial", () => {
  const file = mapToFile(pallet, allMaps, allGyms);

  it("portal passa a apontar por slug", () => {
    expect(file.portals[0].targetMapSlug).toBe("floresta-viridian");
    expect(file.portals[0]).not.toHaveProperty("targetMapId");
  });

  it("NPC de ginásio passa a apontar pelo nome do líder", () => {
    const gymNpc = file.npcs.find((n) => n.id === "gym")!;
    expect(gymNpc.gymLeaderName).toBe("Brock");
    expect(gymNpc).not.toHaveProperty("gymId");
  });

  it("shopId é preservado (é id lógico, não serial)", () => {
    expect(file.npcs.find((n) => n.id === "shop")!.shopId).toBe(1);
    expect(file.gyms[0].shopId).toBe(1);
  });

  it("não leva id, creatorId nem timestamps", () => {
    const json = JSON.stringify(file);
    expect(file).not.toHaveProperty("id");
    expect(json).not.toContain("creatorId");
    expect(json).not.toContain("createdAt");
    expect(json).not.toContain("updatedAt");
    expect(file.format).toBe(WORLD_FORMAT);
  });

  it("só embute os ginásios do próprio mapa", () => {
    expect(file.gyms.map((g) => g.leaderName)).toEqual(["Brock"]);
    expect(mapToFile(floresta, allMaps, allGyms).gyms).toEqual([]);
  });

  it("portal para mapa inexistente falha alto", () => {
    const broken = mapRow({
      id: 30,
      slug: "quebrado",
      portals: [{ id: "px", sourceX: 0, sourceY: 0, targetMapId: 999, targetX: 0, targetY: 0 }],
    });
    expect(() => mapToFile(broken, [...allMaps, broken], allGyms)).toThrow(/portal "px".*#999/);
  });

  it("NPC para ginásio inexistente ou de outro mapa falha alto", () => {
    const semGym = mapRow({
      id: 31,
      slug: "sem-gym",
      npcs: [{ id: "g", x: 0, y: 0, type: "gym", name: "X", gymId: 777, dialog: "" }],
    });
    expect(() => mapToFile(semGym, [...allMaps, semGym], allGyms)).toThrow(/ginásio #777/);

    const gymAlheio = mapRow({
      id: 32,
      slug: "gym-alheio",
      npcs: [{ id: "g", x: 0, y: 0, type: "gym", name: "Brock", gymId: 40, dialog: "" }],
    });
    expect(() => mapToFile(gymAlheio, [...allMaps, gymAlheio], allGyms)).toThrow(/outro mapa/);
  });
});

describe("shopsToFiles", () => {
  const rows: ShopRow[] = [
    { id: 3, shopId: 2, name: "Greatball", description: "", category: "ball", itemKey: "greatballs", buyPrice: 600, sellPrice: 300, iconEmoji: "🔵", isPremium: false, stock: 50 },
    { id: 1, shopId: 1, name: "Poção", description: "", category: "potion", itemKey: "potions", buyPrice: 300, sellPrice: 150, iconEmoji: "🧪", isPremium: false, stock: 99 },
    { id: 2, shopId: 1, name: "Pokébola", description: "", category: "ball", itemKey: "pokeballs", buyPrice: 200, sellPrice: 100, iconEmoji: "🔴", isPremium: false, stock: 99 },
  ];

  it("agrupa por shopId, em ordem, e ordena itens por itemKey", () => {
    const files = shopsToFiles(rows);
    expect(files.map((f) => f.shopId)).toEqual([1, 2]);
    expect(files[0].items.map((i) => i.itemKey)).toEqual(["pokeballs", "potions"]);
  });

  it("não leva o id serial do item", () => {
    expect(JSON.stringify(shopsToFiles(rows))).not.toMatch(/"id"/);
  });
});

// ─── Importação ───────────────────────────────────────────────────────────

describe("resolveMapRefs — ids do banco de destino", () => {
  const file = mapToFile(pallet, allMaps, allGyms);

  it("resolve portal e NPC com ids deslocados", () => {
    // No destino, os mapas nasceram com outros ids e o ginásio também.
    const slugToId = new Map([
      ["vale-pallet", 7],
      ["floresta-viridian", 5],
    ]);
    const gyms = new Map([[gymKey("vale-pallet", "Brock"), 6]]);

    const { portals, npcs } = resolveMapRefs(file, slugToId, gyms);

    expect(portals[0].targetMapId).toBe(5);
    expect(portals[0]).not.toHaveProperty("targetMapSlug");
    expect(npcs.find((n) => n.id === "gym")!.gymId).toBe(6);
    expect(npcs.find((n) => n.id === "gym")).not.toHaveProperty("gymLeaderName");
    expect(npcs.find((n) => n.id === "shop")!.shopId).toBe(1);
  });

  it("não deixa chaves undefined no jsonb", () => {
    const { portals, npcs } = resolveMapRefs(
      mapToFile(floresta, allMaps, allGyms),
      new Map([["vale-pallet", 1], ["floresta-viridian", 2]]),
      new Map()
    );
    expect(Object.keys(portals[0])).not.toContain("targetMapName");
    expect(Object.keys(portals[0])).not.toContain("label");
    expect(npcs).toEqual([]);
  });

  it("portal para slug desconhecido falha alto", () => {
    expect(() => resolveMapRefs(file, new Map([["vale-pallet", 1]]), new Map())).toThrow(/floresta-viridian/);
  });

  it("NPC para líder desconhecido no mapa falha alto", () => {
    const slugToId = new Map([["vale-pallet", 1], ["floresta-viridian", 2]]);
    // Brock existe, mas em outro mapa: a chave é (mapa, líder).
    const gyms = new Map([[gymKey("floresta-viridian", "Brock"), 6]]);
    expect(() => resolveMapRefs(file, slugToId, gyms)).toThrow(/líder "Brock"/);
  });
});

describe("parseMapFile / parseShopFile", () => {
  it("aceita o que o export produz", () => {
    const file = mapToFile(pallet, allMaps, allGyms);
    const reparsed = parseMapFile(JSON.parse(JSON.stringify(file)), "x.json");
    expect(reparsed.slug).toBe("vale-pallet");
  });

  it("rejeita formato desconhecido, slug inválido e ginásio sem líder", () => {
    const file = JSON.parse(JSON.stringify(mapToFile(pallet, allMaps, allGyms))) as Record<string, unknown>;
    expect(() => parseMapFile({ ...file, format: "outro" }, "x")).toThrow(/formato/);
    expect(() => parseMapFile({ ...file, slug: "Vale Pallet" }, "x")).toThrow(/slug/);
    expect(() => parseMapFile({ ...file, gyms: [{ title: "sem nome" }] }, "x")).toThrow(/leaderName/);
  });

  it("rejeita loja com itemKey repetido", () => {
    expect(() =>
      parseShopFile(
        { format: WORLD_FORMAT, shopId: 1, items: [{ itemKey: "potions" }, { itemKey: "potions" }] },
        "1.json"
      )
    ).toThrow(/repetido/);
  });
});

// ─── Serialização ─────────────────────────────────────────────────────────

describe("stringifyContent — diff legível", () => {
  it("põe lista de primitivos numa linha e omite undefined", () => {
    const out = stringifyContent({ a: [1, 2, 3], b: undefined, c: { d: "x" } });
    expect(out).toBe('{\n  "a": [1, 2, 3],\n  "c": {\n    "d": "x"\n  }\n}');
  });

  it("grade 2×2 vira uma fileira por linha", () => {
    const out = stringifyContent({ tileGrid: [["a", "b"], ["c", "d"]] });
    expect(out.split("\n")).toHaveLength(6);
    expect(out).toContain('    ["a", "b"],\n    ["c", "d"]');
  });

  it("é JSON válido e faz round-trip", () => {
    const file: WorldMapFile = mapToFile(pallet, allMaps, allGyms);
    const text = stringifyContent(file);
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(file)));
    expect(stringifyContent(JSON.parse(text))).toBe(text);
  });
});
