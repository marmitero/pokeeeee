"use client";

import React, { useEffect, useState } from "react";
import {
  DELUGE_VARIANTS,
  DelugeVariant,
  PokemonSpecies,
  getPokemonSpecies,
} from "@/lib/pokedex";
import {
  computeWildCounterDamage,
  computeWildDamage,
  rollCritical,
} from "@/lib/battle";
import { retroSfx } from "@/lib/sound";
import { Shield, Sparkles, Swords, Trophy, Send } from "lucide-react";

export interface ArenaChatMessage {
  id?: number;
  username: string;
  message: string;
  createdAt?: string;
}

/**
 * Carrega o chat global da arena.
 *
 * B11 (Fase 3): o `GET /api/pvp` existia mas **nunca era chamado** — o chat
 * mostrava só o eco local, com duas mensagens fake hardcoded, e o estado
 * `chatMessages` nem era renderizado. Agora ele é buscado ao abrir e
 * atualizado por polling.
 *
 * Vive fora do componente para não chamar `setState` sincronamente dentro do
 * corpo do `useEffect` (react-hooks/set-state-in-effect).
 */
async function loadArenaChat(
  onMessages: (messages: ArenaChatMessage[]) => void
): Promise<void> {
  try {
    const res = await fetch("/api/pvp", { credentials: "same-origin" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.chatMessages)) {
      onMessages(data.chatMessages as ArenaChatMessage[]);
    }
  } catch {
    // O chat é acessório: uma falha não pode derrubar a batalha.
  }
}

export interface WildEncounterState {
  species: PokemonSpecies;
  variant: DelugeVariant;
  level: number;
  hp: number;
  maxHp: number;
}

export interface PlayerPokemonState {
  id: number;
  pokedexId: number;
  name: string;
  variant: DelugeVariant;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
}

interface BattleArenaModalProps {
  mode: "WILD" | "PVP";
  wildTarget?: WildEncounterState;
  playerParty: PlayerPokemonState[];
  /** Apenas para exibir o autor no eco local do chat — o servidor usa a sessão. */
  username: string;
  pokeballs: number;
  greatballs: number;
  ultraballs: number;
  masterballs: number;
  onCaughtPokemon: (caught: unknown, user: unknown, party: unknown[]) => void;
  onBattleEnd: () => void;
}

