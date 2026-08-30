# Fase 5.1 — Preparação para produção

## Objetivo

Preparar o jogo para operar com segurança em acesso público, usando Next.js na
Vercel e PostgreSQL no Supabase, sem misturar desenvolvimento, staging e
produção.

## Decisões do mantenedor

- O jogo será acessado diretamente, sem iframe.
- Não há dados atuais que precisem ser preservados.
- Staging e produção terão projetos Supabase separados.
- O jogo será público e gratuito, com intenção futura de microtransações e
  anúncios recompensados.
- Ainda não há domínio próprio; o staging pode começar em `*.vercel.app`.
- Observabilidade só será adotada se for segura, gratuita, leve e não
  bloqueante. A primeira opção são logs nativos da Vercel e do Supabase.
- Pokémon será mantido temporariamente para concluir mecânicas. Antes da
  monetização, nomes, criaturas, sprites e identidade serão substituídos por
  propriedade intelectual própria.
- Toda ação manual no Supabase ou na Vercel será solicitada com passo a passo,
  indicação do que é segredo, validação e forma de desfazer. Segredos nunca
  devem ser enviados em chat.

## Ordem de execução

### 5.1.1 — Baseline e dependências

1. Registrar versões, audit, testes e build atuais.
2. Atualizar dependências vulneráveis sem `npm audit fix --force`.
3. Rodar lint, typecheck, testes unitários, integração, build e audit.
4. Manter versões maiores não relacionadas fora deste lote para reduzir risco.

**Critério:** zero vulnerabilidades conhecidas no `npm audit`, CI funcional e
nenhuma regressão nos testes/build.

### 5.1.2 — Endurecimento do banco

1. Adicionar foreign keys e políticas de deleção.
2. Adicionar constraints para dinheiro, inventário, HP, slots, papéis e status.
3. Adicionar unicidade para insígnias e slots do time.
4. Adicionar índices para consultas de sessão, batalha, PvP e chat.
5. Validar migrations em banco vazio e staging antes de produção.

### 5.1.3 — Supabase e runtime serverless

1. Criar Supabase de staging.
2. Separar `DATABASE_URL` de runtime e `DIRECT_DATABASE_URL` de migrations.
3. Usar conexão adequada ao runtime serverless e pool pequeno com timeouts.
4. Usar credencial de privilégio mínimo no runtime.
5. Fechar acesso público desnecessário pela Data API/RLS.
6. Configurar e testar backup e restauração.

### 5.1.4 — Autenticação de produção

1. Usar cookie `HttpOnly`, `Secure` e `SameSite=Lax` no acesso direto.
2. Desativar em produção a entrega do Bearer token no corpo e o armazenamento
   em `localStorage`.
3. Reforçar CSRF para mutações autenticadas por cookie.
4. Criar rotina de limpeza de sessões expiradas.

### 5.1.5 — Segurança HTTP e frontend

1. Configurar CSP, HSTS, `nosniff`, Referrer Policy e Permissions Policy.
2. Restringir framing e origens de imagens/fontes.
3. Desativar ou restringir o painel de debug em produção.
4. Impedir cache de respostas privadas.
5. Garantir que segredos não entrem no bundle do navegador.

### 5.1.6 — Staging na Vercel

1. Importar o repositório e configurar Node/build.
2. Cadastrar segredos diretamente no painel da Vercel.
3. Ligar Preview/staging somente ao Supabase de staging.
4. Não executar migrations automaticamente em todo Preview.
5. Publicar e executar smoke tests.

### 5.1.7 — Operação

1. Começar com logs e métricas nativos da Vercel/Supabase.
2. Manter `/api/health` sem informações sensíveis.
3. Padronizar logs sem tokens, cookies, senhas ou URLs de banco.
4. Criar limpeza de sessões, rate limits e batalhas/salas abandonadas.
5. Avaliar Sentry apenas se o gratuito nativo for insuficiente, sem Replay e
   com sanitização de dados.

### 5.1.8 — Validação

Validar autenticação, autorização, jogo, PvP, concorrência, XSS, CSRF, IDOR,
rate limit, cache, headers, saturação de conexões e restauração de backup. O
mantenedor fará a validação final de experiência em desktop/mobile e com duas
contas no PvP.

