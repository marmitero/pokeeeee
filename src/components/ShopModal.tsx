"use client";

import React, { useEffect, useState } from "react";
import { retroSfx } from "@/lib/sound";
import { X, ShoppingCart, Coins } from "lucide-react";
import { api } from "@/lib/api-client";

interface ShopItem {
  id: number;
  shopId: number;
  name: string;
  description: string;
  category: string;
  itemKey: string;
  buyPrice: number;
  sellPrice: number;
  iconEmoji: string;
  isPremium: boolean;
  stock: number;
}

interface ShopModalProps {
  shopId: number;
  shopName: string;
  npcDialog: string;
  userMoney: number;
  /** Inventário do jogador (`itemKey` → quantidade) para a aba VENDER. */
  inventory: Record<string, number>;
  onPurchase: (updatedUser: unknown) => void;
  onClose: () => void;
}

export function ShopModal({ shopId, shopName, npcDialog, userMoney, inventory, onPurchase, onClose }: ShopModalProps) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  // Etapa C (8.1): a loja agora também recompra consumíveis.
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  useEffect(() => {
    api(`/api/shop?shopId=${shopId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [shopId]);

  const getQty = (itemId: number) => quantities[itemId] ?? 1;

  const handleBuy = async (item: ShopItem) => {
    const qty = getQty(item.id);
    const total = item.buyPrice * qty;
    if (userMoney < total) {
      setMessage(`❌ Sem Pk$ suficiente! Precisa de ${total} Pk$.`);
      return;
    }
    setBuying(true);
    retroSfx.playStep();
    try {
      const res = await api("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy", itemId: item.id, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`✔ ${data.message}`);
      onPurchase(data.user);
      retroSfx.playCatchSuccess();
    } catch (err: unknown) {
      setMessage(`❌ ${err instanceof Error ? err.message : "Erro"}`);
    } finally {
      setBuying(false);
    }
  };

  const handleSell = async (item: ShopItem) => {
    const qty = getQty(item.id);
    const owned = inventory[item.itemKey] ?? 0;
    if (owned < qty) {
      setMessage(`❌ Você só tem ${owned}x ${item.name}.`);
      return;
    }
    setBuying(true);
    retroSfx.playStep();
    try {
      const res = await api("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sell", itemId: item.id, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`✔ ${data.message}`);
      onPurchase(data.user);
      retroSfx.playCatchSuccess();
    } catch (err: unknown) {
      setMessage(`❌ ${err instanceof Error ? err.message : "Erro"}`);
    } finally {
      setBuying(false);
    }
  };

  const categories = ["ball", "potion", "misc"];
  const catLabels: Record<string, string> = { ball: "🔴 POKÉBOLAS", potion: "🧪 POÇÕES & ITENS", misc: "📦 MISCELÂNEA" };

  // Venda: só consumíveis desta loja que o jogador possui. Pedras de evolução
  // (`misc`) não têm recompra — o servidor também rejeita.
  const sellable = items.filter((i) => i.category !== "misc" && (inventory[i.itemKey] ?? 0) > 0);
  const hasStones = items.some((i) => i.category === "misc");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#000,0_20px_50px_rgba(0,0,0,0.95)]">

        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-emerald-900/40 via-slate-900 to-slate-900 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-400" />
              <h2 className="font-['Press_Start_2P'] text-xs text-amber-400">{shopName}</h2>
            </div>
            <p className="mt-1 font-['VT323'] text-lg text-slate-300">&ldquo;{npcDialog}&rdquo;</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 border-2 border-amber-400/50 bg-amber-500/10 px-3 py-1.5">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="font-['Press_Start_2P'] text-xs text-amber-300">{userMoney} Pk$</span>
            </div>
            <button onClick={onClose} className="border-2 border-slate-600 bg-slate-800 p-1.5 text-slate-300 hover:bg-rose-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-slate-700">
          {(["buy", "sell"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(null); }}
              className={`flex-1 px-4 py-2 font-['Press_Start_2P'] text-[10px] ${
                tab === t
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {t === "buy" ? "🛒 COMPRAR" : "💰 VENDER"}
            </button>
          ))}
        </div>

        {message && (
          <div className={`border-b-2 px-5 py-2 font-['VT323'] text-xl ${message.startsWith("✔") ? "border-emerald-600 bg-emerald-950/80 text-emerald-300" : "border-rose-600 bg-rose-950/80 text-rose-300"}`}>
            {message}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <p className="text-center font-['VT323'] text-2xl text-slate-400">Carregando estoque...</p>
          ) : tab === "buy" ? (
            categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat}>
                  <div className="mb-2 border-b border-slate-700 pb-1 font-['Press_Start_2P'] text-[9px] text-slate-400">
                    {catLabels[cat]}
                  </div>
                  <div className="space-y-2">
                    {catItems.map((item) => {
                      const qty = getQty(item.id);
                      const canAfford = userMoney >= item.buyPrice * qty;
                      return (
                        <div key={item.id} className="flex items-center justify-between border-2 border-slate-700 bg-slate-950 px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.iconEmoji}</span>
                            <div>
                              <div className="font-['Press_Start_2P'] text-[10px] text-amber-300">{item.name}</div>
                              <div className="font-['IBM_Plex_Mono'] text-xs text-slate-400">{item.description}</div>
                              <div className="font-['IBM_Plex_Mono'] text-[10px] text-amber-400">{item.buyPrice} Pk$ cada</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-slate-600 bg-slate-900">
                              <button onClick={() => setQuantities((q) => ({ ...q, [item.id]: Math.max(1, (q[item.id] ?? 1) - 1) }))}
                                className="px-2 py-1 font-['Press_Start_2P'] text-xs text-slate-300 hover:bg-slate-700">−</button>
                              <span className="w-8 text-center font-['IBM_Plex_Mono'] text-sm text-amber-300">{qty}</span>
                              <button onClick={() => setQuantities((q) => ({ ...q, [item.id]: Math.min(99, (q[item.id] ?? 1) + 1) }))}
                                className="px-2 py-1 font-['Press_Start_2P'] text-xs text-slate-300 hover:bg-slate-700">+</button>
                            </div>
                            <button onClick={() => handleBuy(item)} disabled={buying || !canAfford}
                              className={`border-2 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] shadow-[2px_2px_0px_#000] transition ${
                                canAfford
                                  ? "border-amber-400 bg-amber-500 text-slate-950 hover:brightness-110"
                                  : "border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed"
                              }`}>
                              {item.buyPrice * qty} Pk$
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div>
              {hasStones && (
                <p className="mb-3 border border-purple-800 bg-purple-950/60 px-3 py-2 font-['VT323'] text-lg text-purple-300">
                  💎 Pedras de evolução não têm recompra — são relíquias, não mercadoria.
                </p>
              )}
              {sellable.length === 0 ? (
                <p className="text-center font-['VT323'] text-2xl text-slate-400">
                  Nada para vender aqui — esta loja só recompra o que ela vende.
                </p>
              ) : (
                <div className="space-y-2">
                  {sellable.map((item) => {
                    const qty = Math.min(getQty(item.id), inventory[item.itemKey] ?? 0);
                    return (
                      <div key={item.id} className="flex items-center justify-between border-2 border-slate-700 bg-slate-950 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.iconEmoji}</span>
                          <div>
                            <div className="font-['Press_Start_2P'] text-[10px] text-emerald-300">{item.name}</div>
                            <div className="font-['IBM_Plex_Mono'] text-xs text-slate-400">
                              Você tem: {inventory[item.itemKey] ?? 0}x · recompra por {item.sellPrice} Pk$ cada
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-600 bg-slate-900">
                            <button onClick={() => setQuantities((q) => ({ ...q, [item.id]: Math.max(1, (q[item.id] ?? 1) - 1) }))}
                              className="px-2 py-1 font-['Press_Start_2P'] text-xs text-slate-300 hover:bg-slate-700">−</button>
                            <span className="w-8 text-center font-['IBM_Plex_Mono'] text-sm text-emerald-300">{qty}</span>
                            <button onClick={() => setQuantities((q) => ({ ...q, [item.id]: Math.min(99, (q[item.id] ?? 1) + 1) }))}
                              className="px-2 py-1 font-['Press_Start_2P'] text-xs text-slate-300 hover:bg-slate-700">+</button>
                          </div>
                          <button onClick={() => handleSell(item)} disabled={buying}
                            className="border-2 border-emerald-400 bg-emerald-600 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-950 shadow-[2px_2px_0px_#000] hover:brightness-110">
                            +{item.sellPrice * qty} Pk$
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
