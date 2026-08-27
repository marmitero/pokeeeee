"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getPokemonSpecies, DELUGE_VARIANTS } from "@/lib/pokedex";
import { retroSfx } from "@/lib/sound";
import { X, Trophy, Shield, Swords } from "lucide-react";
import type { BattleState, BattleView } from "@/lib/battle-service";
import { api } from "@/lib/api-client";

interface GymLeader {
  id: number;
  name: string;
  title: string;
  badgeName: string;
  badgeEmoji: string;
  specialty: string;
  requiredBadges: number;
  rewardMoney: number;
  npcDialog: string;
  defeatDialog: string;
  winDialog: string;
  team: Array<{ pokedexId: number; level: number; variant?: string }>;
}

interface UserBadge {
  id: number;
  gymLeaderId: number;
  badgeName: string;
  badgeEmoji: string;
}

interface GymModalProps {
  gymLeaderId: number;
  userBadges: UserBadge[];
  onBattleResult: (updatedUser: unknown, updatedBadges: UserBadge[]) => void;
  onClose: () => void;
}

type Phase = "intro" | "fighting" | "result";

/**
 * Ginásio (Fase 2).
 *
 * Reescrito como **cliente do motor de batalha do servidor**. Antes calculava o
 * dano localmente e mandava `{ action: "battle_result", won: true }` pronto —
 * ou seja, a insígnia e o dinheiro eram farmáveis com um único curl, sem
 * lutar. Agora cada turno é uma chamada a `/api/battle` e o resultado é
 * decidido pelo servidor.
 */

