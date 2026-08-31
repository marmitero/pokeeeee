"use client";

import React, { useState } from "react";
import { TILE_DEFINITIONS, TileId } from "@/lib/tiles";
import { POKEDEX } from "@/lib/pokedex";
import { retroSfx } from "@/lib/sound";
import {
  Save,
  PlusCircle,
  Link2,
  Brush,
  MapPin,
  X,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import {
  DEFAULT_ENCOUNTER_RATE,
  hasEncounterAt,
  isWalkableAt,
} from "@/lib/map-rules";
import {
  applyLevelRange,
  blankLayer,
  countMarked,
  countOverrides,
  loadLayer,
  sanitizeLevelRange,
  weightShare,
} from "@/lib/map-layers";

export interface GameMapData {
  id: number;
  slug: string;
  name: string;
  description: string;
  width: number;
  height: number;
  tileGrid: TileId[][];
  /** Fase 6.2-A — camadas novas; vazias em mapa legado. Editáveis na 6.2-B. */
  encounterGrid?: boolean[][];
  collisionGrid?: (null | "blocked" | "walkable")[][];
  encounterRate?: number;
  encounterTable: {
    pokedexId: number;
    name: string;
    weight: number;
    minLevel: number;
    maxLevel: number;
    tileTypes: string[];
  }[];
  portals: {
    id: string;
    sourceX: number;
    sourceY: number;
    targetMapId: number;
    targetMapName?: string;
    targetX: number;
    targetY: number;
    label?: string;
  }[];
  npcs?: {
    id: string;
    x: number;
    y: number;
    type: "shop" | "gym" | "healer" | "info";
    name: string;
    shopId?: number;
    gymId?: number;
    dialog: string;
  }[];
}

/** O que o pincel edita. Fase 6.2-B. */
type PaintMode = "terrain" | "encounter" | "collision";

/** Override de colisão por célula: `null` = padrão do tipo de tile. */
type CollisionCell = null | "blocked" | "walkable";

/**
 * Camadas da Fase 6.2 no editor.
 *
 * `null` no estado significa **camada desligada** (mapa em modo legado), que é
 * diferente de uma camada ligada e toda falsa: a primeira deixa o tipo do tile
 * decidir, a segunda diz "aqui não tem nada". Como essa distinção é o coração
 * da regra, ela é preservada no estado e só vira `[]` ao salvar. As funções
 * puras estão em `@/lib/map-layers`, com teste próprio.
 */

interface WorldMapEditorProps {
  maps: GameMapData[];
  currentMapId: number;
  onMapSaved: (updatedMaps: GameMapData[], selectMapId?: number) => void;
  onClose: () => void;
}

export function WorldMapEditor({
  maps,
  currentMapId,
  onMapSaved,
  onClose,
}: WorldMapEditorProps) {
  const initialMap =
    maps.find((m) => m.id === currentMapId) || maps[0];

  const [activeMapId, setActiveMapId] = useState<number>(initialMap.id);
  const [mapName, setMapName] = useState(initialMap.name);
  const [mapDescription, setMapDescription] = useState(initialMap.description);
  const [grid, setGrid] = useState<TileId[][]>(() =>
    JSON.parse(JSON.stringify(initialMap.tileGrid))
  );
  const [portals, setPortals] = useState<GameMapData["portals"]>(
    initialMap.portals || []
  );
  const [encounters, setEncounters] = useState<GameMapData["encounterTable"]>(
    initialMap.encounterTable || []
  );

  // ── Camadas da Fase 6.2 ───────────────────────────────────────────────
  const [paintMode, setPaintMode] = useState<PaintMode>("terrain");
  const [encounterGrid, setEncounterGrid] = useState<boolean[][] | null>(() =>
    loadLayer(initialMap.encounterGrid, initialMap.height, initialMap.width, false)
  );
  const [collisionGrid, setCollisionGrid] = useState<CollisionCell[][] | null>(() =>
    loadLayer<CollisionCell>(initialMap.collisionGrid, initialMap.height, initialMap.width, null)
  );
  const [encounterRate, setEncounterRate] = useState<number>(
    initialMap.encounterRate ?? DEFAULT_ENCOUNTER_RATE
  );
  const [collisionBrush, setCollisionBrush] = useState<CollisionCell>("blocked");
  const [encounterBrush, setEncounterBrush] = useState<boolean>(true);
  const [bulkMinLevel, setBulkMinLevel] = useState(2);
  const [bulkMaxLevel, setBulkMaxLevel] = useState(7);

  const [selectedBrush, setSelectedBrush] = useState<TileId>("tall_grass");
  const [isPainting, setIsPainting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Portal link tool modal
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalSourceX, setPortalSourceX] = useState(7);
  const [portalSourceY, setPortalSourceY] = useState(0);
  const [portalTargetMapId, setPortalTargetMapId] = useState<number>(
    maps.length > 1 ? maps[1].id : maps[0].id
  );
  const [portalTargetX, setPortalTargetX] = useState(7);
  const [portalTargetY, setPortalTargetY] = useState(14);

  // New map creator drawer
  const [showCreateNewMap, setShowCreateNewMap] = useState(false);
  const [newMapName, setNewMapName] = useState(
    `Mapa ${maps.length + 1}: Ilha Estelar Cinnabar`
  );
  const [newMapDesc, setNewMapDesc] = useState(
    "Nova região criada no Editor de Mundos ligada por portal."
  );
  const [linkFromCurrentMap, setLinkFromCurrentMap] = useState(true);
  const [linkFromX, setLinkFromX] = useState(15);
  const [linkFromY, setLinkFromY] = useState(7);

  // Switch editing map
  const switchMap = (m: GameMapData) => {
    retroSfx.playStep();
    setActiveMapId(m.id);
    setMapName(m.name);
    setMapDescription(m.description);
    setGrid(JSON.parse(JSON.stringify(m.tileGrid)));
    setPortals(m.portals || []);
    setEncounters(m.encounterTable || []);
    setEncounterGrid(loadLayer(m.encounterGrid, m.height, m.width, false));
    setCollisionGrid(loadLayer<CollisionCell>(m.collisionGrid, m.height, m.width, null));
    setEncounterRate(m.encounterRate ?? DEFAULT_ENCOUNTER_RATE);
    setStatusMsg(null);
  };

  const height = grid.length;
  const width = grid[0]?.length ?? 16;

  /** Mapa sintético para consultar `map-rules` — a MESMA regra do jogo. */
  const rulesView = {
    width,
    height,
    tileGrid: grid,
    encounterGrid: encounterGrid ?? [],
    collisionGrid: collisionGrid ?? [],
    encounterTable: encounters,
  };

  const handleTileMouseDown = (y: number, x: number) => {
    setIsPainting(true);
    paintCell(y, x);
  };

  const handleTileMouseEnter = (y: number, x: number) => {
    if (isPainting) paintCell(y, x);
  };

  const paintCell = (y: number, x: number) => {
    if (paintMode === "terrain") return paintTile(y, x);
    if (paintMode === "encounter") return paintEncounter(y, x);
    return paintCollision(y, x);
  };

  const paintTile = (y: number, x: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[y][x] = selectedBrush;
      return next;
    });
    if (selectedBrush === "portal") {
      setPortalSourceX(x);
      setPortalSourceY(y);
    }
  };

  /**
   * Área de caça marcada a partir do comportamento atual do mapa.
   *
   * Serve de ponto de partida ao ligar a camada: sem isto, ligar a camada
   * apagaria de uma vez todos os encontros do matinho, porque a camada passa a
   * ser a única fonte da verdade. Convertendo, o mapa continua igual e a
   * pintura vira um ajuste.
   */
  const encounterFromTiles = (): boolean[][] =>
    grid.map((row, y) =>
      row.map((_, x) =>
        hasEncounterAt({ width, height, tileGrid: grid, encounterTable: encounters }, x, y)
      )
    );

  const paintEncounter = (y: number, x: number) => {
    setEncounterGrid((prev) => {
      const base = prev ?? encounterFromTiles();
      const next = base.map((row) => [...row]);
      next[y][x] = encounterBrush;
      return next;
    });
  };

  const paintCollision = (y: number, x: number) => {
    setCollisionGrid((prev) => {
      const base = prev ?? blankLayer<CollisionCell>(height, width, null);
      const next = base.map((row) => [...row]);
      next[y][x] = collisionBrush;
      return next;
    });
  };

  const encounterCount = countMarked(encounterGrid);
  const collisionCount = countOverrides(collisionGrid);

  /** Altera um campo numérico de uma espécie da lista. */
  const updateEncounter = (
    idx: number,
    field: "weight" | "minLevel" | "maxLevel",
    value: number
  ) => {
    setEncounters((prev) =>
      prev.map((enc, i) => (i === idx ? { ...enc, [field]: value } : enc))
    );
  };

  const handleSaveCurrentMap = async () => {
    setSaving(true);
    retroSfx.playStep();
    try {
      const res = await api(`/api/maps/${activeMapId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mapName,
          description: mapDescription,
          tileGrid: grid,
          encounterTable: encounters,
          // `[]` desliga a camada e devolve o mapa ao modo legado — por isso o
          // estado guarda `null` em vez de já nascer como grade cheia.
          encounterGrid: encounterGrid ?? [],
          collisionGrid: collisionGrid ?? [],
          encounterRate,
          portals,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar mapa");
      retroSfx.playCatchSuccess();
      setStatusMsg(`✓ ${mapName} salvo com sucesso no banco de dados!`);
      onMapSaved(data.maps, activeMapId);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewMapAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    retroSfx.playPortalWarp();

    // Cria grade com árvores ao redor e matinho/água central
    const defaultGrid: TileId[][] = Array.from({ length: 16 }, (_, y) =>
      Array.from({ length: 16 }, (_, x) => {
        if (y === 0 || y === 15 || x === 0 || x === 15) return "tree";
        if (y >= 6 && y <= 11 && x >= 4 && x <= 11) return "tall_grass";
        if (y === 7 && x === 7) return "center";
        return "grass";
      })
    );

    // Portal de volta ao mapa de origem em (0,7)
    defaultGrid[7][0] = "portal";
    defaultGrid[8][0] = "portal";

    const originMap = maps.find((m) => m.id === activeMapId) || maps[0];

    try {
      const res = await api("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMapName,
          description: newMapDesc,
          width: 16,
          height: 16,
          tileGrid: defaultGrid,
          // Fase 6.2-B: mapa novo nasce **sem** espécies. Antes vinha com
          // Mewtwo/Rayquaza/Dragonite nível 25-50 fixos no código, o que
          // contraria a dificuldade progressiva — quem cria o mapa escolhe.
          encounterTable: [],
          portals: [
            {
              id: `back-${Date.now()}`,
              sourceX: 0,
              sourceY: 7,
              targetMapId: originMap.id,
              targetMapName: originMap.name,
              targetX: linkFromX,
              targetY: linkFromY,
              label: `Voltar → ${originMap.name}`,
            },
          ],
          linkFromMapId: linkFromCurrentMap ? originMap.id : undefined,
          linkFromX: linkFromCurrentMap ? linkFromX : undefined,
          linkFromY: linkFromCurrentMap ? linkFromY : undefined,
          linkTargetX: 1,
          linkTargetY: 7,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar mapa");
      retroSfx.playCatchSuccess();
      setShowCreateNewMap(false);
      setStatusMsg(
        `✓ Novo mapa "${newMapName}" criado e conectado ao ${originMap.name}!`
      );
      onMapSaved(data.maps, data.createdMap.id);
      switchMap(data.createdMap);
    } catch (err: unknown) {
      setStatusMsg(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPortalConnection = () => {
    const targetMap = maps.find((m) => m.id === Number(portalTargetMapId));
    // Marca tile local como portal
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[portalSourceY][portalSourceX] = "portal";
      return next;
    });

    const newPortal = {
      id: `warp-${Date.now()}`,
      sourceX: portalSourceX,
      sourceY: portalSourceY,
      targetMapId: Number(portalTargetMapId),
      targetMapName: targetMap?.name || `Mapa #${portalTargetMapId}`,
      targetX: Number(portalTargetX),
      targetY: Number(portalTargetY),
      label: `Warp (${portalSourceX},${portalSourceY}) → ${targetMap?.name || "Mapa"}`,
    };
    setPortals((prev) => [...prev, newPortal]);
    setShowPortalModal(false);
    retroSfx.playPortalWarp();
  };

  return (
    <div
      onMouseUp={() => setIsPainting(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm"
    >
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#090d16,0_20px_50px_rgba(0,0,0,0.95)]">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-900 via-amber-900/40 to-slate-900 px-5 py-3">
          <div className="flex items-center gap-3">
            <Brush className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs text-amber-400">
                EDITOR DE MUNDOS FUNCIONAL • DELUGERPG
              </h2>
              <p className="font-['VT323'] text-lg text-slate-300">
                Crie do 2º mapa em diante, pinte matinhos com Shiny/Metallic e ligue portais entre mapas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                retroSfx.playStep();
                setShowCreateNewMap(true);
              }}
              className="flex items-center gap-1.5 border-2 border-cyan-400 bg-cyan-500/20 px-3 py-1.5 font-['Press_Start_2P'] text-[10px] text-cyan-300 hover:bg-cyan-500/30"
            >
              <PlusCircle className="h-4 w-4" /> + CRIAR NOVO MAPA & LIGAR
            </button>
            <button
              onClick={handleSaveCurrentMap}
              disabled={saving}
              className="flex items-center gap-1.5 border-2 border-amber-400 bg-amber-500 px-4 py-1.5 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110"
            >
              <Save className="h-4 w-4" /> {saving ? "SALVANDO..." : "SALVAR MAPA"}
            </button>
            <button
              onClick={onClose}
              className="border-2 border-slate-500 bg-slate-800 px-3 py-1.5 font-['Press_Start_2P'] text-xs text-slate-300 hover:bg-rose-700 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Map tabs bar */}
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-slate-800 bg-slate-950 px-5 py-2">
          <span className="font-['Press_Start_2P'] text-[9px] text-slate-400">
            SELECIONAR MAPA:
          </span>
          {maps.map((m) => (
            <button
              key={m.id}
              onClick={() => switchMap(m)}
              className={`border-2 px-2.5 py-1 font-['Press_Start_2P'] text-[9px] ${
                activeMapId === m.id
                  ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600"
              }`}
            >
              {m.name} ({m.portals?.length || 0} portais)
            </button>
          ))}
        </div>

        {/* Barra de modos de pintura (Fase 6.2-B) */}
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-slate-800 bg-slate-950/60 px-5 py-2">
          <span className="font-['Press_Start_2P'] text-[9px] text-slate-400">PINTAR:</span>
          {(
            [
              ["terrain", "TERRENO", "amber", "o desenho do mapa"],
              ["encounter", "ENCONTROS", "emerald", "onde aparecem bichos"],
              ["collision", "COLISÃO", "rose", "onde dá para andar"],
            ] as const
          ).map(([mode, label, color, hint]) => {
            const active = paintMode === mode;
            const palette =
              color === "amber"
                ? "border-amber-400 bg-amber-500/20 text-amber-300"
                : color === "emerald"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : "border-rose-400 bg-rose-500/20 text-rose-300";
            return (
              <button
                key={mode}
                onClick={() => {
                  retroSfx.playStep();
                  setPaintMode(mode);
                }}
                title={hint}
                className={`border-2 px-3 py-1 font-['Press_Start_2P'] text-[9px] ${
                  active
                    ? palette
                    : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-600"
                }`}
              >
                {label}
              </button>
            );
          })}
          <span className="font-['VT323'] text-lg text-slate-400">
            {paintMode === "terrain" && "Pinte o desenho do mapa."}
            {paintMode === "encounter" &&
              (encounterGrid
                ? `Área de caça: ${encounterCount} célula(s) marcada(s).`
                : "Camada desligada — o matinho decide, como sempre foi.")}
            {paintMode === "collision" &&
              (collisionGrid
                ? `Colisão: ${collisionCount} célula(s) com exceção.`
                : "Camada desligada — o tipo do tile decide.")}
          </span>
        </div>

        {statusMsg && (
          <div className="border-b-2 border-emerald-500 bg-emerald-950/80 px-5 py-2 font-['VT323'] text-xl text-emerald-300">
            {statusMsg}
          </div>
        )}

        {/* Editor Main Content: Left Tile Brush & Portals | Center 16x16 Grid | Right Wild Spawns */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Left Panel: Brush Palette & Warp Portal Connector */}
          <div className="border-b-2 border-slate-800 bg-slate-950/80 p-4 lg:col-span-3 lg:border-b-0 lg:border-r-2">
            <h3 className="mb-2 font-['Press_Start_2P'] text-[10px] text-amber-400">
              1. PALETA DE TILES 16-BIT
            </h3>
            <div
              className={`grid grid-cols-2 gap-1.5 ${
                paintMode === "terrain" ? "" : "pointer-events-none opacity-40"
              }`}
            >
              {(Object.keys(TILE_DEFINITIONS) as TileId[]).map((tileId) => {
                const def = TILE_DEFINITIONS[tileId];
                const active = selectedBrush === tileId;
                return (
                  <button
                    key={tileId}
                    onClick={() => {
                      retroSfx.playStep();
                      setSelectedBrush(tileId);
                    }}
                    className={`flex items-center gap-2 border-2 p-2 text-left transition ${
                      active
                        ? "border-amber-400 bg-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center border border-black font-['Press_Start_2P'] text-xs text-white ${def.colorBg}`}
                    >
                      {def.symbol}
                    </span>
                    <span className="font-['IBM_Plex_Mono'] text-[10px] text-slate-200">
                      {def.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Painel do modo ENCONTROS (Fase 6.2-B) */}
            {paintMode === "encounter" && (
              <div className="mt-5 border-t-2 border-slate-800 pt-4">
                <h3 className="font-['Press_Start_2P'] text-[10px] text-emerald-300">
                  ÁREA DE CAÇA (TILE INVISÍVEL)
                </h3>
                <p className="mt-1 font-['VT323'] text-lg text-slate-400">
                  Marca a célula como área de caça sem mudar o desenho. Vale
                  sobre qualquer tile: areia, pedra ou água liberada.
                </p>

                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {([[true, "MARCAR"], [false, "APAGAR"]] as const).map(([value, label]) => (
                    <button
                      key={label}
                      onClick={() => setEncounterBrush(value)}
                      className={`border-2 px-2 py-1.5 font-['Press_Start_2P'] text-[9px] ${
                        encounterBrush === value
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                          : "border-slate-800 bg-slate-900 text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 space-y-1.5">
                  <button
                    onClick={() => {
                      setEncounterGrid(encounterFromTiles());
                      setStatusMsg(
                        "Área de caça criada a partir do matinho atual. Ajuste e salve."
                      );
                    }}
                    className="w-full border-2 border-emerald-700 bg-emerald-950/60 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-emerald-300 hover:bg-emerald-900/60"
                  >
                    USAR O MATINHO ATUAL
                  </button>
                  <button
                    onClick={() => setEncounterGrid(blankLayer(height, width, false))}
                    className="w-full border-2 border-slate-700 bg-slate-900 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-slate-300 hover:border-slate-500"
                  >
                    LIMPAR TUDO
                  </button>
                  <button
                    onClick={() => {
                      setEncounterGrid(null);
                      setStatusMsg("Camada desligada: volta a valer o tipo do tile.");
                    }}
                    className="w-full border-2 border-slate-800 bg-slate-950 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-slate-500 hover:border-slate-600"
                  >
                    DESLIGAR CAMADA (LEGADO)
                  </button>
                </div>

                {encounterGrid && encounterCount > 0 && encounters.length === 0 && (
                  <p className="mt-2 border-2 border-rose-700 bg-rose-950/60 p-2 font-['VT323'] text-lg text-rose-300">
                    Há área pintada e nenhuma espécie na lista → o servidor vai
                    recusar o salvamento. Adicione espécies no painel 3.
                  </p>
                )}
                {encounterGrid && (
                  <p className="mt-2 font-['VT323'] text-base text-amber-300/90">
                    Com a camada ligada ela é a única fonte da verdade: matinho
                    não marcado deixa de gerar encontro.
                  </p>
                )}
              </div>
            )}

            {/* Painel do modo COLISÃO (Fase 6.2-B) */}
            {paintMode === "collision" && (
              <div className="mt-5 border-t-2 border-slate-800 pt-4">
                <h3 className="font-['Press_Start_2P'] text-[10px] text-rose-300">
                  COLISÃO POR CÉLULA
                </h3>
                <p className="mt-1 font-['VT323'] text-lg text-slate-400">
                  Exceção ao padrão do tile. É assim que a água vira andável e o
                  encontro aquático passa a existir.
                </p>

                <div className="mt-2 space-y-1.5">
                  {(
                    [
                      ["blocked", "✖ BLOQUEAR", "border-rose-400 bg-rose-500/20 text-rose-300"],
                      ["walkable", "✓ LIBERAR", "border-cyan-400 bg-cyan-500/20 text-cyan-300"],
                      [null, "· PADRÃO DO TILE", "border-slate-400 bg-slate-500/20 text-slate-200"],
                    ] as const
                  ).map(([value, label, palette]) => (
                    <button
                      key={label}
                      onClick={() => setCollisionBrush(value)}
                      className={`w-full border-2 px-2 py-1.5 text-left font-['Press_Start_2P'] text-[9px] ${
                        collisionBrush === value
                          ? palette
                          : "border-slate-800 bg-slate-900 text-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setCollisionGrid(null);
                      setStatusMsg("Colisão volta ao padrão de cada tipo de tile.");
                    }}
                    className="w-full border-2 border-slate-800 bg-slate-950 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-slate-500 hover:border-slate-600"
                  >
                    LIMPAR EXCEÇÕES (LEGADO)
                  </button>
                </div>

                <p className="mt-2 font-['VT323'] text-base text-slate-400">
                  A borda do mapa continua fechada mesmo liberada — liberar é
                  terreno, não saída do mundo.
                </p>
              </div>
            )}

            {/* Portal Linker Section */}
            <div className="mt-5 border-t-2 border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-['Press_Start_2P'] text-[10px] text-cyan-300">
                  2. LIGAÇÃO DE MAPAS (PORTAIS)
                </h3>
                <button
                  onClick={() => setShowPortalModal(true)}
                  className="border border-cyan-400 bg-cyan-950 px-2 py-1 font-['Press_Start_2P'] text-[8px] text-cyan-300 hover:bg-cyan-800"
                >
                  + CONECTAR WARP
                </button>
              </div>

              <div className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto">
                {portals.length === 0 ? (
                  <p className="font-['VT323'] text-lg text-slate-500">
                    Nenhum portal ainda. Pinte um tile 🌀 ou clique em &ldquo;+
                    CONECTAR WARP&rdquo; para ligar este mapa a outro.
                  </p>
                ) : (
                  portals.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="flex items-center justify-between border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-['IBM_Plex_Mono'] text-xs text-slate-200"
                    >
                      <div>
                        <span className="text-amber-400">
                          ({p.sourceX},{p.sourceY})
                        </span>{" "}
                        →{" "}
                        <span className="text-cyan-300">
                          {p.targetMapName || `Mapa #${p.targetMapId}`}
                        </span>{" "}
                        <span className="text-slate-400">
                          ({p.targetX},{p.targetY})
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setPortals(portals.filter((_, i) => i !== idx))
                        }
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Center Panel: 16x16 Interactive Canvas Grid */}
          <div className="flex flex-col items-center justify-center bg-slate-950 p-4 lg:col-span-6">
            <div className="mb-2 flex w-full items-center justify-between">
              <input
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="border-2 border-slate-700 bg-slate-900 px-3 py-1 font-['Press_Start_2P'] text-xs text-amber-300"
              />
              <span className="font-['VT323'] text-lg text-slate-400">
                {paintMode === "terrain" && "Clique/arraste para pintar tiles"}
                {paintMode === "encounter" && "Clique/arraste: verde ~ = aparece bicho"}
                {paintMode === "collision" && "Clique/arraste: ✖ bloqueado · ✓ liberado"}
              </span>
            </div>

            <div
              className="grid select-none border-4 border-amber-400 bg-black shadow-[0_0_20px_rgba(0,0,0,0.9)]"
              style={{
                gridTemplateColumns: "repeat(16, minmax(0, 1fr))",
                width: "min(440px, 90vw)",
                height: "min(440px, 90vw)",
              }}
            >
              {grid.map((row, y) =>
                row.map((tileId, x) => {
                  const def = TILE_DEFINITIONS[tileId] || TILE_DEFINITIONS.grass;
                  const hasWarp = portals.some(
                    (p) => p.sourceX === x && p.sourceY === y
                  );

                  // O overlay usa `map-rules`, então mostra o resultado REAL do
                  // motor — não uma segunda interpretação das camadas.
                  const walkable = isWalkableAt(rulesView, x, y);
                  const spawns = hasEncounterAt(rulesView, x, y);
                  const override = collisionGrid?.[y]?.[x] ?? null;

                  const overlay =
                    paintMode === "encounter"
                      ? spawns
                        ? "bg-emerald-400/45 text-emerald-50"
                        : "bg-black/45 text-slate-500"
                      : paintMode === "collision"
                        ? override === "blocked"
                          ? "bg-rose-500/50 text-rose-50"
                          : override === "walkable"
                            ? "bg-cyan-400/50 text-cyan-50"
                            : walkable
                              ? "bg-black/10 text-white/40"
                              : "bg-black/55 text-slate-400"
                        : "";

                  const mark =
                    paintMode === "encounter"
                      ? spawns
                        ? "~"
                        : ""
                      : paintMode === "collision"
                        ? override === "blocked"
                          ? "✖"
                          : override === "walkable"
                            ? "✓"
                            : walkable
                              ? ""
                              : "·"
                        : "";

                  const title =
                    paintMode === "encounter"
                      ? `(${x}, ${y}): ${def.name} • ${spawns ? "área de caça" : "sem encontro"}`
                      : paintMode === "collision"
                        ? `(${x}, ${y}): ${def.name} • ${walkable ? "andável" : "bloqueado"}${
                            override ? ` (exceção: ${override})` : " (padrão do tile)"
                          }`
                        : `(${x}, ${y}): ${def.name}${hasWarp ? " • PORTAL WARP" : ""}`;

                  return (
                    <div
                      key={`${y}-${x}`}
                      onMouseDown={() => handleTileMouseDown(y, x)}
                      onMouseEnter={() => handleTileMouseEnter(y, x)}
                      className={`relative flex items-center justify-center border border-black/30 text-xs transition hover:brightness-125 ${def.colorBg}`}
                      title={title}
                    >
                      <span className="select-none text-white/90">
                        {hasWarp ? "🌀" : def.symbol}
                      </span>
                      {overlay && (
                        <span
                          className={`pointer-events-none absolute inset-0 flex items-center justify-center font-['IBM_Plex_Mono'] text-[11px] font-bold ${overlay}`}
                        >
                          {mark}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Wild Pokémon Encounter Table */}
          <div className="border-t-2 border-slate-800 bg-slate-950/80 p-4 lg:col-span-3 lg:border-l-2 lg:border-t-0">
            <div className="flex items-center justify-between">
              <h3 className="font-['Press_Start_2P'] text-[10px] text-emerald-400">
                3. ESPÉCIES DESTE MAPA
              </h3>
            </div>
            <p className="mt-1 font-['VT323'] text-lg text-slate-400">
              Peso decide a frequência relativa; a % ao lado é a chance real,
              já calculada. Variante especial (Shiny, Metallic…) continua
              automática em ~20%.
            </p>

            {/* Taxa de encontro do mapa (era 22% fixo no código do cliente) */}
            <div className="mt-3 border-2 border-slate-800 bg-slate-900 p-2">
              <label className="font-['Press_Start_2P'] text-[9px] text-slate-300">
                TAXA DE ENCONTRO POR PASSO
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={encounterRate}
                  onChange={(e) => setEncounterRate(Number(e.target.value))}
                  className="flex-1 accent-emerald-400"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={encounterRate}
                  onChange={(e) =>
                    setEncounterRate(Math.min(100, Math.max(0, Number(e.target.value))))
                  }
                  className="w-16 border border-slate-700 bg-slate-950 p-1 text-center font-['IBM_Plex_Mono'] text-xs text-emerald-300"
                />
                <span className="font-['VT323'] text-lg text-slate-400">%</span>
              </div>
            </div>

            {/* Faixa de nível do mapa inteiro */}
            <div className="mt-2 border-2 border-slate-800 bg-slate-900 p-2">
              <label className="font-['Press_Start_2P'] text-[9px] text-slate-300">
                FAIXA DE NÍVEL DO MAPA
              </label>
              <div className="mt-1.5 flex items-center gap-2 font-['IBM_Plex_Mono'] text-xs">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bulkMinLevel}
                  onChange={(e) => setBulkMinLevel(Number(e.target.value))}
                  className="w-14 border border-slate-700 bg-slate-950 p-1 text-center text-amber-300"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bulkMaxLevel}
                  onChange={(e) => setBulkMaxLevel(Number(e.target.value))}
                  className="w-14 border border-slate-700 bg-slate-950 p-1 text-center text-amber-300"
                />
                <button
                  onClick={() => {
                    const { min, max } = sanitizeLevelRange(bulkMinLevel, bulkMaxLevel);
                    setEncounters((prev) => applyLevelRange(prev, min, max));
                    setStatusMsg(`Faixa ${min}-${max} aplicada a todas as espécies.`);
                  }}
                  className="flex-1 border-2 border-amber-600 bg-amber-950/60 px-2 py-1 font-['Press_Start_2P'] text-[8px] text-amber-300 hover:bg-amber-900/60"
                >
                  APLICAR A TODAS
                </button>
              </div>
            </div>

            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {encounters.length === 0 && (
                <p className="font-['VT323'] text-lg text-slate-500">
                  Nenhuma espécie ainda. Escolha abaixo — sem espécie, o mapa
                  não gera encontro nenhum.
                </p>
              )}
              {encounters.map((enc, idx) => {
                const chance = weightShare(encounters, idx);
                const invertido = enc.minLevel > enc.maxLevel;
                return (
                  <div
                    key={idx}
                    className="border-2 border-slate-800 bg-slate-900 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-['Press_Start_2P'] text-[10px] text-amber-300">
                        #{enc.pokedexId} {enc.name}
                      </div>
                      <button
                        onClick={() => setEncounters(encounters.filter((_, i) => i !== idx))}
                        className="border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-rose-400 hover:bg-rose-950"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-1.5 grid grid-cols-3 gap-1.5 font-['IBM_Plex_Mono'] text-[10px]">
                      <label className="text-slate-400">
                        peso
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={enc.weight}
                          onChange={(e) => updateEncounter(idx, "weight", Number(e.target.value))}
                          className="mt-0.5 w-full border border-slate-700 bg-slate-950 p-1 text-center text-slate-200"
                        />
                      </label>
                      <label className="text-slate-400">
                        nv mín
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={enc.minLevel}
                          onChange={(e) => updateEncounter(idx, "minLevel", Number(e.target.value))}
                          className={`mt-0.5 w-full border bg-slate-950 p-1 text-center ${
                            invertido ? "border-rose-500 text-rose-300" : "border-slate-700 text-slate-200"
                          }`}
                        />
                      </label>
                      <label className="text-slate-400">
                        nv máx
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={enc.maxLevel}
                          onChange={(e) => updateEncounter(idx, "maxLevel", Number(e.target.value))}
                          className={`mt-0.5 w-full border bg-slate-950 p-1 text-center ${
                            invertido ? "border-rose-500 text-rose-300" : "border-slate-700 text-slate-200"
                          }`}
                        />
                      </label>
                    </div>

                    <div className="mt-1 flex items-center justify-between font-['VT323'] text-base">
                      <span className="text-emerald-300">chance real: {chance}%</span>
                      {invertido && (
                        <span className="text-rose-400">nv mín &gt; máx — o servidor recusa</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Encounter */}
            <div className="mt-4 border-t-2 border-slate-800 pt-3">
              <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-slate-300">
                + ADICIONAR ESPÉCIE A ESTE MAPA:
              </label>
              <select
                onChange={(e) => {
                  const poke = POKEDEX.find(
                    (p) => p.id === Number(e.target.value)
                  );
                  if (poke) {
                    setEncounters([
                      ...encounters,
                      {
                        pokedexId: poke.id,
                        name: poke.name,
                        weight: 20,
                        // Herda a faixa do mapa em vez do antigo 10-25 fixo.
                        minLevel: sanitizeLevelRange(bulkMinLevel, bulkMaxLevel).min,
                        maxLevel: sanitizeLevelRange(bulkMinLevel, bulkMaxLevel).max,
                        tileTypes: ["tall_grass"],
                      },
                    ]);
                  }
                }}
                defaultValue=""
                className="w-full border-2 border-slate-700 bg-slate-900 px-2 py-1.5 font-['IBM_Plex_Mono'] text-xs text-amber-300"
              >
                <option value="" disabled>
                  -- Escolher Espécie da Pokédex --
                </option>
                {POKEDEX.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} {p.name} ({p.types.join("/")})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal: CONECTAR PORTAL ENTRE DOIS MAPAS */}
        {showPortalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
            <div className="w-full max-w-lg border-4 border-cyan-400 bg-slate-900 p-5 shadow-2xl">
              <h3 className="mb-3 font-['Press_Start_2P'] text-xs text-cyan-300">
                🌀 CONECTAR PORTAL DE WARP ENTRE MAPAS
              </h3>
              <div className="space-y-3 font-['IBM_Plex_Mono'] text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400">Origem X (0..15):</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={portalSourceX}
                      onChange={(e) => setPortalSourceX(Number(e.target.value))}
                      className="mt-1 w-full border border-slate-700 bg-slate-950 p-2 text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Origem Y (0..15):</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={portalSourceY}
                      onChange={(e) => setPortalSourceY(Number(e.target.value))}
                      className="mt-1 w-full border border-slate-700 bg-slate-950 p-2 text-amber-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400">Mapa Destino:</label>
                  <select
                    value={portalTargetMapId}
                    onChange={(e) => setPortalTargetMapId(Number(e.target.value))}
                    className="mt-1 w-full border border-slate-700 bg-slate-950 p-2 text-cyan-300"
                  >
                    {maps.map((m) => (
                      <option key={m.id} value={m.id}>
                        Mapa #{m.id}: {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400">Chegada X (0..15):</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={portalTargetX}
                      onChange={(e) => setPortalTargetX(Number(e.target.value))}
                      className="mt-1 w-full border border-slate-700 bg-slate-950 p-2 text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Chegada Y (0..15):</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={portalTargetY}
                      onChange={(e) => setPortalTargetY(Number(e.target.value))}
                      className="mt-1 w-full border border-slate-700 bg-slate-950 p-2 text-amber-300"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPortalModal(false)}
                    className="border border-slate-600 bg-slate-800 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-300"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPortalConnection}
                    className="border border-cyan-400 bg-cyan-500 px-4 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-950"
                  >
                    CRIAR LIGAÇÃO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: CRIAR NOVO MAPA E LIGAR AUTOMATICAMENTE */}
        {showCreateNewMap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
            <form
              onSubmit={handleCreateNewMapAndLink}
              className="w-full max-w-lg border-4 border-amber-400 bg-slate-900 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h3 className="font-['Press_Start_2P'] text-xs text-amber-400">
                  CRIAR NOVO MAPA DO MUNDO (MAPA #{maps.length + 1})
                </h3>
              </div>

              {/*
                Erro dentro do próprio drawer. Antes a falha ia para `statusMsg`,
                que renderiza em outro painel — o usuário clicava em criar, a
                request falhava (ex.: 401 de sessão) e a tela não dava sinal
                nenhum. Parecia que "carregava e parava".
              */}
              {statusMsg && (
                <div
                  className={`border-2 px-3 py-2 font-['VT323'] text-lg ${
                    statusMsg.startsWith("✓")
                      ? "border-emerald-600 bg-emerald-950/70 text-emerald-300"
                      : "border-rose-600 bg-rose-950/70 text-rose-300"
                  }`}
                >
                  {statusMsg}
                </div>
              )}

              {saving && (
                <p className="font-['VT323'] text-lg text-amber-300">Salvando mapa...</p>
              )}

              <div>
                <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-slate-400">
                  NOME DO MAPA:
                </label>
                <input
                  type="text"
                  required
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-amber-300"
                />
              </div>

              <div>
                <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-slate-400">
                  DESCRIÇÃO:
                </label>
                <input
                  type="text"
                  value={newMapDesc}
                  onChange={(e) => setNewMapDesc(e.target.value)}
                  className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-slate-200"
                />
              </div>

              <div className="border-2 border-slate-800 bg-slate-950 p-3">
                <label className="flex items-center gap-2 font-['Press_Start_2P'] text-[9px] text-cyan-300">
                  <input
                    type="checkbox"
                    checked={linkFromCurrentMap}
                    onChange={(e) => setLinkFromCurrentMap(e.target.checked)}
                  />
                  CONECTAR AUTOMATICAMENTE AO MAPA ATUAL POR PORTAL?
                </label>

                {linkFromCurrentMap && (
                  <div className="mt-2 grid grid-cols-2 gap-2 font-['IBM_Plex_Mono'] text-xs">
                    <div>
                      <span className="text-slate-400">Portal X no Mapa Atual:</span>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={linkFromX}
                        onChange={(e) => setLinkFromX(Number(e.target.value))}
                        className="mt-1 w-full border border-slate-700 bg-slate-900 p-1.5 text-amber-300"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400">Portal Y no Mapa Atual:</span>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={linkFromY}
                        onChange={(e) => setLinkFromY(Number(e.target.value))}
                        className="mt-1 w-full border border-slate-700 bg-slate-900 p-1.5 text-amber-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateNewMap(false)}
                  className="border border-slate-600 bg-slate-800 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-300"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="border border-amber-400 bg-amber-500 px-4 py-2 font-['Press_Start_2P'] text-[9px] text-slate-950 shadow-[3px_3px_0px_#000]"
                >
                  {saving ? "CRIANDO..." : "+ GERAR MAPA & SALVAR"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
