"use client";

import React, { useEffect, useState } from "react";
import { getPokemonSpecies, DELUGE_VARIANTS } from "@/lib/pokedex";
import {
  computeGymCounterDamage,
  computeGymDamage,
  rollCritical,
} from "@/lib/battle";
import { retroSfx } from "@/lib/sound";
import { X, Trophy, Shield, Swords } from "lucide-react";
import { GymPokemon } from "@/lib/seed-gym";

interface GymLeader {
  id: number;
  mapId: number;
  name: string;
  title: string;
  badgeName: string;
  badgeEmoji: string;
  specialty: string;
  requiredBadges: number;
  rewardMoney: number;
  team: GymPokemon[];
  npcDialog: string;
  defeatDialog: string;
  winDialog: string;
}

interface UserBadge {
  id: number;
  gymLeaderId: number;
  badgeName: string;
  badgeEmoji: string;
}

interface GymModalProps {
  gymLeaderId: number;
  playerParty: Array<{
    id: number; pokedexId: number; name: string; variant: string;
    level: number; hp: number; maxHp: number; attack: number;
    defense: number; spAttack: number; spDefense: number; speed: number;
    move1: string; move2: string; move3: string; move4: string;
  }>;
  userBadges: UserBadge[];
  onBattleResult: (updatedUser: unknown, updatedBadges: UserBadge[]) => void;
  onClose: () => void;
}

type BattlePhase = "intro" | "fighting" | "result";

