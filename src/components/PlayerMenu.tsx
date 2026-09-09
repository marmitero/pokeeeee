"use client";

import React, { useState } from "react";
import { X, UserPlus, UserMinus, MessageSquare, Swords } from "lucide-react";
import { avatarEmoji } from "@/lib/avatars";
import { api } from "@/lib/api-client";

/**
 * Menu de interação com outro jogador (8.9).
 *
 * Abre ao clicar num jogador do mapa (desktop) ou no botão 👤 (mobile, quando
 * em cima de outro player). Opções aprovadas nesta rodada:
 *  - ➕/➖ amigo (tabela `friendships`, idempotente);
 *  - 💬 PM (reusa o whisper da 8.8 via ChatWidget);
 *  - ⚔️ desafiar (reusa o PvP amistoso: cria a sala e sussurra o código).
 */

export interface MenuPlayer {
  id: number;
  username: string;
  avatarSprite: string;
  elo: number;
  isFriend: boolean;
}

export function PlayerMenu({
  player,
  onClose,
  onMessage,
  onDuel,
}: {
  player: MenuPlayer;
  onClose: () => void;
  /** Abre o whisper com este treinador (ChatWidget). */
  onMessage: (username: string) => void;
  /** Cria a sala PvP e sussurra o código do desafio. */
  onDuel: (player: MenuPlayer) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(player.isFriend);

  const toggleFriend = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: isFriend ? "remove" : "add", username: player.username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível.");
        return;
      }
      setIsFriend(data.isFriend === true);
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#000]">
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-amber-900/30 to-slate-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{avatarEmoji(player.avatarSprite)}</span>
            <div>
              <h2 className="font-['Press_Start_2P'] text-[10px] text-amber-300">
                {player.username}
              </h2>
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-slate-400">ELO {player.elo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="border-2 border-slate-600 bg-slate-800 p-1 hover:bg-rose-700"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        <div className="space-y-2 p-4">
          {error && (
            <div className="border border-rose-600 bg-rose-950/40 px-3 py-1.5 font-['VT323'] text-lg text-rose-300">
              {error}
            </div>
          )}

          <button
            disabled={busy}
            onClick={() => void toggleFriend()}
            className="flex w-full items-center gap-2 border-2 border-emerald-400 bg-emerald-950/60 px-3 py-2 font-['Press_Start_2P'] text-[9px] text-emerald-300 hover:bg-emerald-900 disabled:opacity-40"
          >
            {isFriend ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {isFriend ? "REMOVER AMIGO" : "ADICIONAR AMIGO"}
          </button>

          <button
            onClick={() => {
              onMessage(player.username);
              onClose();
            }}
            className="flex w-full items-center gap-2 border-2 border-purple-400 bg-purple-950/60 px-3 py-2 font-['Press_Start_2P'] text-[9px] text-purple-300 hover:bg-purple-900"
          >
            <MessageSquare className="h-4 w-4" /> MANDAR MENSAGEM (PM)
          </button>

          <button
            onClick={() => {
              onDuel(player);
              onClose();
            }}
            className="flex w-full items-center gap-2 border-2 border-rose-400 bg-rose-950/60 px-3 py-2 font-['Press_Start_2P'] text-[9px] text-rose-300 hover:bg-rose-900"
          >
            <Swords className="h-4 w-4" /> DESAFIAR PARA DUELO
          </button>
        </div>
      </div>
    </div>
  );
}
