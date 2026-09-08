"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getMoveByName, getPokemonSpecies, DELUGE_VARIANTS } from "@/lib/pokedex";
import { EVOLUTION_ITEM_EMOJI, EVOLUTION_ITEM_LABEL, EVOLUTION_ITEM_VALUES } from "@/lib/evolution-items";
import { retroSfx } from "@/lib/sound";
import { X, Trophy, Swords, Crown } from "lucide-react";
import type { BattleState, BattleView } from "@/lib/battle-service";
import { api } from "@/lib/api-client";
import { StatusTag } from "@/components/battle/StatusTag";
import { BattleItemBar } from "@/components/battle/BattleItemBar";

interface BossStatus {
  arenaMapId: number;
  weekId: string;
  boss: { pokedexId: number; name: string; level: number; types: string[] };
  attemptsLeft: number;
  wonThisWeek: boolean;
  stoneClaimed: boolean;
  legendaryGranted: boolean;
}

interface BossModalProps {
  arenaMapId: number;
  arenaName: string;
  /** Inventário do jogador (o `user` público) — barra de itens da 8.4. */
  inventory?: Record<string, unknown> | null;
  onBattleResult: (updatedUser: unknown) => void;
  onClose: () => void;
}

type Phase = "intro" | "fighting" | "result";

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