export function GymModal({ gymLeaderId, playerParty, userBadges, onBattleResult, onClose }: GymModalProps) {
  const [leader, setLeader] = useState<GymLeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<BattlePhase>("intro");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Battle state
  const [currentLeaderPokemonIdx, setCurrentLeaderPokemonIdx] = useState(0);
  const [leaderCurrentHp, setLeaderCurrentHp] = useState(0);
  const [playerCurrentHp, setPlayerCurrentHp] = useState(0);
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [animating, setAnimating] = useState(false);
  const [battleResult, setBattleResult] = useState<"win" | "lose" | null>(null);

  const activePoke = playerParty[0];

  useEffect(() => {
    // B1 (Fase 3): antes isto pedia `?mapId=0`, mas os líderes têm map_id
    // 1/2/3 — a resposta vinha vazia, `setLeader` nunca rodava e a modal
    // ficava presa em "Carregando Ginásio..." para sempre.
    // Sem filtro de mapa a rota devolve todos os líderes; filtramos aqui.
    fetch("/api/gym")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const found = (d.gymLeaders as GymLeader[]).find((g) => g.id === gymLeaderId);
        if (!found) {
          throw new Error(`Nenhum líder de ginásio com id ${gymLeaderId}.`);
        }
        setLeader(found);
        setLeaderCurrentHp(found.team[0]?.hp ?? 0);
      })
      .catch((err: unknown) => {
        // Sem isto a modal travaria num "Carregando..." eterno em qualquer falha.
        setLoadError(err instanceof Error ? err.message : "Falha ao carregar o Ginásio.");
      })
      .finally(() => setLoading(false));
    // O HP do jogador é definido em `handleStartBattle`; mantê-lo fora deste
    // effect evita re-buscar o líder a cada mudança do time.
  }, [gymLeaderId]);

  const alreadyHasBadge = userBadges.some((b) => b.gymLeaderId === gymLeaderId);
  const badgeCount = userBadges.length;
  const canChallenge = leader ? badgeCount >= leader.requiredBadges : false;

  const addLog = (msg: string) => setBattleLogs((prev) => [...prev, msg]);

  const handleStartBattle = () => {
    if (!leader || !activePoke) return;
    retroSfx.playEncounterFlash();
    setPhase("fighting");
    setCurrentLeaderPokemonIdx(0);
    setLeaderCurrentHp(leader.team[0].hp);
    setPlayerCurrentHp(activePoke.hp);
    setBattleLogs([`${leader.name} enviou ${leader.team[0].name} (LV.${leader.team[0].level})!`]);
  };

  const handlePlayerMove = (moveName: string) => {
    if (!leader || animating || battleResult) return;
    const leaderPoke = leader.team[currentLeaderPokemonIdx];
    if (!leaderPoke) return;

    setAnimating(true);
    retroSfx.playAttack("slash");

    // Player attacks
    const isCrit = rollCritical(0.15);
    const playerDmg = computeGymDamage(
      activePoke.level,
      activePoke.attack,
      leaderPoke.defense,
      isCrit
    );

    const newLeaderHp = Math.max(0, leaderCurrentHp - playerDmg);
    setLeaderCurrentHp(newLeaderHp);
    addLog(`${activePoke.name} usou ${moveName}!${isCrit ? " CRÍTICO!" : ""} Causou ${playerDmg} de dano!`);

    setTimeout(() => {
      if (newLeaderHp <= 0) {
        // Leader pokemon fainted
        const nextIdx = currentLeaderPokemonIdx + 1;
        if (nextIdx >= leader.team.length) {
          // All defeated!
          addLog(`${leaderPoke.name} desmaiou! Você venceu o Ginásio de ${leader.name}!`);
          setBattleResult("win");
          retroSfx.playCatchSuccess();
          finishBattle(true);
        } else {
          addLog(`${leaderPoke.name} desmaiou! ${leader.name} enviou ${leader.team[nextIdx].name}!`);
          setCurrentLeaderPokemonIdx(nextIdx);
          setLeaderCurrentHp(leader.team[nextIdx].hp);
        }
      } else {
        // Leader counter-attacks
        retroSfx.playAttack("beam");
        const leaderDmg = computeGymCounterDamage(
          leaderPoke.level,
          leaderPoke.attack,
          activePoke?.defense ?? 10
        );
        const newPlayerHp = Math.max(0, playerCurrentHp - leaderDmg);
        setPlayerCurrentHp(newPlayerHp);
        addLog(`${leaderPoke.name} contra-atacou! Causou ${leaderDmg} de dano!`);

        if (newPlayerHp <= 0) {
          addLog(`${activePoke.name} desmaiou! Você perdeu para ${leader.name}...`);
          setBattleResult("lose");
          finishBattle(false);
        }
      }
      setAnimating(false);
    }, 600);
  };

  const finishBattle = async (won: boolean) => {
    try {
      const res = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "battle_result", gymLeaderId, won }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhase("result");
        onBattleResult(data.user, data.badges || []);
      }
    } catch { /* ignore */ }
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

  const leaderPoke = leader.team[currentLeaderPokemonIdx];
  const leaderSpecies = leaderPoke ? getPokemonSpecies(leaderPoke.pokedexId) : null;
  const playerSpecies = activePoke ? getPokemonSpecies(activePoke.pokedexId) : null;
  const playerVariant = DELUGE_VARIANTS.find((v) => v.id === activePoke?.variant) || DELUGE_VARIANTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#000]">

        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-amber-900/40 to-slate-950 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              <h2 className="font-['Press_Start_2P'] text-xs text-amber-400">GINÁSIO • {leader.name.toUpperCase()}</h2>
            </div>
            <p className="font-['VT323'] text-lg text-slate-400">{leader.title} • Tipo: {leader.specialty}</p>
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

        {/* INTRO phase */}
        {phase === "intro" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
            {/* Leader team preview */}
            <div className="flex items-center gap-4">
              {leader.team.map((tp, i) => {
                const s = getPokemonSpecies(tp.pokedexId);
                return (
                  <div key={i} className="flex flex-col items-center border-2 border-slate-700 bg-slate-950 p-3">
                    <img src={s.frontSprite} alt={tp.name} className="h-14 w-14 object-contain" />
                    <span className="mt-1 font-['Press_Start_2P'] text-[8px] text-amber-300">{tp.name}</span>
                    <span className="font-['IBM_Plex_Mono'] text-xs text-slate-400">LV.{tp.level}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-2 border-slate-700 bg-slate-950 px-6 py-4 max-w-md">
              <p className="font-['VT323'] text-xl text-amber-300">&ldquo;{leader.npcDialog}&rdquo;</p>
              <div className="mt-2 font-['IBM_Plex_Mono'] text-xs text-slate-400">
                Recompensa: {leader.rewardMoney} Pk$ + {leader.badgeEmoji} {leader.badgeName}
              </div>
            </div>

            {!canChallenge ? (
              <div className="border-2 border-rose-600 bg-rose-950/60 px-5 py-3">
                <p className="font-['VT323'] text-xl text-rose-300">
                  ⚠️ Você precisa de {leader.requiredBadges} insígnias para desafiar este Ginásio!
                  <br />Você tem: {badgeCount} insígnias.
                </p>
              </div>
            ) : (
              <button onClick={handleStartBattle}
                className="flex items-center gap-2 border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3 font-['Press_Start_2P'] text-xs text-slate-950 shadow-[4px_4px_0px_#000] hover:brightness-110">
                <Swords className="h-5 w-5" />
                {alreadyHasBadge ? "RETESTAR GINÁSIO" : "DESAFIAR GINÁSIO!"}
              </button>
            )}
          </div>
        )}

        {/* FIGHTING phase */}
        {phase === "fighting" && leaderPoke && leaderSpecies && (
          <div className="flex flex-1 flex-col">
            {/* Battle arena */}
            <div className="relative flex justify-between bg-[radial-gradient(ellipse_at_top,_#1e293b,_#0f172a)] p-5 h-52">
              {/* Enemy side */}
              <div className="flex flex-col justify-start items-start">
                <div className="border-2 border-slate-600 bg-slate-950/90 px-3 py-1.5">
                  <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">{leaderPoke.name} <span className="text-slate-500">LV.{leaderPoke.level}</span></div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-['Press_Start_2P'] text-[7px] text-amber-400">HP</span>
                    <div className="h-2 w-28 border border-black bg-slate-800">
                      <div className={`h-full transition-all ${leaderCurrentHp / leaderPoke.hp > 0.5 ? "bg-emerald-500" : leaderCurrentHp / leaderPoke.hp > 0.2 ? "bg-amber-400" : "bg-rose-600"}`}
                        style={{ width: `${Math.max(0, (leaderCurrentHp / leaderPoke.hp) * 100)}%` }} />
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-[9px] text-slate-300">{leaderCurrentHp}/{leaderPoke.hp}</span>
                  </div>
                </div>
                <img src={leaderSpecies.frontSprite} alt={leaderPoke.name} className="mt-2 h-24 w-24 object-contain" />
              </div>

              {/* Player side */}
              <div className="flex flex-col justify-end items-end">
                {playerSpecies && (
                  <img src={playerSpecies.backSprite || playerSpecies.frontSprite} alt={activePoke?.name}
                    style={{ filter: playerVariant.filterCss }}
                    className="mb-2 h-24 w-24 object-contain" />
                )}
                {activePoke && (
                  <div className="border-2 border-amber-400 bg-slate-950/90 px-3 py-1.5">
                    <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">{activePoke.name} <span className="text-slate-500">LV.{activePoke.level}</span></div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-['Press_Start_2P'] text-[7px] text-amber-400">HP</span>
                      <div className="h-2 w-28 border border-black bg-slate-800">
                        <div className={`h-full transition-all ${playerCurrentHp / activePoke.maxHp > 0.5 ? "bg-emerald-500" : playerCurrentHp / activePoke.maxHp > 0.2 ? "bg-amber-400" : "bg-rose-600"}`}
                          style={{ width: `${Math.max(0, (playerCurrentHp / activePoke.maxHp) * 100)}%` }} />
                      </div>
                      <span className="font-['IBM_Plex_Mono'] text-[9px] text-amber-300">{playerCurrentHp}/{activePoke.maxHp}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Battle log */}
            <div className="border-y-2 border-slate-700 bg-slate-950 px-4 py-2 h-16 overflow-y-auto">
              {battleLogs.slice(-3).map((log, i) => (
                <div key={i} className="font-['VT323'] text-lg text-amber-300">▸ {log}</div>
              ))}
            </div>

            {/* Moves */}
            {!battleResult && activePoke && (
              <div className="p-4">
                <div className="mb-2 font-['Press_Start_2P'] text-[9px] text-slate-400">ESCOLHA UM GOLPE:</div>
                <div className="grid grid-cols-2 gap-2">
                  {[activePoke.move1, activePoke.move2, activePoke.move3, activePoke.move4].map((move, i) => (
                    <button key={i} onClick={() => handlePlayerMove(move)} disabled={animating || !!battleResult}
                      className="border-2 border-slate-600 bg-slate-800 px-3 py-2.5 font-['Press_Start_2P'] text-[10px] text-amber-300 shadow-[2px_2px_0px_#000] hover:border-amber-400 hover:bg-slate-700 disabled:opacity-40">
                      ⚡ {move}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULT phase */}
        {phase === "result" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
            {battleResult === "win" ? (
              <>
                <Trophy className="h-16 w-16 text-amber-400" />
                <div className="font-['Press_Start_2P'] text-sm text-amber-400">VITÓRIA!</div>
                <div className="border-2 border-amber-400/50 bg-amber-500/10 px-6 py-4">
                  <p className="font-['VT323'] text-2xl text-amber-300">&ldquo;{leader.winDialog}&rdquo;</p>
                  {!alreadyHasBadge && (
                    <div className="mt-3 text-4xl">{leader.badgeEmoji}</div>
                  )}
                  <p className="mt-2 font-['VT323'] text-xl text-emerald-300">
                    +{leader.rewardMoney} Pk$ {!alreadyHasBadge ? `• Nova insígnia: ${leader.badgeName}!` : ""}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl">💀</div>
                <div className="font-['Press_Start_2P'] text-sm text-rose-400">DERROTA...</div>
                <p className="font-['VT323'] text-xl text-slate-300">&ldquo;{leader.defeatDialog}&rdquo;</p>
                <p className="font-['VT323'] text-lg text-rose-400">−300 Pk$ de penalidade</p>
              </>
            )}
            <button onClick={onClose}
              className="border-2 border-amber-400 bg-amber-500 px-6 py-2.5 font-['Press_Start_2P'] text-xs text-slate-950 shadow-[3px_3px_0px_#000] hover:brightness-110">
              CONTINUAR JORNADA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
