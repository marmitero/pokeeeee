# Handoff da próxima conversa — Catchbound

> Este arquivo é o handoff de **2026-09-07 (Fase 6.4-E — catálogo Unova 494–649, sem migration, PR aberto)**. Atualize-o ao final de cada nova rodada (mesma função que o histórico do `AI_State.md`). **Nunca apagar histórico**, só acrescentar.

Você é a continuação do agente do projeto **Catchbound** (produção: https://catchbound.vercel.app). Comece **LENDO `AI_State.md` por completo** (regra do protocolo) — em especial a **§2**, que tem o roadmap em 4 etapas — e depois `docs/RELATORIO-POS-ATIVACAO.md`.

---

## ESTADO ATUAL (2026-09-07, Fase 6.4-E entregue, aguardando merge)

- ✅ **Produção de pé e atual.** `/api/health` → `{"ok":true,"emailVerification":"ok"}`.
- ✅ Migrations **0006, 0007 e 0008** aplicadas em produção; PR #12 (6.4-D) mergeado em `f6f0d98`. **O mantenedor validou em produção todas as pendências #1–#15** do cabeçalho do `AI_State.md` (sprites 493, GM, evoluções Sinnoh, etc.).
- 🔵 **Fase 6.4-E pronta no branch `arena/01a07b36-pokeeeee`** (ver PR):
  catálogo **Unova (494–649)**, 156 espécies novas, **Pokédex 493 → 649** (teto do CDN animado).
  - **Sem migration**: Unova reutiliza pedras existentes (leafStone, fireStone, waterStone, moonStone, sunStone, shinyStone, thunderStone, duskStone) — `evolution-items.ts` continua com 21 itens (ids 1..21).
  - Proxies documentados no header de `pokedex-unova.ts`: troca→nível (Boldore 40, Gurdurr 40, Karrablast 36, Shelmet 36), felicidade→nível (Woobat 25, Swadloon 32), formas só base (Darmanitan, Basculin, Deerling/Sawsbuck, Tornadus/Thundurus/Landorus Incarnate, Kyurem base, Keldeo base, Meloetta Aria, Genesect base), Vanillite/Cubchoo por nível.
  - Só catálogo: `content/world/maps/` intocado (apenas comentários em `world-expansion.test.ts`). Sandbox: **297 unit + 103 integração + build verdes**; smoke `evolutionAtLevel`/`evolutionWithItem` (Snivy lv17→Servine, Pansage+leafStone→Simisage, Boldore 40, Woobat 25) conferido via `npx tsx`.
- ⚠️ **ESTE MERGE NÃO TEM PASSO DE BANCO.** Ordem: (1) mergear; (2) passada visual #16: vitrine 649 (3894 sprites), GM Snivy lv17→Servine→lv36→Serperior, Pansage+Folha→Simisage, Boldore lv39→Gigalith, Woobat→Swoobat. Unova **não aparece na grama** — de propósito (Etapa B).

---

## 🧭 O ROADMAP (redefinido pelo mantenedor em 2026-09-06)

Direção declarada, **em ordem**: primeiro **terminar todos os Pokémon**, depois **construir o mundo até 100 mapas** com lojas, arenas de bosses lendários, ginásios, arena PvP e NPCs de missão. Versão completa: **`AI_State.md` §2**.

| Etapa | O quê | Situação |
|---|---|---|
| **A** | **Pokédex completa** — 6.4-E Unova (→649) ✅, 6.4-F além do 649 (decisão de arte), 6.4-G formas especiais | ✅ **fechada em 649** — Kanto/Johto/Hoenn/Sinnoh/Unova prontos (**649**) — teto do CDN |
| **B** | **Mundo até 100 mapas** — 7.1 (21–40), 7.2 (41–60), 7.3 (61–80), 7.4 (81–100), cada lote com a redistribuição das espécies daquela faixa (Hoenn/Sinnoh/Unova nas bandas altas) | ⬜ próxima — começa quando mantenedor decidir 6.4-F |
| **C** | **Povoar o mundo** — 8.1 lojas por região (+ venda de itens, fix do exploit de `quantity`), 8.2 ginásios 8 + Elite, 8.3 arenas de bosses lendários, 8.4 status de batalha, 8.5 arena PvP ranqueada, 8.6 NPCs de missão, 8.7 treinadores de rota, **8.8 chat dentro do jogo** (pedido novo do mantenedor: bonito e não poluente; hoje só existe no admin e na arena PvP) | ⬜ pode andar em paralelo à B quando o 1º lote de mapas existir — **8.8 é candidato imediato** |
| **D** | **Antes de divulgar** — 9.1 rebranding completo, 9.2 decisão legal de nomes/sprites, 9.3 remetente próprio, 9.4 premium (**bloqueado**) | ⬜ bloqueia monetização |

---

## PRÓXIMA ENTREGA: decisão 6.4-F + 8.8 Chat no jogo

**6.4-F — Além do 649 (Kalos 650–721+)** está **bloqueada por decisão de arte/produto**, não por esforço. Não há GIF animado Gen V para esses ids; opções:

- **(a)** usar sprites estáticos de outra geração só para 650+ — quebra unidade visual;
- **(b)** parar em 649 e chamar de "Pokédex completa" do jogo — honesto com a arte, foca na Etapa B;
- **(c)** arte própria — casa com rebranding e resolve risco legal, mas exige pipeline.

**Levar ao mantenedor antes de implementar.** Enquanto decide, a fila da Etapa C tem:

- **8.8 — Chat dentro do jogo**: hoje só existe no painel admin e arena PvP (`chat_messages` + `GET/POST /api/pvp`, polling 5s). Falta chat no mundo, "bonito e não poluente" no HUD, recolhível/compacto no canto, sem cobrir mapa nem batalha, estética Press Start 2P/CRT, badge de não-lidas quando fechado. Reusa tabela e moderação existentes (remover mensagem, rate limit); sem migration. Pode ganhar canais (global/mapa) quando mundo crescer.

Ou seja: próxima conversa = **perguntar ao mantenedor (a/b/c) para 6.4-F** e, se escolher (b) ou adiar, começar **8.8 Chat no jogo** em paralelo à Etapa B.

---

## O QUE CONFERIR PRIMEIRO (nesta ordem)

0. `AI_State.md` inteiro (§2 = roadmap; §3/§4.31 = o que a 6.4-E entregou).
1. O PR da 6.4-E foi mergeado? **Sem SQL novo** — só mergear. Se vitrine 649 não carrega, conferir se `pokedex-unova.ts` está no bundle.
2. Produção de pé? `/api/health` (sandbox não alcança Supabase; URLs públicas da Vercel passam via `fetch_page`; `curl` a elas falha no TLS).
3. O mantenedor fez a passada #16 (vitrine 649, Snivy lv17, Pansage+Folha, Boldore, Woobat)? Se achou algo, corrigir antes de empilhar mundo/chat.

---

## PROTOCOLO E ARMADILHAS (não redescobrir)

- Todo passo termina atualizando **as 5 seções** do `AI_State.md` + histórico (nunca apagar histórico); **§4 = comandos reais + saída observada**.
- O sandbox reseta entre sessões: se faltar `node_modules`, `npm ci`; `cp .env.example .env`; banco local `npm run db:local` (processo em background) e migrations locais `npx drizzle-kit migrate`.
- `npm run check` precisa de `DATABASE_URL`: `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check`.
- **Egress do sandbox:** `raw.githubusercontent.com` é **bloqueado**; `github.com` passa. Dados da PokeAPI: `git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git` + `git sparse-checkout set data/v2/csv`.
- **Gerar catálogo por script descartável, versionar só a saída** — e conferir as colunas do CSV (`capture_rate` em `pokemon_species.csv`; na 6.4-C veio da coluna errada). Os testes de contrato pegam catchRate errado, golpe forte demais no nível 7 e tipo pobre em golpes fracos. **Corrija o gerador, nunca o teste.**
- **Migration nova:** gerar com `drizzle-kit generate --name …` **depois** de fechar o schema; se precisar regenerar, apague arquivo + snapshot + entrada do journal e recrie o banco local antes — o SQL companheiro grava o **hash sha256 do arquivo final** e o `when` do `_journal.json`, e eles têm que bater. Teste o companheiro 2× num banco que simule produção (migrations anteriores + papel `catchbound_runtime`) para provar idempotência.
- Sprites animados Gen V: **até o id 649** — é o teto do CDN atual. 6.4-F é decisão de arte/produto.
- Suítes de integração: ambiente **sem SMTP** → a rota devolve `devCode` (`helpers.ts registerVerified()`); `beforeEach` com `resetRateLimits()`. O `client()` de teste aceita query string (`/api/shop?shopId=3`) e `GET`.
- Migrações: `drizzle/0000–0008`; em produção a aplicação é **MANUAL** no SQL Editor do Supabase (o `vercel.json` não roda migration em build).
- **REGRA (incidente 2026-09-06):** produção tem **RLS em TODAS as tabelas** e o papel `catchbound_runtime` só opera onde há policy própria. Tabela nova = migration **+** SQL companheiro `docs/supabase-production-000X-runtime.sql` (coluna nova também ganha companheiro, com grants + journal).
- `docs/world-activation.yml` e `docs/backup*.yml` são espelhos de `.github/workflows/` — mantenha idênticos.
- Mundo em produção vive no **banco**: merge sobe código, mapas exigem o workflow **World activation**. A loja seeda itens novos sozinha (`ensureShopSeeded`, insert-if-ausente) — `content/world/shops/*.json` é regenerado com `world:import` + seed + `world:export`.
- Contrato invariante do mundo: **mapa 1 intocado** (6.2-C).
- Conta de admin para teste: `admin` / `admin12345`.
