"use client";

import React from "react";
import { avatarEmoji } from "@/lib/avatars";

/**
 * Marcadores dos outros jogadores no mapa (8.9).
 *
 * Renderiza cada jogador presente (mesmo mapa + heartbeat recente) como um
 * crachá posicionado por porcentagem sobre a grade. O clique abre o menu de
 * interação (amigo/PM/desafio) — o requisito desktop ("clicar no player").
 *
 * Posição em % usa `width`/`height` reais do mapa (16×16 na prática), casando
 * com a grade do `page.tsx` e com a lógica de movimento.
 */

export interface MapPlayer {
  id: number;
  username: string;
  avatarSprite: string;
  playerX: number;
  playerY: number;
  elo: number;
  isFriend: boolean;
}

export function MapPlayers({
  players,
  mapWidth,
  mapHeight,
  onInteract,
}: {
  players: MapPlayer[];
  mapWidth: number;
  mapHeight: number;
  onInteract: (p: MapPlayer) => void;
}) {
  if (players.length === 0) return null;

  const w = mapWidth || 16;
  const h = mapHeight || 16;

  return (
    <>
      {players.map((p) => {
        const left = ((p.playerX + 0.5) / w) * 100;
        const top = ((p.playerY + 0.5) / h) * 100;
        return (
          <button
            key={p.id}
            onClick={(e) => {
              e.stopPropagation();
              onInteract(p);
            }}
            title={`${p.username} · ELO ${p.elo}${p.isFriend ? " · amigo" : ""}`}
            aria-label={`Interagir com ${p.username}`}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-sm border border-black/50 bg-slate-950/70 px-0.5 text-sm leading-none shadow-[1px_1px_0px_#000] transition hover:z-30 hover:scale-125 hover:bg-slate-800/90"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            {avatarEmoji(p.avatarSprite)}
          </button>
        );
      })}
    </>
  );
}
