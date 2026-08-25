import { db } from "@/db";
import { gymLeaders } from "@/db/schema";
import { count } from "drizzle-orm";

export interface GymPokemon {
  pokedexId: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  move1: string;
  move2: string;
  move3: string;
  move4: string;
  sprite: string;
}

export async function ensureGymSeeded() {
  const existing = await db.select({ value: count() }).from(gymLeaders);
  if (existing[0].value > 0) return;

  await db.insert(gymLeaders).values([
    // ── Ginásio 1: Mapa 1 – Lider Brock (Pedra) ──────────────────────────
    {
      mapId: 1,
      name: "Brock",
      title: "Líder do Ginásio Pewter",
      badgeName: "Insígnia Pedra",
      badgeEmoji: "🪨",
      specialty: "Rock",
      requiredBadges: 0,
      rewardMoney: 1500,
      npcDialog: "Sou Brock, Líder do Ginásio de Pewter! Minhas rochas esmagarão seus sonhos!",
      defeatDialog: "Boa sorte nos próximos ginásios... você vai precisar.",
      winDialog: "Impossível! Você derrotou meu Geodude e Onix! Tome a Insígnia Pedra!",
      shopId: 1,
      team: [
        {
          pokedexId: 74, name: "Geodude", level: 12,
          hp: 52, maxHp: 52, attack: 28, defense: 30, spAttack: 18, spDefense: 18, speed: 15,
          move1: "Ataque de Rocha", move2: "Investida", move3: "Defesa Férrea", move4: "Arremessa-Rocha",
          sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/74.gif",
        },
        {
          pokedexId: 95, name: "Onix", level: 14,
          hp: 48, maxHp: 48, attack: 22, defense: 55, spAttack: 12, spDefense: 15, speed: 25,
          move1: "Quebra-Pedra", move2: "Investida", move3: "Encurralar", move4: "Ataque de Cauda",
          sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/95.gif",
        },
      ] as GymPokemon[],
    },

    // ── Ginásio 2: Mapa 2 – Líder Misty (Água) ───────────────────────────
    {
      mapId: 2,
      name: "Misty",
      title: "Líder do Ginásio Cerulean",
      badgeName: "Insígnia Cascata",
      badgeEmoji: "💧",
      specialty: "Water",
      requiredBadges: 1,
      rewardMoney: 2200,
      npcDialog: "Sou Misty! Meus Pokémon Água são os mais poderosos! Prepare-se para molhar!",
      defeatDialog: "Você simplesmente foi superior desta vez…",
      winDialog: "Incrível! Derrotou minha Starmie! Tome a Insígnia Cascata!",
      shopId: 2,
      team: [
        {
          pokedexId: 120, name: "Staryu", level: 18,
          hp: 68, maxHp: 68, attack: 32, defense: 35, spAttack: 45, spDefense: 35, speed: 52,
          move1: "Jato d'Água", move2: "Raio Congelante", move3: "Investida", move4: "Recuperar",
          sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/120.gif",
        },
        {
          pokedexId: 121, name: "Starmie", level: 21,
          hp: 82, maxHp: 82, attack: 38, defense: 42, spAttack: 65, spDefense: 52, speed: 72,
          move1: "Jato d'Água", move2: "Psíquico", move3: "Raio Congelante", move4: "Recuperar",
          sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/121.gif",
        },
      ] as GymPokemon[],
    },

    // ── Ginásio 3: Mapa 3 – Líder Lance (Dragão) ──────────────────────────
    {
      mapId: 3,
      name: "Lance",
      title: "Campeão do Conselho dos Quatro",
      badgeName: "Insígnia do Dragão",
      badgeEmoji: "🐉",
      specialty: "Dragon",
      requiredBadges: 2,
      rewardMoney: 5000,
      npcDialog: "Sou Lance, Mestre dos Dragões! Derrotar-me é conquistar os céus! Você está pronto?",
      defeatDialog: "Meus dragões são invencíveis… continue treinando.",
      winDialog: "Extraordinário! Você domou meu Dragonite! Tome a lendária Insígnia do Dragão!",
      shopId: 3,
      team: [
        {
          pokedexId: 148, name: "Dragonair", level: 38,
          hp: 145, maxHp: 145, attack: 72, defense: 65, spAttack: 75, spDefense: 65, speed: 70,
          move1: "Garra Dragão", move2: "Choque do Trovão", move3: "Raio Congelante", move4: "Hiper Raio",
          sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/148.gif",
        },
        {
          pokedexId: 149, name: "Dragonite", level: 45,
          hp: 185, maxHp: 185, attack: 105, defense: 85, spAttack: 95, spDefense: 90, speed: 75,
          move1: "Garra Dragão", move2: "Lança-Chamas", move3: "Choque do Trovão", move4: "Terremoto",
          sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/149.gif",
        },
      ] as GymPokemon[],
    },
  ]);
}
