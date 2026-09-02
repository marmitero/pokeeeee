/**
 * Mundo como código (Fase 6.2-D) — módulo puro, sem banco.
 *
 * Converte as linhas de `game_maps`, `gym_leaders` e `shop_items` em arquivos
 * versionáveis (`content/world/**`) e de volta. Os scripts
 * `scripts/world-export.mts` e `scripts/world-import.mts` só fazem I/O em
 * cima destas funções, para que a parte que pode dar errado — remapear
 * referências entre bancos — seja testável sem Postgres.
 *
 * A regra que faz o recurso funcionar: **id de banco não atravessa banco.**
 * Um portal no banco aponta para `targetMapId: 2`; num banco novo o mesmo
 * mapa pode nascer com id 7. Por isso, no arquivo:
 *
 *   - portal guarda `targetMapSlug`, nunca `targetMapId`;
 *   - NPC de ginásio guarda `gymLeaderName`, nunca `gymId`;
 *   - o ginásio mora **dentro** do arquivo do mapa (chave `(mapSlug, leaderName)`);
 *   - `shopId` é mantido porque já é um id lógico estável, sem FK;
 *   - `id`, `creatorId`, `createdAt` e `updatedAt` ficam de fora.
 *
 * Referência quebrada (portal para mapa inexistente, NPC para líder
 * inexistente) **lança erro** em vez de gravar mundo inconsistente.
 */

export const WORLD_FORMAT = "catchbound-world/1";

// ─── Linhas do banco (o que os scripts leem) ───────────────────────────────

export interface MapRow {
  id: number;
  slug: string;
  name: string;
  description: string;
  width: number;
  height: number;
  tileGrid: unknown;
  encounterTable: unknown;
  encounterGrid: unknown;
  collisionGrid: unknown;
  encounterRate: number;
  portals: unknown;
  npcs: unknown;
  creatorUsername: string;
  isPublished: boolean;
}

export interface GymRow {
  id: number;
  mapId: number;
  name: string;
  title: string;
  badgeName: string;
  badgeEmoji: string;
  specialty: string;
  requiredBadges: number;
  rewardMoney: number;
  team: unknown;
  npcDialog: string;
  defeatDialog: string;
  winDialog: string;
  shopId: number | null;
}

export interface ShopRow {
  id: number;
  shopId: number;
  name: string;
  description: string;
  category: string;
  itemKey: string;
  buyPrice: number;
  sellPrice: number;
  iconEmoji: string;
  isPremium: boolean;
  stock: number;
}

// ─── Formas como vivem no banco (jsonb) ────────────────────────────────────

export interface DbPortal {
  id: string;
  sourceX: number;
  sourceY: number;
  targetMapId: number;
  targetMapName?: string;
  targetX: number;
  targetY: number;
  label?: string;
}

export interface DbNpc {
  id: string;
  x: number;
  y: number;
  type: "shop" | "gym" | "healer" | "info";
  name: string;
  shopId?: number;
  gymId?: number;
  dialog: string;
}

// ─── Formas como vivem no arquivo ──────────────────────────────────────────

export interface WorldPortalFile {
  id: string;
  sourceX: number;
  sourceY: number;
  targetMapSlug: string;
  targetMapName?: string;
  targetX: number;
  targetY: number;
  label?: string;
}

export interface WorldNpcFile {
  id: string;
  x: number;
  y: number;
  type: "shop" | "gym" | "healer" | "info";
  name: string;
  shopId?: number;
  gymLeaderName?: string;
  dialog: string;
}

export interface WorldGymFile {
  leaderName: string;
  title: string;
  badgeName: string;
  badgeEmoji: string;
  specialty: string;
  requiredBadges: number;
  rewardMoney: number;
  shopId: number | null;
  npcDialog: string;
  defeatDialog: string;
  winDialog: string;
  team: unknown;
}

export interface WorldMapFile {
  format: typeof WORLD_FORMAT;
  slug: string;
  name: string;
  description: string;
  width: number;
  height: number;
  creatorUsername: string;
  isPublished: boolean;
  encounterRate: number;
  encounterTable: unknown;
  portals: WorldPortalFile[];
  npcs: WorldNpcFile[];
  gyms: WorldGymFile[];
  encounterGrid: unknown;
  collisionGrid: unknown;
  tileGrid: unknown;
}

export interface WorldShopItemFile {
  itemKey: string;
  name: string;
  description: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  iconEmoji: string;
  isPremium: boolean;
  stock: number;
}

export interface WorldShopFile {
  format: typeof WORLD_FORMAT;
  shopId: number;
  items: WorldShopItemFile[];
}

// ─── Chaves naturais ───────────────────────────────────────────────────────

/** Chave natural de um ginásio: o mesmo líder pode existir em mapas diferentes. */
export function gymKey(mapSlug: string, leaderName: string): string {
  return `${mapSlug}::${leaderName}`;
}

/** Chave natural de um item de loja. */
export function shopItemKey(shopId: number, itemKey: string): string {
  return `${shopId}::${itemKey}`;
}

// ─── Exportação: banco → arquivo ───────────────────────────────────────────

