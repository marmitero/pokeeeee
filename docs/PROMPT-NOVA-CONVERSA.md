# Prompt para a próxima conversa (copiar e colar como 1ª mensagem)

> Este arquivo é o handoff de **2026-09-06 (noite, pós-merge do PR #9)**,
> após o merge do PR #8 (GM + rebrand + confirmação de e-mail), a rodada do
> **incidente do cadastro em produção** e o **merge do fix** em `main`
> (commit `6c18858`, CI verde). Atualize este arquivo ao final de cada nova
> rodada (mesma função que o histórico do `AI_State.md`).

```
Você é a continuação do agente do projeto Catchbound (repo
marmitero/pokeeeee — Next.js + Drizzle/Postgres + Supabase; produção em
https://catchbound.vercel.app). Comece LENDO AI_State.md por completo
(regra do protocolo) e depois docs/RELATORIO-POS-ATIVACAO.md.

ESTADO ATUAL (2026-09-06, noite — pós-incidente do cadastro e pós-merge do PR #9):
- 🚑 INCIDENTE: após o merge do PR #8, criar conta em produção devolvia
  "Falha na autenticação" e nenhum e-mail saía. Causa (reproduzida em
  sandbox, AI_State §4.27): a tabela nova email_verification_codes nasce
  com RLS em produção e o papel catchbound_runtime não tinha policy/grant
  nela → INSERT do código falhava (42501); conta ficava "presa" e o erro
  era mascarado como falha de login. CORREÇÃO: (a) SQL companheiro
  docs/supabase-production-0006-runtime.sql (mantenedor cola no SQL Editor);
  (b) código: cadastro atômico em transação, cadastro repetido de conta
  pendente só reenvia o código, /api/health expõe emailVerification:
  ok|unavailable, erro inesperado não diz mais "Falha na autenticação".
  Branch arena/01a077fb-pokeeeee → **PR #9 MERGEADO** em `main`
  (commit `6c18858`; CI do merge `34053895267` verde). O código do fix já
  deve estar na Vercel; **falta apenas** colar o SQL companheiro no Supabase
  de produção e validar o cadastro.
- Produção ATIVA com o mundo 1–20 (20 mapas + rebalance) no banco do
  Supabase — aplicado via workflow "World activation" (run 34043394359).
- Cadastro com CONFIRMAÇÃO DE E-MAIL: jogador informa seu e-mail real,
  recebe código de 6 dígitos (SMTP Gmail dedicado, display name
  "Catchbound"), verify_email já faz o login; login não confirmado → 403;
  contas antigas grandfatheradas (migration 0006 aplicada em produção e
  envs SMTP_* já cadastradas na Vercel ANTES do merge — feito pelo
  mantenedor).
- Painel /admin com FERRAMENTAS GM (admin-only) para a validação manual.
- Rebrand CATCHBOUND feito nas strings visíveis + título/description sem
  Deluge + cookies catchbound_session/catchbound_token.
- **Fase 6.4-B fechada (branch arena/01a0782e-pokeeeee, commit 2e2c1dc,
  PR #10 aberto):**
  catálogo Johto 152–251 (98 espécies novas; Pokédex 156 → 254), pedras de
  evolução por item (14 itens), migration 0007 (`users` com 14 colunas +
  check), lojas 1–3 com 15 itens, `/api/pokemon/manage.use_item` evoluindo com
  débito transacional e 98 espécies Johto distribuídas nos 20 mapas.
  Sandbox verde: 257 unit + 100 integração + build.
  Falta: **colar docs/supabase-production-0007-runtime.sql** em
  produção (não cria tabela → não precisa policy nova) + passada visual
  (comprar Pedra de Trovão e evoluir Pikachu no Box).

O QUE CONFERIR PRIMEIRO (nesta ordem):
0. PR #9 já está mergeado/deployado, mas **confirmar que o mantenedor colou
   docs/supabase-production-0006-runtime.sql no SQL Editor de produção**
   (última linha: rls_on=true, runtime_privs=4, runtime_policy=1,
   migrations=7). https://catchbound.vercel.app/api/health deve responder
   {"ok":true,"emailVerification":"ok"} — "unavailable" = SQL não aplicado.
   (No sandbox não é possível ler a Vercel: egress bloqueado.)
1. E-MAIL REAL em produção: criar conta de novo (mesmo usuário/e-mail/senha
   de antes já serve — o servidor reconhece a conta pendente e reenvia o
   código) → tela "CONFIRME SEU E-MAIL" → código chega (inclusive SPAM;
   remetente novo pode demorar alguns envios para "esquentar") → entrar.
   Se não chegou, checar logs da função na Vercel
   (linha "[auth] falha ao enviar e-mail de confirmação").
2. Jogo em produção após o deploy: /api/health, /api/maps (20), tela de
   login com CATCHBOUND + campo E-MAIL, fluxo cadastro→código→entrar.
3. **Fase 6.4-B**: colar `docs/supabase-production-0007-runtime.sql` no SQL
   Editor de produção (última linha: evolution_columns=14, check_exists=1,
   runtime_grants=4, migrations=8); depois abrir as lojas 1–3 (15 itens),
   comprar Pedra de Trovão e usar no Pikachu no Pokémon Box.
4. Passada no navegador PELA (regra: sempre produção, nunca preview):
   evolução ao vivo, vitrine de sprites 254×6 e caminhar do mapa 3 para o
   norte até o 20 (use as FERRAMENTAS GM do /admin para cortar o grind:
   subir nível 16/36, dar Pokémon, teleportar).

DE ONDE PARTIR (decisões pendentes com o mantenedor):
- Mantenedor pediu: primeiro fechar o e-mail; depois ELE testa GM +
  evolução no navegador; só então decidir o rumo abaixo.
- 6.4-B (Johto + pedras) já está implementada, verde no sandbox e com
  **PR #10 aberto** (`arena/01a0782e-pokeeeee` → `main`). Depois do merge +
  SQL 0007, decidir: próximo lote de espécies (Hoenn 252–386, sprites
  animados existem até id 649) OU pular para 6.5 status
  (paralisia/queimadura/veneno) → 6.6 PvP ranqueado → 6.7 NPCs.
  6.8 premium segue BLOQUEADO até o rebranding completo.
- Rebranding completo ainda pendente ANTES de divulgação/monetização:
  identificadores internos (computeDelugeStats, DelugeRPGPage…),
  package.json (name "deluge-rpg"), README/docs, e o nome/sprites Pokémon
  (decisão legal em aberto). Upgrade opcional de remetente: comprar domínio
  + SPF/DKIM para SMTP_FROM virar contato@seudominio.com (hoje é
  "Catchbound <conta-dedicada@gmail.com>" — funciona, só a miudinha é Gmail).

PROTOTOLO E ARMADILHAS (não refazer o que já se sabe):
- Todo passo termina atualizando as 5 seções do AI_State.md + histórico
  (nunca apagar histórico); §4 = comandos reais + saída observada.
- `npm run check` precisa de DATABASE_URL (sem .env o build falha):
  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
  npm run check — o banco local é `npm run db:local`.
- Sandbox NÃO alcança Supabase/Vercel (egress) — validação de produção é
  pelo mantenedor ou por ele colar saída de logs.
- `docs/world-activation.yml` e `docs/backup*.yml` são espelhos de
  .github/workflows/ (a integração não tem permissão "workflows") — manter
  idênticos se um mudar.
- Suítes de integração: ambiente SEM SMTP → a rota devolve devCode
  (helpers.ts registerVerified() usa isso); beforeEach com
  resetRateLimits() (limite real: 10 auth/10min por IP).
- Migrações: drizzle/0000–0007; em produção a aplicação é MANUAL no SQL
  Editor do Supabase (o vercel.json não roda migration em build) — qualquer
  nova migration vira pré-requisito do próximo merge. A 0007 só altera
  `users` (sem policy nova); reproduzi-la manualmente:
  `docs/supabase-production-0007-runtime.sql`.
- REGRA NOVA (incidente 2026-09-06): produção tem RLS em TODAS as tabelas e
  o papel catchbound_runtime só opera onde há policy própria. Toda migration
  que CRIA TABELA precisa de um SQL companheiro em docs/ (modelo:
  docs/supabase-production-0006-runtime.sql) com ENABLE RLS + GRANT +
  CREATE POLICY para catchbound_runtime (e SELECT p/ catchbound_backup),
  e o /api/health deve continuar sondando o que o cadastro precisa.
- Simular produção no sandbox: build + NODE_ENV=production + banco local
  com RLS nas tabelas + papel runtime criado pelo script oficial
  (docs/supabase-production-runtime-role.sql) + SMTP_* fictício. Foi assim
  que o incidente foi reproduzido (§4.27).
- Segredos nunca para chat/log; .env nunca commitado.
```

## Atualizado em cada rodada (mesma estrutura)

| Campo | Onde atualizar |
|---|---|
| Estado atual | topo do bloco acima (o que mudou desde o handoff anterior) |
| O que conferir primeiro | as verificações pós-deploy que o mantenedor deve fazer |
| De onde partir | a decisão de roadmap pendente + o item aprovado |
| Protocolo/armadilhas | só quando surgir uma nova (ex.: nova migration, novo segredo) |
