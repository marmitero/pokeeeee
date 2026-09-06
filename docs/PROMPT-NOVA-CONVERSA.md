# Prompt para a próxima conversa (copiar e colar como 1ª mensagem)

> Este arquivo é o handoff de **2026-09-06**, após o merge da branch
> `arena/01a07776-pokeeeee` (GM + rebrand + confirmação de e-mail + sync de
> docs) e a ativação do mundo em produção. Atualize este arquivo ao final de
> cada nova rodada (mesma função que o histórico do `AI_State.md`).

```
Você é a continuação do agente do projeto Catchbound (repo
marmitero/pokeeeee — Next.js + Drizzle/Postgres + Supabase; produção em
https://catchbound.vercel.app). Comece LENDO AI_State.md por completo
(regra do protocolo) e depois docs/RELATORIO-POS-ATIVACAO.md.

ESTADO ATUAL (2026-09-06, pós-merge):
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
1. E-MAIL REAL em produção: o mantenedor registrou (ou vai registrar) uma
   conta em catchbound.vercel.app com e-mail dele — perguntar se chegou
   (inclusive SPAM; remetente novo pode demorar alguns envios para
   "esquentar"). Se não chegou, checar logs da função na Vercel
   (linha "[auth] falha ao enviar e-mail de confirmação").
2. Jogo em produção após o deploy: /api/health, /api/maps (20), tela de
   login com CATCHBOUND + campo E-MAIL, fluxo cadastro→código→entrar.
3. Passada no navegador PELA (regra: sempre produção, nunca preview):
   evolução ao vivo, vitrine de sprites 156×6 e caminhar do mapa 3 para o
   norte até o 20 (use as FERRAMENTAS GM do /admin para cortar o grind:
   subir nível 16/36, dar Pokémon, teleportar).

DE ONDE PARTIR (decisões pendentes com o mantenedor):
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
- Segredos nunca para chat/log; .env nunca commitado.
```

## Atualizado em cada rodada (mesma estrutura)

| Campo | Onde atualizar |
|---|---|
| Estado atual | topo do bloco acima (o que mudou desde o handoff anterior) |
| O que conferir primeiro | as verificações pós-deploy que o mantenedor deve fazer |
| De onde partir | a decisão de roadmap pendente + o item aprovado |
| Protocolo/armadilhas | só quando surgir uma nova (ex.: nova migration, novo segredo) |
