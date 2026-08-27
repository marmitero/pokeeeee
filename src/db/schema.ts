import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
} from "drizzle-orm/pg-core";

// ─── Shared JSON interfaces ────────────────────────────────────────────────

export interface PortalConnection {
  id: string;
  sourceX: number;
  sourceY: number;
  targetMapId: number;
  targetMapName?: string;
  targetX: number;
  targetY: number;
  label?: string;
}

export interface WildEncounterEntry {
  pokedexId: number;
  name: string;
  weight: number;
  minLevel: number;
  maxLevel: number;
  tileTypes: string[];
}

export interface NpcDefinition {
  id: string;
  x: number;
  y: number;
  type: "shop" | "gym" | "healer" | "info";
  name: string;
  shopId?: number;
  gymId?: number;
  dialog: string;
}

// ─── PAPÉIS DE ACESSO ─────────────────────────────────────────────────────

/**
 * Hierarquia de papéis, da menor para a maior.
 *
 * Mantida como `text` no banco (e não `pgEnum`) de propósito: adicionar um
 * papel novo vira uma linha de código em vez de uma migration de tipo.
 * A validação de valor acontece na aplicação (`src/lib/session.ts`).
 *
 * - `player`    → joga; não altera nada do mundo compartilhado
 * - `moderator` → modera a comunidade (chat); **não** edita mapas
 * - `admin`     → tudo, incluindo o Editor de Mundos e a gestão de papéis
 */
export const ROLES = ["player", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LEVEL: Record<Role, number> = {
  player: 0,
  moderator: 1,
  admin: 2,
};

/** Converte um valor vindo do banco em `Role`, falhando para o mais restritivo. */
export function toRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "player";
}

// ─── USERS ────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarSprite: text("avatar_sprite").notNull().default("red"),
  // autorização: "player" | "moderator" | "admin" — ver ROLES acima
  role: text("role").notNull().default("player"),
  // currency
  money: integer("money").notNull().default(3000),
  // inventory – balls
  pokeballs: integer("pokeballs").notNull().default(10),
  greatballs: integer("greatballs").notNull().default(5),
  ultraballs: integer("ultraballs").notNull().default(2),
  masterballs: integer("masterballs").notNull().default(0),
  // inventory – potions
  potions: integer("potions").notNull().default(3),
  superPotions: integer("super_potions").notNull().default(1),
  maxPotions: integer("max_potions").notNull().default(0),
  revives: integer("revives").notNull().default(1),
  // progress
  currentMapId: integer("current_map_id").notNull().default(1),
  playerX: integer("player_x").notNull().default(8),
  playerY: integer("player_y").notNull().default(12),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  /**
   * Rating ELO (Fase 4).
   *
   * Entra **dormente de propósito**: nenhuma batalha amistosa escreve aqui.
   * Só a futura "Arena PvP" ranqueada vai atualizá-lo, e o ranking global será
   * derivado dele — nunca de `wins`, que é um contador misto (PvE + amistoso).
   * Há teste garantindo que o amistoso não toca neste campo.
   */
  elo: integer("elo").notNull().default(1000),
  // premium flag – future use (skin unlocks, etc.)
  isPremium: boolean("is_premium").notNull().default(false),
  premiumSkins: jsonb("premium_skins").notNull().default("[]"),
  // timestamps
  lastOnlineAt: timestamp("last_online_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── SESSION TOKENS (persistent login) ────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── USER POKÉMON (party + PC box) ────────────────────────────────────────

export const userPokemon = pgTable("user_pokemon", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pokedexId: integer("pokedex_id").notNull(),
  nickname: text("nickname"),                       // custom name
  name: text("name").notNull(),                     // species name
  // variant / skin
  variant: text("variant").notNull().default("Normal"),
  // Normal | Shiny | Metallic | Mystic | Dark | Ghostly
  isPremiumSkin: boolean("is_premium_skin").notNull().default(false),
  // stats
  level: integer("level").notNull().default(5),
  xp: integer("xp").notNull().default(0),
  xpToNextLevel: integer("xp_to_next_level").notNull().default(100),
  hp: integer("hp").notNull().default(24),
  maxHp: integer("max_hp").notNull().default(24),
  attack: integer("attack").notNull().default(14),
  defense: integer("defense").notNull().default(12),
  spAttack: integer("sp_attack").notNull().default(15),
  spDefense: integer("sp_defense").notNull().default(13),
  speed: integer("speed").notNull().default(14),
  // moves
  move1: text("move1").notNull(),
  move2: text("move2").notNull(),
  move3: text("move3").notNull(),
  move4: text("move4").notNull(),
  // party slots 1-6; null = PC box
  partySlot: integer("party_slot"),
  isStarter: boolean("is_starter").notNull().default(false),
  caughtAt: timestamp("caught_at").defaultNow(),
});

// ─── MAPS ─────────────────────────────────────────────────────────────────

