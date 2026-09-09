"use client";

/* eslint-disable react-hooks/set-state-in-effect -- polling de chat precisa sincronizar estado com servidor */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Users, MapPin, Lock } from "lucide-react";
import { api } from "@/lib/api-client";

type ChatChannel = "global" | "local" | "whisper";

interface ChatMessage {
  id: number;
  userId: number;
  username: string;
  message: string;
  channel: string;
  mapId?: number | null;
  recipientId?: number | null;
  createdAt: string | null;
}

interface Conversation {
  username: string;
  lastMessage: string;
  lastAt: string | null;
  lastId: number;
}

interface Props {
  currentMapId: number;
  currentMapName: string;
  userId: number;
  username: string;
  isLoggedIn: boolean;
  /**
   * 8.9: pedido externo de abrir um whisper (menu de interação do mapa).
   * Quando o `nonce` muda, abre o painel já no canal privado com o alvo.
   */
  whisperTarget?: { username: string; nonce: number } | null;
}

export function ChatWidget({
  currentMapId,
  currentMapName,
  userId,
  username,
  isLoggedIn,
  whisperTarget = null,
}: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [channel, setChannel] = useState<ChatChannel>("global");
  const [globalMsgs, setGlobalMsgs] = useState<ChatMessage[]>([]);
  const [localMsgs, setLocalMsgs] = useState<ChatMessage[]>([]);
  const [whisperMsgs, setWhisperMsgs] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [whisperWith, setWhisperWith] = useState<string>("");
  const [recipientInput, setRecipientInput] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // unread counters
  const [unread, setUnread] = useState({ global: 0, local: 0, whisper: 0 });
  const lastIds = useRef({ global: 0, local: 0, whisper: 0, whisperConv: "" });

  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  const fetchChannel = useCallback(
    async (ch: ChatChannel, opts?: { withUser?: string; mapId?: number; afterId?: number }) => {
      if (!isLoggedIn) return;
      try {
        const params = new URLSearchParams();
        params.set("channel", ch);
        params.set("limit", "50");
        if (ch === "local") params.set("mapId", String(opts?.mapId ?? currentMapId));
        if (ch === "whisper" && opts?.withUser) params.set("withUser", opts.withUser);
        if (opts?.afterId) params.set("afterId", String(opts.afterId));

        const res = await api(`/api/chat?${params.toString()}`, { credentials: "same-origin" });
        if (!res.ok) return;
        const data = await res.json();

        const msgs: ChatMessage[] = data.messages ?? [];

        if (ch === "global") {
          if (opts?.afterId) {
            if (msgs.length > 0) {
              setGlobalMsgs((prev) => [...prev, ...msgs]);
              if (collapsed || channel !== "global") {
                setUnread((u) => ({ ...u, global: u.global + msgs.length }));
              }
            }
          } else {
            setGlobalMsgs(msgs);
            if (msgs.length > 0) lastIds.current.global = Math.max(...msgs.map((m) => m.id));
          }
        } else if (ch === "local") {
          if (opts?.afterId) {
            if (msgs.length > 0) {
              setLocalMsgs((prev) => [...prev, ...msgs]);
              if (collapsed || channel !== "local") {
                setUnread((u) => ({ ...u, local: u.local + msgs.length }));
              }
            }
          } else {
            setLocalMsgs(msgs);
            if (msgs.length > 0) lastIds.current.local = Math.max(...msgs.map((m) => m.id));
          }
        } else if (ch === "whisper") {
          if (opts?.withUser) {
            // conversa específica
            if (opts?.afterId) {
              if (msgs.length > 0) {
                setWhisperMsgs((prev) => [...prev, ...msgs]);
                if (collapsed || channel !== "whisper" || lastIds.current.whisperConv !== opts.withUser) {
                  setUnread((u) => ({ ...u, whisper: u.whisper + msgs.length }));
                }
              }
            } else {
              setWhisperMsgs(msgs);
              if (msgs.length > 0) lastIds.current.whisper = Math.max(...msgs.map((m) => m.id));
            }
          } else {
            // lista geral + conversas
            if (opts?.afterId) {
              if (msgs.length > 0) {
                // para lista geral, não acumulamos, apenas mostramos badge?
                // vamos acumular em whisperMsgs também para badge
                if (collapsed || channel !== "whisper") {
                  setUnread((u) => ({ ...u, whisper: u.whisper + msgs.length }));
                }
              }
            } else {
              // msgs são os últimos whispers envolvendo o usuário
              // conversations vem junto
              if (data.conversations) setConversations(data.conversations);
              // se já tem conversa aberta, não sobrescreve whisperMsgs
              if (!whisperWith) {
                // mostra os últimos como lista geral
                setWhisperMsgs(msgs);
                if (msgs.length > 0) lastIds.current.whisper = Math.max(...msgs.map((m) => m.id));
              }
            }
            if (data.conversations) setConversations(data.conversations);
          }
        }
      } catch {
        // polling silencioso
      }
    },
    [isLoggedIn, currentMapId, collapsed, channel, whisperWith]
  );

  // carga inicial + polling
  useEffect(() => {
    if (!isLoggedIn) return;
    // inicial
    void fetchChannel("global");
    void fetchChannel("local", { mapId: currentMapId });
    void fetchChannel("whisper");

    const interval = setInterval(() => {
      const gAfter = lastIds.current.global || undefined;
      const lAfter = lastIds.current.local || undefined;
      const wAfter = lastIds.current.whisper || undefined;

      void fetchChannel("global", { afterId: gAfter });
      void fetchChannel("local", { mapId: currentMapId, afterId: lAfter });
      if (whisperWith) {
        void fetchChannel("whisper", { withUser: whisperWith, afterId: wAfter });
      } else {
        void fetchChannel("whisper", { afterId: wAfter });
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isLoggedIn, currentMapId, whisperWith, fetchChannel]);

  // quando troca de mapa, recarrega local
  useEffect(() => {
    if (!isLoggedIn) return;
    void fetchChannel("local", { mapId: currentMapId });
  }, [currentMapId, isLoggedIn, fetchChannel]);

  // quando troca conversa whisper
  useEffect(() => {
    if (!isLoggedIn) return;
    if (channel === "whisper" && whisperWith) {
      void fetchChannel("whisper", { withUser: whisperWith });
      lastIds.current.whisperConv = whisperWith;
    }
  }, [whisperWith, channel, isLoggedIn, fetchChannel]);

  // 8.9: pedido externo de whisper (menu de interação do mapa).
  useEffect(() => {
    if (!isLoggedIn || !whisperTarget) return;
    setWhisperWith(whisperTarget.username);
    setChannel("whisper");
    setCollapsed(false);
    setUnread((u) => ({ ...u, whisper: 0 }));
  }, [isLoggedIn, whisperTarget]);

  useEffect(() => {
    scrollToBottom();
  }, [globalMsgs, localMsgs, whisperMsgs, channel, scrollToBottom]);

  const handleOpen = () => {
    setCollapsed(false);
    // zera unread do canal atual ao abrir
    setUnread((u) => ({ ...u, [channel]: 0 }));
  };

  const handleChannelSwitch = (ch: ChatChannel) => {
    setChannel(ch);
    setUnread((u) => ({ ...u, [ch]: 0 }));
    setError(null);
    if (ch === "global") void fetchChannel("global");
    if (ch === "local") void fetchChannel("local", { mapId: currentMapId });
    if (ch === "whisper" && whisperWith) void fetchChannel("whisper", { withUser: whisperWith });
    else if (ch === "whisper") void fetchChannel("whisper");
  };

  const handleSend = async () => {
    if (!input.trim() || busy) return;

    // comando /w username mensagem
    let targetChannel: ChatChannel = channel;
    let msg = input.trim();
    let recipient = recipientInput.trim() || whisperWith.trim();

    if (msg.startsWith("/w ") || msg.startsWith("/whisper ")) {
      const parts = msg.split(" ");
      if (parts.length >= 3) {
        recipient = parts[1];
        msg = parts.slice(2).join(" ");
        targetChannel = "whisper";
      }
    }

    if (targetChannel === "whisper" && !recipient) {
      setError("Informe o destinatário do sussurro");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        channel: targetChannel,
        message: msg,
      };
      if (targetChannel === "local") body.mapId = currentMapId;
      if (targetChannel === "whisper") body.recipientUsername = recipient;

      const res = await api("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao enviar");
        return;
      }

      const inserted: ChatMessage = data.message;
      if (targetChannel === "global") {
        setGlobalMsgs((prev) => [...prev, inserted]);
        lastIds.current.global = Math.max(lastIds.current.global, inserted.id);
      } else if (targetChannel === "local") {
        setLocalMsgs((prev) => [...prev, inserted]);
        lastIds.current.local = Math.max(lastIds.current.local, inserted.id);
      } else if (targetChannel === "whisper") {
        setWhisperMsgs((prev) => [...prev, inserted]);
        lastIds.current.whisper = Math.max(lastIds.current.whisper, inserted.id);
        if (recipient && !conversations.some((c) => c.username === recipient)) {
          setConversations((prev) => [
            { username: recipient, lastMessage: inserted.message, lastAt: inserted.createdAt, lastId: inserted.id },
            ...prev,
          ]);
        }
        setWhisperWith(recipient);
      }

      setInput("");
      // se enviou via comando /w mas estava em outro canal, muda para whisper
      if (targetChannel !== channel) {
        setChannel(targetChannel);
      }
    } catch {
      setError("Falha de rede");
    } finally {
      setBusy(false);
    }
  };

  if (!isLoggedIn) return null;

  const totalUnread = unread.global + unread.local + unread.whisper;

  // mensagens do canal ativo
  const activeMessages =
    channel === "global" ? globalMsgs : channel === "local" ? localMsgs : whisperMsgs;

  return (
    <>
      {/* Botão colapsado */}
      {collapsed && (
        <button
          onClick={handleOpen}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 border-4 border-amber-400 bg-slate-900 px-4 py-3 font-['Press_Start_2P'] text-[10px] text-amber-300 shadow-[4px_4px_0px_#000] hover:bg-slate-800"
        >
          <MessageSquare className="h-5 w-5" />
          CHAT
          {totalUnread > 0 && (
            <span className="ml-1 border-2 border-rose-500 bg-rose-600 px-2 py-0.5 text-[9px] text-white">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Painel expandido */}
      {!collapsed && (
        <div className="fixed bottom-4 right-4 z-40 flex h-[420px] w-[min(380px,95vw)] flex-col border-4 border-amber-400 bg-slate-900 shadow-[6px_6px_0px_#000]">
          {/* Header */}
          <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-amber-900/30 to-slate-950 px-3 py-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-400" />
              <span className="font-['Press_Start_2P'] text-[9px] text-amber-300">CHAT</span>
              {channel === "local" && (
                <span className="flex items-center gap-1 border border-cyan-500/40 bg-cyan-950/60 px-1.5 py-0.5 font-['IBM_Plex_Mono'] text-[9px] text-cyan-300">
                  <MapPin className="h-3 w-3" /> #{currentMapId}
                </span>
              )}
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="border-2 border-slate-600 bg-slate-800 p-1 hover:bg-rose-700"
            >
              <X className="h-4 w-4 text-slate-300" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b-2 border-slate-800 bg-slate-950">
            <button
              onClick={() => handleChannelSwitch("global")}
              className={`flex flex-1 items-center justify-center gap-1 border-r-2 border-slate-800 px-2 py-2 font-['Press_Start_2P'] text-[8px] ${
                channel === "global"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-900 text-slate-500 hover:text-slate-300"
              }`}
            >
              <Users className="h-3 w-3" /> GLOBAL
              {unread.global > 0 && (
                <span className="ml-1 bg-rose-600 px-1 text-[7px] text-white">{unread.global}</span>
              )}
            </button>
            <button
              onClick={() => handleChannelSwitch("local")}
              className={`flex flex-1 items-center justify-center gap-1 border-r-2 border-slate-800 px-2 py-2 font-['Press_Start_2P'] text-[8px] ${
                channel === "local"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-slate-900 text-slate-500 hover:text-slate-300"
              }`}
            >
              <MapPin className="h-3 w-3" /> LOCAL
              {unread.local > 0 && (
                <span className="ml-1 bg-rose-600 px-1 text-[7px] text-white">{unread.local}</span>
              )}
            </button>
            <button
              onClick={() => handleChannelSwitch("whisper")}
              className={`flex flex-1 items-center justify-center gap-1 px-2 py-2 font-['Press_Start_2P'] text-[8px] ${
                channel === "whisper"
                  ? "bg-purple-500/20 text-purple-300"
                  : "bg-slate-900 text-slate-500 hover:text-slate-300"
              }`}
            >
              <Lock className="h-3 w-3" /> PRIVADO
              {unread.whisper > 0 && (
                <span className="ml-1 bg-rose-600 px-1 text-[7px] text-white">{unread.whisper}</span>
              )}
            </button>
          </div>

          {/* Info do canal */}
          <div className="border-b border-slate-800 bg-slate-900/60 px-3 py-1 font-['VT323'] text-sm text-slate-400">
            {channel === "global" && "🌍 Todo o servidor — todos veem"}
            {channel === "local" && `📍 ${currentMapName} (#${currentMapId}) — só quem está aqui`}
            {channel === "whisper" && whisperWith
              ? `🔒 Conversa privada com ${whisperWith}`
              : channel === "whisper"
              ? "🔒 Sussurro privado — só você e o destinatário"
              : ""}
          </div>

          {/* Lista de conversas (whisper sem with) */}
          {channel === "whisper" && !whisperWith && conversations.length > 0 && (
            <div className="max-h-28 overflow-y-auto border-b-2 border-slate-800 bg-slate-950 p-2">
              <p className="mb-1 font-['Press_Start_2P'] text-[7px] text-slate-500">CONVERSAS RECENTES</p>
              <div className="flex flex-wrap gap-1">
                {conversations.map((c) => (
                  <button
                    key={c.username}
                    onClick={() => setWhisperWith(c.username)}
                    className="border border-purple-500/40 bg-purple-950/40 px-2 py-1 font-['IBM_Plex_Mono'] text-[10px] text-purple-300 hover:bg-purple-900"
                  >
                    {c.username}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensagens */}
          <div ref={listRef} className="flex-1 overflow-y-auto bg-slate-950 p-2">
            {activeMessages.length === 0 ? (
              <p className="py-8 text-center font-['VT323'] text-lg text-slate-600">
                {channel === "global" && "Nenhuma mensagem global ainda. Seja o primeiro!"}
                {channel === "local" && "Nenhuma mensagem neste mapa. Fale com quem está por perto!"}
                {channel === "whisper" && whisperWith
                  ? `Nenhuma mensagem com ${whisperWith} ainda.`
                  : "Nenhum sussurro ainda. Use /w <nome> <mensagem> ou escolha um destinatário."}
              </p>
            ) : (
              <div className="space-y-1.5">
                {activeMessages.map((m) => {
                  const isMe = m.userId === userId;
                  const isWhisper = m.channel === "whisper";
                  const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div
                      key={m.id}
                      className={`border px-2 py-1 font-['VT323'] text-base leading-tight ${
                        isMe
                          ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                          : isWhisper
                          ? "border-purple-500/30 bg-purple-950/30 text-purple-200"
                          : m.channel === "local"
                          ? "border-cyan-500/20 bg-cyan-950/20 text-cyan-100"
                          : "border-slate-800 bg-slate-900 text-slate-200"
                      }`}
                    >
                      <span className="mr-1 font-['IBM_Plex_Mono'] text-[10px] text-slate-500">{time}</span>
                      <span className={`font-bold ${isMe ? "text-amber-300" : "text-cyan-300"}`}>
                        {isMe ? "você" : m.username}
                      </span>
                      {isWhisper && (
                        <span className="mx-1 text-[12px] text-slate-500">
                          {m.userId === userId ? `→ ${conversations.find((c) => c.lastId === m.id)?.username ?? "?"}` : "→ você"}:
                        </span>
                      )}
                      {!isWhisper && <span className="mx-1 text-slate-500">:</span>}
                      <span className="break-words">{m.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input de destinatário para whisper */}
          {channel === "whisper" && (
            <div className="border-t-2 border-slate-800 bg-slate-900 p-2">
              <div className="flex gap-2">
                <input
                  value={whisperWith || recipientInput}
                  onChange={(e) => {
                    if (whisperWith) setWhisperWith(e.target.value);
                    else setRecipientInput(e.target.value);
                  }}
                  placeholder="Destinatário (nome do treinador)"
                  className="w-36 border-2 border-slate-700 bg-slate-950 px-2 py-1 font-['IBM_Plex_Mono'] text-xs text-purple-300 outline-none placeholder:text-slate-600 focus:border-purple-400"
                />
                {whisperWith && (
                  <button
                    onClick={() => {
                      setWhisperWith("");
                      setRecipientInput("");
                      setWhisperMsgs([]);
                    }}
                    className="border border-slate-600 bg-slate-800 px-2 py-1 font-['Press_Start_2P'] text-[7px] text-slate-400 hover:bg-slate-700"
                  >
                    TROCAR
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Input de mensagem */}
          <div className="border-t-4 border-slate-700 bg-slate-900 p-2">
            {error && (
              <div className="mb-2 border border-rose-600 bg-rose-950/40 px-2 py-1 font-['VT323'] text-sm text-rose-300">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSend();
                }}
                placeholder={
                  channel === "global"
                    ? "Mensagem global..."
                    : channel === "local"
                    ? `Falar no ${currentMapName}...`
                    : whisperWith
                    ? `Sussurro para ${whisperWith}...`
                    : "Sussurro: /w <nome> <mensagem> ou preencha destinatário"
                }
                maxLength={500}
                className="flex-1 border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-amber-100 outline-none placeholder:text-slate-600 focus:border-amber-400"
              />
              <button
                onClick={() => void handleSend()}
                disabled={busy || !input.trim()}
                className="border-2 border-amber-400 bg-amber-500 px-3 py-2 text-slate-950 hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 flex justify-between font-['IBM_Plex_Mono'] text-[9px] text-slate-600">
              <span>
                {channel === "whisper" ? "Use /w <nome> <msg> para atalho" : "Enter para enviar"}
              </span>
              <span>{input.length}/500</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
