"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DELUGE_VARIANTS, getPokemonSpecies } from "@/lib/pokedex";
import { retroSfx } from "@/lib/sound";
import { Swords, Send } from "lucide-react";
import type { BattleView } from "@/lib/battle-service";

export interface ArenaChatMessage {
  id?: number;
  username: string;
  message: string;
  createdAt?: string;
}

interface BattleArenaModalProps {
  /** Batalha selvagem criada pelo servidor. `null` = só a arena/chat. */
  battleId: number | null;
  username: string;
  onStateChange: (user: unknown, party: unknown[]) => void;
  onBattleEnd: () => void;
}

/**
 * Arena de batalha (Fase 2).
 *
 * Reescrita como **cliente do motor do servidor**. Antes o dano era calculado
 * aqui com `(level * 2.4 + 14) * crit` — ignorando power, accuracy, tipo e os
 * próprios status —, a rolagem de captura era decidida no cliente, o HP nunca
 * era gravado (fechar a modal restaurava tudo) e a vitória anunciava
 * "+650 Pokedólares" sem chamar API nenhuma.
 *
 * Agora: a batalha já vem criada do servidor, cada golpe é um POST, e o HP, o
 * XP e o dinheiro retornam prontos para exibir.
 */

async function loadArenaChat(
  onMessages: (messages: ArenaChatMessage[]) => void
): Promise<void> {
  try {
    const res = await fetch("/api/pvp", { credentials: "same-origin" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.chatMessages)) {
      onMessages(data.chatMessages as ArenaChatMessage[]);
    }
  } catch {
    // O chat é acessório: uma falha não pode derrubar a batalha.
  }
}

