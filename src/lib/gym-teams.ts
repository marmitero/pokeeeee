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
 * Níveis restaurados na 6.2-C (decisão do mantenedor): Brock 12/14 e Misty
 * 18/21 — os valores originais que a 6.1 tinha baixado para 10/12 e 16/19.
 * Com a curva de XP de volta a `nível³ × 0,8` e o mapa 1 pronto para receber
 * criaturas de nível 2–7, o treino até o nível 12 volta a ser progressão
 * normal, e o ginásio recupera o papel de porta de entrada exigente.
 * Medição em `scripts/balance-report.mts`.
 */
export const GYM_TEAMS: Record<string, GymTeamMember[]> = {
  // 6.1 baixou para 10/12; 6.2-C restaura os níveis originais
  Brock: [
    { pokedexId: 74, level: 12, variant: "Normal" },
    { pokedexId: 95, level: 14, variant: "Normal" },
  ],
  // 6.1 baixou para 16/19; 6.2-C restaura os níveis originais
  Misty: [
    { pokedexId: 120, level: 18, variant: "Normal" },
    { pokedexId: 121, level: 21, variant: "Normal" },
  ],
  // Lance é o desafio de fim de jogo; mantido
  Lance: [
    { pokedexId: 148, level: 38, variant: "Normal" },
    { pokedexId: 149, level: 45, variant: "Normal" },
  ],
};
