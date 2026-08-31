import type { DelugeVariant } from "@/lib/pokedex";

/**
 * Times dos líderes de ginásio — dados puros, sem banco.
 *
 * Módulo separado de `seed-gym.ts` (Fase 6.1) porque importar o seed arrasta a
 * conexão PostgreSQL junto: `scripts/balance-report.mts` precisa dos níveis dos
 * ginásios e não deve exigir `DATABASE_URL` para imprimir um relatório.
 */
export interface GymTeamMember {
  pokedexId: number;
  level: number;
  variant: DelugeVariant;
}

/**
 * Times dos líderes, fonte única da verdade (Fase 6.1).
 *
 * Estavam embutidos no `insert`, e por isso o script de rebalanceamento
 * precisava repetir os níveis. Duas listas de níveis é uma a mais.
 *
 * Níveis revisados na 6.1 com `scripts/balance-report.mts`: com a curva de XP
 * nova o jogador chega ao primeiro ginásio por volta do nível 10, e Brock
 * 12/14 exigia ~25 batalhas selvagens antes de poder tentar.
 */
export const GYM_TEAMS: Record<string, GymTeamMember[]> = {
  // era 12/14
  Brock: [
    { pokedexId: 74, level: 10, variant: "Normal" },
    { pokedexId: 95, level: 12, variant: "Normal" },
  ],
  // era 18/21, cinco níveis acima de quem tinha acabado de vencer Brock
  Misty: [
    { pokedexId: 120, level: 16, variant: "Normal" },
    { pokedexId: 121, level: 19, variant: "Normal" },
  ],
  // Lance é o desafio de fim de jogo; mantido
  Lance: [
    { pokedexId: 148, level: 38, variant: "Normal" },
    { pokedexId: 149, level: 45, variant: "Normal" },
  ],
};
