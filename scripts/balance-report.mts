/**
 * Relatório de balanceamento (Fase 6.1).
 *
 *   npx tsx scripts/balance-report.mts
 *
 * Existe para que balanceamento seja **medido**, não julgado no olho. Roda o
 * motor real (`sideFromSpecies` + `computeDamage`) com RNG de semente fixa e
 * imprime, para cada confronto, o dano médio, a chance de nocaute em um golpe
 * e quantos turnos a luta dura.
 *
 * Compare a saída antes e depois de qualquer ajuste de stats, golpes ou curva.
 */
import {
  computeDamage,
  maxHitFraction,
  type Rng,
} from "../src/lib/engine/damage";
import { sideFromSpecies, toCombatant, type SideState } from "../src/lib/engine/combatant";
import { applyXp, battleXpGain, STARTER_LEVEL, xpToNextLevel } from "../src/lib/engine/xp";
import { POKEDEX, getPokemonSpecies, movesAtLevel } from "../src/lib/pokedex";
import { GYM_TEAMS } from "../src/lib/gym-teams";

/** Gerador determinístico (mulberry32) — mesma semente, mesmo relatório. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARTERS = [1, 4, 7];
const RUNS = 2000;

function bestMove(attacker: SideState, defender: SideState, rng: Rng) {
  // A IA e o jogador tendem ao golpe mais forte disponível: mede-se o pior caso.
  let best = attacker.moves[0];
  let bestAvg = -1;

  for (const move of attacker.moves) {
    if (move.category === "Status") continue;
    let sum = 0;
    for (let i = 0; i < 200; i++) {
      sum += computeDamage(toCombatant(attacker), toCombatant(defender), move, rng).damage;
    }
    const avg = sum / 200;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = move;
    }
  }

  return best;
}

function duel(attackerId: number, defenderId: number, level: number, rng: Rng) {
  const attacker = sideFromSpecies(attackerId, level, "Normal");
  const defender = sideFromSpecies(defenderId, level, "Normal");
  const move = bestMove(attacker, defender, rng);

  let total = 0;
  let ohko = 0;
  let turns = 0;

  for (let run = 0; run < RUNS; run++) {
    let hp = defender.maxHp;
    let t = 0;
    let first = 0;

    while (hp > 0 && t < 100) {
      const result = computeDamage(toCombatant(attacker), toCombatant(defender), move, rng);
      if (t === 0) first = result.damage;
      hp -= result.damage;
      t += 1;
    }

    total += first;
    if (first >= defender.maxHp) ohko += 1;
    turns += t;
  }

  return {
    attacker: attacker.name,
    defender: defender.name,
    move: `${move.name} (${move.power})`,
    avgDamage: total / RUNS,
    maxHp: defender.maxHp,
    ohkoPct: (ohko / RUNS) * 100,
    turns: turns / RUNS,
  };
}

function section(title: string) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 66 - title.length))}`);
}

const rng = seeded(20260831);

section("Stats e golpes no nível 5");
for (const id of STARTERS) {
  const species = getPokemonSpecies(id);
  const side = sideFromSpecies(id, STARTER_LEVEL, "Normal");
  console.log(
    `${species.name.padEnd(11)} hp=${String(side.maxHp).padStart(3)} ` +
      `atk=${String(side.attack).padStart(2)} def=${String(side.defense).padStart(2)} ` +
      `spA=${String(side.spAttack).padStart(2)} spD=${String(side.spDefense).padStart(2)} ` +
      `spd=${String(side.speed).padStart(2)}  ` +
      side.moves.map((m) => `${m.name}(${m.power})`).join(", ")
  );
}

section("Duelos entre iniciais (nível 5, golpe mais forte, 2000 execuções)");
console.log(
  "atacante → alvo".padEnd(30) +
    "golpe".padEnd(26) +
    "dano".padStart(7) +
    "hp".padStart(5) +
    "OHKO".padStart(7) +
    "turnos".padStart(8)
);
for (const a of STARTERS) {
  for (const d of STARTERS) {
    if (a === d) continue;
    const r = duel(a, d, STARTER_LEVEL, rng);
    console.log(
      `${r.attacker} → ${r.defender}`.padEnd(30) +
        r.move.padEnd(26) +
        r.avgDamage.toFixed(1).padStart(7) +
        String(r.maxHp).padStart(5) +
        `${r.ohkoPct.toFixed(0)}%`.padStart(7) +
        r.turns.toFixed(1).padStart(8)
    );
  }
}

section("Teto de dano por nível do alvo");
console.log(
  [5, 10, 15, 20, 25, 30]
    .map((lvl) => `lvl ${lvl}: ${(maxHitFraction(lvl) * 100).toFixed(0)}%`)
    .join("   ")
);

section("Duelos de meio de jogo (o teto não deve mais valer)");
for (const [a, d, lvl] of [
  [4, 1, 30],
  [1, 7, 30],
  [149, 150, 50],
] as const) {
  const r = duel(a, d, lvl, rng);
  console.log(
    `lvl ${String(lvl).padEnd(3)} ${r.attacker} → ${r.defender}`.padEnd(34) +
      r.move.padEnd(26) +
      `dano ${r.avgDamage.toFixed(1)} / hp ${r.maxHp} · turnos ${r.turns.toFixed(1)}`
  );
}

const brock = GYM_TEAMS.Brock;
section(
  `Primeiro ginásio: Brock (${brock.map((m) => `${getPokemonSpecies(m.pokedexId).name} ${m.level}`).join(" / ")})`
);
for (const starter of STARTERS) {
  for (const lvl of [10, 12]) {
    const linhas = brock.map((member) => {
      const ataque = duel(starter, member.pokedexId, lvl, rng);
      const defesa = duel(member.pokedexId, starter, member.level, rng);
      const meuHp = sideFromSpecies(starter, lvl, "Normal").maxHp;
      const turnosParaMatar = ataque.maxHp / ataque.avgDamage;
      const turnosParaMorrer = meuHp / defesa.avgDamage;
      return (
        `${getPokemonSpecies(member.pokedexId).name} ` +
        `${turnosParaMatar.toFixed(1)}t x ${turnosParaMorrer.toFixed(1)}t` +
        (turnosParaMatar < turnosParaMorrer ? " ✓" : " ✗")
      );
    });
    console.log(
      `${getPokemonSpecies(starter).name.padEnd(11)} lvl ${String(lvl).padStart(2)}: ` +
        linhas.join("  |  ")
    );
  }
}
console.log("  (turnos para vencer x turnos para cair; ✓ = o jogador ganha a troca)");

section("Curva: batalhas selvagens por nível");
console.log("nível  xp p/ subir   xp por vitória (alvo do mesmo nível)   batalhas");
for (const lvl of [5, 8, 10, 12, 15, 20, 25]) {
  const species = getPokemonSpecies(1);
  const total =
    species.baseHp +
    species.baseAtk +
    species.baseDef +
    species.baseSpAtk +
    species.baseSpDef +
    species.baseSpd;
  const gain = battleXpGain(total, lvl, lvl);
  const need = xpToNextLevel(lvl);
  console.log(
    String(lvl).padStart(5) +
      String(need).padStart(13) +
      String(gain).padStart(40) +
      (need / gain).toFixed(1).padStart(11)
  );
}

section("Sanidade do learnset");
let problems = 0;
for (const species of POKEDEX) {
  const atOne = movesAtLevel(species, 1);
  if (atOne.length === 0) {
    console.log(`  ✗ ${species.name} não tem golpe no nível 1`);
    problems += 1;
  }
  const strongEarly = atOne.filter((m) => m.power > 60);
  if (strongEarly.length > 0) {
    console.log(
      `  ✗ ${species.name} começa com golpe forte demais: ` +
        strongEarly.map((m) => `${m.name}(${m.power})`).join(", ")
    );
    problems += 1;
  }
}
console.log(problems === 0 ? "  ✓ todas as espécies ok" : `  ${problems} problema(s)`);

section("XP: level up acumulado a partir do nível 5");
let level = STARTER_LEVEL;
let xp = 0;
let battles = 0;
while (level < 15 && battles < 500) {
  const out = applyXp(level, xp, battleXpGain(318, level, level));
  level = out.newLevel;
  xp = out.newXp;
  battles += 1;
}
console.log(`  ${battles} batalhas contra alvos do próprio nível para ir de 5 a ${level}`);
