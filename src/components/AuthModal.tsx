"use client";

import React, { useState } from "react";
import { POKEDEX } from "@/lib/pokedex";
import { retroSfx } from "@/lib/sound";
import { Shield, UserPlus, LogIn } from "lucide-react";

interface AuthModalProps {
  onSuccess: (user: unknown, party: unknown[]) => void;
}

// Only the 3 classic starters
const STARTER_CHOICES = [
  POKEDEX.find((p) => p.id === 1)!, // Bulbasaur
  POKEDEX.find((p) => p.id === 4)!, // Charmander
  POKEDEX.find((p) => p.id === 7)!, // Squirtle
];

const TRAINER_AVATARS = [
  { id: "red", label: "Red", color: "bg-red-600", emoji: "🧢" },
  { id: "blue", label: "Blue", color: "bg-blue-600", emoji: "💙" },
  { id: "leaf", label: "Leaf", color: "bg-emerald-600", emoji: "🌿" },
  { id: "gold", label: "Gold", color: "bg-amber-500", emoji: "⭐" },
];

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [starterId, setStarterId] = useState<number>(4);
  const [avatarSprite, setAvatarSprite] = useState("red");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStarter = STARTER_CHOICES.find((s) => s?.id === starterId) || STARTER_CHOICES[1]!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    // Espelha as regras validadas no servidor (src/lib/validation.ts),
    // para o jogador ter o feedback antes da ida ao backend.
    if (username.trim().length < 3 || username.trim().length > 20) {
      setError("Nome de treinador deve ter entre 3 e 20 caracteres.");
      return;
    }
    if (tab === "register" && password.length < 8) {
      setError("A senha precisa de ao menos 8 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);
    retroSfx.playStep();

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: tab, username, password, starterId, avatarSprite }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao conectar");
      retroSfx.playCatchSuccess();
      // A sessão passa a viver num cookie httpOnly definido pelo servidor —
      // nenhum token é guardado em JavaScript (Fase 1).
      onSuccess(data.user, data.party || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#000,0_20px_60px_rgba(0,0,0,0.95)]">

        {/* Title */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-amber-900/40 via-slate-900 to-red-900/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-amber-400 bg-red-600 font-['Press_Start_2P'] text-[10px] text-white">
              PKM
            </div>
            <div>
              <h1 className="font-['Press_Start_2P'] text-xs text-amber-400">DELUGE RPG</h1>
              <p className="font-['VT323'] text-lg text-slate-400">Sua jornada começa aqui</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(["register", "login"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => { retroSfx.playStep(); setTab(t); setError(null); }}
                className={`border-2 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] transition ${
                  tab === t
                    ? "border-amber-400 bg-amber-500/20 text-amber-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                }`}>
                {t === "register" ? "CRIAR CONTA" : "ENTRAR"}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="border-2 border-rose-500 bg-rose-950/80 px-4 py-2 font-['VT323'] text-xl text-rose-300">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-amber-400">TREINADOR:</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: AshKetchum" maxLength={20}
                className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-slate-100 outline-none focus:border-amber-400" />
            </div>
            <div>
              <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-amber-400">SENHA:</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" minLength={4}
                className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-slate-100 outline-none focus:border-amber-400" />
            </div>
          </div>

          {tab === "register" && (
            <>
              {/* Starter choice – only 3 */}
              <div className="border-2 border-slate-700 bg-slate-950/80 p-4">
                <div className="mb-3 font-['Press_Start_2P'] text-[9px] text-cyan-300">
                  ESCOLHA SEU POKÉMON INICIAL:
                  <span className="ml-2 font-['VT323'] text-base text-slate-400">(apenas squirtle, charmander ou bulbasaur)</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {STARTER_CHOICES.filter(Boolean).map((poke) => (
                    <button key={poke!.id} type="button"
                      onClick={() => { retroSfx.playStep(); setStarterId(poke!.id); }}
                      className={`flex flex-col items-center gap-2 border-2 p-3 transition ${
                        starterId === poke!.id
                          ? "border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                          : "border-slate-700 bg-slate-900 hover:border-slate-600"
                      }`}>
                      <img src={poke!.frontSprite} alt={poke!.name}
                        className="h-14 w-14 object-contain" style={{ imageRendering: "pixelated" }} />
                      <div className="text-center">
                        <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">{poke!.name}</div>
                        <div className="mt-1 flex justify-center gap-1">
                          {poke!.types.map((t) => (
                            <span key={t} className="border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-['IBM_Plex_Mono'] text-[9px] text-slate-300">{t}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 rounded border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                  <p className="font-['VT323'] text-base text-amber-300">
                    ⭐ Variantes especiais (Shiny, Metallic, Mystic, Dark, Ghostly) são
                    <strong className="text-amber-200"> skins premium</strong> — conquistadas no jogo ou desbloqueadas futuramente.
                    Starters começam como Pokémon Normal.
                  </p>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-3">
                <span className="font-['Press_Start_2P'] text-[9px] text-slate-400">AVATAR:</span>
                {TRAINER_AVATARS.map((av) => (
                  <button key={av.id} type="button"
                    onClick={() => setAvatarSprite(av.id)}
                    title={av.label}
                    className={`h-9 w-9 border-2 text-base ${av.color} ${
                      avatarSprite === av.id ? "border-amber-300 ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900" : "border-slate-700 opacity-60"
                    }`}>
                    {av.emoji}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-1">
            {tab === "register" && (
              <p className="font-['VT323'] text-base text-slate-500">
                Outros Pokémon são capturados explorando o mundo!
              </p>
            )}
            <button type="submit" disabled={loading}
              className={`ml-auto flex items-center gap-2 border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110 active:translate-y-0.5 ${loading ? "opacity-60" : ""}`}>
              {loading ? "AGUARDE..." : tab === "register"
                ? <><UserPlus className="h-4 w-4" /> INICIAR JORNADA</>
                : <><LogIn className="h-4 w-4" /> ENTRAR</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
