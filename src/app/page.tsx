"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { TILE_DEFINITIONS, TileId } from "@/lib/tiles";
import {
  DELUGE_VARIANTS,
  DelugeVariant,
  getPokemonSpecies,
  rollRandomDelugeVariant,
} from "@/lib/pokedex";
import { retroSfx } from "@/lib/sound";
import { AuthModal } from "@/components/AuthModal";
import { WorldMapEditor, GameMapData } from "@/components/WorldMapEditor";
import { BattleArenaModal, PlayerPokemonState, WildEncounterState } from "@/components/BattleArenaModal";
import { SpritePackModal } from "@/components/SpritePackModal";
import { PokemonBox, BoxPokemon } from "@/components/PokemonBox";
import { ShopModal } from "@/components/ShopModal";
import { GymModal } from "@/components/GymModal";
import {
  Map, Volume2, VolumeX, Swords, Sparkles, User,
  Heart, Compass, LogOut, Package, ShoppingBag, Shield,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserState {
  id: number;
  username: string;
  avatarSprite: string;
  /** "player" | "moderator" | "admin" — vem da sessão; nunca é aceito do cliente */
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
  wins: number;
  losses: number;
  currentMapId: number;
  playerX: number;
  playerY: number;
}

interface NpcDef {
  id: string;
  x: number;
  y: number;
  type: "shop" | "gym" | "healer" | "info";
  name: string;
  shopId?: number;
  gymId?: number;
  dialog: string;
}

interface UserBadge {
  id: number;
  gymLeaderId: number;
  badgeName: string;
  badgeEmoji: string;
}

/** A cada quantos passos a posição é persistida (B12). */
const SAVE_EVERY_STEPS = 10;

const GUEST_USER: UserState = {
  id: 0, username: "Treinador", avatarSprite: "red",
  money: 3000, pokeballs: 10, greatballs: 5, ultraballs: 2, masterballs: 0,
  potions: 3, superPotions: 1, maxPotions: 0, revives: 1,
  wins: 0, losses: 0, currentMapId: 1, playerX: 8, playerY: 12,
  role: "player",
};

/**
 * Restaura a sessão a partir do cookie `httpOnly` enviado pelo navegador.
 *
 * Fase 1: não existe mais token no `localStorage` — o cookie é inacessível a
 * JavaScript, então a única forma de saber quem está logado é perguntar ao
 * servidor (`GET /api/auth`).
 *
 * Vive fora do componente para que nenhum `setState` seja chamado
 * sincronamente dentro do corpo de um `useEffect` (react-hooks/set-state-in-effect).
 */
async function fetchCurrentSession(
  onSession: (user: UserState, party: BoxPokemon[]) => void,
  onAuthRequired: () => void
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const res = await fetch("/api/auth", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
    });

    if (!res.ok) {
      onAuthRequired();
      return;
    }

    const data = await res.json();
    if (data.user) {
      onSession(data.user, data.party || []);
    } else {
      onAuthRequired();
    }
  } catch {
    onAuthRequired();
  }
}