function asArray<T>(value: unknown, what: string): T[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${what}: esperava uma lista, veio ${typeof value}`);
  }
  return value as T[];
}

/**
 * Converte um mapa do banco (e os ginásios que moram nele) num arquivo.
 * `allMaps` e `allGyms` são necessários para traduzir `targetMapId` → slug e
 * `gymId` → nome do líder.
 */
export function mapToFile(map: MapRow, allMaps: readonly MapRow[], allGyms: readonly GymRow[]): WorldMapFile {
  const slugById = new Map(allMaps.map((m) => [m.id, m.slug]));
  const gymById = new Map(allGyms.map((g) => [g.id, g]));

  const portals = asArray<DbPortal>(map.portals, `mapa ${map.slug}: portals`).map((p) => {
    const targetMapSlug = slugById.get(p.targetMapId);
    if (!targetMapSlug) {
      throw new Error(
        `mapa ${map.slug}: portal "${p.id}" aponta para o mapa #${p.targetMapId}, que não existe`
      );
    }
    const out: WorldPortalFile = {
      id: p.id,
      sourceX: p.sourceX,
      sourceY: p.sourceY,
      targetMapSlug,
      targetMapName: p.targetMapName,
      targetX: p.targetX,
      targetY: p.targetY,
      label: p.label,
    };
    return out;
  });

  const npcs = asArray<DbNpc>(map.npcs, `mapa ${map.slug}: npcs`).map((n) => {
    let gymLeaderName: string | undefined;
    if (n.gymId !== undefined && n.gymId !== null) {
      const gym = gymById.get(n.gymId);
      if (!gym) {
        throw new Error(
          `mapa ${map.slug}: NPC "${n.id}" aponta para o ginásio #${n.gymId}, que não existe`
        );
      }
      if (gym.mapId !== map.id) {
        throw new Error(
          `mapa ${map.slug}: NPC "${n.id}" aponta para o ginásio "${gym.name}", que mora em outro mapa (#${gym.mapId}); ` +
            `o arquivo só consegue referenciar ginásios do próprio mapa`
        );
      }
      gymLeaderName = gym.name;
    }
    const out: WorldNpcFile = {
      id: n.id,
      x: n.x,
      y: n.y,
      type: n.type,
      name: n.name,
      shopId: n.shopId,
      gymLeaderName,
      dialog: n.dialog,
    };
    return out;
  });

  const gyms: WorldGymFile[] = allGyms
    .filter((g) => g.mapId === map.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => ({
      leaderName: g.name,
      title: g.title,
      badgeName: g.badgeName,
      badgeEmoji: g.badgeEmoji,
      specialty: g.specialty,
      requiredBadges: g.requiredBadges,
      rewardMoney: g.rewardMoney,
      shopId: g.shopId,
      npcDialog: g.npcDialog,
      defeatDialog: g.defeatDialog,
      winDialog: g.winDialog,
      team: g.team,
    }));

  return {
    format: WORLD_FORMAT,
    slug: map.slug,
    name: map.name,
    description: map.description,
    width: map.width,
    height: map.height,
    creatorUsername: map.creatorUsername,
    isPublished: map.isPublished,
    encounterRate: map.encounterRate,
    encounterTable: map.encounterTable ?? [],
    portals,
    npcs,
    gyms,
    encounterGrid: map.encounterGrid ?? [],
    collisionGrid: map.collisionGrid ?? [],
    tileGrid: map.tileGrid,
  };
}

/** Agrupa os itens por `shopId`; um arquivo por loja, itens ordenados por `itemKey`. */
export function shopsToFiles(rows: readonly ShopRow[]): WorldShopFile[] {
  const byShop = new Map<number, ShopRow[]>();
  for (const row of rows) {
    const list = byShop.get(row.shopId) ?? [];
    list.push(row);
    byShop.set(row.shopId, list);
  }

  return [...byShop.entries()]
    .sort(([a], [b]) => a - b)
    .map(([shopId, items]) => ({
      format: WORLD_FORMAT,
      shopId,
      items: [...items]
        .sort((a, b) => a.itemKey.localeCompare(b.itemKey))
        .map((i) => ({
          itemKey: i.itemKey,
          name: i.name,
          description: i.description,
          category: i.category,
          buyPrice: i.buyPrice,
          sellPrice: i.sellPrice,
          iconEmoji: i.iconEmoji,
          isPremium: i.isPremium,
          stock: i.stock,
        })),
    }));
}

// ─── Importação: arquivo → banco ───────────────────────────────────────────

export interface ResolvedMapRefs {
  portals: DbPortal[];
  npcs: DbNpc[];
}

/**
 * Traduz as referências por nome de um arquivo para os ids **do banco de
 * destino**. `slugToId` deve conter todos os mapas (os do arquivo e os que já
 * existiam); `gymIdByKey` usa `gymKey(mapSlug, leaderName)`.
 */
