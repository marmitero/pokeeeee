# Entrega B — Arena Boss (Etapa C, Fase 8.3)

> Lendário semanal em 2 arenas (mapas 20 e 40), 2 tentativas/dia por arena,
> vitória trava a semana, prêmio em Pk$ + pedra à escolha + 1/1200 do lendário nv 5.

## Boss semanal (`src/lib/boss-rotation.ts`)

- Pool de **47 lendários**. Semana = segunda 00:00 UTC (`weekIdOf`).
- Arena 40 usa **offset 23** (coprimo com 47): as duas arenas **nunca** repetem o
  lendário na mesma semana (garantido por teste).
- Nível `80 + hash % 21` → **80–100**, determinístico por semana+arena.
- Prêmio em dinheiro: `15.000 + 100 × nv` (`bossMoneyForLevel`).

## Regras de negócio (`battle-service.ts` + `api/boss`)

- `start_boss` (em `/api/battle`): valida arena, cria `boss_fights` (tentativa
  registrada **no início** — fugir/desconectar não devolve) e a batalha `kind: "boss"`.
- **Limites**: 2 tentativas/dia por arena (`FOR UPDATE` anti-duplo-clique);
  vitória (`WON`) trava a semana naquela arena; derrota (`LOST`) permite retry.
- Vitória paga: `wins +1`, Pk$ da tabela, `bossStoneChoice` (pedra pendente) e
  rolagem `1/1200` → lendário vencido **nv 5**, time ou PC (`grantBossLegendary`).
- **Captura e fuga bloqueadas** na arena (400 com mensagem temática).
- `GET /api/boss?arenaMapId=`: boss + `attemptsLeft` + `wonThisWeek` +
  `stoneClaimed` + `legendaryGranted`.
- `POST /api/boss claim_stone { arenaMapId, item }`: 1 pedra à escolha (qualquer
  das 21) por vitória semanal; transação com lock, idempotente por semana.

## Mundo

- NPC tipo `"boss"` (ícone 👹) no Santuário Celeste (20) e na Coroa do Mundo (40),
  sobre tiles ocupáveis (`world-expansion.test.ts` trava isso + ausência nas outras).
- `BossModal.tsx`: intro (sprite/nv/tentativas) → luta (HP/log/4 golpes) → resultado
  (Pk$/XP + `StonePicker` com as 21 pedras + aviso do lendário). Pedra pendente pode
  ser retirada depois, direto na intro.

## Banco (migration `0010_boss_arena` + companheiro de produção)

- `boss_fights(id, user_id, arena_map_id CHECK 20/40, week_id, day, status,
  boss_pokedex_id, boss_level, stone_claimed, legendary_granted, …)`.
- `battles.kind` passa a aceitar `"boss"`.
- Companheiro `docs/supabase-production-0010-runtime.sql`: idempotente, validado
  **2×** em clone `TEMPLATE` (conferência `1·1·3·true·1·11` nas duas).

## Testes

- `boss-rotation.test.ts`: 7 (offset, faixa 80–100, semana, prêmio, 1/1200).
- `boss.integration.test.ts`: 8 (status, arenas distintas, arena inválida, limite
  diário, captura/fuga bloqueadas, pedra sem vitória, trava semanal + claim 1×,
  independência entre arenas). Vitória simulada via `boss_fights → WON`
  (vencer um nv 80–100 de verdade é inviável no teste).
- Suíte completa: **323 unit + 128 integração**, tudo verde.
