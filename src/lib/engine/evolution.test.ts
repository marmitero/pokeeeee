import { describe, expect, it } from "vitest";
import { applyEvolution, evolutionAtLevel } from "./evolution";
import { sideFromSpecies } from "./combatant";
import { POKEDEX, getPokemonSpecies } from "../pokedex";

/**
 * Testes da Fase 6.3 — evolução por nível no servidor.
 *
 * O contrato que estes testes travam:
 * - as regras do catálogo são íntegras (alvo existe, gatilho tem nível, sem
 *   ciclos, sem gatilho de item/special antes de existirem);
 * - o estágio certo sai do nível certo (16/32/36/55, e o salto duplo);
 * - a transformação preserva apelido, variante e percentual de HP, e troca
 *   os tipos ainda na mesma batalha;
 * - o motor não sabe se o Pokémon está no time ou no PC — evolui igual.
 */

describe("integridade dos dados de evolução", () => {
  it("todo alvo de evolução existe na Pokédex", () => {
    for (const species of POKEDEX) {
      for (const rule of species.evolvesTo ?? []) {
        expect(
          () => getPokemonSpecies(rule.speciesId),
          `${species.name} evolui para #${rule.speciesId}, que não existe`
        ).not.toThrow();
      }
    }
  });

  it("gatilho de nível tem nível válido; item/special ainda são proibidos", () => {
    for (const species of POKEDEX) {
      for (const rule of species.evolvesTo ?? []) {
        if (rule.trigger === "level") {
          expect(rule.level, `${species.name}: gatilho de nível sem nível`).toBeDefined();
          expect(rule.level!).toBeGreaterThanOrEqual(2);
          expect(rule.level!).toBeLessThanOrEqual(99);
        } else {
          // Quando pedras de evolução existirem (6.4/6.5), este teste e o
          // motor mudam juntos. Citá-las antes só criaria regra morta.
          throw new Error(
            `${species.name}: gatilho "${rule.trigger}" não implementado na 6.3`
          );
        }
      }
    }
  });

  it("nenhuma espécie evolui para si mesma e não há ciclos", () => {
    for (const species of POKEDEX) {
      for (const rule of species.evolvesTo ?? []) {
        expect(rule.speciesId, `${species.name} evolui para si mesma`).not.toBe(species.id);
      }
      // Seguir a cadeia a partir do nível 100 tem que terminar.
      expect(() => evolutionAtLevel(species.id, 100)).not.toThrow();
    }
  });

  it("ao longo de uma cadeia o nível de gatilho só sobe (sem vai-e-vem)", () => {
    for (const species of POKEDEX) {
      let current = species;
      let lastLevel = 0;
      const seen = new Set<number>();
      while ((current.evolvesTo ?? []).length > 0 && !seen.has(current.id)) {
        seen.add(current.id);
        const rule = current.evolvesTo![0];
        expect(rule.level!, `${species.name}: gatilho desceu na cadeia`).toBeGreaterThan(lastLevel);
        lastLevel = rule.level!;
        current = getPokemonSpecies(rule.speciesId);
      }
    }
  });
});

describe("evolutionAtLevel", () => {
  it("linhas dos iniciais nos níveis canônicos", () => {
    expect(evolutionAtLevel(1, 16)).toBe(2);
    expect(evolutionAtLevel(2, 32)).toBe(3);
    expect(evolutionAtLevel(4, 16)).toBe(5);
    expect(evolutionAtLevel(5, 36)).toBe(6);
    expect(evolutionAtLevel(7, 16)).toBe(8);
    expect(evolutionAtLevel(8, 36)).toBe(9);
  });

  it("um nível abaixo do gatilho não evolui", () => {
    expect(evolutionAtLevel(4, 15)).toBeNull();
    expect(evolutionAtLevel(5, 35)).toBeNull();
    expect(evolutionAtLevel(1, 15)).toBeNull();
  });

  it("salto de nível grande atravessa a cadeia inteira", () => {
    // 15 → 37 numa batalha só: Charmander → Charmeleon → Charizard.
    expect(evolutionAtLevel(4, 37)).toBe(6);
    expect(evolutionAtLevel(1, 40)).toBe(3);
  });

  it("estágios finais e espécies sem linha não evolui", () => {
    expect(evolutionAtLevel(6, 100)).toBeNull();
    expect(evolutionAtLevel(9, 100)).toBeNull();
    expect(evolutionAtLevel(149, 100)).toBeNull();
    expect(evolutionAtLevel(25, 100)).toBeNull(); // Pikachu: Raichu não existe (ainda)
  });

  it("linhas provisórias de pedra/felicidade viram nível 30", () => {
    expect(evolutionAtLevel(120, 30)).toBe(121); // Staryu → Starmie
    expect(evolutionAtLevel(133, 30)).toBe(197); // Eevee → Umbreon
    expect(evolutionAtLevel(148, 55)).toBe(149); // Dragonair → Dragonite (cânon)
  });
});