### 5.1.9 — Go-live

Produção só será aberta com CI verde, sem vulnerabilidade alta aplicável,
migrations testadas em staging, backup restaurável, sessão sem `localStorage`,
headers ativos, debug restrito e smoke test aprovado. O lançamento será gradual
e terá rollback de deploy documentado.

## Monetização: fase separada

Microtransações e anúncios não fazem parte da 5.1. Antes deles:

1. substituir completamente a propriedade intelectual de Pokémon;
2. criar termos e política de privacidade adequados;
3. modelar produtos, pedidos, eventos de pagamento, ledger e benefícios;
4. conceder benefícios somente por webhook assinado e idempotente;
5. confirmar anúncios recompensados no servidor, nunca pela palavra do cliente;
6. implementar estorno, auditoria, limites e antifraude.

## Protocolo para ações do mantenedor

Toda solicitação manual trará: objetivo, URL/menu, passos exatos, indicação de
segredos, resultado esperado, resposta não sensível a enviar e rollback. Nenhuma
contratação ou recurso pago será ativado sem aprovação explícita.

## Registro da 5.1.1 — 2026-08-29

Baseline: Node 22.22.3, npm 10.9.8, Next 16.2.6, 84 testes unitários, 52 testes
de integração e 14 rotas compiladas. O audit apontava 7 vulnerabilidades (3
altas e 4 moderadas).

Atualizações aplicadas:

- Next.js e `eslint-config-next`: 16.2.6 → 16.3.3;
- React/React DOM: 19.2.6 → 19.2.8;
- PostCSS: 8.5.8 → 8.5.26;
- pg: 8.20.0 → 8.23.0;
- dotenv: 17.3.1 → 17.4.2;
- lucide-react: linha 1.34 → 1.37.0;
- Zod: linha 4.4 → 4.5.2;
- override limitado de esbuild 0.25.10 para a cadeia legada do Drizzle Kit.

Validação: lint, typecheck, 84 testes unitários, 52 testes de integração, build
de 14 rotas e `npm audit` passaram. Resultado final do audit: zero
vulnerabilidades conhecidas.

Atualizações major não relacionadas (ESLint 10, TypeScript 7 e tipos do Node
26) foram deliberadamente adiadas para não misturar risco de migração com a
correção de segurança.

## Registro da 5.1-A — concluída em 2026-08-29

A camada local de segurança para produção foi concluída sem iniciar staging:

- schema reforçado por migration `0003` com 15 foreign keys, 16 índices e
  constraints de domínio/integridade para usuários, inventário, Pokémon,
  mapas, lojas, ginásios, batalhas, PvP, chat e rate limit;
- slot de time único por usuário e insígnia única por usuário/ginásio;
- produção direta usa somente cookie `HttpOnly`, `Secure` e `SameSite=Lax`;
- Bearer/localStorage fica desligado em produção e disponível apenas em
  desenvolvimento/testes ou opt-in explícito;
- logout passou a validar CSRF; produção bloqueia mutação por cookie sem Origin
  e requisições marcadas como `Sec-Fetch-Site: cross-site`;
- CSP, HSTS, `nosniff`, Referrer Policy, Permissions Policy, bloqueio de iframe,
  remoção de `X-Powered-By` e `no-store` nas APIs;
- painel de debug removido do bundle renderizado em produção;
- documentação corrigida para as 11 tabelas reais.

Validação local: migration em banco vazio, 87 testes unitários, 52 testes de
integração, lint, typecheck, build das 14 rotas e audit sem vulnerabilidades.
Headers foram verificados no servidor de produção local; registro em produção
não devolve `token`, e mutação sem Origin retorna 403.

**Próxima etapa, não iniciada:** 5.1-B — criação/configuração de staging no
Supabase e na Vercel. Exige autorização do mantenedor e ações guiadas nos
painéis.

## Registro da 5.1-B — preparação local (2026-08-29)

Antes da criação do staging, a aplicação foi preparada para o Supabase/Vercel:

