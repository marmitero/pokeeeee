"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Swords, X, Users, Trophy } from "lucide-react";
import { getPokemonSpecies } from "@/lib/pokedex";
import { api } from "@/lib/api-client";

/**
 * Lobby da Arena PvP (Fase 4 + 8.5).
 *
 * Três abas:
 *  - SALAS: amistoso por código (criar/entrar) — não conta para o ranking;
 *  - RANQUEADA: fila por ELO (`join_ranked`) — pareia sozinho um rival de
 *    ELO próximo (±150, +50 a cada 30 s de espera);
 *  - RANKING: top 50 por ELO + a posição do próprio jogador.
 *
 * O Pokémon é escolhido **por id** — o servidor lê os status do banco; o
 * cliente nunca os envia.
 */

interface PartyMon {
  id: number;
  name: string;
  pokedexId: number;
  level: number;
  hp: number;
  maxHp: number;
}

interface WaitingRoom {
  roomCode: string;
  player1Username: string;
}

interface RankingEntry {
  position: number;
  username: string;
  elo: number;
  matches: number;
}

interface RankingView {
  weekId: string;
  top: RankingEntry[];
  you: { username: string; elo: number; matches: number; position: number | null };
}

type Tab = "salas" | "ranqueada" | "ranking";

export function PvpLobby({
  party,
  onEnterRoom,
  onClose,
}: {
  party: PartyMon[];
  onEnterRoom: (roomCode: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("salas");
  const [rooms, setRooms] = useState<WaitingRoom[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    const first = party.find((m) => m.hp > 0);
    return first ? [first.id] : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ranking, setRanking] = useState<RankingView | null>(null);

  const loadRooms = useCallback(async (apply: (rooms: WaitingRoom[]) => void) => {
    // Setter por parâmetro — ver comentário em PvpArena.load.
    const res = await api("/api/pvp", { credentials: "same-origin" }).catch(() => null);
    if (!res || !res.ok) return; // o lobby funciona sem a listagem

    const data = await res.json();
    apply(data.waitingRooms ?? []);
  }, []);

  const loadRanking = useCallback(async (apply: (v: RankingView) => void) => {
    const res = await api("/api/pvp?ranking=1", { credentials: "same-origin" }).catch(() => null);
    if (!res || !res.ok) return;
    const data = await res.json();
    if (data.ranking) apply(data.ranking as RankingView);
  }, []);

  useEffect(() => {
    const tick = () => void loadRooms(setRooms);
    tick();
    const t = setInterval(tick, 4000);
    return () => clearInterval(t);
  }, [loadRooms]);

  useEffect(() => {
    // Setter por parâmetro — mesmo formato de loadRooms/PvpArena.load.
    if (tab === "ranking") void loadRanking(setRanking);
  }, [tab, loadRanking]);

  const usable = party.filter((m) => m.hp > 0);

  const call = async (body: Record<string, unknown>) => {
    if (selectedIds.length === 0) {
      setError("Escolha de 1 a 3 Pokémon para lutar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...body, pokemonIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível.");
        return;
      }
      onEnterRoom(data.roomCode);
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "salas", label: "SALAS" },
    { id: "ranqueada", label: "RANQUEADA" },
    { id: "ranking", label: "RANKING" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#000]">
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-rose-900/40 to-slate-950 px-5 py-3">
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-rose-400" />
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs text-rose-300">ARENA PVP</h2>
              <p className="font-['VT323'] text-base text-slate-400">
                Amistoso por código · Ranqueada por ELO · Ranking global
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="border-2 border-slate-600 bg-slate-800 p-1.5 hover:bg-rose-700"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b-4 border-slate-700">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 font-['Press_Start_2P'] text-[9px] transition ${
                tab === t.id
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-amber-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <div className="border-2 border-rose-600 bg-rose-950/70 px-4 py-2 font-['VT323'] text-lg text-rose-300">
              {error}
            </div>
          )}

          {/* Escolha do Pokémon (comum a salas e ranqueada) */}
          {tab !== "ranking" && (
            <section>
              <h3 className="mb-2 border-b-2 border-slate-800 pb-1 font-['Press_Start_2P'] text-[9px] text-amber-400">
                1. ESCOLHA SEU TIME (1–3)
              </h3>
              {usable.length === 0 ? (
                <p className="font-['VT323'] text-xl text-rose-300">
                  Nenhum Pokémon em condições de lutar. Cure a equipe num Centro Pokémon.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {usable.map((m) => {
                    const sp = getPokemonSpecies(m.pokedexId);
                    const active = selectedIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() =>
                          setSelectedIds((current) =>
                            current.includes(m.id)
                              ? current.filter((id) => id !== m.id)
                              : current.length < 3
                                ? [...current, m.id]
                                : current
                          )
                        }
                        className={`flex items-center gap-2 border-2 px-2 py-2 text-left transition ${
                          active
                            ? "border-amber-400 bg-amber-500/15"
                            : "border-slate-700 bg-slate-950 hover:border-slate-500"
                        }`}
                      >
                        <img src={sp.frontSprite} alt={m.name} className="h-9 w-9 object-contain" />
                        <span className="font-['Press_Start_2P'] text-[8px] text-amber-300">
                          {m.name}
                          <span className="ml-1 block text-slate-500">
                            LV.{m.level} · {m.hp}/{m.maxHp}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {tab === "salas" && (
            <>
              {/* Criar sala */}
              <section>
                <h3 className="mb-2 border-b-2 border-slate-800 pb-1 font-['Press_Start_2P'] text-[9px] text-amber-400">
                  2. CRIAR OU ENTRAR (AMISTOSO)
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy || selectedIds.length === 0}
                    onClick={() => call({ action: "create_room" })}
                    className="border-2 border-amber-400 bg-amber-500 px-4 py-2 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110 disabled:opacity-40"
                  >
                    + CRIAR SALA
                  </button>

                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO DA SALA"
                      className="min-w-0 flex-1 border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-amber-300 outline-none focus:border-amber-400"
                    />
                    <button
                      disabled={busy || !joinCode || selectedIds.length === 0}
                      onClick={() => call({ action: "join_room", roomCode: joinCode })}
                      className="border-2 border-cyan-400 bg-cyan-950 px-4 py-2 font-['Press_Start_2P'] text-[10px] text-cyan-300 hover:bg-cyan-900 disabled:opacity-40"
                    >
                      ENTRAR
                    </button>
                  </div>
                </div>
              </section>

              {/* Salas abertas */}
              <section>
                <h3 className="mb-2 flex items-center gap-2 border-b-2 border-slate-800 pb-1 font-['Press_Start_2P'] text-[9px] text-amber-400">
                  <Users className="h-3.5 w-3.5" /> SALAS AGUARDANDO ({rooms.length})
                </h3>
                {rooms.length === 0 ? (
                  <p className="font-['VT323'] text-xl text-slate-500">Nenhuma sala aberta agora.</p>
                ) : (
                  <div className="space-y-2">
                    {rooms.map((r) => (
                      <div
                        key={r.roomCode}
                        className="flex items-center justify-between border-2 border-slate-800 bg-slate-950 px-3 py-2"
                      >
                        <span className="font-['Press_Start_2P'] text-[9px] text-amber-300">
                          {r.roomCode}
                          <span className="ml-2 text-slate-500">de {r.player1Username}</span>
                        </span>
                        <button
                          disabled={busy || selectedIds.length === 0}
                          onClick={() => call({ action: "join_room", roomCode: r.roomCode })}
                          className="border-2 border-cyan-500 bg-cyan-950/60 px-3 py-1 font-['Press_Start_2P'] text-[8px] text-cyan-300 hover:bg-cyan-900 disabled:opacity-40"
                        >
                          ENTRAR
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {tab === "ranqueada" && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 border-b-2 border-slate-800 pb-1 font-['Press_Start_2P'] text-[9px] text-amber-400">
                <Swords className="h-3.5 w-3.5" /> BUSCA RANQUEADA (ELO)
              </h3>
              <p className="mb-3 font-['VT323'] text-lg text-slate-400">
                A fila pareia um rival de ELO próximo (janela de 150, que cresce 50 a cada
                30 s de espera). Vitórias sobem seu ELO e derrotas descem — vale ranking
                e recompensa semanal. Partidas contra a mesma conta só pontuam 3× por dia.
              </p>
              <button
                disabled={busy || selectedIds.length === 0}
                onClick={() => call({ action: "join_ranked" })}
                className="w-full border-2 border-rose-400 bg-rose-600 px-4 py-3 font-['Press_Start_2P'] text-[10px] text-white shadow-[3px_3px_0px_#000] hover:brightness-110 disabled:opacity-40"
              >
                ⚔ BUSCAR RIVAL RANQUEADO
              </button>
            </section>
          )}

          {tab === "ranking" && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 border-b-2 border-slate-800 pb-1 font-['Press_Start_2P'] text-[9px] text-amber-400">
                <Trophy className="h-3.5 w-3.5" /> RANKING GLOBAL · TOP 50
              </h3>

              {ranking && (
                <div className="mb-3 border-2 border-slate-700 bg-slate-950 px-3 py-2">
                  <span className="font-['Press_Start_2P'] text-[8px] text-slate-400">
                    VOCÊ · ELO {ranking.you.elo} · {ranking.you.matches} PARTIDA
                    {ranking.you.matches === 1 ? "" : "S"}
                  </span>
                  {ranking.you.position !== null ? (
                    <span className="ml-2 font-['Press_Start_2P'] text-[8px] text-amber-300">
                      #{ranking.you.position}
                    </span>
                  ) : (
                    <span className="ml-2 font-['VT323'] text-lg text-slate-500">
                      (complete 10 partidas ranqueadas para entrar no top)
                    </span>
                  )}
                </div>
              )}

              {ranking === null ? (
                <p className="font-['VT323'] text-xl text-slate-500">Carregando ranking...</p>
              ) : ranking.top.length === 0 ? (
                <p className="font-['VT323'] text-xl text-slate-500">
                  Ninguém disputou 10 partidas ranqueadas ainda. Seja o primeiro!
                </p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] border-b-2 border-slate-700 px-2 pb-1 font-['Press_Start_2P'] text-[8px] text-slate-500">
                    <span>#</span>
                    <span>JOGADOR</span>
                    <span className="text-right">ELO</span>
                    <span className="text-right">JOGOS</span>
                  </div>
                  {ranking.top.map((r) => (
                    <div
                      key={r.position}
                      className={`grid grid-cols-[2.5rem_1fr_4rem_4rem] items-center px-2 py-1 font-['IBM_Plex_Mono'] text-sm ${
                        r.username === ranking.you.username
                          ? "border-2 border-amber-400 bg-amber-500/10 text-amber-300"
                          : "text-slate-300"
                      }`}
                    >
                      <span className="font-['Press_Start_2P'] text-[9px]">
                        {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : r.position}
                      </span>
                      <span className="truncate">{r.username}</span>
                      <span className="text-right">{r.elo}</span>
                      <span className="text-right">{r.matches}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
