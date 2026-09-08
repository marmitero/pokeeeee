"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Trash2, Crown, MessageSquare, Wrench } from "lucide-react";
import { api } from "@/lib/api-client";
import { DELUGE_VARIANTS, POKEDEX } from "@/lib/pokedex";
import { EVOLUTION_ITEM_EMOJI, EVOLUTION_ITEM_LABEL, EVOLUTION_ITEM_VALUES } from "@/lib/evolution-items";
import { STATUS_ITEMS, STATUS_ITEM_KEYS } from "@/lib/status-items";

/**
 * Painel administrativo (Fase 5 + ferramentas GM de teste).
 *
 * Dá uma interface para o que antes só existia via `npm run db:set-role`, e
 * finalmente dá ao papel `moderator` uma função concreta: moderação do chat.
 *
 * A seção **Ferramentas GM** (admin-only) agilibiza a validação manual: o
 * agente não tem navegador, então o mantenedor usa esses comandos para chegar
 * rápido ao estado a testar (nível 16 para ver evolução, time forte para o
 * ginásio, dinheiro/itens para a loja, teleport para a cadeia de mapas).
 *
 * A autorização é toda no servidor (`/api/admin`). Esta página apenas esconde
 * as seções que o usuário não pode usar — esconder aqui é conveniência, nunca
 * a barreira de segurança.
 */

type Role = "player" | "moderator" | "admin";

interface StaffRow {
  id: number;
  username: string;
  role: string;
  lastOnlineAt: string | null;
}

interface ChatRow {
  id: number;
  username: string;
  message: string;
  createdAt: string | null;
}

// ─── Tipos das respostas GM ────────────────────────────────────────────────

interface GmUserRow {
  username: string;
  role: string;
  money: number;
  pokeballs: number;
  greatballs: number;
  ultraballs: number;
  masterballs: number;
  potions: number;
  superPotions: number;
  maxPotions: number;
  revives: number;
}

interface GmPokemonRow {
  id: number;
  pokedexId: number;
  name: string;
  nickname: string | null;
  variant: string;
  level: number;
  hp: number;
  maxHp: number;
  partySlot: number | null;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
}

const ROLE_LABEL: Record<Role, string> = {
  player: "Jogador",
  moderator: "Moderador",
  admin: "Admin",
};

const ROLE_COLOR: Record<Role, string> = {
  player: "border-slate-600 text-slate-300",
  moderator: "border-cyan-400 text-cyan-300",
  admin: "border-amber-400 text-amber-300",
};

const GM_ITEM_LABEL: Record<string, string> = {
  pokeballs: "Pokébola",
  greatballs: "Grande Bola",
  ultraballs: "Ultrabola",
  masterballs: "Master Ball",
  potions: "Poção",
  superPotions: "Super Poção",
  maxPotions: "Max Poção",
  revives: "Revive",
  // 6.4-D: itens de evolução (pedras da 6.4-B + itens de Sinnoh) — derivados
  // do catálogo para o GM poder testar qualquer linha sem passar pela loja.
  ...Object.fromEntries(
    EVOLUTION_ITEM_VALUES.map((key) => [key, `${EVOLUTION_ITEM_EMOJI[key]} ${EVOLUTION_ITEM_LABEL[key]}`])
  ),
  // 8.4: curas de status.
  ...Object.fromEntries(
    STATUS_ITEM_KEYS.map((key) => [key, `${STATUS_ITEMS[key].iconEmoji} ${STATUS_ITEMS[key].name}`])
  ),
};

const GM_GYMS = [
  { id: 1, label: "1 — Brock (Insígnia Pedra)" },
  { id: 2, label: "2 — Misty (Insígnia Cascata)" },
  { id: 3, label: "3 — Lance (Insígnia do Dragão)" },
];

