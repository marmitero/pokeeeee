import { z } from "zod";
import { TILE_DEFINITIONS } from "./tiles";

/**
 * Validação de entrada de todas as rotas (Zod).
 *
 * Regra da Fase 1: **nada que venha do cliente é confiável**. Todo valor é
 * checado em tipo, faixa e enum antes de tocar o banco. É isso que fecha
 * os exploits V3 (quantity negativa) e V4 (level/variant arbitrários).
 */

// ─── Primitivos compartilhados ────────────────────────────────────────────

export const VARIANT_VALUES = [
  "Normal",
  "Shiny",
  "Metallic",
  "Mystic",
  "Dark",
  "Ghostly",
] as const;

export const BALL_VALUES = [
  "pokeballs",
  "greatballs",
  "ultraballs",
  "masterballs",
] as const;

export const HEAL_ITEM_VALUES = [
  "potion",
  "superPotion",
  "maxPotion",
  "revive",
] as const;

/** Colunas de inventário que uma loja pode creditar (allowlist anti mass-assignment). */
export const INVENTORY_KEYS = [
  "pokeballs",
  "greatballs",
  "ultraballs",
  "masterballs",
  "potions",
  "superPotions",
  "maxPotions",
  "revives",
] as const;

export const variantSchema = z.enum(VARIANT_VALUES);
export const ballSchema = z.enum(BALL_VALUES);

/**
 * Papel de acesso. Espelha `ROLES` de `src/db/schema.ts`.
 *
 * Usado pelo script `db:set-role` e reservado para o futuro painel
 * administrativo. Não existe endpoint HTTP que aceite papel no corpo:
 * promoção é feita apenas por acesso direto ao banco, de propósito.
 */
export const roleSchema = z.enum(["player", "moderator", "admin"]);

export const levelSchema = z.coerce
  .number()
  .int("Nível deve ser inteiro")
  .min(1, "Nível mínimo é 1")
  .max(100, "Nível máximo é 100");

/** Quantidade: inteiro ≥ 1. Fecha o exploit de compra com valor negativo. */
export const quantitySchema = z.coerce
  .number()
  .int("Quantidade deve ser inteira")
  .min(1, "Quantidade deve ser no mínimo 1")
  .max(99, "Quantidade máxima é 99");

export const idSchema = z.coerce
  .number()
  .int("Identificador inválido")
  .positive("Identificador inválido");

// ─── /api/auth ────────────────────────────────────────────────────────────

const usernameSchema = z
  .string({ message: "Nome de treinador obrigatório" })
  .trim()
  .min(3, "Nome de treinador precisa de ao menos 3 caracteres")
  .max(20, "Nome de treinador pode ter no máximo 20 caracteres")
  .regex(
    /^[\p{L}\p{N}_.-]+$/u,
    "Use apenas letras, números, ponto, hífen e underline"
  );

const passwordSchema = z
  .string({ message: "Senha obrigatória" })
  .min(8, "Senha precisa de ao menos 8 caracteres")
  .max(128, "Senha muito longa");

export const authRegisterSchema = z.object({
  action: z.literal("register"),
  username: usernameSchema,
  password: passwordSchema,
  starterId: z.coerce.number().int().optional(),
  avatarSprite: z.string().trim().min(1).max(32).optional(),
});

export const authLoginSchema = z.object({
  action: z.literal("login"),
  username: usernameSchema,
  password: z.string().min(1, "Senha obrigatória").max(128),
});

export const authSchema = z.discriminatedUnion("action", [
  authRegisterSchema,
  authLoginSchema,
]);

// ─── /api/pokemon/catch ───────────────────────────────────────────────────

export const catchSchema = z.object({
  pokedexId: idSchema,
  variant: variantSchema.default("Normal"),
  level: levelSchema.default(5),
  ballUsed: ballSchema.default("pokeballs"),
});

// ─── /api/pokemon/heal ────────────────────────────────────────────────────

const coordinateSchema = z.coerce.number().int().min(0).max(63);

export const healSchema = z.object({
  currentMapId: idSchema.optional(),
  playerX: coordinateSchema.optional(),
  playerY: coordinateSchema.optional(),
});

// ─── /api/pokemon/manage ──────────────────────────────────────────────────

export const manageSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("release"), pokemonId: idSchema }),
  z.object({ action: z.literal("sell"), pokemonId: idSchema }),
  z.object({ action: z.literal("to_party"), pokemonId: idSchema }),
  z.object({ action: z.literal("to_box"), pokemonId: idSchema }),
  z.object({
    action: z.literal("swap_slots"),
    slot1PokemonId: idSchema,
    slot2PokemonId: idSchema,
  }),
  z.object({
    action: z.literal("use_item"),
    pokemonId: idSchema,
    item: z.enum(HEAL_ITEM_VALUES),
  }),
]);

// ─── /api/shop ────────────────────────────────────────────────────────────

export const shopActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("buy"),
    itemId: idSchema,
    quantity: quantitySchema.default(1),
  }),
]);

