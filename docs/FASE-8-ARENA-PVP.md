# Arena PvP ranqueada (Etapa C, Fase 8.5)

> ELO com pareamento por fila, ranking global top 50 e temporada semanal com
> recompensas — a Arena ranqueada herda todo o motor de troca com status da 8.4.

## ELO (`src/lib/elo.ts`, puro e testável)

- K-factor **32**, e **24** acima de 2000 (`kFactor`); piso de **100** — ninguém
  desce abaixo (`applyElo` aplica `max(100, …)`).
- Atualizado **só** em `pvp_battles.mode = "ranked"`, dentro da MESMA transação
  do `FINISHED` (`awardResult`). Forfeit e timeout contam como derrota/vitória.
- **Forfeit antes do turno 3**: derrota cheia para quem desistiu, vitória com
  **½ K** para o outro (`halfKForWinner`).
- Amistoso continua sem tocar em ELO (teste existente garante).

## Pareamento por fila (`joinRanked`)

- `POST /api/pvp { action: "join_ranked", pokemonIds }` — **sem código de sala**.
- Procura sala `WAITING` com `|elo − meu| ≤ janela` (150, +50 a cada 30 s de
  espera do anfitrião, `eloMatchWindow`); senão, abre sala nova.
- **Antifarm de pareamento**: mesmo IP (hash FNV-1a, `hashIp`) não pareia.
- Salas ranqueadas **não** aceitam `join_room` (400) nem aparecem na lista de
  salas do lobby (a lista devolve só amistosas).
- Polling de 2,5 s do `PvpArena` serve — sem WebSocket.

## Ranking global (`GET /api/pvp?ranking=1`)

- Devolve **top 50** por ELO (entre quem tem ≥ **10** partidas ranqueadas) + a
  posição do jogador (`position: null` antes das 10).
- A leitura dispara o fechamento preguiçoso da temporada anterior (mesma
  chamada que o 1º `join_ranked` da semana nova).

## Temporada semanal + recompensas (`src/lib/pvp-season.ts`)

- Mesma semana ISO UTC do boss (`weekIdOf`); fechamento **preguiçoso** (sem
  cron): na 1ª chamada da semana nova, a anterior é fotografada em `pvp_seasons`
  e o top 10 recebe na hora:
  - **1º** — 50.000 Pk$ + 5 Cura Total + 5 Restaurador Total;
  - **2º** — 30.000 + 3 + 3; **3º** — 20.000 + 2 + 2;
  - **4º–10º** — 10.000 + 1 + 1.
- Advisory lock por semana (`pg_advisory_xact_lock`) serializa concorrência;
  `onConflictDoNothing` + conferência de pré-existência garantem idempotência
  (não paga duas vezes).

## Antifarm

- **Mesmo par de contas** só pontua ELO **3×/dia** (contado pelas partidas
  `FINISHED` de hoje entre os dois); `wins`/`losses` continuam subindo.
- **Mínimo 10 partidas** para aparecer no top/ranking.
- **Forfeit antes do turno 3** = ½ K (acima).
- **Mesmo IP** não pareia.

## Banco (migration `0012_pvp_ranked_seasons` + companheiro)

- Tabela nova `pvp_seasons(id, week_id, user_id FK users, elo_final, rank,
  reward_claimed, created_at)` + unique `(week_id, user_id)` + índice
  `(week_id, rank)` + checks `rank ≥ 1` / `elo_final ≥ 0`.
- `users.elo` já existia (default 1000, dormente desde a Fase 4) — **sem
  migration** para ele.
- Companheiro `docs/supabase-production-0012-runtime.sql` (regra do incidente
  2026-09-06: tabela nova = RLS + policy + grants + journal). Validado **2×**
  num banco prodsim (0000–0011 + papéis + RLS): conferência idêntica
  `rls_on 1 · runtime_privs 4 · runtime_policy 1 · backup_policy 1 ·
  indexes 2 · checks 2 · migrations 13`; checks e policies provados.

## UI

- `PvpLobby.tsx`: 3 abas — **SALAS** (amistoso por código), **RANQUEADA**
  (busca por fila) e **RANKING** (top 50 + posição do jogador), estética
  Press Start 2P/CRT.
- `PvpArena.tsx`: mostra o modo (`RANQUEADA — vale ELO e ranking`), e a tela de
  espera da fila ("procurando rival de ELO próximo").

## Testes

- `elo.test.ts` (11): simetria, K 32/24, piso 100, vitória ½ K, janela
  crescente, hash de IP.
- `pvp-season.test.ts` (5): semana ISO, semana anterior, recompensas por
  colocação, constantes.
- `pvp-ranked.integration.test.ts` (8): pareamento por fila (mesma sala),
  ELO distante não pareia, mesmo IP não pareia, `join_room` em sala ranqueada
  = 400, forfeit cedo (½ K), antifarm 3×/dia, ranking top 50 + posição null,
  fechamento da temporada com recompensas + idempotência.
- Suíte completa: **374 unit + 141 integração**, `npm run check` verde
  (lint + typecheck + unit + build, 17 rotas).
