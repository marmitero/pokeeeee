import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

/**
 * Override de colisão por célula (Fase 6.2-A).
 *
 * `null`       → usa o padrão do tipo de tile (`TILE_DEFINITIONS.walkable`);
 * `"blocked"`  → intransponível mesmo sendo grama;
 * `"walkable"` → atravessável mesmo sendo água ou árvore.
 *
 * Existe porque `walkable` era fixo por tipo de tile no código: água é
 * `walkable: false` **e** `hasEncounter: true`, ou seja, encontro aquático era
 * impossível — o jogador nunca pisava lá.
 */
export type CollisionOverride = null | "blocked" | "walkable";

export interface NpcDefinition {
  id: string;
  x: number;
  y: number;
  type: "shop" | "gym" | "healer" | "info" | "boss";
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
  // E-mail real do jogador (2026-09-06): preenchido no cadastro e
  // confirmado por código enviado ao e-mail (emailVerified). Antes era um
  // placeholder derivado do username (`@delugerpg.net`).
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
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
  // inventory – evolution items (Fase 6.4-B: pedras e itens raros de evolução)
  fireStone: integer("fire_stone").notNull().default(0),
  waterStone: integer("water_stone").notNull().default(0),
  thunderStone: integer("thunder_stone").notNull().default(0),
  leafStone: integer("leaf_stone").notNull().default(0),
  moonStone: integer("moon_stone").notNull().default(0),
  sunStone: integer("sun_stone").notNull().default(0),
  shinyStone: integer("shiny_stone").notNull().default(0),
  metalCoat: integer("metal_coat").notNull().default(0),
  kingsRock: integer("kings_rock").notNull().default(0),
  dragonScale: integer("dragon_scale").notNull().default(0),
  upgrade: integer("upgrade").notNull().default(0),
  duskStone: integer("dusk_stone").notNull().default(0),
  dawnStone: integer("dawn_stone").notNull().default(0),
  ovalStone: integer("oval_stone").notNull().default(0),
  // inventory – evolution items (Fase 6.4-D: itens de Sinnoh; no cânone são
  // "segurados numa troca", aqui são de uso direto como os cascos da 6.4-B)
  protector: integer("protector").notNull().default(0),
  electirizer: integer("electirizer").notNull().default(0),
  magmarizer: integer("magmarizer").notNull().default(0),
  razorClaw: integer("razor_claw").notNull().default(0),
  razorFang: integer("razor_fang").notNull().default(0),
  dubiousDisc: integer("dubious_disc").notNull().default(0),
  reaperCloth: integer("reaper_cloth").notNull().default(0),
  // inventory – status cures (Fase 8.4: veneno/queimadura/paralisia/sono/gelo)
  antidotes: integer("antidotes").notNull().default(0),
  paralyzeHeals: integer("paralyze_heals").notNull().default(0),
  awakenings: integer("awakenings").notNull().default(0),
  burnHeals: integer("burn_heals").notNull().default(0),
  iceHeals: integer("ice_heals").notNull().default(0),
  fullHeals: integer("full_heals").notNull().default(0),
  fullRestores: integer("full_restores").notNull().default(0),
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
  /**
   * Presença multiplayer (8.9): heartbeat do polling de presença (2–3 s).
   * Diferente de `last_online_at` (login/heal): este marca que o cliente está
   * ATIVO agora — jogadores com `last_seen_at` recente aparecem no mapa.
   * Default = epoch de propósito: só fica "visível" quem de fato envia
   * heartbeat (cadastrar/login não é estar no mapa).
   */
  lastSeenAt: timestamp("last_seen_at").default(sql`to_timestamp(0)`),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  check("users_role_check", sql`${table.role} IN ('player', 'moderator', 'admin')`),
  check("users_money_nonnegative", sql`${table.money} >= 0`),
  check("users_inventory_nonnegative", sql`${table.pokeballs} >= 0 AND ${table.greatballs} >= 0 AND ${table.ultraballs} >= 0 AND ${table.masterballs} >= 0 AND ${table.potions} >= 0 AND ${table.superPotions} >= 0 AND ${table.maxPotions} >= 0 AND ${table.revives} >= 0 AND ${table.fireStone} >= 0 AND ${table.waterStone} >= 0 AND ${table.thunderStone} >= 0 AND ${table.leafStone} >= 0 AND ${table.moonStone} >= 0 AND ${table.sunStone} >= 0 AND ${table.shinyStone} >= 0 AND ${table.metalCoat} >= 0 AND ${table.kingsRock} >= 0 AND ${table.dragonScale} >= 0 AND ${table.upgrade} >= 0 AND ${table.duskStone} >= 0 AND ${table.dawnStone} >= 0 AND ${table.ovalStone} >= 0 AND ${table.protector} >= 0 AND ${table.electirizer} >= 0 AND ${table.magmarizer} >= 0 AND ${table.razorClaw} >= 0 AND ${table.razorFang} >= 0 AND ${table.dubiousDisc} >= 0 AND ${table.reaperCloth} >= 0 AND ${table.antidotes} >= 0 AND ${table.paralyzeHeals} >= 0 AND ${table.awakenings} >= 0 AND ${table.burnHeals} >= 0 AND ${table.iceHeals} >= 0 AND ${table.fullHeals} >= 0 AND ${table.fullRestores} >= 0`),
  check("users_progress_nonnegative", sql`${table.wins} >= 0 AND ${table.losses} >= 0 AND ${table.elo} >= 0`),
  check("users_position_check", sql`${table.playerX} BETWEEN 0 AND 63 AND ${table.playerY} BETWEEN 0 AND 63`),
]);

