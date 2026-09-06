import { describe, expect, it } from "vitest";
import {
  computeDelugeStats,
  getPokemonSpecies,
  movesAtLevel,
  moveSlots,
} from "./pokedex";
import { xpToNextLevel } from "./engine/xp";
import { gmCreatePokemon, gmSetLevel, type GmPokemonRow } from "./gm";

/**
 * Testes unitários dos comandos GM (`src/lib/gm.ts`).
 *
 * A lógica tem que seguir o MESMO caminho do motor de batalha (stats por
 * nível, learnset, evolução com catch-up). Os casos abaixo travam isso com
 * espécies de linha conhecida:
 *  - Charmander (4) → Charmeleon (5, nv 16) → Charizard (6, nv 36)
 *  - Togepi (175) → Togetic (176, nv 20)
 *  - Pikachu (25) NÃO evolui por nível: a pedra de Trovão é caminho próprio.
 */

function row(overrides: Partial<GmPokemonRow> & { pokedexId: number; level: number }): GmPokemonRow {
  const { pokedexId, level, ...rest } = overrides;
  const species = getPokemonSpecies(pokedexId);
  const stats = computeDelugeStats(species, level, "Normal");
  const moves = moveSlots(movesAtLevel(species, level));
  return {
    id: 1,
    pokedexId: species.id,
    nickname: null,
    name: species.name,
    variant: "Normal",
    level,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    spAttack: stats.spAttack,
    spDefense: stats.spDefense,
    speed: stats.speed,
    move1: moves.move1,
    move2: moves.move2,
    move3: moves.move3,
    move4: moves.move4,
    xp: 0,
    ...rest,
  };
}

describe("gmSetLevel (subir nível)", () => {
  it("cruzar o gatilho evolui e mantém HP cheio", () => {
    const out = gmSetLevel(row({ pokedexId: 4, level: 5 }), 16);

    expect(out.pokedexId).toBe(5);
    expect(out.name).toBe("Charmeleon");
    expect(out.evolved).toEqual({ fromName: "Charmander", toName: "Charmeleon" });

    const expected = computeDelugeStats(getPokemonSpecies(5), 16, "Normal");
    expect(out.level).toBe(16);
    expect(out.hp).toBe(expected.maxHp);
    expect(out.maxHp).toBe(expected.maxHp);
    expect(out.attack).toBe(expected.attack);
    expect(out.xp).toBe(0);
    expect(out.xpToNextLevel).toBe(xpToNextLevel(16));
  });

  it("aprende os golpes do learnset no nível alcançado e lista os novos", () => {
    const out = gmSetLevel(row({ pokedexId: 4, level: 5 }), 16);
    const expectedMoves = moveSlots(movesAtLevel(getPokemonSpecies(5), 16));

    expect({ move1: out.move1, move2: out.move2, move3: out.move3, move4: out.move4 }).toEqual(
      expectedMoves
    );
    // No nível 5 o Charmander só conhecia Arranhão/Brasa.
    expect(out.newMoves).toContain("Redemoinho de Fogo");
    expect(out.newMoves).toContain("Garra de Metal");
    expect(out.newMoves).not.toContain("Arranhão");
  });

  it("salto grande segue a cadeia até o estágio final (catch-up)", () => {
    const out = gmSetLevel(row({ pokedexId: 4, level: 5 }), 36);

    expect(out.pokedexId).toBe(6);
    expect(out.name).toBe("Charizard");
    expect(out.evolved).toEqual({ fromName: "Charmander", toName: "Charizard" });
    expect(out.move4).toBe("Ataque de Asa"); // WingAttack, nível 34
  });

  it("descer de nível recalcula status e golpes sem desevoluir", () => {
    const out = gmSetLevel(row({ pokedexId: 6, level: 50 }), 10);

    expect(out.pokedexId).toBe(6); // segue Charizard — evolução nunca regride
    expect(out.level).toBe(10);
    const expected = computeDelugeStats(getPokemonSpecies(6), 10, "Normal");
    expect(out.maxHp).toBe(expected.maxHp);
    expect(out.hp).toBe(expected.maxHp);
    expect(out.move1).toBe("Arranhão");
    expect(out.move4).toBe(""); // no nível 10 só conhece 3 golpes
  });

  it("Togepi 19 continua Togepi; 20 vira Togetic", () => {
    expect(gmSetLevel(row({ pokedexId: 175, level: 5 }), 19).pokedexId).toBe(175);
    const out = gmSetLevel(row({ pokedexId: 175, level: 5 }), 20);
    expect(out.pokedexId).toBe(176);
    expect(out.name).toBe("Togetic");
  });

  it("Pikachu não evolui por nível — pedra é caminho próprio (6.4-B)", () => {
    expect(gmSetLevel(row({ pokedexId: 25, level: 30 }), 30).pokedexId).toBe(25);
    expect(gmSetLevel(row({ pokedexId: 25, level: 30 }), 100).pokedexId).toBe(25);
  });

  it("sem gatilho atingido não evolui e não inventa golpe novo", () => {
    const out = gmSetLevel(row({ pokedexId: 133, level: 1 }), 1);

    expect(out.evolved).toBeNull();
    expect(out.newMoves).toEqual([]);
    expect(out.move1).toBe("Investida");
    expect(out.move2).toBe("");
  });
});

describe("gmCreatePokemon (dar Pokémon)", () => {
  it("espécie que já teria evoluído chega no estágio do nível pedido", () => {
    const out = gmCreatePokemon(4, 40, "Normal", null);

    expect(out.pokedexId).toBe(6);
    expect(out.name).toBe("Charizard");
    expect(out.evolvedFrom).toBe("Charmander");

    const expectedStats = computeDelugeStats(getPokemonSpecies(6), 40, "Normal");
    const expectedMoves = moveSlots(movesAtLevel(getPokemonSpecies(6), 40));
    expect(out.maxHp).toBe(expectedStats.maxHp);
    expect(out.hp).toBe(expectedStats.maxHp);
    expect({ move1: out.move1, move2: out.move2, move3: out.move3, move4: out.move4 }).toEqual(
      expectedMoves
    );
    expect(out.xp).toBe(0);
    expect(out.isStarter).toBe(false);
  });

  it("espécie no estágio certo chega como pedida, sem evolução", () => {
    const out = gmCreatePokemon(6, 40, "Normal", null);
    expect(out.pokedexId).toBe(6);
    expect(out.evolvedFrom).toBeNull();
  });

  it("variante não Normal afeta os status (Shiny = +HP/+VEL)", () => {
    const normal = gmCreatePokemon(25, 5, "Normal", null);
    const shiny = gmCreatePokemon(25, 5, "Shiny", "Raio");

    const normalStats = computeDelugeStats(getPokemonSpecies(25), 5, "Normal");
    const shinyStats = computeDelugeStats(getPokemonSpecies(25), 5, "Shiny");
    expect(normal.maxHp).toBe(normalStats.maxHp);
    expect(shiny.maxHp).toBe(shinyStats.maxHp);
    expect(shiny.maxHp).toBeGreaterThan(normal.maxHp);
    expect(shiny.nickname).toBe("Raio");
  });

  it("nível 100 é aceito e zera a barra de XP", () => {
    const out = gmCreatePokemon(150, 100, "Normal", null);
    expect(out.level).toBe(100);
    expect(out.xpToNextLevel).toBe(0);
  });

  it("espécie fora da Pokédex lança (a rota converte em 400)", () => {
    expect(() => gmCreatePokemon(999, 5, "Normal", null)).toThrow();
  });
});
