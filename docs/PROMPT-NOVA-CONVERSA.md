# Prompt para a próxima conversa (copiar e colar como 1ª mensagem)

> Este arquivo é o handoff de **2026-09-06 (noite)**, após o merge do PR #8
> (GM + rebrand + confirmação de e-mail) e a rodada de **incidente do
> cadastro em produção** (branch `arena/01a077fb-pokeeeee`). Atualize este arquivo ao final de
> cada nova rodada (mesma função que o histórico do `AI_State.md`).

```
Você é a continuação do agente do projeto Catchbound (repo
marmitero/pokeeeee — Next.js + Drizzle/Postgres + Supabase; produção em
https://catchbound.vercel.app). Comece LENDO AI_State.md por completo
(regra do protocolo) e depois docs/RELATORIO-POS-ATIVACAO.md.

ESTADO ATUAL (2026-09-06, noite — pós-incidente do cadastro):
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
  Branch arena/01a077fb-pokeeeee (PR a abrir/mergear).
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

O QUE CONFERIR PRIMEIRO (nesta ordem):
0. O mantenedor colou docs/supabase-production-0006-runtime.sql no SQL
   Editor de produção? (última linha: rls_on=true, runtime_privs=4,
   runtime_policy=1, migrations=7). O PR do fix foi mergeado/deployado?
   https://catchbound.vercel.app/api/health deve responder
   {"ok":true,"emailVerification":"ok"} — "unavailable" = SQL não aplicado.
1. E-MAIL REAL em produção: criar conta de novo (mesmo usuário/e-mail/senha
   de antes já serve — o servidor reconhece a conta pendente e reenvia o
   código) → tela "CONFIRME SEU E-MAIL" → código chega (inclusive SPAM;
   remetente novo pode demorar alguns envios para "esquentar") → entrar.
   Se não chegou, checar logs da função na Vercel
   (linha "[auth] falha ao enviar e-mail de confirmação").
2. Jogo em produção após o deploy: /api/health, /api/maps (20), tela de
   login com CATCHBOUND + campo E-MAIL, fluxo cadastro→código→entrar.
3. Passada no navegador PELA (regra: sempre produção, nunca preview):
   evolução ao vivo, vitrine de sprites 156×6 e caminhar do mapa 3 para o
   norte até o 20 (use as FERRAMENTAS GM do /admin para cortar o grind:
   subir nível 16/36, dar Pokémon, teleportar).

DE ONDE PARTIR (decisões pendentes com o mantenedor):
- Mantenedor pediu: primeiro fechar o e-mail; depois ELE testa GM +
  evolução no navegador; só então decidir o rumo abaixo.
- 6.4 restante: espécies de Johto e além (sprites animados existem até o
  id 649) + pedras de evolução na loja (trocariam gatilhos // pedra de
  nível por item) — OU pular para 6.5 status (paralisia/queimadura/veneno)
  → 6.6 PvP ranqueado → 6.7 NPCs. 6.8 premium segue BLOQUEADO até o
  rebranding completo.
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
- Migrações: drizzle/0000–0006; em produção a aplicação é MANUAL no SQL
  Editor do Supabase (o vercel.json não roda migration em build) — qualquer
  nova migration vira pré-requisito do próximo merge.
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