// ─── SESSION TOKENS (persistent login) ────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
  index("sessions_expires_at_idx").on(table.expiresAt),
]);

// ─── USER POKÉMON (party + PC box) ────────────────────────────────────────

export const userPokemon = pgTable("user_pokemon", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  // Fase 8.4 — status de batalha persistente (NONE|PSN|TOX|BRN|PAR|SLP|FRZ).
  // Persiste depois da batalha até Centro Pokémon ou item, como no GBA.
  status: text("status").notNull().default("NONE"),
  // SLP: turnos restantes de sono · TOX: turnos já sofridos · demais: 0.
  statusTurns: integer("status_turns").notNull().default(0),
}, (table) => [
  index("user_pokemon_user_id_idx").on(table.userId),
  uniqueIndex("user_pokemon_party_slot_unique").on(table.userId, table.partySlot).where(sql`${table.partySlot} IS NOT NULL`),
  check("user_pokemon_variant_check", sql`${table.variant} IN ('Normal', 'Shiny', 'Metallic', 'Mystic', 'Dark', 'Ghostly')`),
  check("user_pokemon_level_check", sql`${table.level} BETWEEN 1 AND 100`),
  check("user_pokemon_xp_check", sql`${table.xp} >= 0 AND ${table.xpToNextLevel} > 0`),
  check("user_pokemon_hp_check", sql`${table.maxHp} > 0 AND ${table.hp} BETWEEN 0 AND ${table.maxHp}`),
  check("user_pokemon_stats_check", sql`${table.attack} > 0 AND ${table.defense} > 0 AND ${table.spAttack} > 0 AND ${table.spDefense} > 0 AND ${table.speed} > 0`),
  check("user_pokemon_party_slot_check", sql`${table.partySlot} IS NULL OR ${table.partySlot} BETWEEN 1 AND 6`),
  check("user_pokemon_status_check", sql`${table.status} IN ('NONE', 'PSN', 'TOX', 'BRN', 'PAR', 'SLP', 'FRZ') AND ${table.statusTurns} >= 0`),
]);

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
  // ── Camadas da Fase 6.2-A ────────────────────────────────────────────────
  // O "tile invisível": marca onde pode aparecer criatura, sem mudar o
  // desenho do mapa. Grade vazia = modo legado (usa `hasEncounter` do tipo de
  // tile + `tileTypes` da tabela de encontros), que é o comportamento atual.
  encounterGrid: jsonb("encounter_grid").notNull().default([]),
  // Override de colisão por célula; grade vazia = padrão do tipo de tile.
  collisionGrid: jsonb("collision_grid").notNull().default([]),
  // Chance de encontro por passo, em %. Era um `0.22` fixo no cliente.
  encounterRate: integer("encounter_rate").notNull().default(22),
  portals: jsonb("portals").notNull(),
  npcs: jsonb("npcs").notNull().default("[]"),
  creatorUsername: text("creator_username").notNull().default("GameMaster"),
  // Dono do mapa (Fase 1): `null` = mapa de sistema/semente, editável por
  // qualquer usuário autenticado; com valor = só o criador pode alterar.
  creatorId: integer("creator_id").references(() => users.id, { onDelete: "set null" }),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("game_maps_published_idx").on(table.isPublished),
  check("game_maps_dimensions_check", sql`${table.width} BETWEEN 1 AND 64 AND ${table.height} BETWEEN 1 AND 64`),
  check("game_maps_encounter_rate_check", sql`${table.encounterRate} BETWEEN 0 AND 100`),
]);

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
}, (table) => [
  index("shop_items_shop_id_idx").on(table.shopId),
  check("shop_items_category_check", sql`${table.category} IN ('ball', 'potion', 'misc')`),
  check("shop_items_prices_stock_check", sql`${table.buyPrice} >= 0 AND ${table.sellPrice} >= 0 AND ${table.stock} >= 0`),
]);

