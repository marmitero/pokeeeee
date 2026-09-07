import { WORLD_LEGENDARIES } from "./world-layout";

/**
 * Rotação semanal da Arena Boss (Etapa C, 8.3).
 *
 * Duas arenas (mapas 20 e 40), cada uma com seu lendário da semana:
 *
 * - o pool são os 47 lendários/míticos do catálogo (`WORLD_LEGENDARIES`);
 * - a cada ciclo de 47 semanas o pool é embaralhado com seed determinística
 *   (mulberry32 do número do ciclo) — o embaralhamento é o mesmo para as
 *   duas arenas, mas a arena 40 lê a posição deslocada de 23: assim cada
 *   arena percorre os 47 **sem repetir**, e as duas nunca exibem o mesmo
 *   lendário na mesma semana (23 não é múltiplo de 47);
 * - o nível do boss (80–100) é pseudo-aleatório determinístico da
 *   (semana, arena) — todo jogador vê o mesmo boss, e o servidor valida
 *   pelo mesmo cálculo (não confia no cliente);
 * - semana = ISO UTC (segunda a domingo); `weekId` = `YYYY-Www`.
 *
 * Tudo aqui é puro e determinístico: rotação não precisa de tabela. O que
 * precisa de banco é o progresso do jogador (`boss_fights`): tentativas do
 * dia e vitória da semana.
 */

export const BOSS_ARENAS = [20, 40] as const;
export type BossArena = (typeof BOSS_ARENAS)[number];

export const BOSS_MIN_LEVEL = 80;
export const BOSS_MAX_LEVEL = 100;
/** Tentativas por dia por arena. */
export const BOSS_DAILY_ATTEMPTS = 2;
/** Chance de ganhar o lendário nv 5 ao vencer (1/1200). */
export const BOSS_LEGENDARY_CHANCE = 1 / 1200;
/** Dinheiro do prêmio: base + nível×100 (nv 80 → 23k, nv 100 → 25k). */
export const BOSS_MONEY_BASE = 15_000;
export const BOSS_MONEY_PER_LEVEL = 100;

export function bossMoneyForLevel(level: number): number {
  return BOSS_MONEY_BASE + level * BOSS_MONEY_PER_LEVEL;
}

/** Pool ordenado (estável entre versões enquanto o catálogo não mudar). */
export const BOSS_POOL: readonly number[] = [...WORLD_LEGENDARIES].sort((a, b) => a - b);

/** Deslocamento da arena 40 dentro do embaralhamento (coprimo com 47). */
const ARENA_OFFSET: Record<BossArena, number> = { 20: 0, 40: 23 };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffledPool(cycle: number): number[] {
  const rand = mulberry32(hashString(`catchbound-boss-cycle-${cycle}`));
  const pool = [...BOSS_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool;
}

/**
 * Índice da semana (monotônico, ancorado em segundas-feiras UTC).
 * A âncora é a segunda 1970-01-05 (primeira segunda da época Unix).
 */
export function weekIndexOf(date: Date): number {
  const mondayEpoch = Date.UTC(1970, 0, 5);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((date.getTime() - mondayEpoch) / weekMs);
}

/** `YYYY-Www` ISO UTC (segunda = começo). Usado como chave em `boss_fights`. */
export function weekIdOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Quinta da semana define o ano ISO.
  const thursday = new Date(d.getTime() + (4 - ((d.getUTCDay() + 6) % 7)) * 86_400_000);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round((thursday.getTime() - jan4.getTime()) / (7 * 86_400_000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** `YYYY-MM-DD` UTC. Usado como chave do limite diário. */
export function dayIdOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface WeeklyBoss {
  pokedexId: number;
  level: number;
  weekId: string;
  weekIndex: number;
}

/** O boss de uma arena numa data. Determinístico. */
export function bossFor(arena: BossArena, date: Date = new Date()): WeeklyBoss {
  const weekIndex = weekIndexOf(date);
  const cycle = Math.floor(weekIndex / BOSS_POOL.length);
  const pos = ((weekIndex % BOSS_POOL.length) + BOSS_POOL.length) % BOSS_POOL.length;
  const pool = shuffledPool(cycle);
  const pick = (pos + ARENA_OFFSET[arena]) % BOSS_POOL.length;
  const level =
    BOSS_MIN_LEVEL +
    (hashString(`catchbound-boss-lv-${arena}-${weekIndex}`) %
      (BOSS_MAX_LEVEL - BOSS_MIN_LEVEL + 1));
  return { pokedexId: pool[pick]!, level, weekId: weekIdOf(date), weekIndex };
}

export function isBossArena(mapId: number): mapId is BossArena {
  return mapId === 20 || mapId === 40;
}
