/**
 * Importa o mundo de `content/world/` para o banco.
 *
 *   DATABASE_URL=... npm run world:import -- --dry-run   # mostra e desfaz
 *   DATABASE_URL=... npm run world:import                # aplica
 *
 * Garantias:
 *   - **idempotente**: casa por chave natural (mapa = slug; ginásio =
 *     (mapSlug, leaderName); item = (shopId, itemKey)). Cria o que falta,
 *     atualiza o que difere, deixa igual o que já está igual;
 *   - **nunca apaga**: mapa, ginásio ou item que só existe no banco fica lá;
 *   - **transacional**: qualquer erro desfaz tudo — inclusive referência
 *     quebrada (portal para slug desconhecido, NPC para líder desconhecido);
 *   - **ids do destino**: portais e NPCs são resolvidos num segundo passo,
 *     depois que todos os mapas e ginásios já têm id no banco de destino.
 *
 * Ver `docs/MUNDO-COMO-CODIGO.md`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, asc, eq, sql } from "drizzle-orm";
import { gameMaps, gymLeaders, shopItems } from "../src/db/schema";
import {
  gymKey,
  parseMapFile,
  parseShopFile,
  resolveMapRefs,
  shopItemKey,
  type WorldMapFile,
  type WorldShopFile,
} from "../src/lib/world-content";
import { WORLD_DIR, connect, describeTarget } from "./world-db.mts";

const dryRun = process.argv.includes("--dry-run");
const { pool, db } = connect();
const root = fileURLToPath(WORLD_DIR);

class DryRunRollback extends Error {}

function readJsonDir<T>(dir: string, parse: (raw: unknown, source: string) => T): T[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const full = path.join(dir, f);
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(full, "utf8"));
      } catch (err) {
        throw new Error(`${full}: JSON inválido (${err instanceof Error ? err.message : err})`);
      }
      return parse(raw, path.relative(root, full));
    });
}

/** Comparação estrutural com chaves ordenadas — para não "atualizar" o que já está igual. */
function same(a: unknown, b: unknown): boolean {
  return canon(a) === canon(b);
}
function canon(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canon(v)}`).join(",")}}`;
}

interface Tally {
  criados: number;
  atualizados: number;
  iguais: number;
}
const tally = { mapas: t(), ginasios: t(), itens: t() };
function t(): Tally {
  return { criados: 0, atualizados: 0, iguais: 0 };
}
function fmt(x: Tally): string {
  return `${x.criados} criado(s), ${x.atualizados} atualizado(s), ${x.iguais} igual(is)`;
}