export default function DelugeRPGPage() {
  // ── Map state ──────────────────────────────────────────────────────────
  const [maps, setMaps] = useState<GameMapData[]>([]);
  const [currentMapId, setCurrentMapId] = useState(1);
  const [playerX, setPlayerX] = useState(8);
  const [playerY, setPlayerY] = useState(12);
  const [playerDir, setPlayerDir] = useState<"up" | "down" | "left" | "right">("down");
  const [portalFade, setPortalFade] = useState(false);
  const [banner, setBanner] = useState<string>("Bem-vindo ao DelugeRPG! Use WASD para explorar.");
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth state ─────────────────────────────────────────────────────────
  const [user, setUser] = useState<UserState>(GUEST_USER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [allPokemon, setAllPokemon] = useState<BoxPokemon[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const sessionInitialized = useRef(false);
  const stepCount = useRef(0);

  // ── Modal state ────────────────────────────────────────────────────────
  const [showAuth, setShowAuth] = useState(false);
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [showSprites, setShowSprites] = useState(false);
  const [showBox, setShowBox] = useState(false);
  const [shopCtx, setShopCtx] = useState<{ shopId: number; shopName: string; dialog: string } | null>(null);
  const [gymCtx, setGymCtx] = useState<{ gymLeaderId: number } | null>(null);
  const [battleState, setBattleState] = useState<{
    active: boolean; mode: "WILD" | "PVP"; wildTarget?: WildEncounterState;
  }>({ active: false, mode: "WILD" });
  const [audioEnabled, setAudioEnabled] = useState(true);

  const anyModalOpen = showAuth || showMapEditor || showSprites || showBox || !!shopCtx || !!gymCtx || battleState.active;

  // O Editor de Mundos mexe no mundo compartilhado: só para administradores.
  // Escondemos a entrada na UI para o jogador não montar um mapa e levar 403.
  const isAdmin = user.role === "admin";
  const isStaff = user.role === "admin" || user.role === "moderator";

  // ── Current map ────────────────────────────────────────────────────────
  const currentMap = maps.find((m) => m.id === currentMapId) || maps[0] || null;

  const party: PlayerPokemonState[] = allPokemon
    .filter((p) => p.partySlot !== null)
    .sort((a, b) => (a.partySlot ?? 99) - (b.partySlot ?? 99))
    .map((p) => ({
      id: p.id, pokedexId: p.pokedexId, name: p.nickname || p.name,
      variant: p.variant as DelugeVariant,
      level: p.level, hp: p.hp, maxHp: p.maxHp,
      attack: p.attack, defense: p.defense,
      // B3 (Fase 3): antes eram os literais 15 e 13 — todo Pokémon lutava com
      // Sp.Atk 15 e Sp.Def 13, do Bulbasaur nível 5 ao Rayquaza nível 50.
      spAttack: p.spAttack, spDefense: p.spDefense, speed: p.speed,
      move1: p.move1, move2: p.move2, move3: p.move3, move4: p.move4,
    }));

  // ── Utilities ──────────────────────────────────────────────────────────
  const showBanner = useCallback((msg: string, ms = 4000) => {
    setBanner(msg);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(""), ms);
  }, []);

  // ── Load maps ──────────────────────────────────────────────────────────
  const fetchMaps = useCallback(async () => {
    try {
      const res = await fetch("/api/maps");
      const d = await res.json();
      if (d.maps?.length) setMaps(d.maps);
    } catch { /* ignore */ }
  }, []);

  // ── Load badges ────────────────────────────────────────────────────────
  const fetchBadges = useCallback(async () => {
    try {
      // Sem `userId` na query: o servidor deriva o treinador da sessão.
      const res = await fetch("/api/gym", { credentials: "same-origin" });
      const d = await res.json();
      setUserBadges(d.badges || []);
    } catch { /* ignore */ }
  }, []);

  // ── Apply a restored/created session ───────────────────────────────────
  const applyLogin = useCallback(
    (u: UserState, pokeList: BoxPokemon[]) => {
      setUser(u);
      setAllPokemon(pokeList);
      setIsLoggedIn(true);
      setCurrentMapId(u.currentMapId || 1);
      setPlayerX(u.playerX || 8);
      setPlayerY(u.playerY || 12);
      fetchBadges();
      showBanner(`★ Bem-vindo de volta, ${u.username}!`);
    },
    [fetchBadges, showBanner]
  );

  const requestAuth = useCallback(() => setShowAuth(true), []);

  // ── Session resume on mount ────────────────────────────────────────────
  useEffect(() => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;
    fetchMaps();
    void fetchCurrentSession(applyLogin, requestAuth);
  }, [fetchMaps, applyLogin, requestAuth]);

  const handleLogout = useCallback(async () => {
    // Logout de verdade: revoga a sessão no banco e limpa o cookie.
    // Antes só apagava o localStorage e o token continuava válido.
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "logout" }),
      });
    } catch { /* o estado local é limpo de qualquer forma */ }

    setIsLoggedIn(false);
    setUser(GUEST_USER);
    setAllPokemon([]);
    setUserBadges([]);
    setShowAuth(true);
    showBanner("Sessão encerrada. Até logo, Treinador!");
  }, [showBanner]);

  // ── Heal party ────────────────────────────────────────────────────────
  const handleHealParty = useCallback(async () => {
    retroSfx.playAttack("heal");
    setAllPokemon((prev) => prev.map((p) => ({ ...p, hp: p.maxHp })));
    showBanner("✚ Toda a equipe foi curada no Centro Pokémon!");
    if (!isLoggedIn) return;
    try {
      const res = await fetch("/api/pokemon/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMapId, playerX, playerY }),
      });
      const d = await res.json();
      if (d.party) setAllPokemon(d.party);
    } catch { /* ignore */ }
  }, [isLoggedIn, currentMapId, playerX, playerY, showBanner]);

  // ── NPC Interaction ───────────────────────────────────────────────────
  const handleNpcInteraction = useCallback((npc: NpcDef) => {
    retroSfx.playPortalWarp();
    if (npc.type === "healer") {
      handleHealParty();
      return;
    }
    if (npc.type === "shop" && npc.shopId) {
      setShopCtx({ shopId: npc.shopId, shopName: npc.name, dialog: npc.dialog });
      return;
    }
    if (npc.type === "gym" && npc.gymId) {
      if (!isLoggedIn) { showBanner("⚠️ Faça login para desafiar o Ginásio!"); return; }
      setGymCtx({ gymLeaderId: npc.gymId });
      return;
    }
    showBanner(`💬 ${npc.name}: "${npc.dialog}"`);
  }, [handleHealParty, isLoggedIn, showBanner]);

  // ── Movement ──────────────────────────────────────────────────────────
  const movePlayer = useCallback((dx: number, dy: number, dir: "up" | "down" | "left" | "right") => {
    if (anyModalOpen || !currentMap) return;
    setPlayerDir(dir);

    const nextX = playerX + dx;
    const nextY = playerY + dy;
    // B12 (Fase 3): antes o limite era o literal 16, ignorando as colunas
    // width/height que existem no banco e no tipo GameMapData.
    const mapW = currentMap.width || 16;
    const mapH = currentMap.height || 16;
    if (nextX < 0 || nextX >= mapW || nextY < 0 || nextY >= mapH) return;

    const tileId = (currentMap.tileGrid[nextY]?.[nextX] || "grass") as TileId;
    const tileDef = TILE_DEFINITIONS[tileId] || TILE_DEFINITIONS.grass;
    if (!tileDef.walkable) return;

    retroSfx.playStep();
    setPlayerX(nextX);
    setPlayerY(nextY);

    // B12 (Fase 3): antes era `Math.random() < 0.15` — 85% dos passos não eram
    // gravados e o jogador reabria o jogo em outro lugar ao acaso. Agora salva
    // a cada SAVE_EVERY_STEPS passos, de forma determinística.
    stepCount.current += 1;
    if (isLoggedIn && stepCount.current % SAVE_EVERY_STEPS === 0) {
      fetch("/api/pokemon/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ currentMapId, playerX: nextX, playerY: nextY }),
      }).catch(() => {});
    }

    // Portal warp
    const portal = currentMap.portals?.find((p) => p.sourceX === nextX && p.sourceY === nextY);
    if (portal) {
      retroSfx.playPortalWarp();
      setPortalFade(true);
      setTimeout(() => {
        setCurrentMapId(portal.targetMapId);
        setPlayerX(portal.targetX);
        setPlayerY(portal.targetY);
        showBanner(`🌀 Você foi para: ${portal.targetMapName || `Mapa #${portal.targetMapId}`}`);
        setTimeout(() => setPortalFade(false), 180);
      }, 200);
      return;
    }

    // Pokémon Center
    if (tileId === "center") {
      handleHealParty();
      return;
    }

    // NPC adjacent interaction
    const npcs = (currentMap.npcs || []) as NpcDef[];
    const adjacentNpc = npcs.find((n) => n.x === nextX && n.y === nextY);
    if (adjacentNpc) {
      handleNpcInteraction(adjacentNpc);
      return;
    }

    // Wild encounter
    if ((tileId === "tall_grass" || tileId === "water") && Math.random() < 0.22) {
      const pool = currentMap.encounterTable?.length ? currentMap.encounterTable : [
        { pokedexId: 4, name: "Charmander", weight: 20, minLevel: 5, maxLevel: 12, tileTypes: ["tall_grass"] },
      ];
      const totalW = pool.reduce((a, e) => a + (e.weight || 10), 0);
      let roll = Math.random() * totalW;
      let chosen = pool[0];
      for (const entry of pool) {
        if (roll <= entry.weight) { chosen = entry; break; }
        roll -= entry.weight;
      }
      const species = getPokemonSpecies(chosen.pokedexId);
      const variant: DelugeVariant = rollRandomDelugeVariant();
      const level = Math.floor(Math.random() * (chosen.maxLevel - chosen.minLevel + 1)) + chosen.minLevel;
      const hp = Math.floor(species.baseHp * 1.25 + level * 3.2);

      retroSfx.playEncounterFlash();
      setBattleState({ active: true, mode: "WILD", wildTarget: { species, variant, level, hp, maxHp: hp } });
    }
  }, [anyModalOpen, currentMap, playerX, playerY, isLoggedIn, currentMapId, handleHealParty, handleNpcInteraction, showBanner]);

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (anyModalOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); movePlayer(0, -1, "up"); }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); movePlayer(0, 1, "down"); }
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { e.preventDefault(); movePlayer(-1, 0, "left"); }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { e.preventDefault(); movePlayer(1, 0, "right"); }
      else if (e.key === "e" || e.key === "E") { setShowBox(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [movePlayer, anyModalOpen]);

  // ── Render helpers ────────────────────────────────────────────────────
  const avatarEmoji = playerDir === "up" ? "🧗" : playerDir === "left" || playerDir === "right" ? "🏃" : "🧑‍🚀";

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 select-none overflow-x-hidden">
      {/* CRT overlay */}
      <div className="scanline-overlay fixed inset-0 z-40 pointer-events-none" />
      {/* Portal fade */}
      <div className={`fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200 ${portalFade ? "opacity-90" : "opacity-0"}`} />

      {/* ── TOP HUD ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b-4 border-amber-400 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-amber-400 bg-red-600 font-['Press_Start_2P'] text-[9px] text-white shadow-[2px_2px_0px_#000]">
              PKM
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-['Press_Start_2P'] text-[10px] text-amber-400">DELUGE RPG</span>
                <span className="border border-cyan-500 bg-cyan-950/70 px-1 py-0.5 font-['Press_Start_2P'] text-[7px] text-cyan-300">
                  MAPA {currentMapId}/{maps.length}
                </span>
                {isLoggedIn && userBadges.length > 0 && (
                  <div className="flex gap-0.5">
                    {userBadges.map((b) => (
                      <span key={b.id} title={b.badgeName} className="text-base">{b.badgeEmoji}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 font-['IBM_Plex_Mono'] text-[10px] text-slate-300">
                <span className="font-semibold text-amber-300">👤 {user.username}</span>
                {isStaff && (
                  <span className="border border-cyan-400 bg-cyan-950/70 px-1 py-0.5 font-['Press_Start_2P'] text-[7px] text-cyan-300">
                    {user.role === "admin" ? "ADMIN" : "MOD"}
                  </span>
                )}
                <span>💰 {user.money} Pk$</span>
                <span>🔴 {user.pokeballs}</span>
                <span>🔵 {user.greatballs}</span>
                <span>🟡 {user.ultraballs}</span>
                {user.masterballs > 0 && <span>🟣 {user.masterballs}</span>}
                <span>🧪 {user.potions}</span>
              </div>
            </div>
          </div>

          {/* Party quick view */}
          <div className="hidden items-center gap-1.5 xl:flex">
            {party.slice(0, 6).map((poke) => {
              const variantCfg = DELUGE_VARIANTS.find((v) => v.id === poke.variant) || DELUGE_VARIANTS[0];
              const species = getPokemonSpecies(poke.pokedexId);
              return (
                <div key={poke.id} onClick={() => setShowBox(true)}
                  title={`${poke.name} LV.${poke.level} • HP ${poke.hp}/${poke.maxHp}`}
                  className="flex cursor-pointer items-center gap-1.5 border-2 border-slate-700 bg-slate-900/90 px-2 py-1 hover:border-amber-400">
                  <img src={species.frontSprite} alt={poke.name}
                    style={{ filter: variantCfg.filterCss }}
                    className="h-7 w-7 object-contain" />
                  <div>
                    <div className="font-['Press_Start_2P'] text-[7px] text-amber-300">{poke.name}</div>
                    <div className="h-1.5 w-12 border border-black bg-slate-800">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.round((poke.hp / poke.maxHp) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => { retroSfx.enabled = !audioEnabled; setAudioEnabled(!audioEnabled); }}
              className="border-2 border-slate-700 bg-slate-800 p-1.5 text-amber-400 hover:border-amber-400">
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </button>
            <button onClick={() => { retroSfx.playStep(); setShowBox(true); }}
              className="flex items-center gap-1 border-2 border-slate-600 bg-slate-800 px-2.5 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-200 hover:border-amber-400">
              <Package className="h-3.5 w-3.5" /> POKÉMON [E]
            </button>
            <button onClick={() => { retroSfx.playStep(); setShowSprites(true); }}
              className="flex items-center gap-1 border-2 border-amber-400 bg-slate-900 px-2.5 py-1.5 font-['Press_Start_2P'] text-[9px] text-amber-300 shadow-[2px_2px_0px_#000] hover:bg-slate-800">
              <Sparkles className="h-3.5 w-3.5" /> SPRITES
            </button>
            {isAdmin && (
              <button onClick={() => { retroSfx.playStep(); setShowMapEditor(true); }}
                className="flex items-center gap-1 border-2 border-cyan-400 bg-cyan-950 px-2.5 py-1.5 font-['Press_Start_2P'] text-[9px] text-cyan-300 shadow-[2px_2px_0px_#000] hover:bg-cyan-900">
                <Map className="h-3.5 w-3.5" /> EDITOR
              </button>
            )}
            <button onClick={() => { retroSfx.playStep(); setBattleState({ active: true, mode: "PVP" }); }}
              className="flex items-center gap-1 border-2 border-rose-500 bg-gradient-to-r from-rose-600 to-amber-600 px-2.5 py-1.5 font-['Press_Start_2P'] text-[9px] text-white shadow-[2px_2px_0px_#000] hover:brightness-110">
              <Swords className="h-3.5 w-3.5" /> PVP
            </button>
            {isLoggedIn ? (
              <button onClick={handleLogout}
                className="flex items-center gap-1 border-2 border-slate-600 bg-slate-800 px-2.5 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-300 hover:border-rose-500 hover:text-rose-300">
                <LogOut className="h-3.5 w-3.5" /> SAIR
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="flex items-center gap-1 border-2 border-slate-600 bg-slate-800 px-2.5 py-1.5 font-['Press_Start_2P'] text-[9px] text-slate-200 hover:border-amber-400">
                <User className="h-3.5 w-3.5" /> LOGIN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      {banner && (
        <div className="border-b-2 border-slate-800 bg-amber-500/12 px-4 py-1.5 text-center font-['VT323'] text-lg text-amber-300">
          ▸ {banner}
        </div>
      )}

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-5 p-4 lg:grid-cols-12">

        {/* Left sidebar */}
        <div className="flex flex-col gap-4 lg:col-span-4">

          {/* Map navigation */}
          <div className="border-4 border-amber-400 bg-slate-900 p-4 shadow-[4px_4px_0px_#000]">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3">
              <h2 className="font-['Press_Start_2P'] text-[9px] text-amber-400">MAPAS INTERLIGADOS</h2>
              {isAdmin && (
                <button onClick={() => setShowMapEditor(true)} className="font-['Press_Start_2P'] text-[8px] text-cyan-300 hover:underline">+ CRIAR</button>
              )}
            </div>
            <div className="space-y-2">
              {maps.map((m) => {
                const isCurrent = m.id === currentMapId;
                // B12 (Fase 3): esta lista era um teleporte livre — clicava-se em
                // qualquer mapa e ignorava-se portais e progressão. Agora só é
                // possível viajar para um mapa ligado por portal ao mapa atual.
                const reachable =
                  !isCurrent &&
                  !!currentMap?.portals?.some((p) => p.targetMapId === m.id);
                return (
                  <div key={m.id}
                    onClick={() => {
                      if (!reachable) {
                        retroSfx.playStep();
                        showBanner(`🔒 ${m.name} só é acessível por um portal 🌀 no mapa atual.`);
                        return;
                      }
                      retroSfx.playPortalWarp();
                      setCurrentMapId(m.id); setPlayerX(8); setPlayerY(12);
                      showBanner(`🌀 Viajou para ${m.name}`);
                    }}
                    title={
                      isCurrent
                        ? "Você está aqui"
                        : reachable
                          ? `Viajar para ${m.name}`
                          : "Acesse este mapa por um portal 🌀"
                    }
                    className={`border-2 p-2.5 transition ${
                      isCurrent
                        ? "border-amber-400 bg-amber-500/15"
                        : reachable
                          ? "cursor-pointer border-slate-800 bg-slate-950 hover:border-cyan-500"
                          : "border-slate-800/60 bg-slate-950/60 opacity-60"
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-['Press_Start_2P'] text-[9px] text-amber-300">#{m.id} {m.name}</span>
                      {isCurrent ? (
                        <span className="bg-amber-500 px-1.5 py-0.5 font-['Press_Start_2P'] text-[7px] text-slate-950">AQUI</span>
                      ) : reachable ? (
                        <span className="border border-cyan-500/60 px-1.5 py-0.5 font-['Press_Start_2P'] text-[7px] text-cyan-300">IR →</span>
                      ) : (
                        <span className="px-1.5 py-0.5 font-['Press_Start_2P'] text-[7px] text-slate-600">🔒</span>
                      )}
                    </div>
                    <p className="mt-1 font-['IBM_Plex_Mono'] text-[10px] text-slate-500 truncate">{m.description}</p>
                    {m.portals?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.portals.map((p, i) => (
                          <span key={i} className="border border-cyan-500/40 bg-cyan-950/60 px-1.5 py-0.5 font-['IBM_Plex_Mono'] text-[9px] text-cyan-400">
                            🌀→ Mapa #{p.targetMapId}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Party panel */}
          <div className="border-4 border-slate-700 bg-slate-900 p-4">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-3">
              <h3 className="font-['Press_Start_2P'] text-[9px] text-amber-400">TIME ({party.length}/6)</h3>
              <div className="flex gap-2">
                <button onClick={handleHealParty}
                  className="flex items-center gap-1 border border-rose-500 bg-rose-600/30 px-2 py-0.5 font-['Press_Start_2P'] text-[8px] text-rose-300 hover:bg-rose-600">
                  <Heart className="h-3 w-3" /> CURAR
                </button>
                <button onClick={() => setShowBox(true)}
                  className="flex items-center gap-1 border border-slate-600 bg-slate-800 px-2 py-0.5 font-['Press_Start_2P'] text-[8px] text-slate-300 hover:border-amber-400">
                  <Package className="h-3 w-3" /> BOX
                </button>
              </div>
            </div>
            {party.length === 0 ? (
              <p className="font-['VT323'] text-xl text-slate-500 text-center py-4">Sem Pokémon no time!</p>
            ) : (
              <div className="space-y-2">
                {party.map((poke) => {
                  const variantCfg = DELUGE_VARIANTS.find((v) => v.id === poke.variant) || DELUGE_VARIANTS[0];
                  const species = getPokemonSpecies(poke.pokedexId);
                  return (
                    <div key={poke.id} className="flex items-center justify-between border-2 border-slate-800 bg-slate-950 p-2">
                      <div className="flex items-center gap-2">
                        <img src={species.frontSprite} alt={poke.name}
                          style={{ filter: variantCfg.filterCss }}
                          className="h-9 w-9 object-contain" />
                        <div>
                          <div className="font-['Press_Start_2P'] text-[9px] text-amber-300">
                            {poke.name}
                            {poke.variant !== "Normal" && (
                              <span className={`ml-1 border px-1 py-0.5 text-[7px] ${variantCfg.badgeBg} ${variantCfg.badgeBorder} ${variantCfg.badgeText}`}>{poke.variant.slice(0,4)}</span>
                            )}
                          </div>
                          <div className="font-['IBM_Plex_Mono'] text-[9px] text-slate-500">LV.{poke.level}</div>
                          <div className="mt-0.5 h-1.5 w-20 border border-black bg-slate-800">
                            <div className={`h-full ${poke.hp / poke.maxHp > 0.5 ? "bg-emerald-500" : poke.hp / poke.maxHp > 0.2 ? "bg-amber-400" : "bg-rose-600"}`}
                              style={{ width: `${Math.round((poke.hp / poke.maxHp) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                      <span className="font-['IBM_Plex_Mono'] text-[10px] text-slate-400">{poke.hp}/{poke.maxHp}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Badges */}
          {userBadges.length > 0 && (
            <div className="border-4 border-slate-700 bg-slate-900 p-4">
              <h3 className="mb-2 border-b-2 border-slate-800 pb-2 font-['Press_Start_2P'] text-[9px] text-amber-400">
                🏅 INSÍGNIAS ({userBadges.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {userBadges.map((b) => (
                  <div key={b.id} className="flex items-center gap-1.5 border border-amber-400/40 bg-amber-500/10 px-2 py-1">
                    <span className="text-xl">{b.badgeEmoji}</span>
                    <span className="font-['Press_Start_2P'] text-[8px] text-amber-300">{b.badgeName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: World Map */}
        <div className="flex flex-col items-center lg:col-span-8">
          {/* Map name bar */}
          <div className="mb-2 flex w-full max-w-[520px] items-center justify-between border-2 border-slate-800 bg-slate-900 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-amber-400" />
              <span className="font-['Press_Start_2P'] text-[9px] text-amber-400">{currentMap?.name || "Carregando..."}</span>
            </div>
            <span className="font-['IBM_Plex_Mono'] text-[10px] text-slate-400">X:{playerX} Y:{playerY}</span>
          </div>

          {/* 16×16 Grid */}
          <div
            className="relative grid border-4 border-amber-400 bg-black shadow-[0_0_0_4px_#000,0_15px_40px_rgba(0,0,0,0.95)]"
            style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))", width: "min(520px, 93vw)", height: "min(520px, 93vw)" }}>
            {currentMap?.tileGrid.map((row, y) =>
              row.map((tileId, x) => {
                const def = TILE_DEFINITIONS[tileId as TileId] || TILE_DEFINITIONS.grass;
                const isPlayer = x === playerX && y === playerY;
                const hasPortal = currentMap.portals?.some((p) => p.sourceX === x && p.sourceY === y);
                const npcs = (currentMap.npcs || []) as NpcDef[];
                const npc = npcs.find((n) => n.x === x && n.y === y);
                const isAdjacent = Math.abs(x - playerX) + Math.abs(y - playerY) === 1;

                return (
                  <div key={`${y}-${x}`}
                    onClick={() => {
                      if (isAdjacent) {
                        const ddx = x - playerX, ddy = y - playerY;
                        movePlayer(ddx, ddy, ddx > 0 ? "right" : ddx < 0 ? "left" : ddy > 0 ? "down" : "up");
                      }
                      if (npc) handleNpcInteraction(npc);
                    }}
                    className={`relative flex items-center justify-center border border-black/20 ${def.colorBg} ${isAdjacent || npc ? "cursor-pointer hover:brightness-125" : ""}`}
                    title={`(${x},${y}): ${def.name}${npc ? ` • NPC: ${npc.name}` : ""}${hasPortal ? " • PORTAL" : ""}`}>

                    {/* Player */}
                    {isPlayer && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-400/30 ring-2 ring-amber-400">
                        <span className="text-sm drop-shadow-[1px_1px_0px_#000]">{avatarEmoji}</span>
                      </div>
                    )}

                    {/* NPC icons */}
                    {!isPlayer && npc && (
                      <span className="z-5 text-sm" title={npc.name}>
                        {npc.type === "shop" ? "🏪" : npc.type === "gym" ? "🏟️" : npc.type === "healer" ? "✚" : "💬"}
                      </span>
                    )}

                    {/* Portal shimmer */}
                    {!isPlayer && !npc && hasPortal && (
                      <span className="animate-pulse text-xs">🌀</span>
                    )}

                    {/* Tile symbol */}
                    {!isPlayer && !npc && !hasPortal && (
                      <span className="select-none text-[11px] text-white/80">{def.symbol}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* D-Pad & Legend */}
          <div className="mt-3 flex w-full max-w-[520px] flex-wrap items-center justify-between gap-3 border-4 border-slate-800 bg-slate-900 p-3">
            {/* D-Pad */}
            <div className="flex flex-col items-center">
              <button onClick={() => movePlayer(0, -1, "up")}
                className="h-10 w-12 border-2 border-amber-400 bg-slate-800 font-['Press_Start_2P'] text-xs text-amber-300 shadow-[2px_2px_0px_#000] active:translate-y-0.5">▲</button>
              <div className="my-1 flex gap-2">
                <button onClick={() => movePlayer(-1, 0, "left")}
                  className="h-10 w-12 border-2 border-amber-400 bg-slate-800 font-['Press_Start_2P'] text-xs text-amber-300 shadow-[2px_2px_0px_#000] active:translate-y-0.5">◀</button>
                <button onClick={() => movePlayer(0, 1, "down")}
                  className="h-10 w-12 border-2 border-amber-400 bg-slate-800 font-['Press_Start_2P'] text-xs text-amber-300 shadow-[2px_2px_0px_#000] active:translate-y-0.5">▼</button>
                <button onClick={() => movePlayer(1, 0, "right")}
                  className="h-10 w-12 border-2 border-amber-400 bg-slate-800 font-['Press_Start_2P'] text-xs text-amber-300 shadow-[2px_2px_0px_#000] active:translate-y-0.5">▶</button>
              </div>
            </div>
            {/* Quick NPCs legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-['IBM_Plex_Mono'] text-[10px] text-slate-300">
              <div>🌿 Grama Alta → Batalha Selvagem</div>
              <div>🌀 Portal → Outro Mapa</div>
              <div>✚ Centro → Cura Equipe</div>
              <div>🏪 NPC → Loja de Itens</div>
              <div>🏟️ NPC → Líder de Ginásio</div>
              <div>[E] → Abrir PC Box</div>
            </div>
          </div>
        </div>
      </main>

      {/* ── MODALS ──────────────────────────────────────────────────────── */}

      {/* AUTH */}
      {showAuth && (
        <AuthModal
          onSuccess={(loggedUser, loggedParty) => {
            applyLogin(loggedUser as UserState, loggedParty as BoxPokemon[]);
            setShowAuth(false);
          }}
        />
      )}

      {/* POKEMON BOX */}
      {showBox && (
        <PokemonBox
          allPokemon={allPokemon}
          userItems={{ potions: user.potions, superPotions: user.superPotions, maxPotions: user.maxPotions, revives: user.revives }}
          onUpdated={(updated, updatedUser) => {
            setAllPokemon(updated as BoxPokemon[]);
            if (updatedUser) setUser((prev) => ({ ...prev, ...(updatedUser as UserState) }));
          }}
          onClose={() => setShowBox(false)}
        />
      )}

      {/* SHOP */}
      {shopCtx && (
        <ShopModal
          shopId={shopCtx.shopId}
          shopName={shopCtx.shopName}
          npcDialog={shopCtx.dialog}
          userMoney={user.money}
          onPurchase={(updatedUser) => setUser((prev) => ({ ...prev, ...(updatedUser as UserState) }))}
          onClose={() => setShopCtx(null)}
        />
      )}

      {/* GYM */}
      {gymCtx && (
        <GymModal
          gymLeaderId={gymCtx.gymLeaderId}
          playerParty={party}
          userBadges={userBadges}
          onBattleResult={(updatedUser, badges) => {
            if (updatedUser) setUser((prev) => ({ ...prev, ...(updatedUser as UserState) }));
            setUserBadges(badges);
          }}
          onClose={() => setGymCtx(null)}
        />
      )}

      {/* MAP EDITOR — apenas admin */}
      {showMapEditor && isAdmin && (
        <WorldMapEditor
          maps={maps}
          currentMapId={currentMapId}
          onMapSaved={(updated, sel) => { setMaps(updated); if (sel) setCurrentMapId(sel); }}
          onClose={() => setShowMapEditor(false)}
        />
      )}

      {/* SPRITES */}
      {showSprites && <SpritePackModal onClose={() => setShowSprites(false)} />}

      {/* BATTLE */}
      {battleState.active && (
        <BattleArenaModal
          mode={battleState.mode}
          wildTarget={battleState.wildTarget}
          playerParty={party}
          username={user.username}
          pokeballs={user.pokeballs}
          greatballs={user.greatballs}
          ultraballs={user.ultraballs}
          masterballs={user.masterballs}
          onCaughtPokemon={(_, updatedUser, updatedParty) => {
            if (updatedUser) setUser((prev) => ({ ...prev, ...(updatedUser as UserState) }));
            if (Array.isArray(updatedParty)) setAllPokemon(updatedParty as BoxPokemon[]);
          }}
          onBattleEnd={() => setBattleState({ active: false, mode: "WILD" })}
        />
      )}
    </div>
  );
}
