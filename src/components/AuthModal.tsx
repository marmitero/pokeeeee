"use client";

import React, { useEffect, useState } from "react";
import { POKEDEX } from "@/lib/pokedex";
import { retroSfx } from "@/lib/sound";
import { Shield, UserPlus, LogIn, MailCheck } from "lucide-react";
import { api, setToken } from "@/lib/api-client";

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

// Janela de reenvio do código (espelha o cooldown de 60s do servidor).
const RESEND_COOLDOWN_S = 60;

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [starterId, setStarterId] = useState<number>(4);
  const [avatarSprite, setAvatarSprite] = useState("red");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStarter =
    STARTER_CHOICES.find((s) => s?.id === starterId) || STARTER_CHOICES[1]!;

  // Contagem regressiva do reenvio (60s, espelha o servidor).
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const enterVerify = (emailValue: string, dev: string | null) => {
    setStep("verify");
    setEmail(emailValue);
    setCode("");
    setDevCode(dev);
    setResendIn(RESEND_COOLDOWN_S);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    if (tab === "register" && !email.trim()) {
      setError("Informe o seu e-mail — a conta fica vinculada a ele.");
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
      const res = await api("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tab,
          username,
          email: tab === "register" ? email : undefined,
          password,
          starterId,
          avatarSprite,
        }),
      });
      const data = await res.json();

      if (res.status === 403 && tab === "login") {
        // Conta existe (senha correta) mas o e-mail ainda não foi confirmado.
        setStep("verify");
        setEmail("");
        setCode("");
        setDevCode(null);
        setResendIn(0);
        setError(
          "Sua conta ainda não confirmou o e-mail. Informe o e-mail cadastrado e digite o código de 6 dígitos."
        );
        return;
      }

      if (!res.ok) throw new Error(data.error || "Erro ao conectar");

      if (data.verified === false) {
        // Cadastro criado: a jornada começa na confirmação do e-mail.
        enterVerify(data.email ?? email, data.devCode ?? null);
        return;
      }

      retroSfx.playCatchSuccess();
      // O token é guardado para o fluxo Bearer. O cookie httpOnly continua
      // sendo emitido pelo servidor; dentro de iframe cross-site é o Bearer
      // que carrega a sessão (ver src/lib/api-client.ts).
      if (data.token) setToken(data.token);
      onSuccess(data.user, data.party || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^\d{6}$/.test(code)) {
      setError("Informe o e-mail e o código de 6 dígitos.");
      return;
    }
    setError(null);
    setLoading(true);
    retroSfx.playStep();

    try {
      const res = await api("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_email", email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao confirmar o e-mail");

      retroSfx.playCatchSuccess();
      if (data.token) setToken(data.token);
      onSuccess(data.user, data.party || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || resendIn > 0 || loading) return;
    setError(null);
    setLoading(true);
    retroSfx.playStep();

    try {
      const res = await api("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_code", email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao reenviar o código");

      setCode("");
      setDevCode(data.devCode ?? null);
      setResendIn(RESEND_COOLDOWN_S);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const backToForm = (to: "register" | "login") => {
    retroSfx.playStep();
    setStep("form");
    setTab(to);
    setCode("");
    setDevCode(null);
    setResendIn(0);
    setError(null);
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
              <h1 className="font-['Press_Start_2P'] text-xs text-amber-400">CATCHBOUND</h1>
              <p className="font-['VT323'] text-lg text-slate-400">
                {step === "verify" ? "Confirme seu e-mail e parta!" : "Sua jornada começa aqui"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(["register", "login"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => { backToForm(t); }}
                className={`border-2 px-3 py-1.5 font-['Press_Start_2P'] text-[9px] transition ${
                  step === "form" && tab === t
                    ? "border-amber-400 bg-amber-500/20 text-amber-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                }`}>
                {t === "register" ? "CRIAR CONTA" : "ENTRAR"}
              </button>
            ))}
          </div>
        </div>

        {step === "verify" ? (
          /* ── Passo 2: confirmação do e-mail ── */
          <form onSubmit={handleVerify} className="space-y-5 p-6">
            {error && (
              <div className="border-2 border-rose-500 bg-rose-950/80 px-4 py-2 font-['VT323'] text-xl text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <div className="border-2 border-amber-400/40 bg-amber-500/10 p-4">
              <div className="mb-1 flex items-center gap-2 font-['Press_Start_2P'] text-[10px] text-amber-300">
                <MailCheck className="h-4 w-4" /> CONFIRME SEU E-MAIL
              </div>
              <p className="font-['VT323'] text-lg leading-snug text-slate-300">
                Enviamos um código de 6 dígitos para o seu e-mail. Digite-o
                abaixo para confirmar a conta e entrar na jornada.
              </p>
              {devCode && (
                <p className="mt-2 border border-cyan-500/40 bg-cyan-950/50 px-3 py-1.5 font-['IBM_Plex_Mono'] text-sm text-cyan-300">
                  💻 Ambiente de teste (sem e-mail configurado): seu código é{" "}
                  <strong className="tracking-[0.3em]">{devCode}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-amber-400">SEU E-MAIL:</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com" maxLength={254}
                className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-slate-100 outline-none focus:border-amber-400" />
            </div>

            <div>
              <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-amber-400">CÓDIGO DE 6 DÍGITOS:</label>
              <input type="text" inputMode="numeric" pattern="\d{6}" required value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full border-2 border-amber-400/50 bg-slate-950 px-3 py-3 text-center font-['IBM_Plex_Mono'] text-2xl tracking-[0.6em] text-amber-200 outline-none focus:border-amber-400" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={handleResend}
                disabled={resendIn > 0 || loading}
                className="font-['Press_Start_2P'] text-[9px] text-cyan-300 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-600">
                {resendIn > 0 ? `REENVIAR EM ${resendIn}s` : "REENVIAR CÓDIGO"}
              </button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110 active:translate-y-0.5 disabled:opacity-60">
                {loading ? "AGUARDE..." : <><MailCheck className="h-4 w-4" /> CONFIRMAR</>}
              </button>
            </div>
          </form>
        ) : (
          /* ── Passo 1: criar conta / entrar ── */
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
                <div>
                  <label className="mb-1 block font-['Press_Start_2P'] text-[9px] text-amber-400">SEU E-MAIL:</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com" maxLength={254}
                    className="w-full border-2 border-slate-700 bg-slate-950 px-3 py-2 font-['IBM_Plex_Mono'] text-sm text-slate-100 outline-none focus:border-amber-400" />
                  <p className="mt-1 font-['VT323'] text-base text-slate-500">
                    A conta fica vinculada a este e-mail — enviamos um código
                    de confirmação para ele.
                  </p>
                </div>

                {/* Starter choice – only 3 */}
                <div className="border-2 border-slate-700 bg-slate-950/80 p-4">
                  <div className="mb-3 font-['Press_Start_2P'] text-[9px] text-cyan-300">
                    ESCOLHA SEU PARCEIRO INICIAL!
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
                      Escolha com sabedoria
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
              <button type="submit" disabled={loading}
                className={`ml-auto flex items-center gap-2 border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110 active:translate-y-0.5 ${loading ? "opacity-60" : ""}`}>
                {loading ? "AGUARDE..." : tab === "register"
                  ? <><UserPlus className="h-4 w-4" /> INICIAR JORNADA</>
                  : <><LogIn className="h-4 w-4" /> ENTRAR</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
