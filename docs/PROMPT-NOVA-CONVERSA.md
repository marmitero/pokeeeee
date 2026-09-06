# Handoff da próxima conversa — Catchbound

> Este arquivo é o handoff de **2026-09-06 (Fase 6.4-C — catálogo Hoenn)**.
> Atualize-o ao final de cada nova rodada (mesma função que o histórico do
> `AI_State.md`). **Nunca apagar histórico**, só acrescentar.

Você é a continuação do agente do projeto **Catchbound**
(produção: https://catchbound.vercel.app). Comece **LENDO `AI_State.md` por
completo** (regra do protocolo) e depois `docs/RELATORIO-POS-ATIVACAO.md`.

---

## ESTADO ATUAL (2026-09-06, após a 6.4-C)

- ✅ **Produção de pé e atual.** Conferido nesta rodada:
  `/api/health` → `{"ok":true,"emailVerification":"ok"}`;
  `/api/maps` → mundo 1–20 respondendo.
- ✅ Migrations **0006** (confirmação de e-mail) e **0007** (inventário de
  itens de evolução) **aplicadas em produção** pelo mantenedor; PRs #9 e #10
  mergeados e validados no navegador (sprites + evolução por pedra).
- ✅ **FASE 6.4-C concluída no sandbox** (branch `arena/01a07870-pokeeeee`):
  catálogo **Hoenn 252–386** — 133 espécies novas em
  `src/lib/pokedex-hoenn.ts`, **Pokédex 254 → 387**.
  - Decisão explícita do mantenedor: **só catálogo**, sem redistribuir nos
    mapas — *"depois iremos construir mais mapas, aí sim adicionaremos os
    encounters corretamente"*. `content/world/` **não foi tocado**.
  - Evolução por dados: níveis canônicos + pedras que **já existem na loja**
    desde a 6.4-B (nenhum item novo). Proxies declarados para beleza
    (Feebas → Milotic = Pedra Brilhante) e felicidade (= Pedra da Lua).
    Shedinja existe sem gatilho (o cânone exige slot vazio + Pokébola).
  - **SEM MIGRATION** — este merge não tem passo de banco nenhum.
  - Validação: `npm run check` verde (lint + tsc + **266 unit** + build) e
    **100 testes de integração** (§4.29 do `AI_State.md`).

## O QUE CONFERIR PRIMEIRO (nesta ordem)

0. Leitura obrigatória: `AI_State.md` inteiro + `docs/RELATORIO-POS-ATIVACAO.md`.
1. Produção continua de pé? `/api/health` e `/api/maps`.
   (Sandbox **não** alcança Supabase/Vercel — peça a saída ao mantenedor, ou
   use `fetch_page`/`curl` só para as URLs públicas da Vercel, que passam.)
2. O PR da 6.4-C foi mergeado e o deploy subiu?
3. Passada visual em **produção** (regra: nunca preview):
   - vitrine de sprites com **387 espécies × 6 variantes** (Hoenn no fim);
   - `/admin` → **Ferramentas GM** → dar um Treecko → subir para o nível 16 →
     `★ … evoluiu para Grovyle!`.
   Hoenn **não aparece na grama** — é assim de propósito nesta fase.

## DE ONDE PARTIR (decisão pendente com o mantenedor)

O plano declarado é **mapas primeiro, encontros depois**:

1. **6.4-D — mundo 21+ e redistribuição**: mapas temáticos novos para as faixas
   altas e as 133 espécies de Hoenn entrando nos encontros. Regras de sempre:
   linhas evolutivas completas por região, bandas de nível crescentes, **mapa 1
   intocado** (contrato da 6.2-C), `world:export` + PR, e aplicação em produção
   pelo workflow **World activation** (`apply=false` duas vezes antes do
   `APLICAR-production`).
2. Ou pular para **6.5 status** (veneno/queimadura/paralisia; colunas
   `status`/`statusTurns` em `user_pokemon` → **migration 0008**, que vira
   pré-requisito do merge; Antídoto volta à loja) → 6.6 PvP ranqueado →
   6.7 NPCs.
3. **Rebranding completo** segue pendente **antes** de divulgação/monetização
   (6.8 premium bloqueado): identificadores internos (`computeDelugeStats`,
   `DelugeRPGPage`, `DelugeVariant`), `package.json` (`name: "deluge-rpg"`),
   README/docs, e a decisão legal sobre nomes/sprites Pokémon. Opcional:
   domínio próprio + SPF/DKIM para tirar o `SMTP_FROM` do Gmail.

## PROTOCOLO E ARMADILHAS (não redescobrir)

- Todo passo termina atualizando **as 5 seções** do `AI_State.md` + histórico
  (nunca apagar histórico); **§4 = comandos reais + saída observada**.
- O sandbox reseta: se faltar `node_modules`, `npm install`; o banco local é
  `npm run db:local` e as migrations locais, `npx drizzle-kit migrate`.
- `npm run check` precisa de `DATABASE_URL`:
  `DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check`.
- **Egress do sandbox:** `raw.githubusercontent.com` é **bloqueado**;
  `github.com` passa. Para dados da PokeAPI, use
  `git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git`
  e `git sparse-checkout set data/v2/csv` (foi como a 6.4-C nasceu).
  Supabase/Vercel-interno continuam inalcançáveis.
- Sprites animados Gen V existem **até o id 649** — Sinnoh (387–493) e Unova
  (494–649) ainda cabem no mesmo CDN; a partir de 650, não.
- Suítes de integração: ambiente **sem SMTP** → a rota devolve `devCode`
  (`helpers.ts registerVerified()` usa isso); `beforeEach` com
  `resetRateLimits()` (limite real: 10 auth/10 min por IP).
- Migrações: `drizzle/0000–0007`; em produção a aplicação é **MANUAL** no SQL
  Editor do Supabase (o `vercel.json` não roda migration em build) — qualquer
  migration nova vira **pré-requisito do merge**, com SQL companheiro de
  grants/RLS.
- **REGRA (incidente 2026-09-06):** produção tem **RLS em TODAS as tabelas** e
  o papel `catchbound_runtime` só opera onde há policy própria. Tabela nova =
  migration **+** SQL companheiro (`docs/supabase-production-000X-runtime.sql`).
- `docs/world-activation.yml` e `docs/backup*.yml` são espelhos de
  `.github/workflows/` (a integração do agente não tem permissão `workflows`) —
  mantenha idênticos.
- Conta de admin para teste: `admin` / `admin12345`.