- `DATABASE_URL` agora é exclusiva do runtime (Session Pooler 5432);
- `DIRECT_DATABASE_URL` é preferida pelo Drizzle Kit para migrations;
- pool de produção limitado por padrão a 3 conexões por instância;
- timeouts de conexão e ociosidade configuráveis;
- Transaction Pooler 6543 é detectado e desaconselhado;
- Session Pooler 5432 não é mais confundido com Transaction Pooler;
- TLS valida certificado por padrão;
- `.env.example` e `docs/SUPABASE.md` foram reescritos sem recomendar segredo
  em Git/chat.

Validação local: lint, typecheck, 87 testes unitários, build de 14 rotas e audit
sem vulnerabilidades. Próximo bloqueio: criação manual do Supabase staging.

### Correção do painel Admin durante o smoke test

O Editor funcionava, mas `/admin` permanecia carregando porque `loadStaff`
tinha `roles` como dependência e chamava `setRoles`. Cada resposta criava novo
array, recriava o callback e disparava novamente o `useEffect`, formando um
loop de requests até o rate limit. A dependência circular foi removida, equipe
e chat carregam em paralelo e falhas de sessão/API agora são exibidas na tela.
A autorização continua exclusivamente no servidor e os testes existentes de
papéis permanecem aprovados.

### Correções finais do smoke test da 5.1-B

- O botão PVP ainda abria a modal legada de batalha, cuja criação de sala não
  enviava `pokemonId`; a API corretamente respondia "Dados inválidos". O botão
  agora abre `PvpLobby`, fluxo da Fase 4 que exige seleção e envia somente o ID.
  Os controles legados de sala foram removidos da batalha selvagem, preservando
  seu motor e chat.
- O palco do ginásio posicionava o oponente à esquerda e o jogador à direita,
  inverso ao palco selvagem e à orientação dos sprites. Apenas o layout do
  `GymModal` foi invertido: oponente à direita e jogador à esquerda. Sprites e
  batalha selvagem não foram alterados.

### PvP em equipes e tela final

O PvP agora permite selecionar manualmente de 1 a 3 Pokémon. A seleção é
validada no servidor e somente seus integrantes podem entrar em campo; quando o
ativo desmaia e ainda há integrante vivo, o jogador escolhe o substituto. A
tela final distingue vitória/derrota, oferece SAIR e REVANCHE e não é
substituída por erro transitório de polling. A revanche exige aceite dos dois e
cura completamente os integrantes selecionados antes de reiniciar a mesma sala.
Salas legadas são normalizadas como times de um integrante.

## Registro da 5.1-C — operação (em andamento, 2026-08-29)

Implementada manutenção diária protegida por `CRON_SECRET`, agendada para 03:00
UTC (00:00 em São Paulo). Em uma transação idempotente ela remove sessões e
rate limits expirados, marca salas WAITING/ACTIVE com mais de 24h como
ABANDONED, encerra batalhas PvE ACTIVE antigas como FLED e remove chat com mais
de 90 dias. Não toca em usuários, Pokémon, inventário, mapas, insígnias ou
resultados concluídos. Foram adicionados testes de autorização e preservação do
usuário. A migration `0004` amplia o domínio de status PvP.

### Backup gratuito e criptografado

Como o Supabase Free não oferece backups, o workflow
`.github/workflows/backup.yml` gera diariamente um `pg_dump` dos schemas
`public` e `drizzle` via Session Pooler. Antes de qualquer upload, o dump é
criptografado com AES-256-CBC/PBKDF2 (200 mil iterações). O workflow restaura o
dump plaintext em PostgreSQL 18 isolado e exige 11 tabelas e pelo menos 5
migrations; só então publica o arquivo cifrado como artifact por 14 dias. O
dump e a CA em plaintext são removidos sempre. Cinco GitHub Actions Secrets são
necessários. Nenhuma chave da Data API é usada.

### Validação final da 5.1-C

