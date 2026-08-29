"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Swords, Flag } from "lucide-react";
import { getPokemonSpecies, DELUGE_VARIANTS } from "@/lib/pokedex";
import { api } from "@/lib/api-client";

/**
 * Arena PvP (Fase 4).
 *
 * Modelo assíncrono por polling: cada lado trava a ação às cegas e o servidor
 * resolve quando ambos travaram. O cliente consulta o estado a cada
 * `POLL_MS` e redesenha.
 *
 * Regra de segurança refletida aqui: o estado devolve apenas
 * `opponentCommitted: boolean` — **nunca** qual golpe o oponente escolheu.
 */

interface SideView {
  name: string;
  displayName: string;
  variant: string;
  pokedexId: number;
  level: number;
  hp: number;
  maxHp: number;
  moves: Array<{ name: string; type: string; power: number }>;
}

interface BattleView {
  roomCode: string;
  status: "WAITING" | "ACTIVE" | "FINISHED" | "ABANDONED";
  turn: number;
  phase: "ACTION" | "SWITCH";
  youAre: "p1" | "p2";
  you: SideView;
  opponent: { name: string; level: number; hp: number; maxHp: number; variant: string; pokedexId: number };
  opponentUsername: string;
  opponentCommitted: boolean;
  youCommitted: boolean;
  yourNeedsSwitch: boolean;
  yourActivePokemonId: number;
  winnerId: number | null;
  youWon: boolean;
  youRequestedRematch: boolean;
  opponentRequestedRematch: boolean;
  log: string[];
  version: number;
  party: Array<{ id: number; name: string; pokedexId: number; level: number; hp: number; maxHp: number }>;
}

const POLL_MS = 2500;

const hpColor = (hp: number, maxHp: number) =>
  hp / maxHp > 0.5 ? "bg-emerald-500" : hp / maxHp > 0.2 ? "bg-amber-400" : "bg-rose-600";