async function callBattle(
  body: Record<string, unknown>
): Promise<{ battle: BattleView; user: unknown; party: unknown[] } | { error: string }> {
  const res = await api("/api/battle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? "Erro na batalha." };
  return data;
}

export function GymModal({
  gymLeaderId,
  userBadges,
  onBattleResult,
  onClose,
}: GymModalProps) {
  const [leader, setLeader] = useState<GymLeader | null>(null);
  const [battle, setBattle] = useState<BattleView | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const badgeCount = userBadges.length;
  const canChallenge = leader ? badgeCount >= leader.requiredBadges : false;
  const alreadyHasBadge = userBadges.some((b) => b.gymLeaderId === gymLeaderId);

  // Carrega o líder (a luta só começa quando o jogador aceita).
  useEffect(() => {
    api("/api/gym", { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const found = (d.gymLeaders as GymLeader[]).find((g) => g.id === gymLeaderId);
        if (!found) throw new Error(`Nenhum líder de ginásio com id ${gymLeaderId}.`);
        setLeader(found);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Falha ao carregar o Ginásio.");
      })
      .finally(() => setLoading(false));
  }, [gymLeaderId]);

  const refreshBadges = useCallback(async () => {
    const res = await api("/api/gym", { credentials: "same-origin" });
    if (!res.ok) return [];
    const d = await res.json();
    return (d.badges ?? []) as UserBadge[];
  }, []);

  const startBattle = async () => {
    setBusy(true);
    setError(null);
    retroSfx.playEncounterFlash();

    const res = await callBattle({ action: "start_gym", gymLeaderId });
    setBusy(false);

    if ("error" in res) {
      setError(res.error);
      return;
    }

    setBattle(res.battle);
    setPhase("fighting");
    if (res.user) {
      const badges = await refreshBadges();
      onBattleResult(res.user, badges);
    }
  };

  const doAttack = async (moveIndex: number) => {
    if (!battle || busy) return;
    setBusy(true);
    setError(null);
    retroSfx.playAttack("slash");

    const res = await callBattle({ action: "attack", battleId: battle.id, moveIndex });
    setBusy(false);

    if ("error" in res) {
      setError(res.error);
      return;
    }

    setBattle(res.battle);

    if (res.battle.status === "WON") {
      retroSfx.playCatchSuccess();
      setPhase("result");
      const badges = await refreshBadges();
      onBattleResult(res.user, badges);
    } else if (res.battle.status === "LOST") {
      setPhase("result");
      const badges = await refreshBadges();
      onBattleResult(res.user, badges);
    } else if (res.user) {
      const badges = await refreshBadges();
      onBattleResult(res.user, badges);
    }
  };

  if (loading || !leader) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/90 p-6 text-center">
        {loadError ? (
          <>
            <div className="text-5xl">⚠️</div>
            <p className="font-['Press_Start_2P'] text-xs text-rose-400">
              NÃO FOI POSSÍVEL CARREGAR O GINÁSIO
            </p>
            <p className="font-['VT323'] text-xl text-slate-400">{loadError}</p>
            <button
              onClick={onClose}
              className="border-2 border-amber-400 bg-amber-500 px-5 py-2 font-['Press_Start_2P'] text-xs text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110"
            >
              VOLTAR
            </button>
          </>
        ) : (
          <p className="font-['Press_Start_2P'] text-sm text-amber-400">Carregando Ginásio...</p>
        )}
      </div>
    );
  }

  const state: BattleState | null = battle?.state ?? null;
  const opponent = state?.opponent ?? null;
  const player = state?.player ?? null;

  const opponentSpecies = opponent ? getPokemonSpecies(opponent.pokedexId) : null;
  const playerSpecies = player ? getPokemonSpecies(player.pokedexId) : null;
  const playerVariantCfg =
    DELUGE_VARIANTS.find((v) => v.id === player?.variant) || DELUGE_VARIANTS[0];

  const hpColor = (hp: number, maxHp: number) =>
    hp / maxHp > 0.5 ? "bg-emerald-500" : hp / maxHp > 0.2 ? "bg-amber-400" : "bg-rose-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#000]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-amber-900/40 to-slate-950 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <h2 className="font-['Press_Start_2P'] text-xs text-amber-400">
                GINÁSIO • {leader.name.toUpperCase()}
              </h2>
            </div>
            <p className="font-['VT323'] text-lg text-slate-400">
              {leader.title} • Tipo: {leader.specialty}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {alreadyHasBadge && (
              <span className="border border-amber-400 bg-amber-500/20 px-2 py-1 font-['VT323'] text-lg text-amber-300">
                {leader.badgeEmoji} Insígnia Obtida!
              </span>
            )}
            {phase !== "fighting" && (
              <button onClick={onClose} className="border-2 border-slate-600 bg-slate-800 p-1.5 hover:bg-rose-700">
                <X className="h-4 w-4 text-slate-300" />
              </button>
            )}
          </div>
        </div>

        {/* INTRO */}
        {phase === "intro" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
            <div className="flex items-center gap-4">
              {leader.team.map((tp, i) => {
                const s = getPokemonSpecies(tp.pokedexId);
                return (
                  <div key={i} className="flex flex-col items-center border-2 border-slate-700 bg-slate-950 p-3">
                    <img src={s.frontSprite} alt={s.name} className="h-14 w-14 object-contain" />
                    <span className="mt-1 font-['Press_Start_2P'] text-[8px] text-amber-300">{s.name}</span>
                    <span className="font-['IBM_Plex_Mono'] text-xs text-slate-400">LV.{tp.level}</span>
                  </div>
                );
              })}
            </div>

            <div className="max-w-md border-2 border-slate-700 bg-slate-950 px-6 py-4">
              <p className="font-['VT323'] text-xl text-amber-300">&ldquo;{leader.npcDialog}&rdquo;</p>
              <div className="mt-2 font-['IBM_Plex_Mono'] text-xs text-slate-400">
                Recompensa: {leader.rewardMoney} Pk$ + {leader.badgeEmoji} {leader.badgeName}
              </div>
            </div>

            {error && (
              <div className="border-2 border-rose-600 bg-rose-950/60 px-5 py-2 font-['VT323'] text-xl text-rose-300">
                {error}
              </div>
            )}

            {!canChallenge ? (
              <div className="border-2 border-rose-600 bg-rose-950/60 px-5 py-3">
                <p className="font-['VT323'] text-xl text-rose-300">
                  ⚠️ Você precisa de {leader.requiredBadges} insígnia(s) para desafiar este Ginásio!
                  <br />
                  Você tem: {badgeCount} insígnia(s).
                </p>
              </div>
            ) : (
              <button
                onClick={startBattle}
                disabled={busy}
                className="flex items-center gap-2 border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3 font-['Press_Start_2P'] text-xs text-slate-950 shadow-[4px_4px_0px_#000] hover:brightness-110 disabled:opacity-50"
              >
                <Swords className="h-5 w-5" />
                {alreadyHasBadge ? "RETESTAR GINÁSIO" : "DESAFIAR GINÁSIO!"}
              </button>
            )}
          </div>
        )}

        {/* FIGHTING */}
        {phase === "fighting" && opponent && player && opponentSpecies && playerSpecies && (
          <div className="flex flex-1 flex-col">
            <div className="relative flex h-52 justify-between bg-[radial-gradient(ellipse_at_top,_#1e293b,_#0f172a)] p-5">
              {/* Oponente */}
              <div className="flex flex-col items-start justify-start">
                <div className="border-2 border-slate-600 bg-slate-950/90 px-3 py-1.5">
                  <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">
                    {opponent.name} <span className="text-slate-500">LV.{opponent.level}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[7px] text-amber-400">HP</span>
                    <div className="h-2 w-28 border border-black bg-slate-800">
                      <div
                        className={`h-full transition-all ${hpColor(opponent.hp, opponent.maxHp)}`}
                        style={{ width: `${Math.max(0, (opponent.hp / opponent.maxHp) * 100)}%` }}
                      />
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-[9px] text-slate-300">
                      {opponent.hp}/{opponent.maxHp}
                    </span>
                  </div>
                </div>
                <img src={opponentSpecies.frontSprite} alt={opponent.name} className="mt-2 h-24 w-24 object-contain" />
              </div>

              {/* Jogador */}
              <div className="flex flex-col items-end justify-end">
                <img
                  src={playerSpecies.backSprite || playerSpecies.frontSprite}
                  alt={player.displayName}
                  style={{ filter: playerVariantCfg.filterCss }}
                  className="mb-2 h-24 w-24 object-contain"
                />
                <div className="border-2 border-amber-400 bg-slate-950/90 px-3 py-1.5">
                  <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">
                    {player.displayName} <span className="text-slate-500">LV.{player.level}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[7px] text-amber-400">HP</span>
                    <div className="h-2 w-28 border border-black bg-slate-800">
                      <div
                        className={`h-full transition-all ${hpColor(player.hp, player.maxHp)}`}
                        style={{ width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%` }}
                      />
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-[9px] text-amber-300">
                      {player.hp}/{player.maxHp}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Log vindo do servidor */}
            <div className="h-20 overflow-y-auto border-y-2 border-slate-700 bg-slate-950 px-4 py-2">
              {(state?.log ?? []).slice(-4).map((line, i) => (
                <div key={i} className="font-['VT323'] text-lg text-amber-300">
                  ▸ {line}
                </div>
              ))}
            </div>

            {error && (
              <div className="border-b-2 border-rose-600 bg-rose-950/70 px-4 py-1.5 font-['VT323'] text-lg text-rose-300">
                {error}
              </div>
            )}

            <div className="p-4">
              <div className="mb-2 font-['Press_Start_2P'] text-[9px] text-slate-400">
                ESCOLHA UM GOLPE:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {player.moves.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => doAttack(i)}
                    disabled={busy || player.hp <= 0}
                    className="border-2 border-slate-600 bg-slate-800 px-3 py-2.5 font-['Press_Start_2P'] text-[10px] text-amber-300 shadow-[2px_2px_0px_#000] hover:border-amber-400 hover:bg-slate-700 disabled:opacity-40"
                  >
                    ⚡ {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESULT */}
        {phase === "result" && battle && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
            {battle.status === "WON" ? (
              <>
                <Trophy className="h-16 w-16 text-amber-400" />
                <div className="font-['Press_Start_2P'] text-sm text-amber-400">VITÓRIA!</div>
                <div className="border-2 border-amber-400/50 bg-amber-500/10 px-6 py-4">
                  <p className="font-['VT323'] text-2xl text-amber-300">
                    &ldquo;{leader.winDialog}&rdquo;
                  </p>
                  {!alreadyHasBadge && <div className="mt-3 text-4xl">{leader.badgeEmoji}</div>}
                  <p className="mt-2 font-['VT323'] text-xl text-emerald-300">
                    +{leader.rewardMoney} Pk$
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl">💀</div>
                <div className="font-['Press_Start_2P'] text-sm text-rose-400">DERROTA...</div>
                <p className="font-['VT323'] text-xl text-slate-300">&ldquo;{leader.defeatDialog}&rdquo;</p>
              </>
            )}

            <div className="max-h-28 w-full overflow-y-auto border-2 border-slate-800 bg-slate-950 px-3 py-2 text-left">
              {(battle.state?.log ?? []).map((line, i) => (
                <div key={i} className="font-['VT323'] text-base text-slate-400">
                  ▸ {line}
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="border-2 border-amber-400 bg-amber-500 px-6 py-2.5 font-['Press_Start_2P'] text-xs text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110"
            >
              CONTINUAR JORNADA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
