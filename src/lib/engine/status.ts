/**
 * Status de batalha (Fase 8.4) — módulo puro, sem banco e sem Pokédex.
 *
 * Regras calcadas nos jogos de GBA (Gen III: Ruby/Sapphire/Emerald/FireRed/
 * LeafGreen), com duas concessões modernas registradas em `docs/FASE-8-STATUS.md`:
 * sono de 1–3 turnos (Gen V+, em vez de 2–5) porque as batalhas aqui duram
 * 2–7 turnos, e tipo Elétrico imune a paralisia (Gen VI+) por ser intuitivo.
 *
 * | Status | Efeito por turno                          | Impedimento de agir     | Imunes          |
 * |--------|-------------------------------------------|-------------------------|-----------------|
 * | PSN    | −1/8 do HP máximo ao fim do turno         | —                       | Poison, Steel   |
 * | TOX    | −1/16, −2/16, −3/16… (teto 15/16)         | —                       | Poison, Steel   |
 * | BRN    | −1/8 do HP máximo · dano físico ×0,5      | —                       | Fire            |
 * | PAR    | velocidade ×0,25                          | 25% de não se mover     | Electric        |
 * | SLP    | —                                         | 1–3 turnos sem agir     | —               |
 * | FRZ    | —                                         | até descongelar (20%/t) | Ice             |
 *
 * Um Pokémon carrega **um** status por vez; o status **persiste depois da
 * batalha** até um Centro Pokémon ou item; desmaiar limpa o status; golpe de
 * Fogo com dano descongela; o contador de TOX zera ao trocar/sair de batalha.
 *
 * Todo sorteio recebe `rng` injetável (mesmo padrão de `damage.ts`).
 */

export const STATUS_VALUES = ["NONE", "PSN", "TOX", "BRN", "PAR", "SLP", "FRZ"] as const;
export type StatusCondition = (typeof STATUS_VALUES)[number];
export type ActiveStatus = Exclude<StatusCondition, "NONE">;

/** O mínimo que as regras precisam de um combatente. `SideState` satisfaz. */
export interface StatusBearer {
  displayName: string;
  types: string[];
  hp: number;
  maxHp: number;
  speed: number;
  status: StatusCondition;
  /** SLP: turnos restantes · TOX: turnos já sofridos (multiplicador) · demais: 0. */
  statusTurns: number;
}

export type Rng = () => number;
const defaultRng: Rng = () => Math.random();

// ─── Constantes (Gen III salvo nota) ───────────────────────────────────────

/** Fração do HP máximo perdida por turno com veneno ou queimadura. */
export const RESIDUAL_FRACTION = 1 / 8;
/** Passo do veneno grave: 1/16, 2/16, 3/16… */
export const TOXIC_STEP = 1 / 16;
/** Teto do multiplicador do veneno grave (15/16 do HP máximo por turno). */
export const TOXIC_MAX_STEPS = 15;
/** Paralisia: velocidade ×0,25 (Gen I–VI; Gen VII+ usa ×0,5). */
export const PARALYSIS_SPEED_MULT = 0.25;
/** Paralisia: chance de não conseguir se mover no turno. */
export const FULL_PARALYSIS_CHANCE = 0.25;
/** Congelamento: chance de descongelar no início de cada turno (Gen III+). */
export const THAW_CHANCE = 0.2;
/** Queimadura: dano de golpes físicos pela metade. */
export const BURN_PHYSICAL_MULT = 0.5;
/** Sono: 1–3 turnos (Gen V+; Gen III era 2–5 — longo demais para batalhas de 2–7 turnos). */
export const SLEEP_MIN_TURNS = 1;
export const SLEEP_MAX_TURNS = 3;

/** Tipos imunes a cada status. Elétrico↔PAR é regra da Gen VI (adotada por clareza). */
export const STATUS_IMMUNITY: Record<ActiveStatus, readonly string[]> = {
  PSN: ["Poison", "Steel"],
  TOX: ["Poison", "Steel"],
  BRN: ["Fire"],
  PAR: ["Electric"],
  SLP: [],
  FRZ: ["Ice"],
};