describe("applyEvolution", () => {
  it("Charmander nível 16 vira Charmeleon com status da nova espécie", () => {
    const side = sideFromSpecies(4, 16, "Normal");

    const outcome = applyEvolution(side);

    expect(outcome).not.toBeNull();
    expect(outcome!.fromName).toBe("Charmander");
    expect(outcome!.toName).toBe("Charmeleon");
    expect(side.pokedexId).toBe(5);
    expect(side.name).toBe("Charmeleon");
    expect(side.displayName).toBe("Charmeleon");
    expect(side.types).toEqual(["Fire"]);

    const esperado = sideFromSpecies(5, 16, "Normal");
    expect(side.maxHp).toBe(esperado.maxHp);
    expect(side.attack).toBe(esperado.attack);
    expect(side.spAttack).toBe(esperado.spAttack);
  });

  it("preserva o percentual de HP — evoluir ferido não cura nem zera", () => {
    const side = sideFromSpecies(4, 16, "Normal");
    side.hp = Math.floor(side.maxHp * 0.4); // 40% de HP

    applyEvolution(side);

    const esperado40 = Math.max(1, Math.floor(side.maxHp * 0.4));
    expect(side.hp).toBe(esperado40);
    expect(side.hp).toBeGreaterThan(0);
    expect(side.hp).toBeLessThan(side.maxHp);
  });

  it("apelido é mantido; sem apelido o nome troca para a nova forma", () => {
    const semApelido = sideFromSpecies(4, 16, "Normal");
    applyEvolution(semApelido);
    expect(semApelido.displayName).toBe("Charmeleon");

    const comApelido = sideFromSpecies(4, 16, "Normal");
    comApelido.displayName = "Foguin";
    applyEvolution(comApelido);
    expect(comApelido.displayName).toBe("Foguin");
    expect(comApelido.name).toBe("Charmeleon"); // coluna `name` é da espécie
  });

  it("variante é respeitada no recálculo ( Metallic evolui com bônus de defesa)", () => {
    const normal = sideFromSpecies(4, 16, "Normal");
    const metallic = sideFromSpecies(4, 16, "Metallic");

    applyEvolution(normal);
    applyEvolution(metallic);

    expect(metallic.defense).toBeGreaterThan(normal.defense);
    expect(metallic.variant).toBe("Metallic");
  });

  it("não faz nada fora do gatilho", () => {
    const side = sideFromSpecies(4, 15, "Normal");
    const antes = { ...side };

    expect(applyEvolution(side)).toBeNull();
    expect(side.pokedexId).toBe(antes.pokedexId);
    expect(side.maxHp).toBe(antes.maxHp);
  });

  it("é agnóstico a time/PC: a mesma entrada produz a mesma saída", () => {
    // O SideState não carrega "estou no time" — e não deve. Quem ganha XP
    // evolui, esteja onde estiver, pelo mesmo código.
    const noTime = sideFromSpecies(7, 16, "Normal");
    const noPC = sideFromSpecies(7, 16, "Normal");

    applyEvolution(noTime);
    applyEvolution(noPC);

    expect(noTime.pokedexId).toBe(noPC.pokedexId);
    expect(noTime.maxHp).toBe(noPC.maxHp);
    expect(noTime.attack).toBe(noPC.attack);
  });

  it("a evolução troca os tipos ainda na mesma batalha", () => {
    // Eevee (Normal) → Umbreon (Dark): a desvantagem nova passa a valer já no
    // turno seguinte, não só na próxima batalha.
    const side = sideFromSpecies(133, 30, "Normal");
    expect(side.types).toEqual(["Normal"]);

    applyEvolution(side);

    expect(side.pokedexId).toBe(197);
    expect(side.types).toEqual(["Dark"]);
  });
});