// ─── GYM LEADERS ──────────────────────────────────────────────────────────

export const gymLeaders = pgTable("gym_leaders", {
  id: serial("id").primaryKey(),
  mapId: integer("map_id").notNull().references(() => gameMaps.id, { onDelete: "restrict" }),
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
}, (table) => [
  index("gym_leaders_map_id_idx").on(table.mapId),
  check("gym_leaders_rewards_check", sql`${table.requiredBadges} >= 0 AND ${table.rewardMoney} >= 0`),
]);

// ─── VERIFICAÇÃO DE E-MAIL (código de confirmação do cadastro) ──────────

/**
 * Código de confirmação do e-mail do cadastro (2026-09-06).
 *
 * Uma linha por e-mail: reenvio substitui o código anterior. O código é
 * gravado apenas como **SHA-256** (mesma convenção de `sessions`): um
 * vazamento do banco não entrega códigos utilizáveis.
 *
 * Throttling: 60 s entre envios (`lastSentAt`) + 5 tentativas de verificação
 * (`attempts`) + expiração de 10 min (`expiresAt`), por cima do rate limit
 * por IP da rota de auth.
 */
export const emailVerificationCodes = pgTable("email_verification_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastSentAt: timestamp("last_sent_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("email_verification_codes_user_id_idx").on(table.userId),
  check("email_verification_codes_attempts_check", sql`${table.attempts} >= 0`),
]);

// ─── USER BADGES (gym progress) ───────────────────────────────────────────

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  gymLeaderId: integer("gym_leader_id").notNull().references(() => gymLeaders.id, { onDelete: "cascade" }),
  badgeName: text("badge_name").notNull(),
  badgeEmoji: text("badge_emoji").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
}, (table) => [
  uniqueIndex("user_badges_user_gym_unique").on(table.userId, table.gymLeaderId),
  index("user_badges_user_id_idx").on(table.userId),
]);

// ─── PVP BATTLES ──────────────────────────────────────────────────────────

export const pvpBattles = pgTable("pvp_battles", {
  id: serial("id").primaryKey(),
  roomCode: text("room_code").notNull().unique(),
  player1Id: integer("player1_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  player1Username: text("player1_username").notNull(),
  player2Id: integer("player2_id").references(() => users.id, { onDelete: "restrict" }),
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
  currentTurnPlayerId: integer("current_turn_player_id").references(() => users.id, { onDelete: "restrict" }),
  battleState: jsonb("battle_state").notNull(),
  winnerId: integer("winner_id").references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pvp_battles_player1_idx").on(table.player1Id),
  index("pvp_battles_player2_idx").on(table.player2Id),
  index("pvp_battles_status_idx").on(table.status),
  check("pvp_battles_mode_check", sql`${table.mode} IN ('friendly', 'ranked')`),
  check("pvp_battles_status_check", sql`${table.status} IN ('WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED')`),
  check("pvp_battles_players_distinct", sql`${table.player2Id} IS NULL OR ${table.player1Id} <> ${table.player2Id}`),
]);

// ─── TEMPORADA PVP RANQUEADA (Etapa C, 8.5) ────────────────────────────────

/**
 * Resultado da temporada semanal da Arena ranqueada.
 *
 * Fechamento **preguiçoso** (padrão do projeto, sem cron): na 1ª chamada da
 * semana nova (`GET /api/pvp?ranking=1` ou `join_ranked`), a semana anterior
 * é fechada — uma linha por jogador do top 10 (por ELO, entre quem tem ≥ 10
 * partidas ranqueadas), com o ELO final, a colocação e a recompensa entregue
 * na hora (Pk$ + Cura Total + Restaurador Total).
 *
 * - `weekId` = `YYYY-Www` ISO UTC (mesmo `weekIdOf` do boss);
 * - `eloFinal`/`rank` são o retrato da temporada (auditoria);
 * - `rewardClaimed` marca a entrega da recompensa (auto-grant no fechamento).
 */
export const pvpSeasons = pgTable("pvp_seasons", {
  id: serial("id").primaryKey(),
  weekId: text("week_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eloFinal: integer("elo_final").notNull(),
  rank: integer("rank").notNull(),
  rewardClaimed: boolean("reward_claimed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("pvp_seasons_week_user_unique").on(table.weekId, table.userId),
  index("pvp_seasons_week_rank_idx").on(table.weekId, table.rank),
  check("pvp_seasons_rank_check", sql`${table.rank} >= 1`),
  check("pvp_seasons_elo_check", sql`${table.eloFinal} >= 0`),
]);

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
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),                 // "wild" | "gym" | "boss"
  mapId: integer("map_id").references(() => gameMaps.id, { onDelete: "restrict" }),                     // batalha selvagem
  gymLeaderId: integer("gym_leader_id").references(() => gymLeaders.id, { onDelete: "restrict" }),        // batalha de ginásio
  activePokemonId: integer("active_pokemon_id").references(() => userPokemon.id, { onDelete: "set null" }),
  opponentIndex: integer("opponent_index").notNull().default(0),
  state: jsonb("state").notNull(),              // combatentes, turno, log
  status: text("status").notNull().default("ACTIVE"), // ACTIVE|WON|LOST|FLED|CAUGHT
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("battles_user_status_idx").on(table.userId, table.status),
  check("battles_kind_check", sql`${table.kind} IN ('wild', 'gym', 'boss')`),
  check("battles_status_check", sql`${table.status} IN ('ACTIVE', 'WON', 'LOST', 'FLED', 'CAUGHT')`),
  check("battles_opponent_index_check", sql`${table.opponentIndex} >= 0`),
]);

