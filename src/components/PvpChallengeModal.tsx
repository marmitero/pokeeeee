"use client";

import React from "react";
import { Check, Clock3, Swords, X } from "lucide-react";
import { avatarEmoji } from "@/lib/avatars";

export interface ChallengeView {
  id: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED";
  challengerId: number;
  challengerUsername: string;
  targetId: number;
  targetUsername: string;
  createdAt: string;
  expiresAt: string;
  cooldownUntil: string | null;
  roomCode: string | null;
}

/** Popup central do mapa para o jogador que recebeu o convite. */
export function PvpChallengeModal({
  challenge,
  onAccept,
  onDecline,
  busy = false,
}: {
  challenge: ChallengeView;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-md border-4 border-rose-400 bg-slate-900 shadow-[0_0_0_4px_#000,0_12px_40px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-rose-900/50 to-slate-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-rose-300" />
            <span className="font-['Press_Start_2P'] text-[10px] text-rose-300">DESAFIO PvP</span>
          </div>
          <span className="animate-pulse font-['Press_Start_2P'] text-[8px] text-amber-300">NOVO</span>
        </div>

        <div className="p-5 text-center">
          <div className="mb-2 text-4xl">{avatarEmoji("red")}</div>
          <p className="font-['VT323'] text-2xl text-slate-200">
            <strong className="text-amber-300">{challenge.challengerUsername}</strong> desafiou você para uma batalha!
          </p>
          <p className="mt-2 font-['VT323'] text-lg text-slate-400">
            A batalha usará o time atual dos dois jogadores.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              disabled={busy}
              onClick={onAccept}
              className="flex items-center justify-center gap-2 border-2 border-emerald-400 bg-emerald-600 px-3 py-3 font-['Press_Start_2P'] text-[10px] text-white shadow-[3px_3px_0px_#000] hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> ACEITAR
            </button>
            <button
              disabled={busy}
              onClick={onDecline}
              className="flex items-center justify-center gap-2 border-2 border-rose-400 bg-rose-950 px-3 py-3 font-['Press_Start_2P'] text-[10px] text-rose-200 shadow-[3px_3px_0px_#000] hover:bg-rose-900 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> RECUSAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Estado visual do desafiante enquanto o alvo ainda não respondeu. */
export function PvpChallengeWaiting({
  challenge,
  onCancel,
  busy = false,
}: {
  challenge: ChallengeView;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center p-4">
      <div className="pointer-events-auto w-full max-w-sm border-4 border-amber-400 bg-slate-900 p-5 text-center shadow-[0_0_0_4px_#000,0_12px_40px_rgba(0,0,0,0.8)]">
        <Clock3 className="mx-auto mb-3 h-8 w-8 animate-pulse text-amber-300" />
        <h2 className="font-['Press_Start_2P'] text-[10px] text-amber-300">AGUARDANDO RESPOSTA</h2>
        <p className="mt-3 font-['VT323'] text-xl text-slate-300">
          {challenge.targetUsername} recebeu seu desafio.
        </p>
        <p className="mt-1 font-['VT323'] text-lg text-slate-500">O convite expira em 60 segundos.</p>
        <button
          disabled={busy}
          onClick={onCancel}
          className="mt-5 flex w-full items-center justify-center gap-2 border-2 border-slate-500 bg-slate-800 px-3 py-2 font-['Press_Start_2P'] text-[9px] text-slate-200 hover:border-rose-400 hover:text-rose-300 disabled:opacity-50"
        >
          <X className="h-4 w-4" /> CANCELAR DESAFIO
        </button>
      </div>
    </div>
  );
}