export function BossModal({ arenaMapId, arenaName, inventory, onBattleResult, onClose }: BossModalProps) {
  const [status, setStatus] = useState<BossStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [battle, setBattle] = useState<BattleView | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedStone, setPickedStone] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api(`/api/boss?arenaMapId=${arenaMapId}`, { credentials: "same-origin" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar a arena.");
      setStatus(data as BossStatus);
      setClaimed((data as BossStatus).stoneClaimed);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar a arena.");
    }
  }, [arenaMapId]);

  useEffect(() => {
    api(`/api/boss?arenaMapId=${arenaMapId}`, { credentials: "same-origin" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Erro ao carregar a arena.");
        return data as BossStatus;
      })
      .then((data) => {
        setStatus(data);
        setClaimed(data.stoneClaimed);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Erro ao carregar a arena.");
      });
  }, [arenaMapId]);

  const startBattle = async () => {
    setBusy(true);
    setError(null);
    retroSfx.playEncounterFlash();

    const res = await callBattle({ action: "start_boss", arenaMapId });
    setBusy(false);

    if ("error" in res) {
      setError(res.error);
      void refresh();
      return;
    }

    setBattle(res.battle);
    setPhase("fighting");
    if (res.user) onBattleResult(res.user);
    void refresh();
  };

  const doAttack = async (moveIndex: number) => {
    if (!battle || busy) return;
    const moveName = battle.state.player.moves[moveIndex]?.name;
    retroSfx.playAttack(moveName ? getMoveByName(moveName).sfx : "slash");
    await doAction({ action: "attack", battleId: battle.id, moveIndex });
  };

  // Fase 8.4: poção / cura de status — consome o turno (o lendário ataca depois).
  const doUseItem = async (item: string) => {
    if (!battle || busy) return;
    retroSfx.playAttack("heal");
    await doAction({ action: "use_item", battleId: battle.id, item });
  };

  const doAction = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);

    const res = await callBattle(body);
    setBusy(false);

    if ("error" in res) {
      setError(res.error);
      return;
    }

    setBattle(res.battle);

    if (res.battle.status === "WON") {
      retroSfx.playCatchSuccess();
      setPhase("result");
      if (res.user) onBattleResult(res.user);
      void refresh();
    } else if (res.battle.status === "LOST") {
      setPhase("result");
      if (res.user) onBattleResult(res.user);
      void refresh();
    } else if (res.user) {
      onBattleResult(res.user);
    }
  };

  const claimStone = async () => {
    if (!pickedStone || busy) return;
    setBusy(true);
    setClaimMsg(null);
    try {
      const res = await api("/api/boss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "claim_stone", arenaMapId, item: pickedStone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao retirar a pedra.");
      setClaimed(true);
      setClaimMsg(`✔ ${EVOLUTION_ITEM_LABEL[pickedStone as keyof typeof EVOLUTION_ITEM_LABEL]} retirada!`);
      if (data.user) onBattleResult(data.user);
      retroSfx.playCatchSuccess();
      void refresh();
    } catch (err: unknown) {
      setClaimMsg(`❌ ${err instanceof Error ? err.message : "Erro"}`);
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/90 p-6 text-center">
        {loadError ? (
          <>
            <div className="text-5xl">⚠️</div>
            <p className="font-['Press_Start_2P'] text-xs text-rose-400">NÃO FOI POSSÍVEL CARREGAR A ARENA</p>
            <p className="font-['VT323'] text-xl text-slate-400">{loadError}</p>
            <button
              onClick={onClose}
              className="border-2 border-amber-400 bg-amber-500 px-5 py-2 font-['Press_Start_2P'] text-xs text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110"
            >
              VOLTAR
            </button>
          </>
        ) : (
          <p className="font-['Press_Start_2P'] text-sm text-amber-400">Carregando Arena Boss...</p>
        )}
      </div>
    );
  }

  const state: BattleState | null = battle?.state ?? null;
  const opponent = state?.opponent ?? null;
  const player = state?.player ?? null;

  const bossSpecies = getPokemonSpecies(status.boss.pokedexId);
  const opponentSpecies = opponent ? getPokemonSpecies(opponent.pokedexId) : null;
  const playerSpecies = player ? getPokemonSpecies(player.pokedexId) : null;
  const playerVariantCfg =
    DELUGE_VARIANTS.find((v) => v.id === player?.variant) || DELUGE_VARIANTS[0];

  const hpColor = (hp: number, maxHp: number) =>
    hp / maxHp > 0.5 ? "bg-emerald-500" : hp / maxHp > 0.2 ? "bg-amber-400" : "bg-rose-600";

  const canFight = !status.wonThisWeek && status.attemptsLeft > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col border-4 border-purple-500 bg-slate-900 shadow-[0_0_0_4px_#000]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-purple-900/40 to-slate-950 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-400" />
              <h2 className="font-['Press_Start_2P'] text-xs text-purple-400">
                ARENA BOSS • {arenaName.toUpperCase()}
              </h2>
            </div>
            <p className="font-['VT323'] text-lg text-slate-400">
              Lendário da semana ({status.weekId}) • {status.attemptsLeft}/2 tentativas hoje
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status.wonThisWeek && (
              <span className="border border-emerald-400 bg-emerald-500/20 px-2 py-1 font-['VT323'] text-lg text-emerald-300">
                🏆 Vencido!
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
          <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
            <div className="flex flex-col items-center border-2 border-purple-500 bg-slate-950 p-4 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
              <img src={bossSpecies.frontSprite} alt={status.boss.name} className="h-24 w-24 object-contain" />
              <span className="mt-1 font-['Press_Start_2P'] text-[10px] text-purple-300">{status.boss.name}</span>
              <span className="font-['IBM_Plex_Mono'] text-xs text-slate-400">
                LV.{status.boss.level} • {status.boss.types.join("/")}
              </span>
            </div>

            <div className="max-w-md border-2 border-slate-700 bg-slate-950 px-6 py-4">
              <p className="font-['VT323'] text-xl text-purple-300">
                &ldquo;Um {status.boss.name} nv {status.boss.level} desceu à arena. Só os mais fortes saem de pé!&rdquo;
              </p>
              <div className="mt-2 font-['IBM_Plex_Mono'] text-xs text-slate-400">
                Prêmio: XP + Pk$ + 1 pedra à escolha + 1/1200 o lendário nv 5
              </div>
            </div>

            {error && (
              <div className="border-2 border-rose-600 bg-rose-950/60 px-5 py-2 font-['VT323'] text-xl text-rose-300">
                {error}
              </div>
            )}

            {/* Pedra pendente de retirada (venceu e fechou sem retirar) */}
            {status.wonThisWeek && !claimed && (
              <div className="w-full max-w-md border-2 border-amber-400 bg-amber-500/10 px-4 py-3">
                <p className="mb-2 font-['Press_Start_2P'] text-[9px] text-amber-300">
                  🏆 SUA PEDRA DA SEMANA TE ESPERA:
                </p>
                <StonePicker picked={pickedStone} onPick={setPickedStone} />
                <button
                  onClick={claimStone}
                  disabled={busy || !pickedStone}
                  className="mt-3 border-2 border-amber-400 bg-amber-500 px-6 py-2 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110 disabled:opacity-50"
                >
                  RETIRAR PEDRA
                </button>
                {claimMsg && (
                  <p className={`mt-2 font-['VT323'] text-xl ${claimMsg.startsWith("✔") ? "text-emerald-300" : "text-rose-300"}`}>
                    {claimMsg}
                  </p>
                )}
              </div>
            )}

            {status.wonThisWeek ? (
              <div className="border-2 border-emerald-600 bg-emerald-950/60 px-5 py-3">
                <p className="font-['VT323'] text-xl text-emerald-300">
                  Você já venceu esta arena nesta semana. A próxima lenda chega segunda-feira!
                  {status.legendaryGranted && <><br />✨ E o lendário se juntou a você! ✨</>}
                </p>
              </div>
            ) : status.attemptsLeft <= 0 ? (
              <div className="border-2 border-rose-600 bg-rose-950/60 px-5 py-3">
                <p className="font-['VT323'] text-xl text-rose-300">
                  Suas 2 tentativas de hoje acabaram. Volte amanhã!
                </p>
              </div>
            ) : (
              <button
                onClick={startBattle}
                disabled={busy || !canFight}
                className="flex items-center gap-2 border-2 border-purple-400 bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-3 font-['Press_Start_2P'] text-xs text-white shadow-[4px_4px_0px_#000] hover:brightness-110 disabled:opacity-50"
              >
                <Swords className="h-5 w-5" />
                DESAFIAR O LENDÁRIO!
              </button>
            )}
          </div>
        )}

        {/* FIGHTING */}
        {phase === "fighting" && opponent && player && opponentSpecies && playerSpecies && (
          <div className="flex flex-1 flex-col">
            <div className="relative flex h-52 flex-row-reverse justify-between bg-[radial-gradient(ellipse_at_top,_#3b0764,_#0f172a)] p-5">
              <div className="flex flex-col items-start justify-start">
                <div className="border-2 border-purple-500 bg-slate-950/90 px-3 py-1.5">
                  <div className="flex items-center gap-2 font-['Press_Start_2P'] text-[9px] text-purple-300">
                    <span>{opponent.name} <span className="text-slate-500">LV.{opponent.level}</span></span>
                    <StatusTag status={opponent.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[7px] text-purple-400">HP</span>
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

              <div className="flex flex-col items-end justify-end">
                <img
                  src={playerSpecies.backSprite || playerSpecies.frontSprite}
                  alt={player.displayName}
                  style={{ filter: playerVariantCfg.filterCss }}
                  className="mb-2 h-24 w-24 object-contain"
                />
                <div className="border-2 border-amber-400 bg-slate-950/90 px-3 py-1.5">
                  <div className="flex items-center gap-2 font-['Press_Start_2P'] text-[9px] text-amber-300">
                    <span>{player.displayName} <span className="text-slate-500">LV.{player.level}</span></span>
                    <StatusTag status={player.status} />
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
                    {m.category === "Status" ? "✨" : "⚡"} {m.name}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <BattleItemBar
                  inventory={inventory}
                  playerHp={player.hp}
                  playerMaxHp={player.maxHp}
                  playerStatus={player.status}
                  disabled={busy || player.hp <= 0}
                  onUse={doUseItem}
                />
              </div>
            </div>
          </div>
        )}

        {/* RESULT */}
        {phase === "result" && battle && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
            {battle.status === "WON" ? (
              <>
                <Trophy className="h-16 w-16 text-amber-400" />
                <div className="font-['Press_Start_2P'] text-sm text-amber-400">LENDÁRIO VENCIDO!</div>
                <div className="border-2 border-amber-400/50 bg-amber-500/10 px-6 py-4">
                  <p className="font-['VT323'] text-2xl text-amber-300">
                    +{battle.rewards?.money ?? 0} Pk$ + {battle.rewards?.xp ?? 0} XP!
                  </p>
                  {battle.rewards?.bossLegendary && (
                    <p className="mt-2 font-['VT323'] text-2xl text-purple-300">
                      ✨✨✨ {battle.rewards.bossLegendary} (NV. 5) se juntou a você! ✨✨✨
                    </p>
                  )}
                </div>
                {!claimed ? (
                  <div className="w-full max-w-md border-2 border-amber-400 bg-amber-500/10 px-4 py-3">
                    <p className="mb-2 font-['Press_Start_2P'] text-[9px] text-amber-300">
                      ESCOLHA SUA PEDRA:
                    </p>
                    <StonePicker picked={pickedStone} onPick={setPickedStone} />
                    <button
                      onClick={claimStone}
                      disabled={busy || !pickedStone}
                      className="mt-3 border-2 border-amber-400 bg-amber-500 px-6 py-2 font-['Press_Start_2P'] text-[10px] text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110 disabled:opacity-50"
                    >
                      RETIRAR PEDRA
                    </button>
                    {claimMsg && (
                      <p className={`mt-2 font-['VT323'] text-xl ${claimMsg.startsWith("✔") ? "text-emerald-300" : "text-rose-300"}`}>
                        {claimMsg}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="font-['VT323'] text-xl text-emerald-300">✔ Pedra da semana retirada!</p>
                )}
              </>
            ) : (
              <>
                <div className="text-5xl">💀</div>
                <div className="font-['Press_Start_2P'] text-sm text-rose-400">O LENDÁRIO VENCEU...</div>
                <p className="font-['VT323'] text-xl text-slate-300">
                  Treine mais e volte — a derrota não gasta sua semana, só a tentativa de hoje.
                </p>
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

function StonePicker({ picked, onPick }: { picked: string | null; onPick: (key: string) => void }) {
  return (
    <div className="grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto">
      {EVOLUTION_ITEM_VALUES.map((key) => (
        <button
          key={key}
          onClick={() => onPick(key)}
          className={`flex items-center gap-1.5 border-2 px-2 py-1.5 text-left ${
            picked === key
              ? "border-amber-400 bg-amber-500/30"
              : "border-slate-700 bg-slate-950 hover:border-amber-400"
          }`}
        >
          <span className="text-lg">{EVOLUTION_ITEM_EMOJI[key]}</span>
          <span className="font-['IBM_Plex_Mono'] text-[10px] leading-tight text-slate-200">
            {EVOLUTION_ITEM_LABEL[key]}
          </span>
        </button>
      ))}
    </div>
  );
}