export const shopQuerySchema = z.object({
  shopId: idSchema.default(1),
});

// ─── /api/gym ─────────────────────────────────────────────────────────────

export const gymQuerySchema = z.object({
  mapId: idSchema.optional(),
});

export const gymActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("battle_result"),
    gymLeaderId: idSchema,
    // ⚠️ Ainda vem do cliente. Passar a decidir no servidor é trabalho da
    // Fase 2 (motor de jogo), que vai simular a luta de fato.
    won: z.boolean(),
  }),
]);

// ─── /api/pvp ─────────────────────────────────────────────────────────────

const roomCodeSchema = z
  .string()
  .trim()
  .min(3, "Código da sala muito curto")
  .max(32, "Código da sala muito longo")
  .regex(/^[A-Z0-9-]+$/, "Use apenas letras maiúsculas, números e hífen");

const battlePokemonSchema = z.object({
  id: z.number().int().optional(),
  pokedexId: idSchema,
  name: z.string().trim().min(1).max(40),
  variant: variantSchema.default("Normal"),
  level: levelSchema,
  hp: z.coerce.number().int().min(0).max(9999),
  maxHp: z.coerce.number().int().min(1).max(9999),
  attack: z.coerce.number().int().min(0).max(9999).optional(),
  defense: z.coerce.number().int().min(0).max(9999).optional(),
  spAttack: z.coerce.number().int().min(0).max(9999).optional(),
  spDefense: z.coerce.number().int().min(0).max(9999).optional(),
  speed: z.coerce.number().int().min(0).max(9999).optional(),
  move1: z.string().trim().max(60).optional(),
  move2: z.string().trim().max(60).optional(),
  move3: z.string().trim().max(60).optional(),
  move4: z.string().trim().max(60).optional(),
});

export const pvpActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("chat"),
    message: z.string().trim().min(1, "Mensagem vazia").max(200, "Máximo de 200 caracteres"),
  }),
  z.object({
    action: z.literal("create_room"),
    roomCode: roomCodeSchema.optional(),
    player1Pokemon: battlePokemonSchema,
  }),
  z.object({
    action: z.literal("join_room"),
    roomCode: roomCodeSchema,
    player1Pokemon: battlePokemonSchema,
  }),
]);

// ─── /api/maps ────────────────────────────────────────────────────────────

const TILE_IDS = Object.keys(TILE_DEFINITIONS) as [string, ...string[]];
const tileSchema = z.enum(TILE_IDS);

export const mapSizeSchema = z.coerce
  .number()
  .int()
  .min(8, "Mapa precisa ter ao menos 8 tiles")
  .max(32, "Mapa pode ter no máximo 32 tiles");

export const tileGridSchema = z
  .array(z.array(tileSchema).min(1).max(64))
  .min(1)
  .max(64);

const encounterSchema = z.object({
  pokedexId: idSchema,
  name: z.string().trim().min(1).max(40),
  weight: z.coerce.number().min(0).max(1000),
  minLevel: levelSchema,
  maxLevel: levelSchema,
  tileTypes: z.array(z.string()).max(10),
});

const portalSchema = z.object({
  id: z.string().trim().min(1).max(64),
  sourceX: z.coerce.number().int().min(0).max(63),
  sourceY: z.coerce.number().int().min(0).max(63),
  targetMapId: idSchema,
  targetMapName: z.string().trim().max(60).optional(),
  targetX: z.coerce.number().int().min(0).max(63),
  targetY: z.coerce.number().int().min(0).max(63),
  label: z.string().trim().max(80).optional(),
});

const npcSchema = z.object({
  id: z.string().trim().min(1).max(64),
  x: z.coerce.number().int().min(0).max(63),
  y: z.coerce.number().int().min(0).max(63),
  type: z.enum(["shop", "gym", "healer", "info"]),
  name: z.string().trim().min(1).max(60),
  shopId: idSchema.optional(),
  gymId: idSchema.optional(),
  dialog: z.string().trim().max(400),
});

export const mapCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome do mapa obrigatório").max(60),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Slug inválido")
    .optional(),
  description: z.string().trim().max(300).optional(),
  width: mapSizeSchema.default(16),
  height: mapSizeSchema.default(16),
  tileGrid: tileGridSchema,
  encounterTable: z.array(encounterSchema).max(50).default([]),
  portals: z.array(portalSchema).max(50).default([]),
  npcs: z.array(npcSchema).max(50).optional(),
  linkFromMapId: idSchema.optional(),
  linkFromX: z.coerce.number().int().min(0).max(63).optional(),
  linkFromY: z.coerce.number().int().min(0).max(63).optional(),
  linkTargetX: z.coerce.number().int().min(0).max(63).default(7),
  linkTargetY: z.coerce.number().int().min(0).max(63).default(1),
});

export const mapUpdateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  tileGrid: tileGridSchema.optional(),
  encounterTable: z.array(encounterSchema).max(50).optional(),
  portals: z.array(portalSchema).max(50).optional(),
  npcs: z.array(npcSchema).max(50).optional(),
});