async function adminCall(body: Record<string, unknown>) {
  const res = await api("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

const INPUT_CLS =
  "border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-amber-300 outline-none focus:border-amber-400";
const LABEL_CLS = "font-['Press_Start_2P'] text-[8px] text-slate-400";
const BTN_CLS =
  "border-2 border-amber-400 bg-amber-500 px-4 py-2 font-['Press_Start_2P'] text-[9px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110 disabled:opacity-50";

export default function AdminPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [roles, setRoles] = useState<Role[]>(["player", "moderator", "admin"]);

  const [targetUsername, setTargetUsername] = useState("");
  const [targetRole, setTargetRole] = useState<Role>("moderator");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Estado das ferramentas GM ─────────────────────────────────────────
  const [gmTarget, setGmTarget] = useState("");
  const [gmUser, setGmUser] = useState<GmUserRow | null>(null);
  const [gmTeam, setGmTeam] = useState<GmPokemonRow[]>([]);
  const [gmLevel, setGmLevel] = useState(16);
  const [gmPokemonId, setGmPokemonId] = useState("");
  const [gmSpeciesId, setGmSpeciesId] = useState(4);
  const [gmGiveLevel, setGmGiveLevel] = useState(5);
  const [gmVariant, setGmVariant] = useState("Normal");
  const [gmNickname, setGmNickname] = useState("");
  const [gmItem, setGmItem] = useState("potions");
  const [gmQuantity, setGmQuantity] = useState(10);
  const [gmMoney, setGmMoney] = useState(5000);
  const [gmMaps, setGmMaps] = useState<{ id: number; name: string }[]>([]);
  const [gmMapId, setGmMapId] = useState<number | "">("");
  const [gmGymId, setGmGymId] = useState(1);

  const loadStaff = useCallback(async () => {
    const r = await adminCall({ action: "list_staff" });
    if (!r.ok) {
      throw new Error(r.data.error ?? `Falha ao carregar equipe (HTTP ${r.status})`);
    }
    setStaff(r.data.staff ?? []);
    setRoles(r.data.roles ?? ["player", "moderator", "admin"]);
  }, []);

  const loadChat = useCallback(async () => {
    const r = await adminCall({ action: "list_chat", limit: 50 });
    if (!r.ok) {
      throw new Error(r.data.error ?? `Falha ao carregar chat (HTTP ${r.status})`);
    }
    setChat(r.data.messages ?? []);
  }, []);

  const loadMaps = useCallback(async () => {
    const res = await api("/api/maps", { credentials: "same-origin" });
    if (!res.ok) return; // teleporte só perde o select, não derruba o painel
    const data = (await res.json()) as { maps: { id: number; name: string }[] };
    setGmMaps((data.maps ?? []).map((m) => ({ id: m.id, name: m.name })));
  }, []);

  /** Recarrega a visão do alvo depois de qualquer mutação GM. */
  const refreshGm = useCallback(async () => {
    if (!gmTarget.trim()) return;
    const r = await adminCall({ action: "gm_list", username: gmTarget.trim() });
    if (!r.ok) return;
    setGmUser(r.data.user ?? null);
    setGmTeam(r.data.pokemon ?? []);
  }, [gmTarget]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api("/api/auth", { credentials: "same-origin" });
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "Sessão não encontrada. Volte ao jogo e faça login novamente."
              : `Falha ao validar sessão (HTTP ${res.status}).`
          );
        }
        const data = await res.json();
        if (cancelled) return;

        const r = (data.user?.role ?? "player") as Role;
        setRole(r);
        setUsername(data.user?.username ?? "");

        const loads: Promise<void>[] = [];
        if (r === "admin") {
          loads.push(loadStaff(), loadMaps());
        }
        if (r === "admin" || r === "moderator") loads.push(loadChat());
        await Promise.all(loads);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Falha ao carregar o painel."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    }
  }, [loadStaff, loadChat, loadMaps]);

  const changeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const r = await adminCall({ action: "set_role", username: targetUsername, role: targetRole });
    setFeedback(r.ok ? `✔ ${r.data.message}` : `✗ ${r.data.error ?? "Falha"}`);

    if (r.ok) {
      setTargetUsername("");
      await loadStaff();
    }
  };

  const removeMessage = async (id: number) => {
    const r = await adminCall({ action: "delete_chat", messageId: id });
    setFeedback(r.ok ? "✔ Mensagem removida." : `✗ ${r.data.error ?? "Falha"}`);
    if (r.ok) await loadChat();
  };

  // ─── Ações GM ───────────────────────────────────────────────────────────

  const gmAct = async (
    body: Record<string, unknown>,
    successMsg?: (data: Record<string, unknown>) => string
  ) => {
    setFeedback(null);
    const r = await adminCall(body);
    setFeedback(
      r.ok
        ? `✔ ${successMsg ? successMsg(r.data as Record<string, unknown>) : "Comando aplicado."}`
        : `✗ ${r.data.error ?? `Falha (HTTP ${r.status})`}`
    );
    if (r.ok) await refreshGm();
  };

  const gmList = async () => {
    setFeedback(null);
    const r = await adminCall({ action: "gm_list", username: gmTarget.trim() });
    if (!r.ok) {
      setFeedback(`✗ ${r.data.error ?? "Falha"}`);
      return;
    }
    setGmUser(r.data.user ?? null);
    setGmTeam(r.data.pokemon ?? []);
    setFeedback(`✔ ${gmTarget.trim()}: time/box carregados.`);
  };

  const gmLevelUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await gmAct(
      {
        action: "gm_set_level",
        username: gmTarget.trim(),
        level: gmLevel,
        ...(gmPokemonId.trim() ? { pokemonId: Number(gmPokemonId) } : {}),
      },
      (d) => {
        const updated = (d.updated ?? []) as Array<{
          id: number;
          name: string;
          evolved: { fromName: string; toName: string } | null;
        }>;
        const evo = updated
          .map((p) => (p.evolved ? ` [${p.evolved.fromName} → ${p.evolved.toName}]` : ""))
          .join("");
        return `${updated.length} Pokémon de nível ${gmLevel}.${evo}`;
      }
    );
  };

  const gmGivePokemon = async (e: React.FormEvent) => {
    e.preventDefault();
    await gmAct(
      {
        action: "gm_give_pokemon",
        username: gmTarget.trim(),
        pokedexId: gmSpeciesId,
        level: gmGiveLevel,
        variant: gmVariant,
        ...(gmNickname.trim() ? { nickname: gmNickname.trim() } : {}),
      },
      (d) => {
        const pokemon = d.pokemon as GmPokemonRow | undefined;
        return `${pokemon?.name ?? "Pokémon"} nv ${pokemon?.level ?? "?"} entregue em ${d.placement ?? "?"}` +
          (d.evolvedFrom ? ` (pedido como ${d.evolvedFrom})` : "");
      }
    );
  };

  const gmGiveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await gmAct(
      {
        action: "gm_give_item",
        username: gmTarget.trim(),
        item: gmItem,
        quantity: gmQuantity,
      },
      (d) => d.message as string
    );
  };

  const gmGiveMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    await gmAct(
      { action: "gm_give_money", username: gmTarget.trim(), amount: gmMoney },
      (d) => d.message as string
    );
  };

  const gmHeal = async () => {
    await gmAct({ action: "gm_heal", username: gmTarget.trim() }, (d) => d.message as string);
  };

  const gmTeleport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gmMapId === "") return;
    await gmAct(
      { action: "gm_teleport", username: gmTarget.trim(), mapId: gmMapId },
      (d) =>
        `📍 ${d.target} teleportado para "${(d.map as { name?: string } | undefined)?.name}" em (${d.x},${d.y}) — o alvo precisa refazer login para pegar a posição.`
    );
  };

  const gmGiveBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    await gmAct(
      { action: "gm_give_badge", username: gmTarget.trim(), gymLeaderId: gmGymId },
      (d) => `${d.badge} para ${d.target} (total: ${d.badges})`
    );
  };

  const canManageRoles = role === "admin";
  const canModerate = role === "admin" || role === "moderator";

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between border-4 border-amber-400 bg-slate-900 px-5 py-4 shadow-[4px_4px_0px_#000]">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="font-['Press_Start_2P'] text-xs text-amber-400">PAINEL ADMINISTRATIVO</h1>
              <p className="font-['VT323'] text-lg text-slate-400">
                {loading ? "carregando..." : `${username} · ${role ? ROLE_LABEL[role] : "—"}`}
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="border-2 border-slate-600 bg-slate-800 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-200 hover:border-amber-400"
          >
            ← VOLTAR AO JOGO
          </Link>
        </header>

        {feedback && (
          <div className="border-2 border-slate-700 bg-slate-900 px-4 py-2 font-['VT323'] text-xl text-amber-300">
            {feedback}
          </div>
        )}

        {loadError && (
          <div className="border-2 border-rose-600 bg-rose-950/40 px-4 py-3 font-['VT323'] text-xl text-rose-300">
            ✗ {loadError}
          </div>
        )}

        {loading ? (
          <p className="font-['Press_Start_2P'] text-xs text-slate-500">Carregando...</p>
        ) : !canModerate ? (
          <div className="border-4 border-rose-600 bg-rose-950/40 px-6 py-10 text-center">
            <div className="text-5xl">🔒</div>
            <p className="mt-4 font-['Press_Start_2P'] text-xs text-rose-400">ACESSO NEGADO</p>
            <p className="mt-2 font-['VT323'] text-xl text-slate-400">
              Esta área exige papel moderador ou superior.
            </p>
          </div>
        ) : (
          <>
            {/* Ferramentas GM (admin) */}
            {canManageRoles && (
              <section className="border-4 border-amber-400 bg-slate-900 p-5">
                <h2 className="mb-2 flex items-center gap-2 border-b-2 border-slate-800 pb-2 font-['Press_Start_2P'] text-[10px] text-amber-400">
                  <Wrench className="h-4 w-4" /> FERRAMENTAS GM — AGILIZAR TESTES
                </h2>
                <p className="mb-4 font-['VT323'] text-lg text-slate-400">
                  Comandos de game master: nivelam, dão Pokémon/itens/dinheiro, curam e
                  teleportam o treinador — sem grind. O servidor reusa a mesma lógica da
                  batalha real (stats, learnset e evolução).
                </p>

                {/* Alvo */}
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLS}>TREINADOR ALVO</span>
                    <input
                      value={gmTarget}
                      onChange={(e) => setGmTarget(e.target.value)}
                      placeholder="nome de usuário"
                      className={INPUT_CLS}
                    />
                  </label>
                  <button onClick={gmList} className={BTN_CLS} disabled={!gmTarget.trim()}>
                    LISTAR TIME
                  </button>
                </div>

                {/* Visão do alvo */}
                {gmUser && (
                  <div className="mb-4 border-2 border-slate-800 bg-slate-950 p-3">
                    <p className="mb-2 font-['VT323'] text-xl text-slate-300">
                      💰 {gmUser.money} · ⚪ {gmUser.pokeballs} poke · 🟢 {gmUser.greatballs} grande ·
                      🟣 {gmUser.ultraballs} ultra · 🩷 {gmUser.masterballs} master
                    </p>
                    <p className="mb-2 font-['VT323'] text-xl text-slate-300">
                      🧪 {gmUser.potions} poção · {gmUser.superPotions} super · {gmUser.maxPotions} max ·
                      ⚕ {gmUser.revives} revive
                    </p>
                    {gmTeam.length === 0 ? (
                      <p className="font-['VT323'] text-xl text-slate-500">
                        Nenhum Pokémon — use DAR POKÉMON.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {gmTeam.map((p) => (
                          <div
                            key={p.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-900 pb-1 font-['VT323'] text-lg"
                          >
                            <span className="text-slate-500">#{p.id}</span>
                            <span className="text-amber-300">
                              {p.nickname ?? p.name}
                              {p.variant !== "Normal" && <span className="text-amber-400"> ★</span>}
                            </span>
                            <span className="text-slate-300">nv {p.level}</span>
                            <span className={p.hp < p.maxHp ? "text-rose-400" : "text-emerald-400"}>
                              HP {p.hp}/{p.maxHp}
                            </span>
                            <span className="text-slate-400">
                              {[p.move1, p.move2, p.move3, p.move4].filter(Boolean).join(" · ")}
                            </span>
                            <span className="ml-auto text-slate-500">
                              {p.partySlot ? `time ${p.partySlot}` : "PC Box"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Comandos */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Subir nível */}
                  <form
                    onSubmit={gmLevelUp}
                    className="space-y-2 border-2 border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="font-['Press_Start_2P'] text-[8px] text-amber-400">⬆ SUBIR NÍVEL</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>NÍVEL (1–100)</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={gmLevel}
                          onChange={(e) => setGmLevel(Number(e.target.value))}
                          className={`${INPUT_CLS} w-24`}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>POKÉMON # (vazio = todos)</span>
                        <input
                          value={gmPokemonId}
                          onChange={(e) => setGmPokemonId(e.target.value)}
                          placeholder="todos"
                          className={`${INPUT_CLS} w-28`}
                        />
                      </label>
                    </div>
                    <button type="submit" className={BTN_CLS} disabled={!gmTarget.trim()}>
                      APLICAR
                    </button>
                    <p className="font-['VT323'] text-base text-slate-500">
                      Cura o(s) Pokémon e aplica evolução pendente, como no level up real.
                    </p>
                  </form>

                  {/* Dar Pokémon */}
                  <form
                    onSubmit={gmGivePokemon}
                    className="space-y-2 border-2 border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="font-['Press_Start_2P'] text-[8px] text-amber-400">🎁 DAR POKÉMON</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>ESPÉCIE</span>
                        <select
                          value={gmSpeciesId}
                          onChange={(e) => setGmSpeciesId(Number(e.target.value))}
                          className={INPUT_CLS}
                        >
                          {[...POKEDEX]
                            .sort((a, b) => a.id - b.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                #{s.id} {s.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>NÍVEL</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={gmGiveLevel}
                          onChange={(e) => setGmGiveLevel(Number(e.target.value))}
                          className={`${INPUT_CLS} w-20`}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>VARIANTE</span>
                        <select
                          value={gmVariant}
                          onChange={(e) => setGmVariant(e.target.value)}
                          className={INPUT_CLS}
                        >
                          {DELUGE_VARIANTS.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.id}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>APELIDO (opcional)</span>
                        <input
                          value={gmNickname}
                          onChange={(e) => setGmNickname(e.target.value)}
                          maxLength={20}
                          className={`${INPUT_CLS} w-28`}
                        />
                      </label>
                    </div>
                    <button type="submit" className={BTN_CLS} disabled={!gmTarget.trim()}>
                      ENTREGAR
                    </button>
                    <p className="font-['VT323'] text-base text-slate-500">
                      Entra no primeiro slot livre do time; time cheio vai para o PC Box.
                    </p>
                  </form>

                  {/* Dar item */}
                  <form
                    onSubmit={gmGiveItem}
                    className="space-y-2 border-2 border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="font-['Press_Start_2P'] text-[8px] text-amber-400">📦 DAR ITEM</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>ITEM</span>
                        <select
                          value={gmItem}
                          onChange={(e) => setGmItem(e.target.value)}
                          className={INPUT_CLS}
                        >
                          {Object.entries(GM_ITEM_LABEL).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>QTD. (1–999)</span>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={gmQuantity}
                          onChange={(e) => setGmQuantity(Number(e.target.value))}
                          className={`${INPUT_CLS} w-24`}
                        />
                      </label>
                    </div>
                    <button type="submit" className={BTN_CLS} disabled={!gmTarget.trim()}>
                      ENTREGAR
                    </button>
                  </form>

                  {/* Dar dinheiro */}
                  <form
                    onSubmit={gmGiveMoney}
                    className="space-y-2 border-2 border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="font-['Press_Start_2P'] text-[8px] text-amber-400">💰 DAR DINHEIRO</p>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex flex-col gap-1">
                        <span className={LABEL_CLS}>VALOR (1–10.000.000)</span>
                        <input
                          type="number"
                          min={1}
                          max={10_000_000}
                          step={100}
                          value={gmMoney}
                          onChange={(e) => setGmMoney(Number(e.target.value))}
                          className={`${INPUT_CLS} w-32`}
                        />
                      </label>
                    </div>
                    <button type="submit" className={BTN_CLS} disabled={!gmTarget.trim()}>
                      ENTREGAR
                    </button>
                  </form>

                  {/* Curar */}
                  <div className="space-y-2 border-2 border-slate-800 bg-slate-950 p-3">
                    <p className="font-['Press_Start_2P'] text-[8px] text-amber-400">✚ CURAR EQUIPE</p>
                    <p className="font-['VT323'] text-base text-slate-500">
                      Time + PC Box a 100% (idem Centro Pokémon).
                    </p>
                    <button onClick={gmHeal} className={BTN_CLS} disabled={!gmTarget.trim()}>
                      CURAR
                    </button>
                  </div>

                  {/* Teleportar */}
                  <form
                    onSubmit={gmTeleport}
                    className="space-y-2 border-2 border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="font-['Press_Start_2P'] text-[8px] text-amber-400">📍 TELEPORTAR</p>
                    <label className="flex flex-col gap-1">
                      <span className={LABEL_CLS}>MAPA (cai no centro)</span>
                      <select
                        value={gmMapId}
                        onChange={(e) => setGmMapId(e.target.value === "" ? "" : Number(e.target.value))}
                        className={INPUT_CLS}
                      >
                        <option value="">escolher mapa…</option>
                        {gmMaps.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.id} — {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className={BTN_CLS} disabled={!gmTarget.trim() || gmMapId === ""}>
                      TELEPORTAR
                    </button>
                    <p className="font-['VT323'] text-base text-slate-500">
                      Para o jogo pegar a posição, o alvo refaz login (ou a sessão recarrega o mundo).
                    </p>
                  </form>

                  {/* Dar insígnia */}
                  <form
                    onSubmit={gmGiveBadge}
                    className="space-y-2 border-2 border-slate-800 bg-slate-950 p-3"
                  >
                    <p className="font-['Press_Start_2P'] text-[8px] text-amber-400">🏅 DAR INSÍGNIA</p>
                    <label className="flex flex-col gap-1">
                      <span className={LABEL_CLS}>GINÁSIO</span>
                      <select
                        value={gmGymId}
                        onChange={(e) => setGmGymId(Number(e.target.value))}
                        className={INPUT_CLS}
                      >
                        {GM_GYMS.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className={BTN_CLS} disabled={!gmTarget.trim()}>
                      CONCEDER
                    </button>
                    <p className="font-['VT323'] text-base text-slate-500">
                      Desbloqueia o pré-requisito de ginásio (Misty pede 1, Lance pede 2).
                    </p>
                  </form>
                </div>
              </section>
            )}

            {/* Gestão de papéis */}
            {canManageRoles && (
              <section className="border-4 border-slate-700 bg-slate-900 p-5">
                <h2 className="mb-4 flex items-center gap-2 border-b-2 border-slate-800 pb-2 font-['Press_Start_2P'] text-[10px] text-amber-400">
                  <Crown className="h-4 w-4" /> GESTÃO DE PAPÉIS
                </h2>

                <form onSubmit={changeRole} className="mb-5 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLS}>TREINADOR</span>
                    <input
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      placeholder="nome de usuário"
                      required
                      className={INPUT_CLS}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className={LABEL_CLS}>PAPEL</span>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value as Role)}
                      className={INPUT_CLS}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="submit"
                    className="border-2 border-amber-400 bg-amber-500 px-5 py-2 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110"
                  >
                    APLICAR
                  </button>
                </form>

                <div className="space-y-2">
                  {staff.length === 0 ? (
                    <p className="font-['VT323'] text-xl text-slate-500">
                      Ninguém com papel acima de jogador ainda.
                    </p>
                  ) : (
                    staff.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between border-2 border-slate-800 bg-slate-950 px-3 py-2"
                      >
                        <span className="font-['Press_Start_2P'] text-[9px] text-amber-300">
                          {s.username}
                        </span>
                        <span
                          className={`border px-2 py-0.5 font-['Press_Start_2P'] text-[8px] ${ROLE_COLOR[s.role as Role] ?? ROLE_COLOR.player}`}
                        >
                          {ROLE_LABEL[s.role as Role] ?? s.role}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Moderação de chat */}
            <section className="border-4 border-slate-700 bg-slate-900 p-5">
              <div className="mb-4 flex items-center justify-between border-b-2 border-slate-800 pb-2">
                <h2 className="flex items-center gap-2 font-['Press_Start_2P'] text-[10px] text-amber-400">
                  <MessageSquare className="h-4 w-4" /> MODERAÇÃO DO CHAT
                </h2>
                <button
                  onClick={loadChat}
                  className="border-2 border-slate-600 bg-slate-800 px-3 py-1 font-['Press_Start_2P'] text-[8px] text-slate-300 hover:border-amber-400"
                >
                  ↻ ATUALIZAR
                </button>
              </div>

              <div className="space-y-2">
                {chat.length === 0 ? (
                  <p className="font-['VT323'] text-xl text-slate-500">Nenhuma mensagem no chat.</p>
                ) : (
                  chat.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 border-2 border-slate-800 bg-slate-950 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-['Press_Start_2P'] text-[8px] text-amber-400">
                          {m.username}
                        </span>
                        <span className="ml-2 font-['VT323'] text-lg text-slate-300">{m.message}</span>
                      </div>
                      <button
                        onClick={() => removeMessage(m.id)}
                        title="Remover mensagem"
                        className="border-2 border-slate-700 bg-slate-800 p-1.5 text-slate-400 hover:border-rose-500 hover:text-rose-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