Execução GitHub Actions `33263808649`: job completo com sucesso. As etapas de
dump, criptografia, restauração isolada, verificação e upload passaram; como os
comandos `test` exigem 11 tabelas e ao menos 5 migrations, sucesso da etapa
confirma ambos. Artifact `staging-db-33263808649` criado com 56.970 bytes,
criptografado (`.dump.enc`) e expiração em 2026-09-12. Supabase Free não oferece
backup, PITR ou restore; nenhuma contratação foi feita.

## Registro da 5.1-D — produção controlada (em andamento, 2026-08-30)

O produto oficial se chamará **Catchbound**. Foi criado um projeto Supabase de
produção vazio, Free, em São Paulo. O bootstrap de produção reúne as migrations
0000–0004, ativa RLS nas 11 tabelas, revoga Data API pública e registra o journal
Drizzle. Um segundo script cria `catchbound_runtime` com senha aleatória gerada
no PostgreSQL, sem superuser/DDL/BYPASSRLS/acesso a schemas internos; concede
somente DML e sequences das tabelas do jogo por policies explícitas.

Validação local em banco vazio: 11 tabelas, 5 migrations, RLS em 11 tabelas,
login do papel runtime, leitura permitida; CREATE TABLE e leitura de `pg_authid`
recusadas com `42501`.

### Validação real de produção — 2026-08-30

O mantenedor aplicou e validou o Supabase oficial de produção:

- 11 tabelas do jogo em `public`;
- 5 migrations no journal Drizzle;
- RLS habilitado nas 11 tabelas;
- papel `catchbound_runtime` existente;
- flags privilegiadas do runtime todas falsas (`rolsuper`, `rolcreatedb`,
  `rolcreaterole`, `rolreplication`, `rolbypassrls`).

O deploy oficial foi publicado em `https://catchbound.vercel.app/`. A primeira
falha observada foi `28P01` por autenticação do `catchbound_runtime`; a causa
provável era usuário/senha do Session Pooler. Após corrigir a configuração da
Vercel, `/api/health` passou a responder `{ "ok": true }`.

Validações executadas pelo agente contra endpoints públicos:

- `/api/health` → `{ "ok": true }`;
- `/api/maps` → 3 mapas seedados;
- `/api/gym` → 3 líderes seedados;
- `/api/shop?shopId=1/2/3` → itens seedados;
- `/api/maintenance` sem segredo → não autorizado;
- `/api/auth`, `/api/pvp`, `/api/battle` sem sessão → bloqueados;
- `/admin` sem sessão → acesso negado.

Validação manual do mantenedor em produção:

- smoke script autenticado no navegador: passou;
- mapa/movimento: ok;
- batalha selvagem: ok;
- ginásio: ok;
- loja: ok;
- PvP: ok;
- admin: ok;
- manutenção com `CRON_SECRET`: ok (200, `{ "ok": true }`) após rotação do segredo e redeploy.

### Backup de produção — preparado, pendente de ativação

Foram adicionados artefatos de apoio para backup de produção:

- `docs/supabase-production-backup-role.sql` cria `catchbound_backup`, papel
  somente-leitura para dump dos schemas `public` e `drizzle`, sem superuser,
  DDL, escrita ou `BYPASSRLS`;
- `docs/supabase-production-backup-rotate-password.sql` rotaciona a senha de
  `catchbound_backup` quando o papel já existe ou a senha foi perdida, e
  reaplica grants/policies idempotentes sem conceder escrita. Em Supabase, a
  rotação altera apenas a senha porque o usuário administrativo do projeto não
  é superuser real e não pode tocar novamente em flags como `NOSUPERUSER`;
- `docs/backup-production.yml` é o workflow de referência para copiar para
  `.github/workflows/backup-production.yml`; ele usa `--enable-row-security`
  porque o papel de backup não possui `BYPASSRLS` e depende das policies
  somente-leitura explícitas.

A ativação exige ação manual do mantenedor porque a integração do agente da
Arena não tem permissão GitHub `workflows` para criar/alterar arquivos em
`.github/workflows/`. Secrets necessários no GitHub Actions:
`PRODUCTION_DB_HOST`, `PRODUCTION_DB_USER`, `PRODUCTION_DB_PASSWORD`,
`PRODUCTION_DB_CA_CERT` e `PRODUCTION_BACKUP_PASSPHRASE`.
