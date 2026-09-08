"use client";

import { STATUS_ITEMS, STATUS_ITEM_KEYS, itemCures, type StatusItemKey } from "@/lib/status-items";
import { normalizeStatus, type StatusCondition } from "@/lib/engine/status";

/**
 * Barra "ITENS" da batalha (Fase 8.4): poções e curas de status usáveis no
 * Pokémon ativo. Usar um item **consome o turno** (o oponente age depois).
 *
 * Mostra só o que o jogador tem; destaca o que resolve o status atual e
 * desabilita o que não teria efeito (o servidor também recusa — isto é só
 * conforto). `inventory` é o `user` público (colunas camelCase).
 */
export interface BattleItemBarProps {
  inventory: Record<string, unknown> | null | undefined;
  playerHp: number;
  playerMaxHp: number;
  playerStatus?: string | null;
  disabled: boolean;
  onUse: (item: string) => void;
}

const POTIONS: Array<{ column: string; useKey: string; label: string; emoji: string }> = [
  { column: "potions", useKey: "potion", label: "Poção", emoji: "🧪" },
  { column: "superPotions", useKey: "superPotion", label: "Super Poção", emoji: "🧴" },
  { column: "maxPotions", useKey: "maxPotion", label: "Hiper Poção", emoji: "💊" },
];

function count(inv: BattleItemBarProps["inventory"], column: string): number {
  const v = inv?.[column];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function BattleItemBar({
  inventory,
  playerHp,
  playerMaxHp,
  playerStatus,
  disabled,
  onUse,
}: BattleItemBarProps) {
  const status: StatusCondition = normalizeStatus(playerStatus);
  const hpFull = playerHp >= playerMaxHp;

  const potions = POTIONS.filter((p) => count(inventory, p.column) > 0);
  const cures = STATUS_ITEM_KEYS.filter((k) => count(inventory, k) > 0);
  if (potions.length === 0 && cures.length === 0) return null;

  const cureUseful = (key: StatusItemKey) =>
    itemCures(key, status) || (Boolean(STATUS_ITEMS[key].fullHp) && !hpFull);

  const btn = (useful: boolean) =>
    `border-2 px-2 py-1.5 text-left font-['Press_Start_2P'] text-[8px] shadow-[2px_2px_0px_#000] disabled:opacity-40 ` +
    (useful
      ? "border-emerald-400 bg-emerald-900/70 text-emerald-100 hover:brightness-125"
      : "border-slate-700 bg-slate-900 text-slate-400");

  return (
    <div data-testid="battle-items">
      <div className="mb-1.5 font-['Press_Start_2P'] text-[9px] text-emerald-300">
        ITENS (usar gasta o turno):
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {potions.map((p) => (
          <button
            key={p.useKey}
            type="button"
            disabled={disabled || hpFull}
            title={hpFull ? "HP já está cheio" : `${p.label} ×${count(inventory, p.column)}`}
            onClick={() => onUse(p.useKey)}
            className={btn(!hpFull)}
          >
            {p.emoji} {p.label}
            <span className="ml-1 text-slate-500">×{count(inventory, p.column)}</span>
          </button>
        ))}
        {cures.map((key) => {
          const spec = STATUS_ITEMS[key];
          const useful = cureUseful(key);
          return (
            <button
              key={key}
              type="button"
              disabled={disabled || !useful}
              title={useful ? spec.description : `${spec.name}: sem efeito agora`}
              onClick={() => onUse(spec.useKey)}
              className={btn(useful)}
            >
              {spec.iconEmoji} {spec.name}
              <span className="ml-1 text-slate-500">×{count(inventory, key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
