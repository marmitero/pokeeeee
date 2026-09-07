/**
 * Redistribuição das 649 espécies nos 40 mapas (Fase 7.1) — CLI do gerador.
 *
 *   npx tsx scripts/world-distribute.mts --report          # diagnóstico no terminal
 *   npx tsx scripts/world-distribute.mts --write           # regrava src/lib/world-encounters.ts
 *   npx tsx scripts/world-distribute.mts --check           # fail se a tabela commitada divergir
 *
 * A lógica fica em `src/lib/world-distribute.ts` (pura, testável). Este script
 * só formata a saída. Depois de `--write`:
 *
 *   npm run world:seed && npm run world:export
 *
 * porque `content/world/` é o espelho versionado do banco, não do código.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { layoutByOrder, WORLD_BANDS, WORLD_MAP_COUNT } from "../src/lib/world-layout";
import { getPokemonSpecies } from "../src/lib/pokedex";
import { distributeWorld, validateDistribution } from "../src/lib/world-distribute";
import { buildDefaultMaps } from "../src/lib/default-world";

const OUT = fileURLToPath(new URL("../src/lib/world-encounters.ts", import.meta.url));
const args = process.argv.slice(2);
const mode = args.includes("--write") ? "write" : args.includes("--check") ? "check" : "report";

const d = distributeWorld();
const problems = validateDistribution(d);

if (mode === "report") {
  console.log(`espécies distribuídas: ${d.assignments.size} | mapa 1 pinado: 5 | total catálogo: ${d.assignments.size + 5}`);
  console.log(`por mapa: min ${d.minCount}, max ${d.maxCount} | ajustes de peso: ${d.weightAdjustments}`);
  console.log(`bioma: ${d.themeMatchPct}% por tipo primário, ${d.anyTypeMatchPct}% por qualquer tipo`);
  console.log(`não colocadas: ${d.unplaced.length}`);
  console.log("");
  for (let n = 1; n <= WORLD_MAP_COUNT; n++) {
    const layout = layoutByOrder(n);
    const band = WORLD_BANDS[n];
    const list = d.encounters[n] ?? [];
    const cast = (d.rows[n] ?? [])
      .map(([id, w, lo, hi, water]) => `${getPokemonSpecies(id).name}:${w}[${lo}-${hi}${water ? "≈" : ""}]`)
      .join(" ");
    if (n === 1) {
      // O mapa 1 não passa pelo gerador: é contrato verbatim da 6.2-C. Lido da
      // própria semente para o relatório nunca contar um mapa 1 que não existe.
      const pinada = buildDefaultMaps()[0]!;
      console.log(
        `M 1 ${layout.shortName.padEnd(24)} nv ${band?.[0]}–${band?.[1]}  n=${String(pinada.encounterTable.length).padStart(2)}  [contrato 6.2-C — pinado em default-world.ts (map1Table)]`
      );
      console.log(
        "      " +
          pinada.encounterTable
            .map((e) => `${e.name}:${e.weight}[${e.minLevel}-${e.maxLevel}${e.tileTypes.includes("water") ? "≈" : ""}]`)
            .join(" ")
      );
      continue;
    }
    console.log(`M${String(n).padStart(2)} ${layout.shortName.padEnd(24)} nv ${band?.[0]}–${band?.[1]}  n=${String(list.length).padStart(2)}  [${layout.types.join("/")}]`);
    console.log(`      ${cast}`);
  }
  if (problems.length) {
    console.log("\nPROBLEMAS:");
    for (const p of problems.slice(0, 40)) console.log(`  ✗ ${p}`);
  } else {
    console.log("\n✓ contrato atendido (649×1, pesos 100, evolução monotônica, lendários ≥M10 e ≤20)");
  }
  process.exitCode = problems.length ? 1 : 0;
} else {
  const body = renderTable();
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (mode === "check") {
    if (problems.length) {
      console.error("[world:distribute] tabela regerada viola o contrato:\n" + problems.slice(0, 20).map((p) => `  ✗ ${p}`).join("\n"));
      process.exitCode = 1;
    } else if (current !== body) {
      console.error("[world:distribute] src/lib/world-encounters.ts está defasada em relação a world-layout.ts + Pokédex.\n  Rode `npm run world:distribute -- --write` e faça `world:seed` + `world:export`.");
      process.exitCode = 1;
    } else {
      console.log("[world:distribute] tabela em dia com o layout e a Pokédex ✓");
    }
  } else {
    if (problems.length) {
      console.error("[world:distribute] abortando: contrato violado:\n" + problems.slice(0, 20).map((p) => `  ✗ ${p}`).join("\n"));
      process.exitCode = 1;
    } else {
      fs.mkdirSync(path.dirname(OUT), { recursive: true });
      fs.writeFileSync(OUT, body);
      console.log(`[world:distribute] escreveu ${path.relative(process.cwd(), OUT)} (${d.assignments.size} espécies em ${Object.keys(d.encounters).length} mapas)`);
    }
  }
}

function renderTable(): string {
  const lines: string[] = [];
  lines.push(`import type { WorldEncounterRow } from "./world-layout";`);
  lines.push("");
  lines.push("/**");
  lines.push(" * TABELA DE ENCONTROS GERADA — **não editar à mão** (Fase 7.1).");
  lines.push(" *");
  lines.push(" * Saída determinística de `src/lib/world-distribute.ts`, regrava com:");
  lines.push(" *");
  lines.push(" *   npm run world:distribute -- --write");
  lines.push(" *");
  lines.push(" * Cada linha é `[pokedexId, peso, minLevel, maxLevel, água]`. Peso e nível já");
  lines.push(" * embutidos de propósito: a escada depende do grafo de evolução (piso de");
  lines.push(" * nível) e da raridade, e o app não precisa carregar `pokedex.ts` + o");
  lines.push(" * distribuidor para renderizar um mapa. Mexeu em `world-layout.ts` ou no");
  lines.push(" * catálogo? regere. O teste `world-distribute.test.ts` trava que este arquivo");
  lines.push(" * bate com uma regeração.");
  lines.push(" *");
  lines.push(` * ${d.assignments.size + 5} espécies: 5 pinadas no mapa 1 (contrato 6.2-C) + ${d.assignments.size} aqui.`);
  lines.push(" */");
  lines.push("");
  lines.push("export const WORLD_ENCOUNTERS: Record<number, readonly WorldEncounterRow[]> = {");
  lines.push("  // Mapa 1: contrato verbatim da 6.2-C — vive em `default-world.ts` (map1Table).");
  for (let n = 2; n <= WORLD_MAP_COUNT; n++) {
    const layout = layoutByOrder(n);
    const band = WORLD_BANDS[n];
    const list = d.rows[n] ?? [];
    lines.push(
      `  // M${n} ${layout.shortName} · nv ${band?.[0]}–${band?.[1]} · ${layout.types.join("/")} · ${list.length} espécies · peso Σ ${list.reduce((a, r) => a + r[1], 0)}`
    );
    const cells = list.map((r) => `[${r.join(", ")}]`).join(", ");
    lines.push(`  ${n}: [${cells}],`);
  }
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}
