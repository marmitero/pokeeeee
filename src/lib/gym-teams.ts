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
  // ── Etapa C (8.2): um líder por cidade (mapas 5→40), times tirados da
  // tabela de encontros da própria cidade, no topo da banda do mapa ──────
  Coralina: [
    { pokedexId: 363, level: 24, variant: "Normal" },
    { pokedexId: 366, level: 27, variant: "Normal" },
  ],
  Glacio: [
    { pokedexId: 86, level: 33, variant: "Normal" },
    { pokedexId: 361, level: 37, variant: "Normal" },
  ],
  Nerissa: [
    { pokedexId: 610, level: 43, variant: "Normal" },
    { pokedexId: 147, level: 45, variant: "Normal" },
    { pokedexId: 594, level: 47, variant: "Normal" },
  ],
  Ventus: [
    { pokedexId: 329, level: 54, variant: "Normal" },
    { pokedexId: 621, level: 56, variant: "Normal" },
    { pokedexId: 169, level: 58, variant: "Normal" },
  ],
  Ferrao: [
    { pokedexId: 262, level: 64, variant: "Normal" },
    { pokedexId: 305, level: 66, variant: "Normal" },
    { pokedexId: 510, level: 68, variant: "Normal" },
  ],
  Tormenta: [
    { pokedexId: 57, level: 75, variant: "Normal" },
    { pokedexId: 55, level: 77, variant: "Normal" },
    { pokedexId: 454, level: 79, variant: "Normal" },
  ],
  Nocturna: [
    { pokedexId: 31, level: 86, variant: "Normal" },
    { pokedexId: 429, level: 88, variant: "Normal" },
    { pokedexId: 593, level: 90, variant: "Normal" },
  ],
  Magnus: [
    { pokedexId: 373, level: 95, variant: "Normal" },
    { pokedexId: 445, level: 97, variant: "Normal" },
    { pokedexId: 635, level: 100, variant: "Normal" },
  ],
};
