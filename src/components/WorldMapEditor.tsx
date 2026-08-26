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

export interface GameMapData {
  id: number;
  slug: string;
  name: string;
  description: string;
  width: number;
  height: number;
  tileGrid: TileId[][];
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
    setStatusMsg(null);
  };

  const handleTileMouseDown = (y: number, x: number) => {
    setIsPainting(true);
    paintTile(y, x);
  };

  const handleTileMouseEnter = (y: number, x: number) => {
    if (isPainting) paintTile(y, x);
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

  const handleSaveCurrentMap = async () => {
    setSaving(true);
    retroSfx.playStep();
    try {
      const res = await fetch(`/api/maps/${activeMapId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mapName,
          description: mapDescription,
          tileGrid: grid,
          encounterTable: encounters,
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
      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMapName,
          description: newMapDesc,
          width: 16,
          height: 16,
          tileGrid: defaultGrid,
          encounterTable: [
            {
              pokedexId: 150,
              name: "Mewtwo",
              weight: 25,
              minLevel: 30,
              maxLevel: 50,
              tileTypes: ["tall_grass"],
            },
            {
              pokedexId: 384,
              name: "Rayquaza",
              weight: 25,
              minLevel: 30,
              maxLevel: 50,
              tileTypes: ["tall_grass"],
            },
            {
              pokedexId: 149,
              name: "Dragonite",
              weight: 30,
              minLevel: 25,
              maxLevel: 45,
              tileTypes: ["tall_grass"],
            },
          ],
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
            <div className="grid grid-cols-2 gap-1.5">
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
                Clique/Arraste para pintar tiles 16×16
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
                  return (
                    <div
                      key={`${y}-${x}`}
                      onMouseDown={() => handleTileMouseDown(y, x)}
                      onMouseEnter={() => handleTileMouseEnter(y, x)}
                      className={`relative flex items-center justify-center border border-black/30 text-xs transition hover:brightness-125 ${def.colorBg}`}
                      title={`(${x}, ${y}): ${def.name}${hasWarp ? " • PORTAL WARP" : ""}`}
                    >
                      <span className="select-none text-white/90">
                        {hasWarp ? "🌀" : def.symbol}
                      </span>
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
                3. ENCONTROS SELVAGENS NO MATINHO
              </h3>
            </div>
            <p className="mt-1 font-['VT323'] text-lg text-slate-400">
              Chances de spawn de Shiny, Metallic, Mystic, Dark e Ghostly são
              automáticas no DelugeRPG (20% variante especial).
            </p>

            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {encounters.map((enc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-2 border-slate-800 bg-slate-900 p-2"
                >
                  <div>
                    <div className="font-['Press_Start_2P'] text-[10px] text-amber-300">
                      {enc.name}
                    </div>
                    <div className="font-['IBM_Plex_Mono'] text-[10px] text-slate-400">
                      Lvl {enc.minLevel}-{enc.maxLevel} • Peso: {enc.weight}%
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setEncounters(encounters.filter((_, i) => i !== idx))
                    }
                    className="border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-rose-400 hover:bg-rose-950"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Add Encounter */}
            <div className="mt-4 border-t-2 border-slate-800 pt-3">
              <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-slate-300">
                + ADICIONAR POKÉMON AO MATINHO:
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
                        minLevel: 10,
                        maxLevel: 25,
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
