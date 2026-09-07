import { db } from "@/db";
import { gymLeaders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GYM_TEAMS } from "@/lib/gym-teams";
export { GYM_TEAMS } from "@/lib/gym-teams";
export type { GymTeamMember } from "@/lib/gym-teams";

/**
 * Seed dos líderes de ginásio.
 *
 * Fase 2 (item 8): o time agora guarda **apenas** `pokedexId`, `level` e
 * `variant`. Status e golpes são derivados da Pokédex em tempo de execução.
 *
 * Antes cada Pokémon tinha `hp`/`attack`/`defense`/`move1..4` escritos à mão
 * (Geodude lvl 12 com `hp: 52`, golpes como \"Arremessa-Rocha\" que não existem
 * no catálogo). Isso desbalanceava a luta contra `computeDelugeStats` e fazia
 * os golpes não resolverem. Linhas antigas no banco continuam funcionando,
 * porque o runtime só lê `pokedexId` e `level`.
 *
 * Etapa C (8.2): o seed virou **insert-if-absent por nome**. Antes era
 * `count() > 0 → return`, o que impediria os 8 líderes das cidades de
 * entrarem em bancos já populados (produção). O nome é a chave estável:
 * `scripts/backfill-balance.ts` também localiza o time por `GYM_TEAMS[name]`,
 * então **o `name` aqui precisa ser idêntico à chave de `GYM_TEAMS`**.
 */

interface GymSeed {
  mapId: number;
  name: keyof typeof GYM_TEAMS;
  title: string;
  badgeName: string;
  badgeEmoji: string;
  specialty: string;
  requiredBadges: number;
  rewardMoney: number;
  npcDialog: string;
  defeatDialog: string;
  winDialog: string;
  shopId: number;
}