/** Nome por extenso, no gênero neutro possível (\"está …\"). */
export const STATUS_NAME: Record<ActiveStatus, string> = {
  PSN: "envenenado",
  TOX: "gravemente envenenado",
  BRN: "queimado",
  PAR: "paralisado",
  SLP: "dormindo",
  FRZ: "congelado",
};

/** Substantivo do problema, para mensagens de cura ("se curou de paralisia"). */
export const STATUS_NOUN: Record<ActiveStatus, string> = {
  PSN: "envenenamento",
  TOX: "envenenamento grave",
  BRN: "queimadura",
  PAR: "paralisia",
  SLP: "sono",
  FRZ: "congelamento",
};

/** Etiqueta curta de 3 letras, no estilo da caixa de HP do GBA. */
export const STATUS_TAG: Record<ActiveStatus, string> = {
  PSN: "ENV",
  TOX: "TÓX",
  BRN: "QUE",
  PAR: "PAR",
  SLP: "SON",
  FRZ: "GEL",
};

export function isActiveStatus(value: unknown): value is ActiveStatus {
  return typeof value === "string" && value !== "NONE" && (STATUS_VALUES as readonly string[]).includes(value);
}

/** Aceita o que vier do banco/JSON legado e devolve um status válido. */
export function normalizeStatus(value: unknown): StatusCondition {
  return typeof value === "string" && (STATUS_VALUES as readonly string[]).includes(value)
    ? (value as StatusCondition)
    : "NONE";
}

// ─── Aplicação ─────────────────────────────────────────────────────────────

export type StatusBlock = "fainted" | "already" | "immune";

/** Por que o status não pegaria — ou `null` se pode ser aplicado. */
export function statusBlockReason(target: StatusBearer, status: ActiveStatus): StatusBlock | null {
  if (target.hp <= 0) return "fainted";
  if (target.status !== "NONE") return "already";
  if (STATUS_IMMUNITY[status].some((t) => target.types.includes(t))) return "immune";
  return null;
}

export function canReceiveStatus(target: StatusBearer, status: ActiveStatus): boolean {
  return statusBlockReason(target, status) === null;
}

export function rollSleepTurns(rng: Rng = defaultRng): number {
  return SLEEP_MIN_TURNS + Math.floor(rng() * (SLEEP_MAX_TURNS - SLEEP_MIN_TURNS + 1));
}

export interface InflictResult {
  applied: boolean;
  log: string[];
}

/**
 * Tenta aplicar um status. Mutação em `target`; devolve as linhas de log.
 *
 * `silentIfBlocked` é para efeito secundário de golpe de dano (Brasa 10%):
 * quando o alvo já tem status ou é imune, o jogo não anuncia nada — só o
 * golpe de status dedicado (Onda Trovão) explica por que falhou.
 */
export function inflictStatus(
  target: StatusBearer,
  status: ActiveStatus,
  rng: Rng = defaultRng,
  opts: { silentIfBlocked?: boolean } = {}
): InflictResult {
  const blocked = statusBlockReason(target, status);
  if (blocked) {
    if (opts.silentIfBlocked || blocked === "fainted") return { applied: false, log: [] };
    if (blocked === "already") {
      const current = target.status as ActiveStatus;
      return { applied: false, log: [`${target.displayName} já está ${STATUS_NAME[current]}!`] };
    }
    return { applied: false, log: [`Não afeta ${target.displayName}...`] };
  }

  target.status = status;
  target.statusTurns = status === "SLP" ? rollSleepTurns(rng) : 0;

  const line: Record<ActiveStatus, string> = {
    PSN: `${target.displayName} foi envenenado!`,
    TOX: `${target.displayName} foi gravemente envenenado!`,
    BRN: `${target.displayName} foi queimado!`,
    PAR: `${target.displayName} está paralisado! Talvez não consiga se mover!`,
    SLP: `${target.displayName} adormeceu!`,
    FRZ: `${target.displayName} foi congelado!`,
  };
  return { applied: true, log: [line[status]] };
}

