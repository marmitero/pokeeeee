import { db } from "@/db";
import { gymLeaders } from "@/db/schema";
import { count } from "drizzle-orm";
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
 * (Geodude lvl 12 com `hp: 52`, golpes como "Arremessa-Rocha" que não existem
 * no catálogo). Isso desbalanceava a luta contra `computeDelugeStats` e fazia
 * os golpes não resolverem. Linhas antigas no banco continuam funcionando,
 * porque o runtime só lê `pokedexId` e `level`.
 */


export async function ensureGymSeeded() {
  const existing = await db.select({ value: count() }).from(gymLeaders);
  if (existing[0].value > 0) return;

  await db.insert(gymLeaders).values([
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
      team: GYM_TEAMS.Brock,
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
      team: GYM_TEAMS.Misty,
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
      team: GYM_TEAMS.Lance,
    },
  ]);
}
