"use client";

/* eslint-disable react-hooks/set-state-in-effect -- polling da lista de amigos sincroniza com o servidor */
import React, { useCallback, useEffect, useState } from "react";
import { MessageSquare, Swords, UserMinus, UserPlus, Users, X } from "lucide-react";
import { avatarEmoji } from "@/lib/avatars";
import { api } from "@/lib/api-client";
import type { MenuPlayer } from "@/components/PlayerMenu";

export interface FriendRow {
  id: number;
  username: string;
  avatarSprite: string;
  elo: number;
  currentMapId: number;
  lastSeenAt: string | null;
  online: boolean;
}

/**
 * Painel de amigos (pedido do mantenedor): lista, adiciona por nome, PM,
 * desafio (se o amigo está online no mesmo mapa) e remove. Independente dos
 * drawers de MAPAS/TIME — modal compacto no desktop e no celular.
 */
export function FriendsPanel({
  currentMapId,
  maps,
  onMessage,
  onDuel,
  onClose,
}: {
  currentMapId: number;
  maps: Array<{ id: number; name: string }>;
  onMessage: (username: string) => void;
  onDuel: (player: MenuPlayer) => void;
  onClose: () => void;
}) {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [addName, setAddName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api("/api/friends", { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível listar os amigos.");
        return;
      }
      if (Array.isArray(data.friends)) setFriends(data.friends as FriendRow[]);
    } catch {
      setError("Falha de rede ao listar amigos.");
    }
  }, []);

  useEffect(() => {
    // A lista precisa aparecer ao abrir o painel; o intervalo só mantém o
    // "online" fresco. O setState fica no callback da Promise, não no corpo.
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  const addFriend = async () => {
    const username = addName.trim();
    if (!username || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "add", username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível adicionar.");
        return;
      }
      setAddName("");
      await load();
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  };

  const removeFriend = async (username: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "remove", username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível remover.");
        return;
      }
      await load();
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  };

  const mapName = (id: number) => maps.find((m) => m.id === id)?.name ?? `Mapa #${id}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div className="flex max-h-[min(86vh,640px)] w-full max-w-md flex-col border-4 border-cyan-400 bg-slate-900 shadow-[0_0_0_4px_#000,6px_6px_0px_#000]">
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-cyan-900/40 to-slate-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-300" />
            <h2 className="font-['Press_Start_2P'] text-[10px] text-cyan-300">AMIGOS</h2>
            <span className="font-['IBM_Plex_Mono'] text-[10px] text-slate-400">
              {friends.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="border-2 border-slate-600 bg-slate-800 p-1 hover:bg-rose-700"
            aria-label="Fechar amigos"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
        </div>

        <div className="border-b-2 border-slate-800 p-3">
          <div className="flex gap-2">
            <input
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addFriend();
              }}
              placeholder="Nome do treinador"
              maxLength={20}
              className="min-w-0 flex-1 border-2 border-slate-700 bg-slate-950 px-2 py-2 font-['IBM_Plex_Mono'] text-sm text-cyan-100 outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
            <button
              disabled={busy || addName.trim().length < 3}
              onClick={() => void addFriend()}
              className="flex items-center gap-1 border-2 border-emerald-400 bg-emerald-700 px-3 py-2 font-['Press_Start_2P'] text-[8px] text-white shadow-[2px_2px_0px_#000] hover:bg-emerald-600 disabled:opacity-40"
            >
              <UserPlus className="h-3.5 w-3.5" /> ADD
            </button>
          </div>
          {error && (
            <p className="mt-2 border border-rose-600 bg-rose-950/40 px-2 py-1 font-['VT323'] text-lg text-rose-300">
              {error}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {friends.length === 0 ? (
            <p className="py-6 text-center font-['VT323'] text-xl text-slate-500">
              Nenhum amigo ainda. Adicione pelo nome ou pelo menu do jogador no mapa.
            </p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => {
                const sameMap = friend.online && friend.currentMapId === currentMapId;
                return (
                  <div
                    key={friend.id}
                    className="border-2 border-slate-800 bg-slate-950 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{avatarEmoji(friend.avatarSprite)}</span>
                          <span className="truncate font-['Press_Start_2P'] text-[9px] text-amber-300">
                            {friend.username}
                          </span>
                        </div>
                        <p className="mt-1 font-['IBM_Plex_Mono'] text-[10px] text-slate-400">
                          ELO {friend.elo}
                          {friend.online
                            ? ` · ${sameMap ? "online aqui" : mapName(friend.currentMapId)}`
                            : " · offline"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 border px-1.5 py-0.5 font-['Press_Start_2P'] text-[7px] ${
                          friend.online
                            ? "border-emerald-400 bg-emerald-950 text-emerald-300"
                            : "border-slate-600 bg-slate-800 text-slate-500"
                        }`}
                      >
                        {friend.online ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => {
                          onMessage(friend.username);
                          onClose();
                        }}
                        className="flex items-center justify-center gap-1 border border-purple-400 bg-purple-950/70 px-1 py-1.5 font-['Press_Start_2P'] text-[7px] text-purple-200 hover:bg-purple-900"
                      >
                        <MessageSquare className="h-3 w-3" /> PM
                      </button>
                      <button
                        disabled={!sameMap || busy}
                        title={
                          sameMap
                            ? `Desafiar ${friend.username}`
                            : "Só é possível desafiar quem está online no mesmo mapa"
                        }
                        onClick={() => {
                          onDuel({
                            id: friend.id,
                            username: friend.username,
                            avatarSprite: friend.avatarSprite,
                            elo: friend.elo,
                            isFriend: true,
                          });
                          onClose();
                        }}
                        className="flex items-center justify-center gap-1 border border-rose-400 bg-rose-950/70 px-1 py-1.5 font-['Press_Start_2P'] text-[7px] text-rose-200 hover:bg-rose-900 disabled:opacity-30"
                      >
                        <Swords className="h-3 w-3" /> DUELO
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void removeFriend(friend.username)}
                        className="flex items-center justify-center gap-1 border border-slate-600 bg-slate-800 px-1 py-1.5 font-['Press_Start_2P'] text-[7px] text-slate-300 hover:border-rose-400 hover:text-rose-300"
                      >
                        <UserMinus className="h-3 w-3" /> TIRAR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
