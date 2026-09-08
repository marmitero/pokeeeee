import type { ActiveStatus, StatusCondition } from "./engine/status";

/**
 * Itens de cura de status (Fase 8.4) — o único mapa entre a coluna de
 * inventário em `users`, o valor aceito por `use_item`, o que cada um cura
 * e o texto/emoji da loja e do Pokémon Box.
 *
 * Preços calcados na Gen III (Antidote 100, Parlyz Heal 200, Awakening 250,
 * Burn Heal 250, Ice Heal 250, Full Heal 600, Full Restore 3000) na mesma
 * escala em que a Poção do jogo custa 300 (GBA também 300) — ou seja, 1:1.
 * O Restaurador Total (HP cheio + qualquer status) é o único caro e só
 * aparece das lojas 9–11, como a Masterball.
 */
export const STATUS_ITEM_KEYS = [
  "antidotes",
  "paralyzeHeals",
  "awakenings",
  "burnHeals",
  "iceHeals",
  "fullHeals",
  "fullRestores",
] as const;

export type StatusItemKey = (typeof STATUS_ITEM_KEYS)[number];

export interface StatusItemSpec {
  /** Valor usado em `use_item` (singular, como `potion`/`revive`). */
  useKey: string;
  name: string;
  plural: string;
  description: string;
  iconEmoji: string;
  buyPrice: number;
  /** Status que o item cura; vazio = todos. */
  cures: readonly ActiveStatus[];
  /** Restaurador Total: também enche o HP. */
  fullHp?: boolean;
}

export const STATUS_ITEMS: Record<StatusItemKey, StatusItemSpec> = {
  antidotes: {
    useKey: "antidote",
    name: "Antídoto",
    plural: "Antídotos",
    description: "Cura veneno (inclusive o grave).",
    iconEmoji: "🧫",
    buyPrice: 100,
    cures: ["PSN", "TOX"],
  },
  paralyzeHeals: {
    useKey: "paralyzeHeal",
    name: "Anti-Paralisia",
    plural: "Anti-Paralisias",
    description: "Cura paralisia.",
    iconEmoji: "💛",
    buyPrice: 200,
    cures: ["PAR"],
  },
  awakenings: {
    useKey: "awakening",
    name: "Despertador",
    plural: "Despertadores",
    description: "Acorda um Pokémon adormecido.",
    iconEmoji: "⏰",
    buyPrice: 250,
    cures: ["SLP"],
  },
  burnHeals: {
    useKey: "burnHeal",
    name: "Anti-Queimadura",
    plural: "Anti-Queimaduras",
    description: "Cura queimadura.",
    iconEmoji: "🧯",
    buyPrice: 250,
    cures: ["BRN"],
  },
  iceHeals: {
    useKey: "iceHeal",
    name: "Descongelante",
    plural: "Descongelantes",
    description: "Descongela um Pokémon.",
    iconEmoji: "❄️",
    buyPrice: 250,
    cures: ["FRZ"],
  },
  fullHeals: {
    useKey: "fullHeal",
    name: "Cura Total",
    plural: "Curas Totais",
    description: "Cura qualquer problema de status.",
    iconEmoji: "✨",
    buyPrice: 600,
    cures: [],
  },
  fullRestores: {
    useKey: "fullRestore",
    name: "Restaurador Total",
    plural: "Restauradores Totais",
    description: "Restaura todo o HP e cura qualquer status.",
    iconEmoji: "💖",
    buyPrice: 3000,
    cures: [],
    fullHp: true,
  },
};

/** Valores de `use_item` (singular) — usado no schema de validação. */
export const STATUS_USE_VALUES = STATUS_ITEM_KEYS.map((k) => STATUS_ITEMS[k].useKey) as [string, ...string[]];

/** `use_item` value → coluna do inventário. */
export function statusItemByUseKey(useKey: string): StatusItemKey | null {
  return STATUS_ITEM_KEYS.find((k) => STATUS_ITEMS[k].useKey === useKey) ?? null;
}

/** O item cura este status? */
export function itemCures(key: StatusItemKey, status: StatusCondition): boolean {
  if (status === "NONE") return false;
  const spec = STATUS_ITEMS[key];
  return spec.cures.length === 0 || spec.cures.includes(status);
}

/** Itens que curariam o status dado (para a UI destacar o botão certo). */
export function itemsFor(status: StatusCondition): StatusItemKey[] {
  return STATUS_ITEM_KEYS.filter((k) => itemCures(k, status));
}