try {
  console.log(`[world:import] destino: ${describeTarget()}${dryRun ? "  (dry-run: nada será gravado)" : ""}`);

  const mapFiles = readJsonDir<WorldMapFile>(path.join(root, "maps"), parseMapFile);
  const shopFiles = readJsonDir<WorldShopFile>(path.join(root, "shops"), parseShopFile);

  const slugs = new Set<string>();
  for (const m of mapFiles) {
    if (slugs.has(m.slug)) throw new Error(`slug "${m.slug}" aparece em mais de um arquivo`);
    slugs.add(m.slug);
  }
  const shopIds = new Set<number>();
  for (const s of shopFiles) {
    if (shopIds.has(s.shopId)) throw new Error(`shopId ${s.shopId} aparece em mais de um arquivo`);
    shopIds.add(s.shopId);
  }

  console.log(`[world:import] lidos ${mapFiles.length} mapa(s) e ${shopFiles.length} loja(s) de content/world/`);

  await db.transaction(async (tx) => {
    // ── Passo 1: mapas, sem portais/NPCs (eles dependem de ids que ainda não existem) ──
    const existingMaps = await tx.select().from(gameMaps);
    const slugToId = new Map(existingMaps.map((m) => [m.slug, m.id]));
    const existingBySlug = new Map(existingMaps.map((m) => [m.slug, m]));
    /** Mapas pré-existentes cujos campos base mudaram no passo 1 (o veredito sai no passo 3). */
    const baseChanged = new Map<string, boolean>();

    for (const file of mapFiles) {
      const base = {
        name: file.name,
        description: file.description,
        width: file.width,
        height: file.height,
        tileGrid: file.tileGrid,
        encounterTable: file.encounterTable,
        encounterGrid: file.encounterGrid,
        collisionGrid: file.collisionGrid,
        encounterRate: file.encounterRate,
        creatorUsername: file.creatorUsername,
        isPublished: file.isPublished,
      };
      const current = existingBySlug.get(file.slug);
      if (!current) {
        const [row] = await tx
          .insert(gameMaps)
          .values({ slug: file.slug, ...base, portals: [], npcs: [] })
          .returning({ id: gameMaps.id });
        slugToId.set(file.slug, row.id);
        tally.mapas.criados += 1;
        console.log(`  mapa  ${file.slug.padEnd(24)} criado (#${row.id})`);
      } else {
        // portais/NPCs entram no passo 3; aqui só o resto.
        const unchanged = (Object.keys(base) as (keyof typeof base)[]).every((k) => same(base[k], current[k]));
        if (!unchanged) {
          await tx.update(gameMaps).set({ ...base, updatedAt: sql`now()` }).where(eq(gameMaps.id, current.id));
        }
        // O veredito final (atualizado/igual) sai no passo 3, depois dos refs.
        baseChanged.set(file.slug, !unchanged);
      }
    }

    // ── Passo 2: ginásios, casados por (mapa, líder) ──
    const existingGyms = await tx.select().from(gymLeaders).orderBy(asc(gymLeaders.id));
    const idBySlug = (slug: string) => {
      const id = slugToId.get(slug);
      if (id === undefined) throw new Error(`mapa "${slug}" sem id após o passo 1 (bug)`);
      return id;
    };
    const slugById = new Map([...slugToId.entries()].map(([slug, id]) => [id, slug]));
    const gymIdByKey = new Map<string, number>();
    const gymByKey = new Map<string, (typeof existingGyms)[number]>();
    for (const g of existingGyms) {
      const slug = slugById.get(g.mapId);
      if (!slug) continue;
      const key = gymKey(slug, g.name);
      if (gymByKey.has(key)) {
        console.warn(`  aviso: ginásio "${g.name}" duplicado no mapa ${slug} (ids ${gymByKey.get(key)!.id} e ${g.id}); usando o primeiro`);
        continue;
      }
      gymByKey.set(key, g);
      gymIdByKey.set(key, g.id);
    }

    for (const file of mapFiles) {
      const mapId = idBySlug(file.slug);
      for (const gym of file.gyms) {
        const values = {
          mapId,
          name: gym.leaderName,
          title: gym.title,
          badgeName: gym.badgeName,
          badgeEmoji: gym.badgeEmoji,
          specialty: gym.specialty,
          requiredBadges: gym.requiredBadges,
          rewardMoney: gym.rewardMoney,
          team: gym.team,
          npcDialog: gym.npcDialog,
          defeatDialog: gym.defeatDialog,
          winDialog: gym.winDialog,
          shopId: gym.shopId,
        };
        const key = gymKey(file.slug, gym.leaderName);
        const current = gymByKey.get(key);
        if (!current) {
          const [row] = await tx.insert(gymLeaders).values(values).returning({ id: gymLeaders.id });
          gymIdByKey.set(key, row.id);
          tally.ginasios.criados += 1;
          console.log(`  gym   ${`${gym.leaderName}@${file.slug}`.padEnd(24)} criado (#${row.id})`);
        } else if ((Object.keys(values) as (keyof typeof values)[]).every((k) => same(values[k], current[k]))) {
          tally.ginasios.iguais += 1;
        } else {
          await tx.update(gymLeaders).set(values).where(eq(gymLeaders.id, current.id));
          tally.ginasios.atualizados += 1;
          console.log(`  gym   ${`${gym.leaderName}@${file.slug}`.padEnd(24)} atualizado (#${current.id})`);
        }
      }
    }

    // ── Passo 3: portais e NPCs, agora que todo slug e todo líder têm id ──
    for (const file of mapFiles) {
      const { portals, npcs } = resolveMapRefs(file, slugToId, gymIdByKey);
      const mapId = idBySlug(file.slug);
      const current = existingBySlug.get(file.slug);

      if (!current) {
        await tx.update(gameMaps).set({ portals, npcs }).where(eq(gameMaps.id, mapId));
        continue;
      }
      const refsSame = same(portals, current.portals) && same(npcs, current.npcs);
      if (!refsSame) {
        await tx.update(gameMaps).set({ portals, npcs, updatedAt: sql`now()` }).where(eq(gameMaps.id, mapId));
      }
      if (refsSame && !baseChanged.get(file.slug)) {
        tally.mapas.iguais += 1;
      } else {
        tally.mapas.atualizados += 1;
        console.log(`  mapa  ${file.slug.padEnd(24)} atualizado (#${mapId})`);
      }
    }

    // ── Passo 4: lojas, casadas por (shopId, itemKey) ──
    const existingItems = await tx.select().from(shopItems).orderBy(asc(shopItems.id));
    const itemByKey = new Map<string, (typeof existingItems)[number]>();
    for (const i of existingItems) {
      const key = shopItemKey(i.shopId, i.itemKey);
      if (itemByKey.has(key)) {
        console.warn(`  aviso: item "${i.itemKey}" duplicado na loja ${i.shopId} (ids ${itemByKey.get(key)!.id} e ${i.id}); usando o primeiro`);
        continue;
      }
      itemByKey.set(key, i);
    }

    for (const shop of shopFiles) {
      for (const item of shop.items) {
        const values = {
          shopId: shop.shopId,
          itemKey: item.itemKey,
          name: item.name,
          description: item.description,
          category: item.category,
          buyPrice: item.buyPrice,
          sellPrice: item.sellPrice,
          iconEmoji: item.iconEmoji,
          isPremium: item.isPremium,
          stock: item.stock,
        };
        const current = itemByKey.get(shopItemKey(shop.shopId, item.itemKey));
        if (!current) {
          await tx.insert(shopItems).values(values);
          tally.itens.criados += 1;
          console.log(`  item  ${`${item.itemKey}@loja${shop.shopId}`.padEnd(24)} criado`);
        } else if ((Object.keys(values) as (keyof typeof values)[]).every((k) => same(values[k], current[k]))) {
          tally.itens.iguais += 1;
        } else {
          await tx
            .update(shopItems)
            .set(values)
            .where(and(eq(shopItems.shopId, shop.shopId), eq(shopItems.id, current.id)));
          tally.itens.atualizados += 1;
          console.log(`  item  ${`${item.itemKey}@loja${shop.shopId}`.padEnd(24)} atualizado`);
        }
      }
    }

    if (dryRun) throw new DryRunRollback("dry-run");
  });

  console.log(
    `[world:import] mapas: ${fmt(tally.mapas)} · ginásios: ${fmt(tally.ginasios)} · itens: ${fmt(tally.itens)}`
  );
  console.log("[world:import] concluído — COMMIT.");
} catch (err) {
  if (err instanceof DryRunRollback) {
    console.log(
      `[world:import] mapas: ${fmt(tally.mapas)} · ginásios: ${fmt(tally.ginasios)} · itens: ${fmt(tally.itens)}`
    );
    console.log("[world:import] dry-run — ROLLBACK, nada gravado.");
  } else {
    console.error("[world:import] falhou, nada gravado:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
} finally {
  await pool.end();
}