export function clearStatus(target: StatusBearer): void {
  target.status = "NONE";
  target.statusTurns = 0;
}

// ─── Efeitos durante o turno ───────────────────────────────────────────────

/** Velocidade usada na ordem do turno (paralisia corta para 1/4). */
export function effectiveSpeed(bearer: Pick<StatusBearer, "speed" | "status">): number {
  return bearer.status === "PAR" ? Math.max(1, Math.floor(bearer.speed * PARALYSIS_SPEED_MULT)) : bearer.speed;
}

export interface BeforeMoveResult {
  canAct: boolean;
  log: string[];
}

/**
 * Checagem antes de agir (sono, congelamento, paralisia). Mutação em `bearer`:
 * o sono conta um turno, e acordar/descongelar limpa o status.
 *
 * Desde a Gen II, quem acorda ou descongela **age no mesmo turno**.
 */
export function beforeMove(bearer: StatusBearer, rng: Rng = defaultRng): BeforeMoveResult {
  switch (bearer.status) {
    case "SLP": {
      bearer.statusTurns = Math.max(0, bearer.statusTurns - 1);
      if (bearer.statusTurns > 0) {
        return { canAct: false, log: [`${bearer.displayName} está dormindo profundamente.`] };
      }
      clearStatus(bearer);
      return { canAct: true, log: [`${bearer.displayName} acordou!`] };
    }
    case "FRZ": {
      if (rng() < THAW_CHANCE) {
        clearStatus(bearer);
        return { canAct: true, log: [`${bearer.displayName} descongelou!`] };
      }
      return { canAct: false, log: [`${bearer.displayName} está congelado!`] };
    }
    case "PAR": {
      if (rng() < FULL_PARALYSIS_CHANCE) {
        return { canAct: false, log: [`${bearer.displayName} está paralisado! Não consegue se mover!`] };
      }
      return { canAct: true, log: [] };
    }
    default:
      return { canAct: true, log: [] };
  }
}

/** Golpe de Fogo que causou dano descongela o alvo (Gen II+). */
export function thawIfHitByFire(target: StatusBearer, moveType: string): string | null {
  if (target.status !== "FRZ" || moveType !== "Fire") return null;
  clearStatus(target);
  return `${target.displayName} descongelou com o calor!`;
}

export interface ResidualResult {
  damage: number;
  log: string[];
}

/**
 * Dano de fim de turno (veneno, veneno grave, queimadura). Mutação em `bearer`
 * (HP e contador do TOX). Sempre ao menos 1 de dano; nunca abaixo de 0.
 */
export function residualDamage(bearer: StatusBearer): ResidualResult {
  if (bearer.hp <= 0) return { damage: 0, log: [] };

  let fraction: number;
  let cause: string;
  switch (bearer.status) {
    case "PSN":
      fraction = RESIDUAL_FRACTION;
      cause = "o veneno";
      break;
    case "TOX": {
      const steps = Math.min(TOXIC_MAX_STEPS, bearer.statusTurns + 1);
      bearer.statusTurns = steps;
      fraction = TOXIC_STEP * steps;
      cause = "o veneno";
      break;
    }
    case "BRN":
      fraction = RESIDUAL_FRACTION;
      cause = "a queimadura";
      break;
    default:
      return { damage: 0, log: [] };
  }

  const damage = Math.min(bearer.hp, Math.max(1, Math.floor(bearer.maxHp * fraction)));
  bearer.hp -= damage;
  return { damage, log: [`${bearer.displayName} sofre com ${cause}! (−${damage} HP)`] };
}

// ─── Captura ───────────────────────────────────────────────────────────────

/** Bônus de captura (Gen III–IV): sono/congelado ×2, demais ×1,5. */
export function captureStatusBonus(status: StatusCondition): number {
  if (status === "SLP" || status === "FRZ") return 2;
  if (status === "NONE") return 1;
  return 1.5;
}