export function PvpArena({
  roomCode,
  onStateChange,
  onExit,
}: {
  roomCode: string;
  onStateChange: (user: unknown) => void;
  onExit: () => void;
}) {
  const [view, setView] = useState<BattleView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const versionRef = useRef(0);
  const finishedRef = useRef(false);

  const load = useCallback(
    async (
      apply: (v: BattleView) => void,
      fail: (msg: string) => void
    ) => {
      // Os setters entram por PARÂMETRO, como em `loadArenaChat` do
      // BattleArenaModal: é o formato que react-hooks/set-state-in-effect aceita
      // para carregamento disparado dentro de um effect.
      const res = await api(`/api/pvp?roomCode=${encodeURIComponent(roomCode)}`, {
        credentials: "same-origin",
      }).catch(() => null);

      if (!res) {
        fail("Falha de rede ao consultar a sala.");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        fail(data.error ?? "Sala indisponível.");
        return;
      }

      const next = data.battle as BattleView;
      versionRef.current = next.version;
      finishedRef.current = next.status === "FINISHED" || next.status === "ABANDONED";
      setError(null);
      apply(next);
    },
    [roomCode]
  );

  useEffect(() => {
    const tick = () =>
      void load(setView, (message) => {
        // A tela final já tem estado suficiente; uma falha transitória de poll
        // não deve substituir vitória/derrota por "Erro ao carregar arena".
        if (!finishedRef.current) setError(message);
      });
    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ roomCode, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ação recusada.");
        return;
      }
      if (data.user) onStateChange(data.user);
      if (data.battle) {
        versionRef.current = data.battle.version;
        finishedRef.current =
          data.battle.status === "FINISHED" || data.battle.status === "ABANDONED";
        setView(data.battle);
      }
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  };

  if (!view) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <p className="font-['Press_Start_2P'] text-xs text-amber-400">
          {error ?? "Conectando à arena..."}
        </p>
      </div>
    );
  }

  const youSpecies = getPokemonSpecies(view.you.pokedexId);
  const foeSpecies = getPokemonSpecies(view.opponent.pokedexId);
  const youVariant = DELUGE_VARIANTS.find((v) => v.id === view.you.variant) || DELUGE_VARIANTS[0];
  const foeVariant =
    DELUGE_VARIANTS.find((v) => v.id === view.opponent.variant) || DELUGE_VARIANTS[0];

  const finished = view.status === "FINISHED" || view.status === "ABANDONED";
  const waiting = view.status === "WAITING";
  const mustSwitch = view.yourNeedsSwitch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#090d16]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-rose-900/40 to-slate-950 px-5 py-3">
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-rose-400" />
            <div>
              <span className="font-['Press_Start_2P'] text-xs text-rose-300">
                ARENA PVP • SALA {view.roomCode}
              </span>
              <p className="font-['VT323'] text-base text-slate-400">
                Amistoso — não conta para o ranking · Turno {view.turn}
              </p>
            </div>
          </div>
          <button
            onClick={onExit}
            className="border-2 border-slate-600 bg-slate-800 px-3 py-1 font-['Press_Start_2P'] text-[10px] text-slate-200 hover:border-rose-500"
          >
            SAIR
          </button>
        </div>

        {error && (
          <div className="border-b-2 border-rose-600 bg-rose-950/70 px-5 py-1.5 font-['VT323'] text-lg text-rose-300">
            {error}
          </div>
        )}

        {finished ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
            <div className="text-6xl">{view.youWon ? "🏆" : "🎖️"}</div>
            <h2 className={`font-['Press_Start_2P'] text-lg ${view.youWon ? "text-amber-300" : "text-cyan-300"}`}>
              {view.youWon ? "VITÓRIA!" : "FIM DE BATALHA"}
            </h2>
            <p className="font-['VT323'] text-2xl text-slate-300">
              {view.youWon
                ? `Você venceu ${view.opponentUsername}!`
                : `${view.opponentUsername} venceu desta vez.`}
            </p>
            <div className="max-h-28 w-full max-w-xl overflow-y-auto border-2 border-slate-700 bg-slate-950 p-3 text-left font-['VT323'] text-lg text-amber-300">
              {view.log.slice(-5).map((line, index) => <div key={index}>▸ {line}</div>)}
            </div>
            {view.youRequestedRematch && !view.opponentRequestedRematch && (
              <p className="animate-pulse font-['Press_Start_2P'] text-[9px] text-cyan-300">
                AGUARDANDO O OPONENTE ACEITAR A REVANCHE...
              </p>
            )}
            {view.opponentRequestedRematch && !view.youRequestedRematch && (
              <p className="font-['VT323'] text-xl text-emerald-300">
                Seu oponente pediu revanche!
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                disabled={busy || view.youRequestedRematch}
                onClick={() => call({ action: "rematch" })}
                className="border-2 border-amber-400 bg-amber-500 px-5 py-2.5 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] disabled:opacity-50"
              >
                REVANCHE
              </button>
              <button
                onClick={onExit}
                className="border-2 border-slate-500 bg-slate-800 px-5 py-2.5 font-['Press_Start_2P'] text-[10px] text-slate-200"
              >
                SAIR
              </button>
            </div>
          </div>
        ) : waiting ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="text-5xl">⏳</div>
            <p className="font-['Press_Start_2P'] text-xs text-amber-400">AGUARDANDO RIVAL</p>
            <p className="font-['VT323'] text-xl text-slate-400">
              Compartilhe o código <span className="text-amber-300">{view.roomCode}</span> para
              alguém entrar.
            </p>
          </div>
        ) : (
          <>
            {/* Palco */}
            <div className="relative flex flex-col justify-between border-b-4 border-slate-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black p-6 sm:h-64">
              {/* Oponente */}
              <div className="flex items-start justify-between">
                <div className="border-2 border-slate-600 bg-slate-950/90 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-xs text-amber-300">
                      {view.opponent.name}
                    </span>
                    <span
                      className={`border px-1.5 py-0.5 font-['Press_Start_2P'] text-[8px] ${foeVariant.badgeBg} ${foeVariant.badgeBorder} ${foeVariant.badgeText}`}
                    >
                      {foeVariant.label}
                    </span>
                    <span className="font-['Press_Start_2P'] text-[10px] text-slate-400">
                      LV.{view.opponent.level}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">HP</span>
                    <div className="h-3 w-40 border border-black bg-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${hpColor(view.opponent.hp, view.opponent.maxHp)}`}
                        style={{ width: `${Math.max(0, (view.opponent.hp / view.opponent.maxHp) * 100)}%` }}
                      />
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-xs text-slate-300">
                      {view.opponent.hp}/{view.opponent.maxHp}
                    </span>
                  </div>
                  <div className="mt-1 font-['VT323'] text-base text-slate-400">
                    {view.opponentUsername}
                    {view.opponentCommitted ? (
                      <span className="ml-2 text-emerald-400">· ação travada ✓</span>
                    ) : (
                      <span className="ml-2 animate-pulse text-amber-400">· pensando...</span>
                    )}
                  </div>
                </div>

                <img
                  src={foeSpecies.frontSprite}
                  alt={view.opponent.name}
                  style={{ filter: foeVariant.filterCss, imageRendering: "pixelated" }}
                  className="mr-6 max-h-24 max-w-24 object-contain"
                />
              </div>

              {/* Você */}
              <div className="mt-4 flex items-end justify-between">
                <img
                  src={youSpecies.backSprite || youSpecies.frontSprite}
                  alt={view.you.displayName}
                  style={{ filter: youVariant.filterCss, imageRendering: "pixelated" }}
                  className="ml-6 max-h-28 max-w-28 object-contain"
                />

                <div className="border-2 border-amber-400 bg-slate-950/95 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-xs text-amber-300">
                      {view.you.displayName}
                    </span>
                    <span className="font-['Press_Start_2P'] text-[10px] text-slate-400">
                      LV.{view.you.level}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">HP</span>
                    <div className="h-3 w-44 border border-black bg-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${hpColor(view.you.hp, view.you.maxHp)}`}
                        style={{ width: `${Math.max(0, (view.you.hp / view.you.maxHp) * 100)}%` }}
                      />
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-xs text-amber-300">
                      {view.you.hp}/{view.you.maxHp}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Log + ações */}
            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12">
              <div className="flex flex-col border-2 border-slate-700 bg-slate-950 p-3 lg:col-span-5">
                <div className="max-h-32 flex-1 space-y-1 overflow-y-auto font-['VT323'] text-xl text-amber-300">
                  {view.log.map((line, i) => (
                    <div key={i}>▸ {line}</div>
                  ))}
                </div>

                {finished && (
                  <button
                    onClick={onExit}
                    className="mt-2 w-full border-2 border-emerald-400 bg-emerald-600 py-2 font-['Press_Start_2P'] text-xs text-white"
                  >
                    VOLTAR AO MAPA →
                  </button>
                )}
              </div>

              <div className="space-y-3 lg:col-span-7">
                {finished ? (
                  <p className="border-2 border-amber-400 bg-amber-500/10 px-4 py-3 text-center font-['Press_Start_2P'] text-[10px] text-amber-300">
                    BATALHA ENCERRADA
                  </p>
                ) : mustSwitch || picking ? (
                  <div>
                    <div className="mb-1.5 font-['Press_Start_2P'] text-[9px] text-cyan-300">
                      {mustSwitch ? "SEU POKÉMON DESMAIOU — ESCOLHA O PRÓXIMO:" : "TROCAR POR:"}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {view.party
                        .filter((m) => m.hp > 0 && m.id !== view.yourActivePokemonId)
                        .map((m) => {
                          const sp = getPokemonSpecies(m.pokedexId);
                          return (
                            <button
                              key={m.id}
                              disabled={busy}
                              onClick={async () => {
                                setPicking(false);
                                await call(
                                  mustSwitch
                                    ? { action: "switch", userPokemonId: m.id }
                                    : {
                                        action: "submit_turn",
                                        turnAction: { kind: "switch", userPokemonId: m.id },
                                      }
                                );
                              }}
                              className="flex items-center gap-2 border-2 border-slate-600 bg-slate-800 px-2 py-1.5 text-left hover:border-cyan-400 disabled:opacity-40"
                            >
                              <img src={sp.frontSprite} alt={m.name} className="h-8 w-8 object-contain" />
                              <span className="font-['Press_Start_2P'] text-[8px] text-amber-300">
                                {m.name}
                                <span className="ml-1 text-slate-500">LV.{m.level}</span>
                              </span>
                            </button>
                          );
                        })}
                    </div>
                    {!mustSwitch && (
                      <button
                        onClick={() => setPicking(false)}
                        className="mt-2 font-['VT323'] text-lg text-slate-400 hover:text-slate-200"
                      >
                        ← cancelar e escolher um golpe
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-1.5 font-['Press_Start_2P'] text-[9px] text-slate-400">
                      {view.youCommitted
                        ? "AÇÃO TRAVADA — AGUARDANDO O OPONENTE..."
                        : "ESCOLHA SUA AÇÃO (o oponente não vê):"}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {view.you.moves.map((m, i) => (
                        <button
                          key={i}
                          disabled={busy || view.youCommitted}
                          onClick={() =>
                            call({
                              action: "submit_turn",
                              turnAction: { kind: "attack", moveIndex: i },
                            })
                          }
                          className="border-2 border-slate-600 bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2.5 text-left font-['Press_Start_2P'] text-[10px] text-amber-300 shadow-[3px_3px_0px_#000] hover:border-amber-400 disabled:opacity-40"
                        >
                          ⚡ {m.name}
                          <span className="ml-1 text-[8px] text-slate-500">
                            {m.type} {m.power}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={busy || view.youCommitted}
                        onClick={() => setPicking(true)}
                        className="flex-1 border-2 border-cyan-500 bg-cyan-950/60 py-1.5 font-['Press_Start_2P'] text-[9px] text-cyan-300 hover:bg-cyan-900 disabled:opacity-40"
                      >
                        ⇄ TROCAR
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => call({ action: "forfeit" })}
                        className="flex items-center justify-center gap-1 border-2 border-rose-600 bg-rose-950/60 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] text-rose-300 hover:bg-rose-900 disabled:opacity-40"
                      >
                        <Flag className="h-3 w-3" /> DESISTIR
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
