import { describe, expect, it } from "vitest";
import { applyEvolution, applyItemEvolution, evolutionAtLevel, evolutionWithItem } from "./evolution";
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

  it("gatilho de nível tem nível válido; item tem itemId; special é proibido", () => {
    for (const species of POKEDEX) {
      for (const rule of species.evolvesTo ?? []) {
        if (rule.trigger === "level") {
          expect(rule.level, `${species.name}: gatilho de nível sem nível`).toBeDefined();
          expect(rule.level!).toBeGreaterThanOrEqual(2);
          expect(rule.level!).toBeLessThanOrEqual(99);
        } else if (rule.trigger === "item") {
          expect(rule.itemId, `${species.name}: gatilho de item sem itemId`).toBeDefined();
          expect(rule.itemId!).toBeGreaterThanOrEqual(1);
          expect(rule.itemId!).toBeLessThanOrEqual(21); // 14 (6.4-B) + 7 de Sinnoh (6.4-D)
        } else {
          throw new Error(`${species.name}: gatilho "special" não implementado`);
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

  it("ao longo de uma cadeia de nível o gatilho só sobe (sem vai-e-vem)", () => {
    for (const species of POKEDEX) {
      let current = species;
      let lastLevel = 0;
      const seen = new Set<number>();
      while ((current.evolvesTo ?? []).length > 0 && !seen.has(current.id)) {
        seen.add(current.id);
        const rule = current.evolvesTo!.find((e) => e.trigger === "level");
        if (!rule) break; // linha só por item/special termina aqui (Eevee etc.)
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
    expect(evolutionAtLevel(150, 100)).toBeNull(); // Mewtwo: lendário sem linha
    expect(evolutionAtLevel(132, 100)).toBeNull(); // Ditto
  });

  it("pedras e trocas saíram do gatilho de nível (6.4-B)", () => {
    expect(evolutionAtLevel(25, 30)).toBeNull(); // Pikachu: agora é pedra de Trovão
    expect(evolutionAtLevel(74, 25)).toBe(75); // Graveler (troca provisional por nível)
    expect(evolutionAtLevel(95, 36)).toBeNull(); // Onix: agora é Revestimento de Metal
    expect(evolutionAtLevel(129, 20)).toBe(130); // Magikarp → Gyarados
    expect(evolutionAtLevel(120, 30)).toBeNull(); // Staryu: agora é Pedra d'Água
    expect(evolutionAtLevel(133, 30)).toBeNull(); // Eevee: agora escolhe pedra
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
    // Togepi (Fairy) → Togetic (Fairy/Flying): a desvantagem nova passa a
    // valer já no turno seguinte, não só na próxima batalha.
    const side = sideFromSpecies(175, 20, "Normal");
    expect(side.types).toEqual(["Fairy"]);

    applyEvolution(side);

    expect(side.pokedexId).toBe(176);
    expect(side.types).toEqual(["Fairy", "Flying"]);
  });
});

describe("evolução por item (6.4-B)", () => {
  it("encontra a regra certa para a pedra da espécie e ignora as erradas", () => {
    expect(evolutionWithItem(25, "thunderStone")?.speciesId).toBe(26);
    expect(evolutionWithItem(25, "fireStone")).toBeNull();
    expect(evolutionWithItem(25, "leafStone")).toBeNull();
    expect(evolutionWithItem(133, "waterStone")?.speciesId).toBe(134);
    expect(evolutionWithItem(133, "thunderStone")?.speciesId).toBe(135);
    expect(evolutionWithItem(133, "fireStone")?.speciesId).toBe(136);
    expect(evolutionWithItem(133, "sunStone")?.speciesId).toBe(196);
    expect(evolutionWithItem(133, "moonStone")?.speciesId).toBe(197);
    expect(evolutionWithItem(1, "thunderStone")).toBeNull();
    expect(evolutionWithItem(25, "naoExiste")).toBeNull();
  });

  it("Pikachu + Pedra de Trovão vira Raichu com stats da nova espécie", () => {
    const side = sideFromSpecies(25, 30, "Normal");
    const antes = side.maxHp;

    const outcome = applyItemEvolution(side, "thunderStone");

    expect(outcome).not.toBeNull();
    expect(outcome!.fromName).toBe("Pikachu");
    expect(outcome!.toName).toBe("Raichu");
    expect(side.pokedexId).toBe(26);
    expect(side.name).toBe("Raichu");
    expect(side.displayName).toBe("Raichu");
    expect(side.types).toEqual(["Electric"]);

    const esperado = sideFromSpecies(26, 30, "Normal");
    expect(side.maxHp).toBe(esperado.maxHp);
    expect(side.attack).toBe(esperado.attack);
    expect(side.spAttack).toBe(esperado.spAttack);
    expect(side.maxHp).toBeGreaterThan(antes);
  });

  it("preserva o percentual de HP e mantém apelido", () => {
    const side = sideFromSpecies(25, 20, "Normal");
    side.hp = Math.floor(side.maxHp * 0.4);
    const fractionBefore = side.hp / side.maxHp;
    side.displayName = "Ratão";

    applyItemEvolution(side, "thunderStone");

    expect(side.displayName).toBe("Ratão");
    expect(side.name).toBe("Raichu");
    const fractionAfter = side.hp / side.maxHp;
    expect(Math.abs(fractionAfter - fractionBefore)).toBeLessThan(0.02);
    expect(side.hp).toBeGreaterThan(0);
    expect(side.hp).toBeLessThan(side.maxHp);
  });

  it("item que não evolui devolve null e não muta o combatente", () => {
    const side = sideFromSpecies(25, 30, "Normal");
    const before = { ...side };

    expect(applyItemEvolution(side, "leafStone")).toBeNull();
    expect(side.pokedexId).toBe(before.pokedexId);
    expect(side.maxHp).toBe(before.maxHp);
    expect(side.types).toEqual(before.types);
  });

  it("Eevee ramifica nas cinco pedras do catálogo", () => {
    const casos: Array<[string, number]> = [
      ["waterStone", 134],
      ["thunderStone", 135],
      ["fireStone", 136],
      ["sunStone", 196],
      ["moonStone", 197],
    ];
    for (const [item, target] of casos) {
      const side = sideFromSpecies(133, 25, "Normal");
      const rule = evolutionWithItem(133, item);
      expect(rule?.speciesId).toBe(target);
      expect(applyItemEvolution(side, item)?.toName).toBe(getPokemonSpecies(target).name);
      expect(side.pokedexId).toBe(target);
    }
  });

  it("Sunkern usa Pedra do Sol (linha que era `special`)", () => {
    const side = sideFromSpecies(191, 20, "Normal");
    expect(evolutionWithItem(191, "sunStone")?.speciesId).toBe(192);
    expect(applyItemEvolution(side, "sunStone")?.toName).toBe("Sunflora");
    expect(side.pokedexId).toBe(192);
  });
});
