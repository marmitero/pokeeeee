"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Trash2, Crown, MessageSquare } from "lucide-react";
import { api } from "@/lib/api-client";

/**
 * Painel administrativo (Fase 5).
 *
 * Dá uma interface para o que antes só existia via `npm run db:set-role`, e
 * finalmente dá ao papel `moderator` uma função concreta: moderação do chat.
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
        if (r === "admin") loads.push(loadStaff());
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
    };
  }, [loadStaff, loadChat]);

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
            {/* Gestão de papéis */}
            {canManageRoles && (
              <section className="border-4 border-slate-700 bg-slate-900 p-5">
                <h2 className="mb-4 flex items-center gap-2 border-b-2 border-slate-800 pb-2 font-['Press_Start_2P'] text-[10px] text-amber-400">
                  <Crown className="h-4 w-4" /> GESTÃO DE PAPÉIS
                </h2>

                <form onSubmit={changeRole} className="mb-5 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="font-['Press_Start_2P'] text-[8px] text-slate-400">TREINADOR</span>
                    <input
                      value={targetUsername}
                      onChange={(e) => setTargetUsername(e.target.value)}
                      placeholder="nome de usuário"
                      required
                      className="border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-amber-300 outline-none focus:border-amber-400"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-['Press_Start_2P'] text-[8px] text-slate-400">PAPEL</span>
                    <select
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value as Role)}
                      className="border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-amber-300 outline-none focus:border-amber-400"
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
