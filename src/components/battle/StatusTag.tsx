"use client";

import { STATUS_NAME, STATUS_TAG, normalizeStatus } from "@/lib/engine/status";

/**
 * Etiqueta de status de batalha (Fase 8.4) — a caixinha colorida "PAR",
 * "ENV", "SON"… ao lado do nível, como no GBA. Não renderiza nada sem status.
 */
const TAG_CLASS: Record<string, string> = {
  PSN: "border-fuchsia-500 bg-fuchsia-900/80 text-fuchsia-100",
  TOX: "border-purple-400 bg-purple-950 text-purple-100",
  BRN: "border-orange-400 bg-orange-800/90 text-orange-50",
  PAR: "border-yellow-400 bg-yellow-700/90 text-yellow-50",
  SLP: "border-slate-400 bg-slate-600 text-slate-50",
  FRZ: "border-cyan-300 bg-cyan-800/90 text-cyan-50",
};

export function StatusTag({ status, className = "" }: { status?: string | null; className?: string }) {
  const s = normalizeStatus(status);
  if (s === "NONE") return null;
  return (
    <span
      title={STATUS_NAME[s]}
      data-testid="status-tag"
      className={`border px-1.5 py-0.5 font-['Press_Start_2P'] text-[8px] ${TAG_CLASS[s]} ${className}`}
    >
      {STATUS_TAG[s]}
    </span>
  );
}
