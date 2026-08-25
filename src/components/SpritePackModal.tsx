"use client";

import React, { useState } from "react";
import { POKEDEX, DELUGE_VARIANTS, DelugeVariant } from "@/lib/pokedex";
import { Sparkles, X, Volume2 } from "lucide-react";
import { retroSfx } from "@/lib/sound";

interface SpritePackModalProps {
  onClose: () => void;
}

export function SpritePackModal({ onClose }: SpritePackModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<DelugeVariant>("Shiny");
  const [searchQuery, setSearchQuery] = useState("");

  const activeVariantConfig =
    DELUGE_VARIANTS.find((v) => v.id === selectedVariant) || DELUGE_VARIANTS[0];

  const filteredPokedex = POKEDEX.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#090d16,0_20px_50px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-800 via-amber-900/40 to-slate-800 px-5 py-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="font-['Press_Start_2P'] text-sm tracking-wider text-amber-400 uppercase">
                PACOTE DE SPRITES & CLASSES DELUGERPG
              </h2>
              <p className="font-['VT323'] text-lg text-slate-300">
                16-Bit Pixel Sprites • Shaders Gen 4/5 • Filtros Dinâmicos de Classe
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              retroSfx.playStep();
              onClose();
            }}
            className="border-2 border-slate-500 bg-slate-800 px-3 py-1 font-['Press_Start_2P'] text-xs text-amber-300 hover:bg-rose-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Variant selector bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-800 bg-slate-950/80 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-['Press_Start_2P'] text-[10px] text-slate-400">
              CLASSE:
            </span>
            {DELUGE_VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  retroSfx.playStep();
                  setSelectedVariant(v.id);
                }}
                className={`border-2 px-2.5 py-1 font-['Press_Start_2P'] text-[10px] transition-transform active:translate-y-0.5 ${
                  selectedVariant === v.id
                    ? `${v.badgeBg} ${v.badgeBorder} ${v.badgeText} shadow-[0_0_12px_rgba(251,191,36,0.4)]`
                    : "border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-500"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Buscar Pokémon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-2 border-slate-700 bg-slate-900 px-3 py-1.5 font-['IBM_Plex_Mono'] text-xs text-amber-300 outline-none focus:border-amber-400"
          />
        </div>

        {/* Banner with active variant info */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 bg-gradient-to-r from-amber-500/10 via-transparent to-cyan-500/10 px-5 py-2">
          <div className="font-['VT323'] text-xl text-amber-300">
            Efeito Ativo:{" "}
            <span className="text-white">{activeVariantConfig.statBonusText}</span>
          </div>
          <button
            onClick={() => retroSfx.playCatchSuccess()}
            className="flex items-center gap-1.5 font-['IBM_Plex_Mono'] text-xs text-cyan-300 hover:underline"
          >
            <Volume2 className="h-4 w-4" /> Testar Som 8-Bit
          </button>
        </div>

        {/* Grid of Pokémon Sprites */}
        <div className="grid max-h-[55vh] grid-cols-2 gap-4 overflow-y-auto p-5 sm:grid-cols-4 md:grid-cols-6">
          {filteredPokedex.map((poke) => (
            <div
              key={poke.id}
              onClick={() => retroSfx.playAttack(poke.moves[0]?.sfx || "slash")}
              className="group relative flex cursor-pointer flex-col items-center justify-between border-2 border-slate-700 bg-slate-950/90 p-3 transition hover:border-amber-400 hover:bg-slate-900"
            >
              <span className="self-start font-['Press_Start_2P'] text-[9px] text-slate-500">
                #{String(poke.id).padStart(3, "0")}
              </span>
              <div className="relative my-2 flex h-20 w-20 items-center justify-center">
                {/* Glow ring */}
                <div
                  className="absolute inset-0 rounded-full opacity-35 blur-md"
                  style={{
                    backgroundColor:
                      selectedVariant === "Shiny"
                        ? "#f59e0b"
                        : selectedVariant === "Metallic"
                        ? "#38bdf8"
                        : selectedVariant === "Mystic"
                        ? "#a855f7"
                        : selectedVariant === "Dark"
                        ? "#ef4444"
                        : selectedVariant === "Ghostly"
                        ? "#2dd4bf"
                        : "transparent",
                  }}
                />
                <img
                  src={
                    selectedVariant === "Shiny"
                      ? poke.shinyFrontSprite || poke.frontSprite
                      : poke.frontSprite
                  }
                  alt={poke.name}
                  style={{
                    filter: activeVariantConfig.filterCss,
                    imageRendering: "pixelated",
                  }}
                  className="relative z-10 max-h-16 max-w-16 object-contain transition-transform group-hover:scale-110"
                />
              </div>
              <div className="text-center">
                <div className="font-['Press_Start_2P'] text-[10px] text-amber-300">
                  {poke.name}
                </div>
                <div className="mt-1 flex justify-center gap-1">
                  {poke.types.map((t) => (
                    <span
                      key={t}
                      className="border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-['IBM_Plex_Mono'] text-[9px] text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t-4 border-slate-700 bg-slate-950 px-5 py-3 font-['VT323'] text-lg text-slate-400">
          <span>Clique em qualquer sprite para ouvir seu efeito sonoro 8-bit.</span>
          <span className="text-amber-400">
            Total de Pokémon: {POKEDEX.length} × 6 Variantes Deluge ={" "}
            {POKEDEX.length * 6} sprites
          </span>
        </div>
      </div>
    </div>
  );
}
