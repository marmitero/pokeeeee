/**
 * Exporta o mundo (mapas + ginásios + lojas) do banco para `content/world/`.
 *
 *   DATABASE_URL=... npm run world:export
 *
 * Grava um arquivo por mapa (`maps/<slug>.json`, com os ginásios do mapa
 * dentro) e um por loja (`shops/<shopId>.json`). Arquivos de mapas/lojas que
 * não existem mais no banco são removidos, para o diretório espelhar o banco.
 *
 * O banco é a fonte da verdade em runtime; o diretório é a cópia versionada.
 * Ver `docs/MUNDO-COMO-CODIGO.md`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gameMaps, gymLeaders, shopItems } from "../src/db/schema";
import {
  mapToFile,
  shopsToFiles,
  stringifyContent,
  type GymRow,
  type MapRow,
  type ShopRow,
} from "../src/lib/world-content";
import { WORLD_DIR, connect, describeTarget } from "./world-db.mts";

const { pool, db } = connect();
const root = fileURLToPath(WORLD_DIR);
const mapsDir = path.join(root, "maps");
const shopsDir = path.join(root, "shops");

function writeIfChanged(file: string, content: string): "criado" | "atualizado" | "igual" {
  const existed = fs.existsSync(file);
  if (existed && fs.readFileSync(file, "utf8") === content) return "igual";
  fs.writeFileSync(file, content);
  return existed ? "atualizado" : "criado";
}

function pruneStale(dir: string, keep: Set<string>): string[] {
  if (!fs.existsSync(dir)) return [];
  const removed: string[] = [];
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    if (keep.has(entry)) continue;
    fs.unlinkSync(path.join(dir, entry));
    removed.push(entry);
  }
  return removed;
}

try {
  console.log(`[world:export] origem: ${describeTarget()}`);

  const maps = (await db.select().from(gameMaps).orderBy(gameMaps.slug)) as MapRow[];
  const gyms = (await db.select().from(gymLeaders).orderBy(gymLeaders.name)) as GymRow[];
  const shops = (await db.select().from(shopItems).orderBy(shopItems.shopId, shopItems.itemKey)) as ShopRow[];

  fs.mkdirSync(mapsDir, { recursive: true });
  fs.mkdirSync(shopsDir, { recursive: true });

  const keptMaps = new Set<string>();
  const counts = { criado: 0, atualizado: 0, igual: 0 };

  for (const map of maps) {
    const file = mapToFile(map, maps, gyms);
    const name = `${map.slug}.json`;
    keptMaps.add(name);
    const status = writeIfChanged(path.join(mapsDir, name), stringifyContent(file) + "\n");
    counts[status] += 1;
    console.log(`  mapa  ${map.slug.padEnd(24)} ${status} (${file.gyms.length} ginásio(s))`);
  }

  const keptShops = new Set<string>();
  let itemTotal = 0;
  for (const shop of shopsToFiles(shops)) {
    const name = `${shop.shopId}.json`;
    keptShops.add(name);
    itemTotal += shop.items.length;
    const status = writeIfChanged(path.join(shopsDir, name), stringifyContent(shop) + "\n");
    counts[status] += 1;
    console.log(`  loja  ${String(shop.shopId).padEnd(24)} ${status} (${shop.items.length} item(ns))`);
  }

  const removed = [...pruneStale(mapsDir, keptMaps), ...pruneStale(shopsDir, keptShops)];
  for (const name of removed) console.log(`  removido ${name} (não existe mais no banco)`);

  console.log(
    `[world:export] ${maps.length} mapa(s), ${gyms.length} ginásio(s), ${itemTotal} item(ns) de loja → ` +
      `${counts.criado} criado(s), ${counts.atualizado} atualizado(s), ${counts.igual} igual(is), ${removed.length} removido(s)`
  );
} catch (err) {
  console.error("[world:export] falhou:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
