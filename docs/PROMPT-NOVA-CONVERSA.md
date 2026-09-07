# Handoff da próxima conversa — Catchbound

> Este arquivo é o handoff de **2026-09-07 (Fase 8.8 — Chat no jogo global/local/whisper + decisão B Pokédex completa 649, PR #13 atualizado)**. Atualize-o ao final de cada nova rodada (mesma função que o histórico do `AI_State.md`). **Nunca apagar histórico**, só acrescentar.

Você é a continuação do agente do projeto **Catchbound** (produção: https://catchbound.vercel.app). Comece **LENDO `AI_State.md` por completo** (regra do protocolo) — em especial a **§2**, que tem o roadmap em 4 etapas — e depois `docs/RELATORIO-POS-ATIVACAO.md`.

---

## ESTADO ATUAL (2026-09-07, Fase 8.8 entregue, aguardando merge)

- ✅ **Produção de pé e atual.** `/api/health` → `{"ok":true,"emailVerification":"ok"}`.
- ✅ Migrations **0006, 0007 e 0008** aplicadas em produção; PR #12 (6.4-D) mergeado em `f6f0d98`. **O mantenedor validou em produção todas as pendências #1–#15** do cabeçalho do `AI_State.md`.
- ✅ **Decisão B do mantenedor (2026-09-07): parar em 649 — Pokédex completa.** Etapa A fechada (Kanto/Johto/Hoenn/Sinnoh/Unova = 649, teto do CDN animado `black-white/animated`). Sem Kalos.
- 🔵 **Fase 6.4-E + 8.8 prontas no branch `arena/01a07b36-pokeeeee`** (PR #13 atualizado):
  - **Unova (494–649)**: 156 espécies novas, Pokédex 493→649, sem migration (reutiliza pedras), proxies troca→nível e felicidade→nível documentados.
  - **Chat no jogo (8.8)**: 3 canais — **GLOBAL** (servidor todo), **LOCAL** (mesmo mapa, `map_id`), **PRIVADO** (whisper, `recipient_id`, só remetente/destinatário, atalho `/w <nome> <msg>`).
    - **Schema**: `chat_messages` + `map_id` + `recipient_id` FK, 3 índices novos, check `IN ('global','local','whisper','arena-global')` → **migration 0009** + SQL companheiro **`docs/supabase-production-0009-runtime.sql`** (idempotente, testado 2× em prodsim: `chat_columns 2 · channel_check 1 · indexes 3 · migrations 10`).
    - **API**: `src/app/api/chat/route.ts` GET (global, local por mapId, whisper com `withUser` ou lista geral + `conversations` agrupadas, `afterId` para polling) e POST (rate limit 30/min, valida mapId e recipientUsername, não pode sussurrar para si mesmo).
    - **UI**: `src/components/ChatWidget.tsx` — botão 💬 colapsado no canto inferior direito com badge total unread, painel expandido 380×420, border 4px amber, bg slate-900, estética Press Start 2P/CRT, tabs GLOBAL/LOCAL/PRIVADO com badges, lista de conversas recentes (whisper), mensagens VT323 com cores por canal, timestamp HH:MM, scroll auto, input por canal + recipient input, polling 4s, `/w` atalho. Integrado em `src/app/page.tsx` (só logado).
    - **Testes**: 297 unit + **112 integração** (9 novos de chat: global, local isolamento por mapa, whisper privado só participantes, self 400, 404, conversas, afterId) + build verde com 15 rotas (+ `/api/chat`).
- ⚠️ **ESTE MERGE TEM PASSO DE BANCO.** Ordem: (1) colar `docs/supabase-production-0009-runtime.sql` no SQL Editor (conferência `chat_columns 2 · channel_check 1 · indexes 3 · migrations 10`); (2) mergear; (3) passada visual #16 (vitrine 649) e #17 (chat GLOBAL/LOCAL/PRIVADO com 2 contas, badge não-lidas).

---

## 🧭 O ROADMAP (redefinido pelo mantenedor em 2026-09-06, atualizado com decisão B em 2026-09-07)

Direção declarada, **em ordem**: primeiro **terminar todos os Pokémon**, depois **construir o mundo até 100 mapas** com lojas, arenas de bosses lendários, ginásios, arena PvP e NPCs de missão. Versão completa: **`AI_State.md` §2**.

| Etapa | O quê | Situação |
|---|---|---|
| **A** | **Pokédex completa** — Kanto/Johto/Hoenn/Sinnoh/Unova (649) — **decisão B: parar em 649, chamar de Pokédex completa** | ✅ **fechada em 649** — sem Kalos — 2026-09-07 |
| **B** | **Mundo até 100 mapas** — 7.1 (21–40), 7.2 (41–60), 7.3 (61–80), 7.4 (81–100), cada lote com a redistribuição das espécies daquela faixa (Hoenn/Sinnoh/Unova nas bandas altas) | ⬜ próxima — começa agora |
| **C** | **Povoar o mundo** — 8.1 lojas por região, 8.2 ginásios 8 + Elite, 8.3 arenas de bosses lendários, 8.4 status de batalha, 8.5 arena PvP ranqueada, 8.6 NPCs de missão, 8.7 treinadores de rota, **8.8 chat dentro do jogo** (GLOBAL/LOCAL/PRIVADO) | ✅ **8.8 feito** — 2026-09-07 — resto ⬜ |
| **D** | **Antes de divulgar** — 9.1 rebranding completo, 9.2 decisão legal de nomes/sprites, 9.3 remetente próprio, 9.4 premium (**bloqueado**) | ⬜ bloqueia monetização |

---

## PRÓXIMA ENTREGA: Etapa B — Mundo até 100 mapas

Com Pokédex fechada em 649 (B) e chat no jogo entregue, a próxima é **7.1 Mapas 21–40**:

- Cada espécie em **exatamente um** mapa, pesos = 100 por mapa, evolução nunca em mapa anterior, lendários ≥ mapa 10 peso ≤20, mapa 1 intocado, cadeia de portais navegável;
- Redistribuição das espécies Hoenn/Sinnoh/Unova nas bandas altas (as 254 atuais viram 649 distribuídas);
- Fluxo: `default-world.ts` + `world:seed` + `world:export` + PR + `World activation` em produção.

Paralelo: Etapa C ainda tem 8.1 lojas por região (venda de itens + fix exploit), 8.2 ginásios, 8.3 bosses lendários, 8.4 status, 8.5 PvP ranqueado, 8.6 missões, 8.7 treinadores.

---

## O QUE CONFERIR PRIMEIRO (nesta ordem)

0. `AI_State.md` inteiro (§2 = roadmap com decisão B; §3/§4.32 = o que a 8.8 entregou).
1. O PR #13 (Unova 649 + Chat) foi mergeado? **Antes do merge** colar `docs/supabase-production-0009-runtime.sql` no SQL Editor (conferência `chat_columns 2 · channel_check 1 · indexes 3 · migrations 10`). Se mergear sem o SQL: chat local/whisper falham com erro de coluna/check.
2. Produção de pé? `/api/health` (sandbox não alcança Supabase; URLs públicas da Vercel passam via `fetch_page`; `curl` a elas falha no TLS).
3. O mantenedor fez a passada #16 (vitrine 649) e #17 (chat GLOBAL/LOCAL/PRIVADO com 2 contas, badge)? Se achou algo, corrigir antes de empilhar mundo.

---

## PROTOCOLO E ARMADILHAS (não redescobrir)

- Todo passo termina atualizando **as 5 seções** do `AI_State.md` + histórico (nunca apagar histórico); **§4 = comandos reais + saída observada**.
- O sandbox reseta entre sessões: se faltar `node_modules`, `npm ci`; `cp .env.example .env`; banco local `npm run db:local` (processo em background) e migrations locais `npx drizzle-kit migrate`.
- `npm run check` precisa de `DATABASE_URL`: `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check`.
- **Egress do sandbox:** `raw.githubusercontent.com` é **bloqueado**; `github.com` passa. Dados da PokeAPI: `git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git` + `git sparse-checkout set data/v2/csv`.
- **Gerar catálogo por script descartável, versionar só a saída** — e conferir as colunas do CSV (`capture_rate` em `pokemon_species.csv`; na 6.4-C veio da coluna errada). Os testes de contrato pegam catchRate errado, golpe forte demais no nível 7 e tipo pobre em golpes fracos. **Corrija o gerador, nunca o teste.**
- **Migration nova:** gerar com `drizzle-kit generate --name …` **depois** de fechar o schema; se precisar regenerar, apague arquivo + snapshot + entrada do journal e recrie o banco local antes — o SQL companheiro grava o **hash sha256 do arquivo final** e o `when` do `_journal.json`, e eles têm que bater. Teste o companheiro 2× num banco que simule produção (migrations anteriores + papel `catchbound_runtime`) para provar idempotência.
- Sprites animados Gen V: **até o id 649** — é o teto do CDN atual. Decisão B: parar em 649, Pokédex completa.
- Suítes de integração: ambiente **sem SMTP** → a rota devolve `devCode` (`helpers.ts registerVerified()`); `beforeEach` com `resetRateLimits()`. O `client()` de teste aceita query string (`/api/shop?shopId=3`, `/api/chat?channel=...`) e `GET`.
- Migrações: `drizzle/0000–0009`; em produção a aplicação é **MANUAL** no SQL Editor do Supabase (o `vercel.json` não roda migration em build).
- **REGRA (incidente 2026-09-06):** produção tem **RLS em TODAS as tabelas** e o papel `catchbound_runtime` só opera onde há policy própria. Tabela nova = migration **+** SQL companheiro `docs/supabase-production-000X-runtime.sql` (coluna nova também ganha companheiro, com grants + journal).
- `docs/world-activation.yml` e `docs/backup*.yml` são espelhos de `.github/workflows/` — mantenha idênticos.
- Mundo em produção vive no **banco**: merge sobe código, mapas exigem o workflow **World activation**. A loja seeda itens novos sozinha (`ensureShopSeeded`, insert-if-ausente) — `content/world/shops/*.json` é regenerado com `world:import` + seed + `world:export`.
- Contrato invariante do mundo: **mapa 1 intocado** (6.2-C).
- Conta de admin para teste: `admin` / `admin12345`.
- Chat: hoje tem `/api/chat` (global/local/whisper) + `/api/pvp` (arena-global legacy) + `/admin` (moderação). O widget no jogo faz polling 4s com `afterId`, badge de não-lidas, `/w` atalho.