export const gameMaps = pgTable("game_maps", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  width: integer("width").notNull().default(16),
  height: integer("height").notNull().default(16),
  tileGrid: jsonb("tile_grid").notNull(),
  encounterTable: jsonb("encounter_table").notNull(),
  portals: jsonb("portals").notNull(),
  npcs: jsonb("npcs").notNull().default("[]"),
  creatorUsername: text("creator_username").notNull().default("GameMaster"),
  // Dono do mapa (Fase 1): `null` = mapa de sistema/semente, editável por
  // qualquer usuário autenticado; com valor = só o criador pode alterar.
  creatorId: integer("creator_id"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── SHOP ITEMS ───────────────────────────────────────────────────────────

export const shopItems = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),       // links to gymLeaders.shopId or standalone shops
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),       // "ball" | "potion" | "misc"
  itemKey: text("item_key").notNull(),         // matches user column: "pokeballs" | "potions" etc.
  buyPrice: integer("buy_price").notNull(),
  sellPrice: integer("sell_price").notNull(),
  iconEmoji: text("icon_emoji").notNull().default("📦"),
  isPremium: boolean("is_premium").notNull().default(false),
  stock: integer("stock").notNull().default(99),
});

// ─── GYM LEADERS ──────────────────────────────────────────────────────────

export const gymLeaders = pgTable("gym_leaders", {
  id: serial("id").primaryKey(),
  mapId: integer("map_id").notNull(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  badgeName: text("badge_name").notNull(),
  badgeEmoji: text("badge_emoji").notNull().default("🏅"),
  specialty: text("specialty").notNull(),    // type speciality
  requiredBadges: integer("required_badges").notNull().default(0),
  rewardMoney: integer("reward_money").notNull().default(1500),
  // their pokemon team
  team: jsonb("team").notNull(),
  npcDialog: text("npc_dialog").notNull(),
  defeatDialog: text("defeat_dialog").notNull(),
  winDialog: text("win_dialog").notNull(),
  shopId: integer("shop_id"),
});

// ─── USER BADGES (gym progress) ───────────────────────────────────────────

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gymLeaderId: integer("gym_leader_id").notNull(),
  badgeName: text("badge_name").notNull(),
  badgeEmoji: text("badge_emoji").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// ─── PVP BATTLES ──────────────────────────────────────────────────────────

export const pvpBattles = pgTable("pvp_battles", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  player1Id: integer("player1_id").notNull(),
  player1Username: text("player1_username").notNull(),
  player2Id: integer("player2_id"),
  player2Username: text("player2_username"),
  /**
   * "friendly" — amistoso. Não mexe em ELO nem entra em ranking.
   * "ranked"   — Arena PvP (futuro). Atualiza ELO e ranking global.
   *
   * O campo nasce na Fase 4 mesmo só havendo amistoso, para que a Arena seja
   * apenas lógica de atualização, sem migração nem retrabalho.
   */
  mode: text("mode").notNull().default("friendly"),
  status: text("status").notNull().default("WAITING"),
  currentTurnPlayerId: integer("current_turn_player_id"),
  battleState: jsonb("battle_state").notNull(),
  winnerId: integer("winner_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── BATALHAS (motor autoritativo — Fase 2) ───────────────────────────────

/**
 * Estado de batalha persistido.
 *
 * Antes a luta inteira acontecia no cliente: o dano era só `setState`, o HP
 * nunca era gravado (fechar a modal restaurava tudo) e o resultado do ginásio
 * chegava pronto num campo `won` — farmável com um curl.
 *
 * Agora o servidor é a fonte da verdade: cada turno é resolvido aqui, o HP é
 * gravado em `user_pokemon` e o resultado é decidido pelo motor.
 */
export const battles = pgTable("battles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull(),                 // "wild" | "gym"
  mapId: integer("map_id"),                     // batalha selvagem
  gymLeaderId: integer("gym_leader_id"),        // batalha de ginásio
  activePokemonId: integer("active_pokemon_id"),
  opponentIndex: integer("opponent_index").notNull().default(0),
  state: jsonb("state").notNull(),              // combatentes, turno, log
  status: text("status").notNull().default("ACTIVE"), // ACTIVE|WON|LOST|FLED|CAUGHT
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── RATE LIMIT (Fase 5) ──────────────────────────────────────────────────

/**
 * Contadores de rate limit compartilhados.
 *
 * Substitui o limite "em memória" da Fase 1, que não sobrevivia a restart nem
 * era compartilhado entre réplicas — ou seja, bastava reiniciar o processo (ou
 * abrir outra instância) para zerar o contador.
 *
 * Uma linha por (escopo + cliente). O `DELETE` de linhas vencidas roda junto,
 * então a tabela não cresce indefinidamente.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(1),
  resetAt: timestamp("reset_at").notNull(),
});

// ─── CHAT ─────────────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  username: text("username").notNull(),
  message: text("message").notNull(),
  channel: text("channel").notNull().default("global"),
  createdAt: timestamp("created_at").defaultNow(),
});