export function resolveMapRefs(
  file: WorldMapFile,
  slugToId: ReadonlyMap<string, number>,
  gymIdByKey: ReadonlyMap<string, number>
): ResolvedMapRefs {
  const portals = file.portals.map((p) => {
    const targetMapId = slugToId.get(p.targetMapSlug);
    if (targetMapId === undefined) {
      throw new Error(
        `mapa ${file.slug}: portal "${p.id}" aponta para "${p.targetMapSlug}", que não existe no destino nem nos arquivos`
      );
    }
    const out: DbPortal = {
      id: p.id,
      sourceX: p.sourceX,
      sourceY: p.sourceY,
      targetMapId,
      targetMapName: p.targetMapName,
      targetX: p.targetX,
      targetY: p.targetY,
      label: p.label,
    };
    return stripUndefined(out);
  });

  const npcs = file.npcs.map((n) => {
    let gymId: number | undefined;
    if (n.gymLeaderName !== undefined) {
      gymId = gymIdByKey.get(gymKey(file.slug, n.gymLeaderName));
      if (gymId === undefined) {
        throw new Error(
          `mapa ${file.slug}: NPC "${n.id}" aponta para o líder "${n.gymLeaderName}", que não existe neste mapa`
        );
      }
    }
    const out: DbNpc = {
      id: n.id,
      x: n.x,
      y: n.y,
      type: n.type,
      name: n.name,
      shopId: n.shopId,
      gymId,
      dialog: n.dialog,
    };
    return stripUndefined(out);
  });

  return { portals, npcs };
}

function stripUndefined<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

// ─── Validação leve dos arquivos lidos ─────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMapFile(raw: unknown, source: string): WorldMapFile {
  if (!isRecord(raw)) throw new Error(`${source}: não é um objeto JSON`);
  if (raw.format !== WORLD_FORMAT) {
    throw new Error(`${source}: formato "${String(raw.format)}" desconhecido (esperava ${WORLD_FORMAT})`);
  }
  if (typeof raw.slug !== "string" || !/^[a-z0-9-]+$/.test(raw.slug)) {
    throw new Error(`${source}: slug inválido`);
  }
  for (const key of ["name", "description", "creatorUsername"] as const) {
    if (typeof raw[key] !== "string") throw new Error(`${source}: "${key}" deve ser texto`);
  }
  for (const key of ["width", "height", "encounterRate"] as const) {
    if (typeof raw[key] !== "number") throw new Error(`${source}: "${key}" deve ser número`);
  }
  if (typeof raw.isPublished !== "boolean") throw new Error(`${source}: "isPublished" deve ser booleano`);
  if (!Array.isArray(raw.tileGrid)) throw new Error(`${source}: "tileGrid" deve ser uma grade`);
  for (const key of ["portals", "npcs", "gyms", "encounterTable", "encounterGrid", "collisionGrid"] as const) {
    if (!Array.isArray(raw[key])) throw new Error(`${source}: "${key}" deve ser uma lista`);
  }
  for (const gym of raw.gyms as unknown[]) {
    if (!isRecord(gym) || typeof gym.leaderName !== "string" || gym.leaderName.trim() === "") {
      throw new Error(`${source}: ginásio sem "leaderName"`);
    }
  }
  return raw as unknown as WorldMapFile;
}

export function parseShopFile(raw: unknown, source: string): WorldShopFile {
  if (!isRecord(raw)) throw new Error(`${source}: não é um objeto JSON`);
  if (raw.format !== WORLD_FORMAT) {
    throw new Error(`${source}: formato "${String(raw.format)}" desconhecido (esperava ${WORLD_FORMAT})`);
  }
  if (typeof raw.shopId !== "number" || !Number.isInteger(raw.shopId) || raw.shopId <= 0) {
    throw new Error(`${source}: "shopId" deve ser inteiro positivo`);
  }
  if (!Array.isArray(raw.items)) throw new Error(`${source}: "items" deve ser uma lista`);
  const seen = new Set<string>();
  for (const item of raw.items as unknown[]) {
    if (!isRecord(item) || typeof item.itemKey !== "string" || item.itemKey === "") {
      throw new Error(`${source}: item sem "itemKey"`);
    }
    if (seen.has(item.itemKey)) throw new Error(`${source}: itemKey "${item.itemKey}" repetido`);
    seen.add(item.itemKey);
  }
  return raw as unknown as WorldShopFile;
}

// ─── Serialização com diff legível ─────────────────────────────────────────

function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

/**
 * JSON com 2 espaços, mas **listas de primitivos ficam numa linha só**.
 *
 * O motivo é o `tileGrid`: com `JSON.stringify(…, null, 2)` uma grade 16×16
 * vira 256 linhas de `"grass",`, e mudar um tile aparece no diff como
 * reescrita do arquivo inteiro. Com uma fileira por linha, o diff mostra a
 * linha do mapa que mudou. Chaves com `undefined` são omitidas, como no JSON
 * padrão.
 */
export function stringifyContent(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  const padIn = "  ".repeat(indent + 1);

  if (isPrimitive(value)) return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every(isPrimitive)) {
      return `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
    }
    const items = value.map((v) => `${padIn}${stringifyContent(v, indent + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "{}";
  const lines = entries.map(
    ([k, v]) => `${padIn}${JSON.stringify(k)}: ${stringifyContent(v, indent + 1)}`
  );
  return `{\n${lines.join(",\n")}\n${pad}}`;
}
