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

// ─── /api/pvp ─────────────────────────────────────────────────────────────

const roomCodeSchema = z
  .string()
  .trim()
  .min(3, "Código da sala muito curto")
  .max(32, "Código da sala muito longo")
  .regex(/^[A-Z0-9-]+$/, "Use apenas letras maiúsculas, números e hífen");

export const pvpActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("chat"),
    message: z.string().trim().min(1, "Mensagem vazia").max(200, "Máximo de 200 caracteres"),
  }),

  /**
   * Fase 4: `pokemonId` substitui o antigo `player1Pokemon`.
   *
   * Antes o cliente mandava o Pokémon INTEIRO (hp, attack, level...) e o
   * servidor gravava como veio — dava para entrar numa sala com hp 9999.
   * Agora manda só o id e o servidor lê o registro do banco.
   */
  z.object({
    action: z.literal("create_room"),
    roomCode: roomCodeSchema.optional(),
    pokemonIds: z.array(idSchema).min(1).max(3),
  }),
  z.object({
    action: z.literal("join_room"),
    roomCode: roomCodeSchema,
    pokemonIds: z.array(idSchema).min(1).max(3),
  }),
  z.object({
    action: z.literal("submit_turn"),
    roomCode: roomCodeSchema,
    // União discriminada: ou ataca com um golpe válido, ou troca de Pokémon.
    turnAction: z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("attack"),
        moveIndex: z.coerce.number().int().min(0).max(3, "Golpe inválido"),
      }),
      z.object({ kind: z.literal("switch"), userPokemonId: idSchema }),
    ]),
  }),
  z.object({
    action: z.literal("switch"),
    roomCode: roomCodeSchema,
    userPokemonId: idSchema,
  }),
  z.object({ action: z.literal("forfeit"), roomCode: roomCodeSchema }),
  z.object({ action: z.literal("rematch"), roomCode: roomCodeSchema }),
  z.object({ action: z.literal("list_rooms") }),
]);

export const pvpQuerySchema = z.object({ roomCode: roomCodeSchema });

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

const encounterSchema = z
  .object({
    pokedexId: idSchema,
    name: z.string().trim().min(1).max(40),
    weight: z.coerce.number().min(0).max(1000),
    minLevel: levelSchema,
    maxLevel: levelSchema,
    tileTypes: z.array(z.string()).max(10),
  })
  // Fase 6.2-A: faixa invertida gerava `Math.max` silencioso no motor. Agora é
  // erro de entrada, porque no editor isso é sempre engano de digitação.
  .refine((entry) => entry.minLevel <= entry.maxLevel, {
    message: "Nível mínimo não pode ser maior que o máximo",
    path: ["minLevel"],
  });

/**
 * Camadas da Fase 6.2-A.
 *
 * Grade vazia é aceita de propósito: significa "mapa legado", e o motor cai no
 * comportamento antigo (padrão do tipo de tile). A checagem de que as
 * dimensões batem com o `tileGrid` acontece na rota, onde `width`/`height` do
 * mapa estão disponíveis.
 */
export const encounterGridSchema = z
  .array(z.array(z.boolean()).max(64))
  .max(64);

export const collisionGridSchema = z
  .array(z.array(z.enum(["blocked", "walkable"]).nullable()).max(64))
  .max(64);

export const encounterRateSchema = z.coerce
  .number()
  .int()
  .min(0, "Taxa de encontro mínima é 0%")
  .max(100, "Taxa de encontro máxima é 100%");

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
  encounterGrid: encounterGridSchema.default([]),
  collisionGrid: collisionGridSchema.default([]),
  encounterRate: encounterRateSchema.default(22),
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
  encounterGrid: encounterGridSchema.optional(),
  collisionGrid: collisionGridSchema.optional(),
  encounterRate: encounterRateSchema.optional(),
  portals: z.array(portalSchema).max(50).optional(),
  npcs: z.array(npcSchema).max(50).optional(),
});

// ─── /api/battle (motor autoritativo — Fase 2) ────────────────────────────

const battleCoordSchema = z.coerce.number().int().min(0).max(63);

export const battleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start_wild"),
    mapId: idSchema,
    playerX: battleCoordSchema,
    playerY: battleCoordSchema,
  }),
  z.object({ action: z.literal("start_gym"), gymLeaderId: idSchema }),
  z.object({
    action: z.literal("attack"),
    battleId: idSchema,
    moveIndex: z.coerce.number().int().min(0, "Golpe inválido").max(3, "Golpe inválido"),
  }),
  z.object({
    action: z.literal("switch"),
    battleId: idSchema,
    pokemonId: idSchema,
  }),
  z.object({
    action: z.literal("catch"),
    battleId: idSchema,
    ball: ballSchema,
  }),
  z.object({ action: z.literal("flee"), battleId: idSchema }),
]);

export const battleQuerySchema = z.object({ battleId: idSchema });

// ─── /api/admin (Fase 5) ──────────────────────────────────────────────────

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_role"),
    username: z.string().trim().min(3).max(20),
    role: roleSchema,
  }),
  z.object({ action: z.literal("list_staff") }),
  z.object({ action: z.literal("list_chat"), limit: z.coerce.number().int().min(1).max(100).default(50) }),
  z.object({ action: z.literal("delete_chat"), messageId: idSchema }),
]);