const GYM_SEEDS: GymSeed[] = [
  // ── Ginásio 1 — Brock (Pedra) ────────────────────────────────────────
  {
    mapId: 1,
    name: "Brock",
    title: "Líder do Ginásio Pewter",
    badgeName: "Insígnia Pedra",
    badgeEmoji: "🪨",
    specialty: "Rock",
    requiredBadges: 0,
    rewardMoney: 1500,
    npcDialog:
      "Sou Brock, Líder do Ginásio de Pewter! Minhas rochas esmagarão seus sonhos!",
    defeatDialog: "Boa sorte nos próximos ginásios... você vai precisar.",
    winDialog:
      "Impossível! Você derrotou meu Geodude e Onix! Tome a Insígnia Pedra!",
    shopId: 1,
  },

  // ── Ginásio 2 — Misty (Água) ─────────────────────────────────────────
  {
    mapId: 2,
    name: "Misty",
    title: "Líder do Ginásio Cerulean",
    badgeName: "Insígnia Cascata",
    badgeEmoji: "💧",
    specialty: "Water",
    requiredBadges: 1,
    rewardMoney: 2200,
    npcDialog:
      "Sou Misty! Meus Pokémon Água são os mais poderosos! Prepare-se para molhar!",
    defeatDialog: "Você simplesmente foi superior desta vez…",
    winDialog: "Incrível! Derrotou minha Starmie! Tome a Insígnia Cascata!",
    shopId: 2,
  },

  // ── Ginásio 3 — Lance (Dragão) ───────────────────────────────────────
  {
    mapId: 3,
    name: "Lance",
    title: "Campeão do Conselho dos Quatro",
    badgeName: "Insígnia do Dragão",
    badgeEmoji: "🐉",
    specialty: "Dragon",
    requiredBadges: 2,
    rewardMoney: 5000,
    npcDialog:
      "Sou Lance, Mestre dos Dragões! Derrotar-me é conquistar os céus. Você está pronto?",
    defeatDialog: "Meus dragões são invencíveis… continue treinando.",
    winDialog:
      "Extraordinário! Você domou meu Dragonite! Tome a lendária Insígnia do Dragão!",
    shopId: 3,
  },

  // ── Etapa C: um líder por cidade (mapas 5→40) ─────────────────────────
  // Pré-requisito em escada (3→10) e recompensa crescente. Times em
  // `GYM_TEAMS`, tirados da tabela de encontros da própria cidade.
  {
    mapId: 5,
    name: "Coralina",
    title: "Líder do Ginásio de Vermilion",
    badgeName: "Insígnia Concha",
    badgeEmoji: "🐚",
    specialty: "Water",
    requiredBadges: 3,
    rewardMoney: 7000,
    npcDialog:
      "Sou Coralina! O mar me ensinou paciência — e a afogar a pressa dos desafiantes!",
    defeatDialog: "A maré virou contra mim… volte quando souber nadar.",
    winDialog:
      "Que correnteza! Você merece a Insígnia Concha. O oceano te respeita!",
    shopId: 4,
  },
  {
    mapId: 10,
    name: "Glacio",
    title: "Líder do Ginásio Glacial",
    badgeName: "Insígnia Floco",
    badgeEmoji: "❄️",
    specialty: "Ice",
    requiredBadges: 4,
    rewardMoney: 9000,
    npcDialog:
      "Sou Glacio. Aqui o frio separa os treinadores dos turistas. Vamos ver de que lado você está.",
    defeatDialog: "Congelado… literalmente. Aqueça-se e tente de novo.",
    winDialog:
      "Impossível derreter… você passou! Tome a Insígnia Floco!",
    shopId: 5,
  },
  {
    mapId: 15,
    name: "Nerissa",
    title: "Líder do Ginásio Abissal",
    badgeName: "Insígnia Profundeza",
    badgeEmoji: "🌊",
    specialty: "Water",
    requiredBadges: 5,
    rewardMoney: 12000,
    npcDialog:
      "Sou Nerissa, voz da fossa. Poucos descem até aqui — menos ainda voltam com uma insígnia.",
    defeatDialog: "O abismo te engoliu… respire fundo e desça outra vez.",
    winDialog:
      "Você tocou o fundo e voltou! A Insígnia Profundeza é sua!",
    shopId: 6,
  },
  {
    mapId: 20,
    name: "Ventus",
    title: "Líder do Ginásio Celeste",
    badgeName: "Insígnia Templo",
    badgeEmoji: "⛩️",
    specialty: "Flying",
    requiredBadges: 6,
    rewardMoney: 15000,
    npcDialog:
      "Sou Ventus, guardião do Santuário. Só quem voa alto entra no templo — mostre suas asas!",
    defeatDialog: "O vento te derrubou… o templo espera sua volta.",
    winDialog:
      "Você voa como os dragões do santuário! Tome a Insígnia Templo!",
    shopId: 7,
  },
  {
    mapId: 25,
    name: "Ferrao",
    title: "Líder do Ginásio da Forja",
    badgeName: "Insígnia Bigorna",
    badgeEmoji: "⚙️",
    specialty: "Steel",
    requiredBadges: 7,
    rewardMoney: 18000,
    npcDialog:
      "Sou Ferrao! Esta forja molda aço e treinadores. Aguenta o martelo?",
    defeatDialog: "Amassado como chapa fina… volte quando for aço.",
    winDialog:
      "Temperado a fogo alto! Você forjou a Insígnia Bigorna!",
    shopId: 8,
  },
  {
    mapId: 30,
    name: "Tormenta",
    title: "Líder do Ginásio do Recife",
    badgeName: "Insígnia Âncora",
    badgeEmoji: "⚓",
    specialty: "Water",
    requiredBadges: 8,
    rewardMoney: 22000,
    npcDialog:
      "Sou Tormenta, capitão deste recife! Meu time bate como ressaca — segure-se!",
    defeatDialog: "Naufragado… o mar cobra pedágio de novo na volta.",
    winDialog:
      "Que travessia! Você ancorou a Insígnia Âncora!",
    shopId: 9,
  },
  {
    mapId: 35,
    name: "Nocturna",
    title: "Líder do Ginásio do Farol",
    badgeName: "Insígnia Lampião",
    badgeEmoji: "🏮",
    specialty: "Ghost",
    requiredBadges: 9,
    rewardMoney: 26000,
    npcDialog:
      "Sou Nocturna, a luz que guia e assombra. As almas do farol querem te conhecer… em batalha!",
    defeatDialog: "Sua luz se apagou… o farol te espera na escuridão.",
    winDialog:
      "Você brilhou mais que o farol! A Insígnia Lampião é sua!",
    shopId: 10,
  },
  {
    mapId: 40,
    name: "Magnus",
    title: "Soberano da Coroa",
    badgeName: "Insígnia Coroa",
    badgeEmoji: "👑",
    specialty: "Dragon",
    requiredBadges: 10,
    rewardMoney: 30000,
    npcDialog:
      "Sou Magnus, Soberano da Coroa do Mundo. Dragões de todas as eras me obedecem. Prove que merece o topo!",
    defeatDialog: "O topo ainda não é seu… a coroa pesa para os fracos.",
    winDialog:
      "INCRÍVEL! Você conquistou a Coroa do Mundo! A Insígnia Coroa é sua — você é uma lenda!",
    shopId: 11,
  },
];

export async function ensureGymSeeded() {
  for (const seed of GYM_SEEDS) {
    const exists = await db
      .select({ id: gymLeaders.id })
      .from(gymLeaders)
      .where(eq(gymLeaders.name, seed.name))
      .limit(1);
    if (exists.length > 0) continue;

    await db.insert(gymLeaders).values({
      mapId: seed.mapId,
      name: seed.name,
      title: seed.title,
      badgeName: seed.badgeName,
      badgeEmoji: seed.badgeEmoji,
      specialty: seed.specialty,
      requiredBadges: seed.requiredBadges,
      rewardMoney: seed.rewardMoney,
      npcDialog: seed.npcDialog,
      defeatDialog: seed.defeatDialog,
      winDialog: seed.winDialog,
      shopId: seed.shopId,
      team: GYM_TEAMS[seed.name],
    });
  }
}
