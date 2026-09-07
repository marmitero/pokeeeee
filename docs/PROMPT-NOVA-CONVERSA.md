# Handoff da próxima conversa — Catchbound

> Este arquivo é o handoff de **2026-09-06 (Fase 6.4-D — catálogo Sinnoh +
> itens de evolução + migration 0008, PR aberto)**. Atualize-o ao final de cada
> nova rodada (mesma função que o histórico do `AI_State.md`). **Nunca apagar
> histórico**, só acrescentar.

Você é a continuação do agente do projeto **Catchbound**
(produção: https://catchbound.vercel.app). Comece **LENDO `AI_State.md` por
completo** (regra do protocolo) — em especial a **§2**, que tem o roadmap em 4
etapas — e depois `docs/RELATORIO-POS-ATIVACAO.md`.

---

## ESTADO ATUAL (2026-09-06, Fase 6.4-D entregue, aguardando merge)

- ✅ **Produção de pé e atual.** `/api/health` → `{"ok":true,"emailVerification":"ok"}`.
- ✅ Migrations **0006** e **0007** aplicadas em produção; PRs #9, #10 e #11
  mergeados. **O mantenedor validou em produção todas as pendências #1–#14**
  do cabeçalho do `AI_State.md` (sprites, GM, evoluções, batalha, captura,
  ginásio, editor, e-mail real, chat…).
- 🔵 **Fase 6.4-D pronta no branch `arena/01a078c9-pokeeeee`** (ver PR):
  catálogo **Sinnoh (387–493)**, 106 espécies novas, **Pokédex 387 → 493**.
  - **7 itens de evolução reais** (Protetor, Eletrizador, Magmatizador, Garra
    Afiada, Presa Afiada, Disco Dúbio, Manto do Ceifador) = 7 colunas em
    `users` = **migration `0008_sinnoh_evolution_items`** + SQL companheiro
    **`docs/supabase-production-0008-runtime.sql`** (idempotente, testado 2×
    num banco que simula produção). Vendidos na **loja 3** (4500/5500 Pk$).
  - 20 linhas cruzadas em Kanto/Johto/Hoenn (`// 6.4-D:`), Eevee → Leafeon/
    Glaceon. Só catálogo: `content/world/maps/` intocado (apenas
    `shops/3.json` mudou). Sandbox: 284 unit + 103 integração + build verdes;
    fluxo Rhydon + Protetor → Rhyperior e compra na loja 3 conferidos pela
    API real.
- ⚠️ **ESTE MERGE TEM PASSO DE BANCO.** Ordem: (1) colar
  `docs/supabase-production-0008-runtime.sql` no SQL Editor do Supabase de
  produção (conferência: `sinnoh_columns 7 · check_exists 1 · runtime_grants 4 ·
  migrations 9`); (2) mergear; (3) passada visual (#15): loja 3 com os 7 itens,
  GM → Rhydon + Protetor → `★ Rhydon evoluiu para Rhyperior!`, Riolu lv19 →
  Lucario, vitrine com 493 espécies. Sinnoh **não aparece na grama** — de
  propósito (Etapa B).

---

## 🧭 O ROADMAP (redefinido pelo mantenedor em 2026-09-06)

Direção declarada, **em ordem**: primeiro **terminar todos os Pokémon**, depois
**construir o mundo até 100 mapas** com lojas, arenas de bosses lendários,
ginásios, arena PvP e NPCs de missão. Versão completa: **`AI_State.md` §2**.

| Etapa | O quê | Situação |
|---|---|---|
| **A** | **Pokédex completa** — 6.4-E Unova (→649), 6.4-F além do 649 (decisão de arte), 6.4-G formas especiais | 🔵 **em andamento** — Kanto/Johto/Hoenn/Sinnoh prontos (**493**) |
| **B** | **Mundo até 100 mapas** — 7.1 (21–40), 7.2 (41–60), 7.3 (61–80), 7.4 (81–100), cada lote com a redistribuição das espécies daquela faixa | ⬜ depois da Etapa A |
| **C** | **Povoar o mundo** — 8.1 lojas por região (+ venda de itens, fix do exploit de `quantity`), 8.2 ginásios 8 + Elite, 8.3 arenas de bosses lendários, 8.4 status de batalha, 8.5 arena PvP ranqueada, 8.6 NPCs de missão, 8.7 treinadores de rota, **8.8 chat dentro do jogo** (pedido novo do mantenedor: bonito e não poluente; hoje só existe no admin e na arena PvP) | ⬜ pode andar em paralelo à B quando o 1º lote de mapas existir |
| **D** | **Antes de divulgar** — 9.1 rebranding completo, 9.2 decisão legal de nomes/sprites, 9.3 remetente próprio, 9.4 premium (**bloqueado**) | ⬜ bloqueia monetização |

---

## PRÓXIMA ENTREGA: 6.4-E — Unova (494–649)

+156 espécies, Pokédex **493 → 649**, no mesmo padrão da 6.4-C/6.4-D:

- `src/lib/pokedex-unova.ts`, dados canônicos da PokeAPI (`git clone --sparse`);
- linhas evolutivas completas, learnsets derivados dos 133 golpes já
  existentes, curva da 6.2-C respeitada (nada acima de poder 50 nos níveis ≤7
  — o CI **pega** isso);
- **sem tocar em `content/world/maps/`** — encontros só na Etapa B;
- `pokedex-unova.test.ts` novo + contagens de `pokedex-gen1.test.ts`,
  `pokedex-hoenn.test.ts`, `pokedex-sinnoh.test.ts` e
  `world-expansion.test.ts` atualizadas.

⚠️ **Atenção na Unova:**
- É o **teto do CDN animado** (`black-white/animated` vai até o id **649**).
  De 650 em diante é decisão de arte/produto (6.4-F) — **perguntar ao
  mantenedor antes** de qualquer Kalos.
- Provavelmente **sem migration**: as pedras existentes cobrem Pansage/Pansear/
  Panpour, Munna, Cottonee/Petilil, Minccino, Lampent, Eelektrik; trocas
  (Boldore, Gurdurr, Karrablast↔Shelmet) viram nível como nas fases anteriores.
  Confirmar no `pokemon_evolution.csv` antes de decidir.
- Formas (Darmanitan Zen, Basculin, Deerling/Sawsbuck, Kyurem, Keldeo,
  Meloetta, Genesect): só a forma base, como Rotom/Burmy na 6.4-D.

---

## O QUE CONFERIR PRIMEIRO (nesta ordem)

0. `AI_State.md` inteiro (§2 = roadmap; §3/§4.30 = o que a 6.4-D entregou).
1. O PR da 6.4-D foi mergeado? O SQL `0008` foi aplicado em produção **antes**?
   (Se mergeou sem o SQL: a loja 3 e o `use_item` de itens Sinnoh falham com
   erro de coluna — basta colar o SQL companheiro, é idempotente.)
2. Produção de pé? `/api/health` (o sandbox **não** alcança Supabase; as URLs
   públicas da Vercel passam via `fetch_page`; `curl` a elas falha no TLS).
3. O mantenedor fez a passada #15 (loja 3, Rhyperior, 493 sprites)? Se achou
   algo, corrigir antes de empilhar Unova.

---

## PROTOCOLO E ARMADILHAS (não redescobrir)

- Todo passo termina atualizando **as 5 seções** do `AI_State.md` + histórico
  (nunca apagar histórico); **§4 = comandos reais + saída observada**.
- O sandbox reseta entre sessões: se faltar `node_modules`, `npm ci`;
  `cp .env.example .env`; banco local `npm run db:local` (processo em
  background) e migrations locais `npx drizzle-kit migrate`.
- `npm run check` precisa de `DATABASE_URL`:
  `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check`.
- **Egress do sandbox:** `raw.githubusercontent.com` é **bloqueado**;
  `github.com` passa. Dados da PokeAPI:
  `git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git`
  + `git sparse-checkout set data/v2/csv`.
- **Gerar catálogo por script descartável, versionar só a saída** — e conferir
  as colunas do CSV (`capture_rate` em `pokemon_species.csv`; na 6.4-C veio da
  coluna errada). Os testes de contrato pegam catchRate errado, golpe forte
  demais no nível 7 e tipo pobre em golpes fracos. **Corrija o gerador, nunca
  o teste.**
- **Migration nova:** gerar com `drizzle-kit generate --name …` **depois** de
  fechar o schema; se precisar regenerar, apague arquivo + snapshot + entrada
  do journal e recrie o banco local antes — o SQL companheiro grava o **hash
  sha256 do arquivo final** e o `when` do `_journal.json`, e eles têm que
  bater. Teste o companheiro 2× num banco que simule produção (migrations
  anteriores + papel `catchbound_runtime`) para provar idempotência.
- Sprites animados Gen V: **até o id 649**.
- Suítes de integração: ambiente **sem SMTP** → a rota devolve `devCode`
  (`helpers.ts registerVerified()`); `beforeEach` com `resetRateLimits()`.
  O `client()` de teste aceita query string (`/api/shop?shopId=3`) e `GET`.
- Migrações: `drizzle/0000–0008`; em produção a aplicação é **MANUAL** no SQL
  Editor do Supabase (o `vercel.json` não roda migration em build).
- **REGRA (incidente 2026-09-06):** produção tem **RLS em TODAS as tabelas** e
  o papel `catchbound_runtime` só opera onde há policy própria. Tabela nova =
  migration **+** SQL companheiro `docs/supabase-production-000X-runtime.sql`
  (coluna nova também ganha companheiro, com grants + journal).
- `docs/world-activation.yml` e `docs/backup*.yml` são espelhos de
  `.github/workflows/` — mantenha idênticos.
- Mundo em produção vive no **banco**: merge sobe código, mapas exigem o
  workflow **World activation**. A loja seeda itens novos sozinha
  (`ensureShopSeeded`, insert-if-ausente) — `content/world/shops/*.json` é
  regenerado com `world:import` + seed + `world:export`.
- Contrato invariante do mundo: **mapa 1 intocado** (6.2-C).
- Conta de admin para teste: `admin` / `admin12345`.