async function callBattle(
  body: Record<string, unknown>
): Promise<{ battle: BattleView; user: unknown; party: unknown[] } | { error: string }> {
  const res = await fetch("/api/battle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? "Erro na batalha." };
  return data;
}

export function BattleArenaModal({
  battleId,
  username,
  onStateChange,
  onBattleEnd,
}: BattleArenaModalProps) {
  const [battle, setBattle] = useState<BattleView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(battleId !== null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ArenaChatMessage[]>([]);
  const [pvpRoomCode, setPvpRoomCode] = useState("ARENA-DELUGE-01");
  const [roomMsg, setRoomMsg] = useState<string | null>(null);

  // Chat global (B11): busca ao abrir + polling.
  useEffect(() => {
    void loadArenaChat(setChatMessages);
    const timer = setInterval(() => void loadArenaChat(setChatMessages), 5000);
    return () => clearInterval(timer);
  }, []);

  const loadBattle = useCallback(async () => {
    if (battleId === null) return;
    // Sem `setLoading(true)` aqui: chamá-lo dentro do corpo do effect é setState
    // síncrono (react-hooks/set-state-in-effect). O estado inicial já nasce
    // `true` quando há battleId.
    try {
      const res = await fetch(`/api/battle?battleId=${battleId}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (res.ok) setBattle(data.battle);
      else setError(data.error ?? "Batalha indisponível.");
    } finally {
      setLoading(false);
    }
  }, [battleId]);

  useEffect(() => {
    void loadBattle();
  }, [loadBattle]);

  const state = battle?.state ?? null;
  const player = state?.player ?? null;
  const opponent = state?.opponent ?? null;
  const finished =
    battle !== null && ["WON", "LOST", "FLED", "CAUGHT"].includes(battle.status);

  const opponentSpecies = opponent ? getPokemonSpecies(opponent.pokedexId) : null;
  const playerSpecies = player ? getPokemonSpecies(player.pokedexId) : null;
  const opponentVariantCfg =
    DELUGE_VARIANTS.find((v) => v.id === opponent?.variant) || DELUGE_VARIANTS[0];
  const playerVariantCfg =
    DELUGE_VARIANTS.find((v) => v.id === player?.variant) || DELUGE_VARIANTS[0];

  const applyResult = (res: { battle: BattleView; user: unknown; party: unknown[] }) => {
    setBattle(res.battle);
    if (res.party) onStateChange(res.user, res.party);
    if (res.battle.status === "WON" || res.battle.status === "CAUGHT") {
      retroSfx.playCatchSuccess();
    }
  };

  const doAttack = async (moveIndex: number) => {
    if (!battle || busy || finished) return;
    setBusy(true);
    setError(null);
    retroSfx.playAttack("flame");

    const res = await callBattle({ action: "attack", battleId: battle.id, moveIndex });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    applyResult(res);
  };

  const doCatch = async (ball: string) => {
    if (!battle || busy || finished) return;
    setBusy(true);
    setError(null);
    retroSfx.playStep();

    const res = await callBattle({ action: "catch", battleId: battle.id, ball });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    applyResult(res);
  };

  const doFlee = async () => {
    if (!battle || busy || finished) return;
    setBusy(true);
    const res = await callBattle({ action: "flee", battleId: battle.id });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      setBusy(false);
      return;
    }
    applyResult(res);
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    retroSfx.playStep();
    setChatMessages((prev) => [...prev, { username, message: chatInput.trim() }]);
    setChatInput("");
    try {
      const res = await fetch("/api/pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "chat", message: chatInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chatMessages)) setChatMessages(data.chatMessages);
      }
    } catch {
      // ignore
    }
  };

  const createRoom = async () => {
    retroSfx.playCatchSuccess();
    setRoomMsg(null);
    try {
      const res = await fetch("/api/pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "create_room", roomCode: pvpRoomCode }),
      });
      const data = await res.json();
      setRoomMsg(
        res.ok
          ? `Sala ${data.battle?.roomCode ?? pvpRoomCode} aberta. A luta PvP real chega na Fase 4.`
          : (data.error ?? "Não foi possível abrir a sala.")
      );
    } catch {
      setRoomMsg("Falha de rede ao abrir a sala.");
    }
  };

  const hpColor = (hp: number, maxHp: number) =>
    hp / maxHp > 0.5 ? "bg-emerald-500" : hp / maxHp > 0.2 ? "bg-amber-400" : "bg-rose-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#090d16,0_20px_50px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-amber-900/50 to-slate-950 px-5 py-3">
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-amber-400" />
            <span className="font-['Press_Start_2P'] text-xs text-amber-400">
              {opponent
                ? `ENCONTRO SELVAGEM • ${opponent.variant.toUpperCase()} ${opponent.name.toUpperCase()}`
                : "ARENA DELUGERPG"}
            </span>
          </div>
          <button
            onClick={() => {
              retroSfx.playStep();
              onBattleEnd();
            }}
            className="border-2 border-amber-400 bg-rose-600 px-3 py-1 font-['Press_Start_2P'] text-[10px] text-white hover:bg-rose-700"
          >
            SAIR
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-10 font-['Press_Start_2P'] text-xs text-amber-400">
            Carregando batalha...
          </div>
        ) : !player || !opponent || !opponentSpecies || !playerSpecies ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <p className="font-['VT323'] text-2xl text-slate-300">
              {error ?? "Nenhuma batalha ativa."}
            </p>
            <p className="font-['VT323'] text-xl text-slate-500">
              Use o chat abaixo ou feche para voltar a explorar.
            </p>
          </div>
        ) : (
          <>
            {/* Palco */}
            <div className="relative flex flex-col justify-between border-b-4 border-slate-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black p-6 sm:h-72">
              <div className="flex items-start justify-between">
                <div className="border-2 border-slate-600 bg-slate-950/90 px-4 py-2 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-xs text-amber-300">{opponent.name}</span>
                    <span
                      className={`border px-1.5 py-0.5 font-['Press_Start_2P'] text-[8px] ${opponentVariantCfg.badgeBg} ${opponentVariantCfg.badgeBorder} ${opponentVariantCfg.badgeText}`}
                    >
                      {opponentVariantCfg.label}
                    </span>
                    <span className="font-['Press_Start_2P'] text-[10px] text-slate-400">LV.{opponent.level}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">HP</span>
                    <div className="h-3 w-40 border border-black bg-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${hpColor(opponent.hp, opponent.maxHp)}`}
                        style={{ width: `${Math.max(0, (opponent.hp / opponent.maxHp) * 100)}%` }}
                      />
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-xs text-slate-300">
                      {opponent.hp}/{opponent.maxHp}
                    </span>
                  </div>
                </div>

                <div className="relative mr-6 flex h-28 w-28 items-center justify-center">
                  <img
                    src={opponentSpecies.frontSprite}
                    alt={opponent.name}
                    style={{ filter: opponentVariantCfg.filterCss, imageRendering: "pixelated" }}
                    className="relative z-10 max-h-24 max-w-24 object-contain"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div className="relative ml-6 flex h-28 w-28 items-center justify-center">
                  <img
                    src={playerSpecies.backSprite || playerSpecies.frontSprite}
                    alt={player.displayName}
                    style={{ filter: playerVariantCfg.filterCss, imageRendering: "pixelated" }}
                    className="relative z-10 max-h-28 max-w-28 object-contain"
                  />
                </div>

                <div className="border-2 border-amber-400 bg-slate-950/95 px-4 py-2.5 shadow-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-xs text-amber-300">{player.displayName}</span>
                    <span
                      className={`border px-1.5 py-0.5 font-['Press_Start_2P'] text-[8px] ${playerVariantCfg.badgeBg} ${playerVariantCfg.badgeBorder} ${playerVariantCfg.badgeText}`}
                    >
                      {playerVariantCfg.label}
                    </span>
                    <span className="font-['Press_Start_2P'] text-[10px] text-slate-400">LV.{player.level}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">HP</span>
                    <div className="h-3 w-44 border border-black bg-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${hpColor(player.hp, player.maxHp)}`}
                        style={{ width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%` }}
                      />
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-xs text-amber-300">
                      {player.hp}/{player.maxHp}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Log + ações */}
            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12">
              <div className="flex flex-col justify-between border-2 border-slate-700 bg-slate-950 p-3 lg:col-span-5">
                <div className="max-h-28 space-y-1 overflow-y-auto font-['VT323'] text-xl text-amber-300">
                  {(state?.log ?? []).map((line, i) => (
                    <div key={i}>▸ {line}</div>
                  ))}
                </div>

                {finished && (
                  <button
                    onClick={onBattleEnd}
                    className="mt-2 w-full border-2 border-emerald-400 bg-emerald-600 py-2 font-['Press_Start_2P'] text-xs text-white"
                  >
                    CONTINUAR EXPLORANDO →
                  </button>
                )}
                {!finished && battle?.kind === "wild" && (
                  <button
                    onClick={doFlee}
                    disabled={busy}
                    className="mt-2 w-full border-2 border-slate-600 bg-slate-800 py-2 font-['Press_Start_2P'] text-[10px] text-slate-300 hover:border-rose-500 disabled:opacity-40"
                  >
                    FUGIR
                  </button>
                )}
              </div>

              <div className="space-y-3 lg:col-span-7">
                {error && (
                  <div className="border-2 border-rose-600 bg-rose-950/70 px-3 py-1.5 font-['VT323'] text-lg text-rose-300">
                    {error}
                  </div>
                )}

                <div>
                  <div className="mb-1.5 font-['Press_Start_2P'] text-[9px] text-slate-400">GOLPES:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {player.moves.map((m, i) => (
                      <button
                        key={i}
                        disabled={busy || finished || player.hp <= 0}
                        onClick={() => doAttack(i)}
                        className="border-2 border-slate-600 bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2.5 text-left font-['Press_Start_2P'] text-[10px] text-amber-300 shadow-[3px_3px_0px_#000] hover:border-amber-400 hover:brightness-125 disabled:opacity-40"
                      >
                        ⚡ {m.name}
                        <span className="ml-1 text-[8px] text-slate-500">
                          {m.type} {m.power}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {battle?.kind === "wild" && !finished && (
                  <div>
                    <div className="mb-1.5 font-['Press_Start_2P'] text-[9px] text-cyan-300">
                      CAPTURAR (a chance depende do HP restante e do catchRate):
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(["pokeballs", "greatballs", "ultraballs", "masterballs"] as const).map((ball) => (
                        <button
                          key={ball}
                          disabled={busy}
                          onClick={() => doCatch(ball)}
                          className="border-2 border-slate-600 bg-slate-800 p-2 font-['Press_Start_2P'] text-[9px] text-slate-200 hover:border-amber-400 disabled:opacity-40"
                        >
                          {ball === "pokeballs"
                            ? "🔴"
                            : ball === "greatballs"
                              ? "🔵"
                              : ball === "ultraballs"
                                ? "🟡"
                                : "🟣"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Chat global + sala PvP */}
        <div className="border-t-2 border-slate-800 bg-slate-950 px-5 py-3">
          <div className="mb-2 max-h-20 space-y-0.5 overflow-y-auto font-['VT323'] text-base text-slate-300">
            {chatMessages.length === 0 ? (
              <p className="text-slate-600">Nenhuma mensagem na arena ainda. Seja o primeiro!</p>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={msg.id ?? `${msg.username}-${i}`} className="truncate">
                  <span className="font-['Press_Start_2P'] text-[8px] text-amber-400">{msg.username}</span>
                  <span className="text-slate-500"> » </span>
                  {msg.message}
                </div>
              ))
            )}
          </div>

          {roomMsg && <p className="mb-2 font-['VT323'] text-base text-cyan-300">{roomMsg}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pvpRoomCode}
                onChange={(e) => setPvpRoomCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO DA SALA"
                className="border border-slate-700 bg-slate-900 px-2.5 py-1 font-['IBM_Plex_Mono'] text-xs text-amber-300"
              />
              <button
                onClick={createRoom}
                className="border-2 border-cyan-400 bg-cyan-600/30 px-3 py-1 font-['Press_Start_2P'] text-[9px] text-cyan-300 hover:bg-cyan-600/50"
              >
                + CRIAR SALA PVP
              </button>
            </div>

            <form onSubmit={sendChat} className="flex max-w-md flex-1 items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Chat global da Arena Deluge..."
                className="flex-1 border border-slate-700 bg-slate-900 px-3 py-1 font-['IBM_Plex_Mono'] text-xs text-slate-100"
              />
              <button
                type="submit"
                className="border border-amber-400 bg-amber-500 px-3 py-1 font-['Press_Start_2P'] text-[9px] text-slate-950"
              >
                <Send className="h-3 w-3" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
