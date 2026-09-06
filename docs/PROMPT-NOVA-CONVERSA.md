# Handoff da próxima conversa — Catchbound

> Este arquivo é o handoff de **2026-09-06 (pós-merge do PR #11 — Fase 6.4-C,
> catálogo Hoenn)**, e traz o **roadmap redefinido pelo mantenedor**.
> Atualize-o ao final de cada nova rodada (mesma função que o histórico do
> `AI_State.md`). **Nunca apagar histórico**, só acrescentar.

Você é a continuação do agente do projeto **Catchbound**
(produção: https://catchbound.vercel.app). Comece **LENDO `AI_State.md` por
completo** (regra do protocolo) — em especial a **§2**, que tem o roadmap novo
em 4 etapas — e depois `docs/RELATORIO-POS-ATIVACAO.md`.

---

## ESTADO ATUAL (2026-09-06, após o merge do PR #11)

- ✅ **Produção de pé e atual.** Conferido nesta rodada:
  `/api/health` → `{"ok":true,"emailVerification":"ok"}`;
  `/api/maps` → mundo 1–20 respondendo.
- ✅ Migrations **0006** e **0007** aplicadas em produção; PRs #9, #10 e #11
  mergeados. **Não há passo de banco pendente.**
- ✅ **Fase 6.4-C mergeada (PR #11, CI 8/8 verde):** catálogo **Hoenn
  (252–386)**, 133 espécies novas, **Pokédex 254 → 387**.
  - Foi **só catálogo**, por decisão do mantenedor: as espécies entram na
    Pokédex, na vitrine de sprites, no motor de evolução e nas Ferramentas GM,
    mas **não** nos encontros dos mapas. `content/world/` intocado.
  - Evolução por dados reaproveitando as pedras que já existem na loja desde a
    6.4-B — nenhum item novo, **nenhuma migration**.
- ⬜ **Falta a passada visual do mantenedor em produção** (sempre produção,
  nunca preview): vitrine com 387 espécies × 6 variantes, e GM → dar Treecko →
  subir para 16 → `★ … evoluiu para Grovyle!`. Hoenn **não aparece na grama** —
  é assim de propósito.

---

## 🧭 O ROADMAP (redefinido pelo mantenedor em 2026-09-06)

Direção declarada, **em ordem**: primeiro **terminar todos os Pokémon**, depois
**construir o mundo até 100 mapas** com lojas, arenas de bosses lendários,
ginásios, arena PvP e NPCs de missão. A ordem antiga (6.5 status → 6.6 PvP →
6.7 NPCs) **deixou de ser uma trilha própria** e foi absorvida na Etapa C.
Versão completa e detalhada: **`AI_State.md` §2**.

| Etapa | O quê | Situação |
|---|---|---|
| **A** | **Pokédex completa** — 6.4-D Sinnoh (→494), 6.4-E Unova (→650), 6.4-F além do 649 (decisão de arte), 6.4-G formas especiais | 🔵 **em andamento** — Kanto/Johto/Hoenn prontos (387) |
| **B** | **Mundo até 100 mapas** — 7.1 (21–40), 7.2 (41–60), 7.3 (61–80), 7.4 (81–100), cada lote com a redistribuição das espécies daquela faixa | ⬜ depois da Etapa A |
| **C** | **Povoar o mundo** — 8.1 lojas por região (+ venda de itens, fix do exploit de `quantity`), 8.2 ginásios 8 + Elite, 8.3 arenas de bosses lendários, 8.4 status de batalha, 8.5 arena PvP ranqueada, 8.6 NPCs de missão, 8.7 treinadores de rota | ⬜ pode andar em paralelo à B quando o 1º lote de mapas existir |
| **D** | **Antes de divulgar** — 9.1 rebranding completo, 9.2 decisão legal de nomes/sprites, 9.3 remetente próprio, 9.4 premium (**bloqueado**) | ⬜ bloqueia monetização |

---

## PRÓXIMA ENTREGA: 6.4-D — Sinnoh (387–493)

+107 espécies, Pokédex **387 → 494**, no mesmo padrão da 6.4-C:

- `src/lib/pokedex-sinnoh.ts`, dados canônicos da PokeAPI;
- linhas evolutivas completas, learnsets derivados dos 133 golpes já
  existentes, curva da 6.2-C respeitada (nada acima de poder 50 nos níveis 1 e
  7 — o CI **pega** isso);
- **sem tocar em `content/world/`** — encontros só na Etapa B;
- `pokedex-sinnoh.test.ts` novo + contagens de `pokedex-gen1.test.ts` e
  `world-expansion.test.ts` atualizadas.

⚠️ **Diferença em relação à 6.4-C:** Sinnoh traz itens de evolução que não
existem no jogo (Protetor, Eletrizador, Magmatizador, Garra Afiada, Escama
Suja). Cada item novo = **coluna nova em `users`** → **migration 0008 + SQL
companheiro** `docs/supabase-production-0008-runtime.sql` (com grants/RLS, pela
regra do incidente) → **pré-requisito do merge**, aplicado à mão no SQL Editor
do Supabase **antes** do deploy. Se o mantenedor preferir evitar o passo de
banco, a alternativa é mapear essas linhas para pedras já existentes (proxy
declarado, como Feebas → Pedra Brilhante na 6.4-C). **Perguntar antes.**

**Teto do CDN:** os GIFs animados Gen V vão até o **id 649**. Sinnoh (493) e
Unova (649) cabem; de 650 em diante é decisão de arte (6.4-F).

---

## O QUE CONFERIR PRIMEIRO (nesta ordem)

0. `AI_State.md` inteiro (§2 = roadmap) + `docs/RELATORIO-POS-ATIVACAO.md`.
1. Produção de pé? `/api/health` e `/api/maps`.
   (O sandbox **não** alcança Supabase/Vercel-interno; as URLs públicas da
   Vercel passam.)
2. O mantenedor já fez a passada visual da 6.4-C (387 sprites + evolução
   Hoenn via GM)? Se achou algo, corrigir antes de empilhar Sinnoh.
3. Confirmar com ele a questão dos itens de evolução novos (migration 0008 vs.
   proxy de pedras) **antes** de gerar o catálogo.

---

## PROTOCOLO E ARMADILHAS (não redescobrir)

- Todo passo termina atualizando **as 5 seções** do `AI_State.md` + histórico
  (nunca apagar histórico); **§4 = comandos reais + saída observada**.
- O sandbox reseta entre sessões: se faltar `node_modules`, `npm install`; o
  banco local é `npm run db:local` e as migrations locais, `npx drizzle-kit
  migrate`.
- `npm run check` precisa de `DATABASE_URL`:
  `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check`.
- **Egress do sandbox:** `raw.githubusercontent.com` é **bloqueado**;
  `github.com` passa. Para os dados da PokeAPI:
  `git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git`
  + `git sparse-checkout set data/v2/csv` (foi como a 6.4-C nasceu).
- **Gerar catálogo por script descartável, versionar só a saída** — e conferir
  as colunas do CSV: na 6.4-C o `catchRate` veio da coluna errada e todo Hoenn
  nasceu com captura 1. Os testes de contrato do repo pegaram isso, junto com
  golpe forte demais no nível 7 e tipo pobre em golpes fracos. **Corrija o
  gerador, nunca o teste.**
- Sprites animados Gen V: **até o id 649**.
- Suítes de integração: ambiente **sem SMTP** → a rota devolve `devCode`
  (`helpers.ts registerVerified()`); `beforeEach` com `resetRateLimits()`
  (limite real: 10 auth/10 min por IP).
- Migrações: `drizzle/0000–0007`; em produção a aplicação é **MANUAL** no SQL
  Editor do Supabase (o `vercel.json` não roda migration em build).
- **REGRA (incidente 2026-09-06):** produção tem **RLS em TODAS as tabelas** e
  o papel `catchbound_runtime` só opera onde há policy própria. Tabela nova =
  migration **+** SQL companheiro `docs/supabase-production-000X-runtime.sql`.
- `docs/world-activation.yml` e `docs/backup*.yml` são espelhos de
  `.github/workflows/` (a integração do agente não tem permissão `workflows`) —
  mantenha idênticos.
- Mundo em produção vive no **banco**: merge sobe código, mapas exigem o
  workflow **World activation** (`apply=false` duas vezes antes do
  `APLICAR-production`).
- Contrato invariante do mundo: **mapa 1 intocado** (6.2-C).
- Conta de admin para teste: `admin` / `admin12345`.