// ─── ARENA BOSS (Etapa C, 8.3) ──────────────────────────────────────────────

/**
 * Tentativas da Arena Boss.
 *
 * Duas arenas (mapas 20 e 40), cada uma com seu lendário semanal
 * (`src/lib/boss-rotation.ts` — determinístico, sem tabela). Uma linha por
 * tentativa: o limite é 2 por dia por arena, e a vitória trava a semana
 * naquela arena (derrota pode tentar de novo).
 *
 * - `weekId`/`day` são texto UTC (`YYYY-Www` / `YYYY-MM-DD`), calculados pelo
 *   servidor — o cliente nunca os informa;
 * - `stoneClaimed` marca a retirada da pedra à escolha (prêmio da vitória);
 * - `legendaryGranted` marca o 1/1200 (o lendário nv 5 foi entregue);
 * - `bossPokedexId`/`bossLevel` são o retrato do boss enfrentado (auditoria).
 */
export const bossFights = pgTable("boss_fights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  arenaMapId: integer("arena_map_id").notNull(),
  weekId: text("week_id").notNull(),
  day: text("day").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  stoneClaimed: boolean("stone_claimed").notNull().default(false),
  legendaryGranted: boolean("legendary_granted").notNull().default(false),
  bossPokedexId: integer("boss_pokedex_id").notNull(),
  bossLevel: integer("boss_level").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("boss_fights_user_arena_week_idx").on(table.userId, table.arenaMapId, table.weekId),
  index("boss_fights_user_arena_day_idx").on(table.userId, table.arenaMapId, table.day),
  check("boss_fights_arena_check", sql`${table.arenaMapId} IN (20, 40)`),
  check("boss_fights_status_check", sql`${table.status} IN ('ACTIVE', 'WON', 'LOST')`),
  check("boss_fights_level_check", sql`${table.bossLevel} BETWEEN 80 AND 100`),
]);

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
}, (table) => [
  index("rate_limits_reset_at_idx").on(table.resetAt),
  check("rate_limits_count_check", sql`${table.count} >= 0`),
]);

// ─── CHAT ─────────────────────────────────────────────────────────────────

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  message: text("message").notNull(),
  channel: text("channel").notNull().default("global"),
  // 8.8 Chat no jogo (2026-09-07): local = mesmo mapa, whisper = privado
  mapId: integer("map_id"),
  recipientId: integer("recipient_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("chat_messages_channel_created_idx").on(table.channel, table.createdAt),
  index("chat_messages_user_id_idx").on(table.userId),
  index("chat_messages_map_id_idx").on(table.mapId),
  index("chat_messages_recipient_id_idx").on(table.recipientId),
  index("chat_messages_channel_map_idx").on(table.channel, table.mapId),
  check("chat_messages_length_check", sql`char_length(${table.message}) BETWEEN 1 AND 500`),
  check(
    "chat_messages_channel_check",
    sql`${table.channel} IN ('global','local','whisper','arena-global')`
  ),
]);

// ─── AMIZADES (Etapa C, 8.9 — presença multiplayer) ──────────────────────

/**
 * Amizade entre dois treinadores (8.9).
 *
 * O par é armazenado em ordem canônica (`user_a_id < user_b_id`) — quem pediu
 * e quem aceitou não importa, a amizade é bidirecional e única. O unique index
 * no par é a fonte da verdade: `add` usa `onConflictDoNothing` (idempotente) e
 * `remove` apaga pela mesma ordem canônica.
 */
export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userAId: integer("user_a_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userBId: integer("user_b_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("friendships_pair_unique").on(table.userAId, table.userBId),
  index("friendships_user_a_idx").on(table.userAId),
  index("friendships_user_b_idx").on(table.userBId),
  check("friendships_distinct_check", sql`${table.userAId} <> ${table.userBId}`),
]);