export function BattleArenaModal({
  mode,
  wildTarget,
  playerParty,
  username,
  pokeballs,
  greatballs,
  ultraballs,
  masterballs,
  onCaughtPokemon,
  onBattleEnd,
}: BattleArenaModalProps) {
  const activePoke = playerParty[0] || {
    id: 1,
    pokedexId: 4,
    name: "Charmander",
    variant: "Shiny",
    level: 7,
    hp: 38,
    maxHp: 38,
    attack: 24,
    defense: 18,
    spAttack: 26,
    spDefense: 19,
    speed: 25,
    move1: "Lança-Chamas",
    move2: "Garra Dragão",
    move3: "Ataque Rápido",
    move4: "Pulso Sombrio",
  };

  const initialOpponent = wildTarget || {
    species: getPokemonSpecies(150),
    variant: "Mystic" as DelugeVariant,
    level: 35,
    hp: 140,
    maxHp: 140,
  };

  const [enemyHp, setEnemyHp] = useState(initialOpponent.hp);
  const [playerHp, setPlayerHp] = useState(activePoke.hp);
  const [screenShake, setScreenShake] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    mode === "WILD"
      ? `Um ${initialOpponent.variant !== "Normal" ? `★ ${initialOpponent.variant} ` : ""}${initialOpponent.species.name} selvagem (LV. ${initialOpponent.level}) saltou do matinho!`
      : `Batalha PvP Online iniciada na Arena DelugeRPG!`,
  ]);
  const [isCatching, setIsCatching] = useState(false);
  const [caughtSuccess, setCaughtSuccess] = useState(false);

  // O estado `pvpRooms` foi removido na Fase 3 (B11): era escrito a cada
  // "+ CRIAR SALA" e nunca lido em lugar nenhum do JSX.
  const [pvpRoomCode, setPvpRoomCode] = useState("ARENA-DELUGE-01");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ArenaChatMessage[]>([]);

  // B11: busca o chat ao abrir e mantém atualizado por polling.
  useEffect(() => {
    void loadArenaChat(setChatMessages);
    const timer = setInterval(() => void loadArenaChat(setChatMessages), 5000);
    return () => clearInterval(timer);
  }, []);

  const opponentSpecies = initialOpponent.species;
  const opponentVariantConfig =
    DELUGE_VARIANTS.find((v) => v.id === initialOpponent.variant) ||
    DELUGE_VARIANTS[0];

  const playerSpecies = getPokemonSpecies(activePoke.pokedexId);
  const playerVariantConfig =
    DELUGE_VARIANTS.find((v) => v.id === activePoke.variant) ||
    DELUGE_VARIANTS[0];

  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 380);
  };

  const handleUseMove = (moveName: string) => {
    if (enemyHp <= 0 || playerHp <= 0 || caughtSuccess) return;
    retroSfx.playAttack("flame");
    triggerShake();

    const isCrit = rollCritical(0.18);
    const baseDmg = computeWildDamage(activePoke.level, isCrit);
    const newEnemyHp = Math.max(0, enemyHp - baseDmg);
    setEnemyHp(newEnemyHp);

    const logLine = `${activePoke.name} usou ${moveName}! ${
      isCrit ? "GOLPE CRÍTICO! " : ""
    }Causou ${baseDmg} de dano!`;

    if (newEnemyHp <= 0) {
      retroSfx.playCatchSuccess();
      setLogs((prev) => [
        ...prev,
        logLine,
        `🏆 ${opponentSpecies.name} desmaiou! Você venceu a batalha e ganhou +650 Pokedólares!`,
      ]);
      return;
    }

    // Contra-ataque selvagem
    setTimeout(() => {
      retroSfx.playAttack("slash");
      const enemyDmg = computeWildCounterDamage(initialOpponent.level);
      const newPlayerHp = Math.max(0, playerHp - enemyDmg);
      setPlayerHp(newPlayerHp);
      setLogs((prev) => [
        ...prev,
        logLine,
        `${opponentSpecies.name} contra-atacou causando ${enemyDmg} de dano!`,
        // Sem isto o jogador ficava preso: os botões seguiam clicáveis, mas
        // handleUseMove retornava em silêncio com playerHp <= 0.
        ...(newPlayerHp <= 0
          ? [
              `💀 ${activePoke.name} desmaiou! Você voltou para a base. Cure sua equipe num Centro Pokémon (✚).`,
            ]
          : []),
      ]);
    }, 450);
  };

  const handleThrowBall = async (
    ballType: "pokeballs" | "greatballs" | "ultraballs" | "masterballs"
  ) => {
    if (enemyHp <= 0 || caughtSuccess || isCatching) return;
    setIsCatching(true);
    retroSfx.playStep();

    const hpPercent = enemyHp / initialOpponent.maxHp;
    const ballMultiplier =
      ballType === "masterballs"
        ? 999
        : ballType === "ultraballs"
        ? 3.2
        : ballType === "greatballs"
        ? 2.1
        : 1.3;

    const catchChance =
      ballType === "masterballs"
        ? 1.0
        : Math.min(0.95, ((1 - hpPercent * 0.65) * ballMultiplier) / 2);

    const rolled = Math.random();

    setTimeout(async () => {
      if (rolled <= catchChance) {
        retroSfx.playCatchSuccess();
        setCaughtSuccess(true);
        setLogs((prev) => [
          ...prev,
          `★ CAPTURADO! ${initialOpponent.variant !== "Normal" ? `${initialOpponent.variant} ` : ""}${opponentSpecies.name} foi adicionado à sua equipe DelugeRPG!`,
        ]);

        try {
          const res = await fetch("/api/pokemon/catch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pokedexId: opponentSpecies.id,
              variant: initialOpponent.variant,
              level: initialOpponent.level,
              ballUsed: ballType,
              moneyReward: 500,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            onCaughtPokemon(data.user, data.user, data.party);
          }
        } catch {
          // ignore
        }
      } else {
        retroSfx.playAttack("slash");
        setLogs((prev) => [
          ...prev,
          `Ah não! ${opponentSpecies.name} escapou da ${ballType.toUpperCase()}!`,
        ]);
      }
      setIsCatching(false);
    }, 650);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    retroSfx.playStep();
    const newMsg = { username, message: chatInput.trim() };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    try {
      const res = await fetch("/api/pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "chat",
          message: newMsg.message,
        }),
      });
      // A rota devolve a lista atualizada — usamos em vez de esperar o polling.
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chatMessages)) {
          setChatMessages(data.chatMessages as ArenaChatMessage[]);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleCreateOnlineRoom = async () => {
    retroSfx.playCatchSuccess();
    try {
      const res = await fetch("/api/pvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_room",
          roomCode: pvpRoomCode,
          player1Pokemon: activePoke,
        }),
      });
      const data = await res.json();
      if (res.ok && data.battle) {
        setLogs((prev) => [
          ...prev,
          `Sala ${data.battle.roomCode} aberta para desafiantes online!`,
        ]);
      } else if (!res.ok) {
        setLogs((prev) => [...prev, `Não foi possível abrir a sala: ${data.error ?? "erro"}`]);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-md ${
        screenShake ? "animate-pulse" : ""
      }`}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col border-4 border-amber-400 bg-slate-900 shadow-[0_0_0_4px_#090d16,0_20px_50px_rgba(0,0,0,0.95)]">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b-4 border-slate-700 bg-gradient-to-r from-slate-950 via-amber-900/50 to-slate-950 px-5 py-3">
          <div className="flex items-center gap-3">
            <Swords className="h-6 w-6 text-amber-400" />
            <span className="font-['Press_Start_2P'] text-xs text-amber-400">
              {mode === "WILD"
                ? `ENCONTRO SELVAGEM • ${initialOpponent.variant.toUpperCase()} ${opponentSpecies.name.toUpperCase()}`
                : "ARENA ONLINE PVP DELUGERPG"}
            </span>
          </div>
          <button
            onClick={() => {
              retroSfx.playStep();
              onBattleEnd();
            }}
            className="border-2 border-amber-400 bg-rose-600 px-3 py-1 font-['Press_Start_2P'] text-[10px] text-white hover:bg-rose-700"
          >
            FUGIR / SAIR DA BATALHA
          </button>
        </div>

        {/* 16-Bit Battle Stage Canvas */}
        <div className="relative flex flex-col justify-between border-b-4 border-slate-800 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black p-6 sm:h-72">
          {/* Top-Right: Enemy Pokémon */}
          <div className="flex items-start justify-between">
            {/* Enemy HP HUD Box */}
            <div className="border-2 border-slate-600 bg-slate-950/90 px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="font-['Press_Start_2P'] text-xs text-amber-300">
                  {opponentSpecies.name}
                </span>
                <span
                  className={`border px-1.5 py-0.5 font-['Press_Start_2P'] text-[8px] ${opponentVariantConfig.badgeBg} ${opponentVariantConfig.badgeBorder} ${opponentVariantConfig.badgeText}`}
                >
                  {opponentVariantConfig.label}
                </span>
                <span className="font-['Press_Start_2P'] text-[10px] text-slate-400">
                  LV.{initialOpponent.level}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">
                  HP
                </span>
                <div className="h-3 w-40 border border-black bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      enemyHp / initialOpponent.maxHp > 0.5
                        ? "bg-emerald-500"
                        : enemyHp / initialOpponent.maxHp > 0.2
                        ? "bg-amber-400"
                        : "bg-rose-600"
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.round(
                          (enemyHp / initialOpponent.maxHp) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
                <span className="font-['IBM_Plex_Mono'] text-xs text-slate-300">
                  {enemyHp}/{initialOpponent.maxHp}
                </span>
              </div>
            </div>

            {/* Enemy Front Sprite */}
            <div className="relative mr-6 flex h-28 w-28 items-center justify-center">
              <div
                className="absolute inset-0 rounded-full opacity-40 blur-lg"
                style={{
                  filter: opponentVariantConfig.auraCss,
                }}
              />
              <img
                src={
                  initialOpponent.variant === "Shiny"
                    ? opponentSpecies.shinyFrontSprite || opponentSpecies.frontSprite
                    : opponentSpecies.frontSprite
                }
                alt={opponentSpecies.name}
                style={{
                  filter: opponentVariantConfig.filterCss,
                  imageRendering: "pixelated",
                }}
                className="relative z-10 max-h-24 max-w-24 object-contain"
              />
            </div>
          </div>

          {/* Bottom-Left: Player Pokémon */}
          <div className="mt-4 flex items-end justify-between">
            {/* Player Back Sprite */}
            <div className="relative ml-6 flex h-28 w-28 items-center justify-center">
              <img
                src={
                  activePoke.variant === "Shiny"
                    ? playerSpecies.shinyFrontSprite || playerSpecies.backSprite
                    : playerSpecies.backSprite || playerSpecies.frontSprite
                }
                alt={activePoke.name}
                style={{
                  filter: playerVariantConfig.filterCss,
                  imageRendering: "pixelated",
                }}
                className="relative z-10 max-h-28 max-w-28 object-contain"
              />
            </div>

            {/* Player HP HUD Box */}
            <div className="border-2 border-amber-400 bg-slate-950/95 px-4 py-2.5 shadow-xl">
              <div className="flex items-center gap-2">
                <span className="font-['Press_Start_2P'] text-xs text-amber-300">
                  {activePoke.name}
                </span>
                <span
                  className={`border px-1.5 py-0.5 font-['Press_Start_2P'] text-[8px] ${playerVariantConfig.badgeBg} ${playerVariantConfig.badgeBorder} ${playerVariantConfig.badgeText}`}
                >
                  {playerVariantConfig.label}
                </span>
                <span className="font-['Press_Start_2P'] text-[10px] text-slate-400">
                  LV.{activePoke.level}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">
                  HP
                </span>
                <div className="h-3 w-44 border border-black bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      playerHp / activePoke.maxHp > 0.5
                        ? "bg-emerald-500"
                        : playerHp / activePoke.maxHp > 0.2
                        ? "bg-amber-400"
                        : "bg-rose-600"
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.round((playerHp / activePoke.maxHp) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <span className="font-['IBM_Plex_Mono'] text-xs text-amber-300">
                  {playerHp}/{activePoke.maxHp}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Combat Controls & Combat Dialogue Box */}
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12">
          {/* Left Dialogue Log */}
          <div className="flex flex-col justify-between border-2 border-slate-700 bg-slate-950 p-3 lg:col-span-5">
            <div className="max-h-24 space-y-1 overflow-y-auto font-['VT323'] text-xl text-amber-300">
              {logs.map((log, idx) => (
                <div key={idx}>▸ {log}</div>
              ))}
            </div>
            {caughtSuccess && (
              <button
                onClick={onBattleEnd}
                className="mt-2 w-full border-2 border-emerald-400 bg-emerald-600 py-2 font-['Press_Start_2P'] text-xs text-white"
              >
                CONTINUAR EXPLORANDO O MAPA →
              </button>
            )}
            {!caughtSuccess && playerHp <= 0 && (
              <button
                onClick={onBattleEnd}
                className="mt-2 w-full border-2 border-rose-400 bg-rose-700 py-2 font-['Press_Start_2P'] text-xs text-white hover:bg-rose-600"
              >
                VOLTAR PARA A BASE →
              </button>
            )}
          </div>

          {/* Right Action Matrix: 4 Moves + 4 Pokéballs */}
          <div className="space-y-3 lg:col-span-7">
            {/* 4 Moves */}
            <div>
              <div className="mb-1.5 font-['Press_Start_2P'] text-[9px] text-slate-400">
                GOLPES DO SEU POKÉMON (CLIQUE PARA ATACAR):
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  activePoke.move1,
                  activePoke.move2,
                  activePoke.move3,
                  activePoke.move4,
                ].map((moveName, idx) => (
                  <button
                    key={idx}
                    disabled={enemyHp <= 0 || playerHp <= 0 || caughtSuccess}
                    onClick={() => handleUseMove(moveName)}
                    className="border-2 border-slate-600 bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-2.5 text-left font-['Press_Start_2P'] text-[10px] text-amber-300 shadow-[3px_3px_0px_#000] hover:border-amber-400 hover:brightness-125 disabled:opacity-40"
                  >
                    ⚡ {moveName}
                  </button>
                ))}
              </div>
            </div>

            {/* Pokéball Catch Tray */}
            {mode === "WILD" && (
              <div>
                <div className="mb-1.5 font-['Press_Start_2P'] text-[9px] text-cyan-300">
                  ARREMESSAR POKÉBOLA PARA CAPTURAR:
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    disabled={enemyHp <= 0 || caughtSuccess || pokeballs <= 0}
                    onClick={() => handleThrowBall("pokeballs")}
                    className="border-2 border-red-500 bg-red-950/60 p-2 text-center font-['Press_Start_2P'] text-[9px] text-red-200 hover:bg-red-900 disabled:opacity-40"
                  >
                    <div>🔴 POKÉBOLA</div>
                    <div className="mt-1 text-amber-300">×{pokeballs}</div>
                  </button>
                  <button
                    disabled={enemyHp <= 0 || caughtSuccess || greatballs <= 0}
                    onClick={() => handleThrowBall("greatballs")}
                    className="border-2 border-blue-500 bg-blue-950/60 p-2 text-center font-['Press_Start_2P'] text-[9px] text-blue-200 hover:bg-blue-900 disabled:opacity-40"
                  >
                    <div>🔵 GREATBALL</div>
                    <div className="mt-1 text-amber-300">×{greatballs}</div>
                  </button>
                  <button
                    disabled={enemyHp <= 0 || caughtSuccess || ultraballs <= 0}
                    onClick={() => handleThrowBall("ultraballs")}
                    className="border-2 border-amber-400 bg-amber-950/60 p-2 text-center font-['Press_Start_2P'] text-[9px] text-amber-200 hover:bg-amber-900 disabled:opacity-40"
                  >
                    <div>🟡 ULTRABALL</div>
                    <div className="mt-1 text-amber-300">×{ultraballs}</div>
                  </button>
                  <button
                    disabled={enemyHp <= 0 || caughtSuccess || masterballs <= 0}
                    onClick={() => handleThrowBall("masterballs")}
                    className="border-2 border-purple-400 bg-purple-950/70 p-2 text-center font-['Press_Start_2P'] text-[9px] text-purple-200 hover:bg-purple-900 disabled:opacity-40"
                  >
                    <div>🟣 MASTER (100%)</div>
                    <div className="mt-1 text-amber-300">×{masterballs}</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Multiplayer PvP Arena & Chat Drawer */}
        <div className="border-t-2 border-slate-800 bg-slate-950 px-5 py-3">
          {/* B11 (Fase 3): as mensagens nunca eram renderizadas. */}
          <div className="mb-2 max-h-20 space-y-0.5 overflow-y-auto font-['VT323'] text-base text-slate-300">
            {chatMessages.length === 0 ? (
              <p className="text-slate-600">Nenhuma mensagem na arena ainda. Seja o primeiro!</p>
            ) : (
              chatMessages.map((msg, idx) => (
                <div key={msg.id ?? `${msg.username}-${idx}`} className="truncate">
                  <span className="font-['Press_Start_2P'] text-[8px] text-amber-400">
                    {msg.username}
                  </span>
                  <span className="text-slate-500"> » </span>
                  {msg.message}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pvpRoomCode}
                onChange={(e) => setPvpRoomCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO DA SALA"
                className="border border-slate-700 bg-slate-900 px-2.5 py-1 font-['IBM_Plex_Mono'] text-xs text-amber-300"
              />
              <button
                onClick={handleCreateOnlineRoom}
                className="border-2 border-cyan-400 bg-cyan-600/30 px-3 py-1 font-['Press_Start_2P'] text-[9px] text-cyan-300 hover:bg-cyan-600/50"
              >
                + CRIAR SALA PVP ONLINE
              </button>
            </div>

            <form
              onSubmit={handleSendChat}
              className="flex flex-1 items-center gap-2 max-w-md"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Chat global da Arena Deluge..."
                className="flex-1 border border-slate-700 bg-slate-900 px-3 py-1 font-['IBM_Plex_Mono'] text-xs text-slate-100"
              />
              <button
                type="submit"
                className="border border-amber-400 bg-amber-500 px-3 py-1 font-['Press_Start_2P'] text-[9px] text-slate-950"
              >
                ENVIAR
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
