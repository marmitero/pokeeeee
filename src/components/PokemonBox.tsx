"use client";

import React, { useState } from "react";
import { DELUGE_VARIANTS, getPokemonSpecies } from "@/lib/pokedex";
import { retroSfx } from "@/lib/sound";
import { X, ArrowRightLeft, Trash2, DollarSign, Package, Zap } from "lucide-react";
import { api } from "@/lib/api-client";

export interface BoxPokemon {
  id: number;
  pokedexId: number;
  nickname: string | null;
  name: string;
  variant: string;
  isPremiumSkin: boolean;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  partySlot: number | null;
  isStarter: boolean;
  xp: number;
  xpToNextLevel: number;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
}

interface PokemonBoxProps {
  allPokemon: BoxPokemon[];
  userItems: { potions: number; superPotions: number; maxPotions: number; revives: number };
  onUpdated: (updatedPokemon: BoxPokemon[], updatedUser?: unknown) => void;
  onClose: () => void;
}

type ViewTab = "party" | "box";

export function PokemonBox({ allPokemon, userItems, onUpdated, onClose }: PokemonBoxProps) {
  const [tab, setTab] = useState<ViewTab>("party");
  const [selected, setSelected] = useState<BoxPokemon | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"release" | "sell" | null>(null);

  const party = allPokemon.filter((p) => p.partySlot !== null).sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99));
  const box = allPokemon.filter((p) => p.partySlot === null);

  const doAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!selected) return;
    setLoading(true);
    retroSfx.playStep();
    try {
      const res = await api("/api/pokemon/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, pokemonId: selected.id, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      onUpdated(data.party as BoxPokemon[], data.user);
      setSelected(null);
      setConfirmAction(null);
      retroSfx.playCatchSuccess();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const applyItem = async (item: string) => {
    if (!selected) return;
    setLoading(true);
    retroSfx.playAttack("heal");
    try {
      const res = await api("/api/pokemon/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use_item", pokemonId: selected.id, item }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      onUpdated(data.party as BoxPokemon[], data.user);
      setSelected((prev) => prev ? { ...prev, hp: Math.min(prev.maxHp, prev.hp + 99) } : null);
      retroSfx.playCatchSuccess();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const sellPrice = selected ? 200 + selected.level * 50 : 0;

  const renderPokemonCard = (poke: BoxPokemon, isInParty: boolean) => {
    const species = getPokemonSpecies(poke.pokedexId);
    const variantCfg = DELUGE_VARIANTS.find((v) => v.id === poke.variant) || DELUGE_VARIANTS[0];
    const hpPct = Math.max(0, Math.round((poke.hp / poke.maxHp) * 100));
    const xpPct = Math.round(((poke.xp % (poke.xpToNextLevel || 100)) / (poke.xpToNextLevel || 100)) * 100);
    const isSelected = selected?.id === poke.id;

    return (
      <div key={poke.id}
        onClick={() => { retroSfx.playStep(); setSelected(isSelected ? null : poke); setMessage(null); setConfirmAction(null); }}
        className={`cursor-pointer border-2 p-2 transition ${
          isSelected
            ? "border-amber-400 bg-amber-500/15 shadow-[0_0_10px_rgba(251,191,36,0.3)]"
            : "border-slate-700 bg-slate-950 hover:border-slate-600"
        }`}>
        <div className="flex items-center gap-2">
          {/* Slot badge */}
          {isInParty && (
            <span className="flex h-5 w-5 items-center justify-center border border-slate-600 bg-slate-800 font-['Press_Start_2P'] text-[8px] text-slate-400">
              {poke.partySlot}
            </span>
          )}
          <div className="relative h-10 w-10 flex-shrink-0">
            <img src={species.frontSprite} alt={poke.name}
              style={{ filter: variantCfg.filterCss, imageRendering: "pixelated" }}
              className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-['Press_Start_2P'] text-[9px] text-amber-300 truncate">
                {poke.nickname || poke.name}
              </span>
              {poke.variant !== "Normal" && (
                <span className={`border px-1 py-0.5 font-['Press_Start_2P'] text-[7px] ${variantCfg.badgeBg} ${variantCfg.badgeBorder} ${variantCfg.badgeText}`}>
                  {poke.variant.slice(0, 4)}
                </span>
              )}
              {poke.isPremiumSkin && <span className="text-amber-400 text-xs">★</span>}
            </div>
            <div className="font-['IBM_Plex_Mono'] text-[9px] text-slate-500">LV.{poke.level} • {poke.name}</div>
            {/* HP bar */}
            <div className="mt-1 flex items-center gap-1">
              <span className="font-['Press_Start_2P'] text-[7px] text-emerald-400">HP</span>
              <div className="h-1.5 flex-1 border border-black bg-slate-800">
                <div className={`h-full transition-all ${hpPct > 50 ? "bg-emerald-500" : hpPct > 20 ? "bg-amber-400" : "bg-rose-500"}`}
                  style={{ width: `${hpPct}%` }} />
              </div>
              <span className="font-['IBM_Plex_Mono'] text-[8px] text-slate-400">{poke.hp}/{poke.maxHp}</span>
            </div>
            {/* XP bar */}
            <div className="mt-0.5 flex items-center gap-1">
              <span className="font-['Press_Start_2P'] text-[7px] text-blue-400">XP</span>
              <div className="h-1 flex-1 border border-black bg-slate-800">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
          {poke.isStarter && (
            <span className="flex-shrink-0 border border-amber-400/50 bg-amber-500/10 px-1 py-0.5 font-['Press_Start_2P'] text-[7px] text-amber-400">INIT</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#000,0_20px_50px_rgba(0,0,0,0.95)]">

        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-slate-950 px-5 py-3">
          <div>
            <h2 className="font-['Press_Start_2P'] text-xs text-amber-400">📦 POKÉMON & PC BOX</h2>
            <p className="font-['VT323'] text-lg text-slate-400">Time: {party.length}/6 • PC: {box.length} guardados</p>
          </div>
          <div className="flex items-center gap-2">
            {(["party", "box"] as ViewTab[]).map((t) => (
              <button key={t} onClick={() => { setTab(t); setSelected(null); }}
                className={`border-2 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] ${
                  tab === t ? "border-amber-400 bg-amber-500/20 text-amber-300" : "border-slate-700 bg-slate-800 text-slate-400"
                }`}>
                {t === "party" ? "🎮 TIME" : "🖥️ PC BOX"}
              </button>
            ))}
            <button onClick={onClose} className="border-2 border-slate-600 bg-slate-800 p-1.5 text-slate-300 hover:bg-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {message && (
          <div className="border-b-2 border-emerald-600 bg-emerald-950/80 px-5 py-2 font-['VT323'] text-xl text-emerald-300">
            ✔ {message}
          </div>
        )}

        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
          {/* Left: Pokemon list */}
          <div className="overflow-y-auto border-r-2 border-slate-800 p-4">
            <div className="mb-2 font-['Press_Start_2P'] text-[9px] text-slate-400">
              {tab === "party" ? `TIME ATIVO (${party.length}/6)` : `PC BOX (${box.length} Pokémon)`}
            </div>
            <div className="space-y-2">
              {(tab === "party" ? party : box).map((p) => renderPokemonCard(p, tab === "party"))}
              {(tab === "party" ? party : box).length === 0 && (
                <p className="font-['VT323'] text-xl text-slate-500 text-center py-8">
                  {tab === "party" ? "Time vazio!" : "PC Box vazio!"}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions panel */}
          <div className="overflow-y-auto p-4">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="text-4xl">👆</span>
                <p className="mt-3 font-['Press_Start_2P'] text-[9px] text-slate-500">
                  Selecione um Pokémon para ver opções
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected pokemon detail */}
                {(() => {
                  const species = getPokemonSpecies(selected.pokedexId);
                  const variantCfg = DELUGE_VARIANTS.find((v) => v.id === selected.variant) || DELUGE_VARIANTS[0];
                  return (
                    <div className="border-2 border-slate-700 bg-slate-950 p-3">
                      <div className="flex items-center gap-3">
                        <img src={species.frontSprite} alt={selected.name}
                          style={{ filter: variantCfg.filterCss }}
                          className="h-16 w-16 object-contain" />
                        <div>
                          <div className="font-['Press_Start_2P'] text-xs text-amber-300">
                            {selected.nickname || selected.name}
                            {selected.variant !== "Normal" && <span className={`ml-2 border px-1 py-0.5 text-[8px] ${variantCfg.badgeBg} ${variantCfg.badgeBorder} ${variantCfg.badgeText}`}>{selected.variant}</span>}
                          </div>
                          <div className="font-['IBM_Plex_Mono'] text-xs text-slate-400">
                            LV.{selected.level} • #{selected.pokedexId} {selected.name}
                          </div>
                          <div className="mt-1 grid grid-cols-2 gap-x-3 font-['IBM_Plex_Mono'] text-[10px] text-slate-300">
                            <span>ATK: {selected.attack}</span>
                            <span>DEF: {selected.defense}</span>
                            <span>VEL: {selected.speed}</span>
                            <span>HP: {selected.hp}/{selected.maxHp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {[selected.move1, selected.move2, selected.move3, selected.move4].map((m, i) => (
                          <span key={i} className="border border-slate-700 bg-slate-900 px-2 py-0.5 font-['IBM_Plex_Mono'] text-[9px] text-slate-300">⚡ {m}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Movement actions */}
                <div>
                  <div className="mb-2 font-['Press_Start_2P'] text-[9px] text-cyan-300">MOVER POKÉMON:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.partySlot !== null ? (
                      <button onClick={() => doAction("to_box")} disabled={loading}
                        className="flex items-center justify-center gap-1.5 border-2 border-slate-600 bg-slate-800 px-3 py-2 font-['Press_Start_2P'] text-[9px] text-slate-300 hover:border-slate-400 disabled:opacity-40">
                        <Package className="h-3.5 w-3.5" /> ENVIAR AO PC
                      </button>
                    ) : (
                      <button onClick={() => doAction("to_party")} disabled={loading}
                        className="flex items-center justify-center gap-1.5 border-2 border-emerald-600 bg-emerald-950 px-3 py-2 font-['Press_Start_2P'] text-[9px] text-emerald-300 hover:bg-emerald-900 disabled:opacity-40">
                        <ArrowRightLeft className="h-3.5 w-3.5" /> COLOCAR NO TIME
                      </button>
                    )}
                  </div>
                </div>

                {/* Use items */}
                <div>
                  <div className="mb-2 font-['Press_Start_2P'] text-[9px] text-emerald-300">USAR ITEM:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => applyItem("potion")} disabled={loading || userItems.potions <= 0}
                      className="flex items-center justify-center gap-1 border border-slate-600 bg-slate-900 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-slate-200 hover:border-emerald-500 disabled:opacity-40">
                      🧪 Poção ×{userItems.potions}
                    </button>
                    <button onClick={() => applyItem("superPotion")} disabled={loading || userItems.superPotions <= 0}
                      className="flex items-center justify-center gap-1 border border-slate-600 bg-slate-900 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-slate-200 hover:border-emerald-500 disabled:opacity-40">
                      🧴 S.Poção ×{userItems.superPotions}
                    </button>
                    <button onClick={() => applyItem("maxPotion")} disabled={loading || userItems.maxPotions <= 0}
                      className="flex items-center justify-center gap-1 border border-slate-600 bg-slate-900 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-slate-200 hover:border-emerald-500 disabled:opacity-40">
                      💊 H.Poção ×{userItems.maxPotions}
                    </button>
                    <button onClick={() => applyItem("revive")} disabled={loading || userItems.revives <= 0 || selected.hp > 0}
                      className="flex items-center justify-center gap-1 border border-slate-600 bg-slate-900 px-2 py-1.5 font-['Press_Start_2P'] text-[8px] text-slate-200 hover:border-amber-500 disabled:opacity-40">
                      ⚡ Reviver ×{userItems.revives}
                    </button>
                  </div>
                </div>

                {/* Danger zone */}
                {!selected.isStarter && (
                  <div>
                    <div className="mb-2 font-['Press_Start_2P'] text-[9px] text-rose-400">ZONA DE PERIGO:</div>
                    {confirmAction === null ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setConfirmAction("release")}
                          className="flex items-center justify-center gap-1.5 border-2 border-slate-700 bg-slate-900 px-3 py-2 font-['Press_Start_2P'] text-[8px] text-slate-400 hover:border-rose-500 hover:text-rose-300">
                          <Trash2 className="h-3.5 w-3.5" /> SOLTAR
                        </button>
                        <button onClick={() => setConfirmAction("sell")}
                          className="flex items-center justify-center gap-1.5 border-2 border-amber-700/50 bg-slate-900 px-3 py-2 font-['Press_Start_2P'] text-[8px] text-amber-600 hover:border-amber-400 hover:text-amber-300">
                          <DollarSign className="h-3.5 w-3.5" /> VENDER
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-rose-500 bg-rose-950/60 p-3">
                        <p className="font-['VT323'] text-xl text-rose-300">
                          {confirmAction === "sell"
                            ? `Vender ${selected.name} por ${sellPrice} Pk$?`
                            : `Soltar ${selected.name}? Esta ação é irreversível!`}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => doAction(confirmAction)} disabled={loading}
                            className="flex-1 border-2 border-rose-400 bg-rose-700 py-1.5 font-['Press_Start_2P'] text-[9px] text-white hover:bg-rose-600 disabled:opacity-40">
                            CONFIRMAR
                          </button>
                          <button onClick={() => setConfirmAction(null)}
                            className="flex-1 border-2 border-slate-600 bg-slate-800 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-300">
                            CANCELAR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
