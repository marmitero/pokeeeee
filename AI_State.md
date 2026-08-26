# 🧠 AI_State — Memória Persistente do Projeto

> ## ⚠️ REGRA OBRIGATÓRIA DE PROTOCOLO
>
> **1. NO INÍCIO de toda etapa:** este arquivo deve ser **LIDO ANTES DE TUDO**,
>    antes de abrir qualquer outro arquivo do projeto ou escrever qualquer código.
>
> **2. NO FINAL de toda etapa:** este arquivo deve ser **ATUALIZADO**,
>    obrigatoriamente preenchendo as 5 seções abaixo:
>
> | # | Seção obrigatória |
> |---|---|
> | 1 | **O que já existe no projeto** |
> | 2 | **O que falta implementar segundo o roadmap** |
> | 3 | **Qual foi a última etapa aplicada** |
> | 4 | **Qual o passo a passo de validação da última etapa aplicada** |
> | 5 | **Qual a próxima etapa a ser aplicada** |
>
> Uma etapa **não está concluída** enquanto a seção 4 não descrever comandos
> reais, executáveis, cujo resultado foi de fato observado.
>
> **Nunca** apague o histórico de etapas — apenas acrescente.

> ## 📌 PENDÊNCIAS DE VALIDAÇÃO MANUAL (aguardando o mantenedor)
>
> Itens verificados **no servidor/motor** mas **nunca abertos num navegador**.
> Nenhum deles bloqueia o trabalho seguinte, mas precisam de uma passada visual.
>
> | # | O que testar | Como | Origem |
> |---|---|---|---|
> | 1 | **Batalha selvagem**: pisar na grama alta, ver o sprite do oponente, as barras de HP, o log com "É super efetivo!", os 4 golpes com tipo/poder, e o botão FUGIR | Login → andar até a grama alta (WASD) | Fase 2 |
> | 2 | **Captura na tela**: arremessar Pokébola e ver a mensagem de escape com a % de chance | idem, botão 🔴 | Fase 2 |
> | 3 | **Ginásio**: falar com o Brock (🏟️), ver a tela de introdução com os sprites corretos (Geodude/Onix, **não** Bulbasaur), lutar e ver a insígnia no HUD | Mapa 1, NPC 🏟️ | Fases 2 e 3 |
> | 4 | **Chat global**: abrir o PVP, ver as mensagens reais carregadas (não as fake) e enviar uma | Botão PVP | Fase 3 |
> | 5 | **Editor de Mundos**: confirmar que o botão EDITOR some para jogador comum e aparece para admin | Logar como admin e como jogador | Fase 1.1 |
> | 6 | **Mapas com cadeado**: confirmar que só os mapas ligados por portal são clicáveis | Sidebar "MAPAS INTERLIGADOS" | Fase 3 |
| 7 | **Painel admin**: abrir `/admin`, ver a lista de equipe, promover alguém e remover uma mensagem do chat | Botão ADMIN no HUD (só aparece para staff) | Fase 5 |
>
> **Conta de admin para teste:** `admin` / `admin12345`
>
> Quando validar, marcar cada linha com ✅/❌ e registrar o resultado na seção 4.

**Projeto:** `marmitero/pokeeeee` — Pokémon Deluge RPG
**Branch da sessão:** `arena/01a03ad9-pokeeeee`
**Documento de origem:** [`AUDITORIA.md`](./AUDITORIA.md) (auditoria completa de 2026-08-25)

---

## 1. O que já existe no projeto

### Stack
| Camada | Tecnologia | Versão |
|---|---|---|
| Linguagem | TypeScript (`strict`) | 5.9.3 |
| Framework | Next.js (App Router, Turbopack) | 16.2.6 |
| UI | React | 19.2.6 |
| Estilo | Tailwind CSS v4 | 4.1.17 |
| Ícones | lucide-react | ^1.34.0 |
| Banco | PostgreSQL (`pg`) | 8.20.0 |
| ORM | Drizzle ORM / drizzle-kit | 0.45.2 / 0.31.10 |
| Lint | ESLint 9 flat config | 9.39.4 |

### Estrutura
```
src/
├── app/
│   ├── layout.tsx            # metadata + <html lang="pt-BR">
│   ├── page.tsx              # mundo, HUD, input, estado global
│   ├── globals.css           # fontes, overlay CRT, image-rendering: pixelated
│   └── api/                  # 10 rotas: auth, maps, maps/[id], pokemon/{catch,heal,manage}, gym, shop, pvp, health
├── components/               # AuthModal, BattleArenaModal, GymModal, PokemonBox, ShopModal, SpritePackModal, WorldMapEditor
├── db/                       # schema.ts (9 tabelas) + index.ts (Pool global)
└── lib/                      # pokedex, tiles, sound, battle, seed-maps, seed-gym, seed-shop
```

### Banco de dados — 9 tabelas
`users` · `sessions` · `user_pokemon` · `game_maps` · `shop_items` · `gym_leaders` · `user_badges` · `pvp_battles` · `chat_messages`

### Conteúdo seedado
21 espécies · 19 golpes · 6 variantes · 3 mapas · 3 líderes de ginásio · 11 itens de loja · 10 tipos de tile

### Estado funcional real
| Feature | Estado |
|---|---|
| Registro / Login / Sessão | ✅ Funciona (inseguro — ver Fase 1) |
| Exploração + movimento + portais | ✅ Funciona |
| Encontros selvagens | ✅ Funciona (decididos no cliente) |
| Batalha selvagem | ✅ **Servidor** — dano, tipos, XP, captura e HP persistidos |
| Captura | ✅ **Servidor** — `catchRate` + HP + bola; pode falhar |
| XP / Nível up | ❌ Morto — colunas existem, nunca recebem UPDATE |
| PC Box / time / itens | ✅ Funciona |
| Ginásio | ✅ **Servidor** — luta turno a turno, insígnia só vencendo de verdade |
| Loja (comprar) | ⚠️ Funciona, com exploit de `quantity` negativa |
| Loja (vender item) | ❌ Não existe (`sellPrice` é coluna morta) |
| Loja (Antídoto) | 🗑️ Removido na Fase 3 — dava Poção e não havia status para curar |
| Editor de Mundos | ✅ Funciona — melhor parte do projeto, sem autorização |
| PvP real | ⬜ Ainda não existe (Fase 4); a arena/chat funcionam |
| Chat global | ✅ **FUNCIONA** (B11 corrigido) — busca ao abrir, polling 5s, mensagens renderizadas |
| Pacote de Sprites | ✅ Funciona (vitrine) — 21 espécies × 6 variantes |

### Direção de arte (preservar — é o ativo mais valioso)
Pixel art 16-bit + overlay CRT. **Zero assets binários no repo**: 48 GIFs animados Gen V via CDN (`raw.githubusercontent.com/PokeAPI/sprites`). 5 das 6 variantes são **filtros CSS em runtime** sobre o sprite base. Tipografia Press Start 2P (HUD) / VT323 (diálogos) / IBM Plex Mono (dados). **Áudio 100% sintetizado via Web Audio API**, sem arquivos de som.

### Infraestrutura de projeto (Fase 0)
`.gitignore` · `README.md` · `.env.example` · `drizzle.config.ts` · `package-lock.json` versionado · `AI_State.md`

### ⚠️ `allowedDevOrigins` em `next.config.ts` — não remover
O Next 16 **bloqueia recursos de desenvolvimento de origem cruzada por padrão**.
Sem `allowedDevOrigins: ["*.e2b.app"]`, o preview servido por proxy quebra de um
jeito enganoso: o HTML chega renderizado, mas o client do React é bloqueado e
**nunca hidrata** — o mapa não carrega (é buscado em `useEffect`) e nenhum botão
responde, com a API respondendo 200 normalmente via curl. Afeta só `next dev`.

### Camada de segurança (Fase 1)
| Módulo | Responsabilidade |
|---|---|
| `src/lib/password.ts` | Hash **scrypt** (N=16384, r=8, p=1) com salt aleatório; comparação em tempo constante; detecção de senha legada |
| `src/lib/session.ts` | Cookie `httpOnly`/`SameSite=Lax`/`Secure`(prod); token **hasheado com SHA-256** no banco; `requireUser()`; logout; purga de sessões vencidas e legadas |
| `src/lib/validation.ts` | Schemas Zod de **todas** as rotas (uniões discriminadas por `action`) |
| `src/lib/api.ts` | `ApiError`, `routeError` (log interno + resposta genérica), `parse`, DTO `publicUser` |
| `src/lib/rate-limit.ts` | Janela fixa em memória, por IP e por escopo |
| `scripts/migrate-passwords.ts` | Converte senhas legadas em texto puro para scrypt (idempotente) |

**Postura atual:** toda rota que escreve exige sessão; `userId` é sempre derivado do cookie; dinheiro e itens são debitados com `UPDATE ... WHERE saldo > 0` dentro de transação.

**Dependências adicionadas:** `zod` (runtime), `tsx` (dev).

### Infraestrutura de qualidade (Fase 5)
| Item | Onde |
|---|---|
| **106 testes** (77 unit + 29 integração) | `src/**/*.test.ts` · `tests/integration/` |
| Vitest | `vitest.config.mts` · `vitest.integration.config.mts` |
| Banco de teste isolado | `tests/global-setup.ts` (cria/derruba `app_db_test`) |
| **CI** com 5 jobs | `docs/ci.yml` — **pronto mas inativo** (ver §4.7) |
| **Migrations versionadas** | `drizzle/0000_*.sql` + `drizzle/0001_*.sql` (`npm run db:migrate`) |
| **Rate limit compartilhado** | tabela `rate_limits` + `src/lib/rate-limit-store.ts` |
| PostgreSQL local embutido | `npm run db:local` (dados em `.pgdata/`, gitignored) |
| **Painel administrativo** | `/admin` + `POST /api/admin` |

### Motor de jogo no servidor (Fase 2)
| Módulo | Responsabilidade |
|---|---|
| `src/lib/engine/types.ts` | Tabela de efetividade 18×18 (esparsa: só os pares não-neutros) |
| `src/lib/engine/damage.ts` | Fórmula de dano: `power`, `accuracy`, `category`, STAB, tipos, crítico, variância |
| `src/lib/engine/xp.ts` | Curva de XP, ganho por batalha, level up |
| `src/lib/engine/capture.ts` | Rolagem de captura com `catchRate` + fórmula de chacoalhada |
| `src/lib/engine/combatant.ts` | Monta os combatentes; variante **afeta** os status (B4) |
| `src/lib/battle-service.ts` | Orquestra turno, troca, captura, fuga e o resultado do ginásio |
| `src/app/api/battle/route.ts` | `start_wild` · `start_gym` · `attack` · `switch` · `catch` · `flee` |
| tabela `battles` | Estado de batalha persistido (`state` jsonb + `status`) |

O cliente não calcula mais nada: escolhe uma ação e desenha o que o servidor devolver.

### Papéis de acesso (Fase 1.1)
`users.role` — `text NOT NULL DEFAULT 'player'`, com hierarquia `player (0) < moderator (1) < admin (2)`.

| Papel | Editor de Mundos | Observação |
|---|---|---|
| `player` | ❌ 403 | padrão de todo registro novo |
| `moderator` | ❌ 403 | nível existe, mas ainda sem capacidade própria (roadmap Fase 5) |
| `admin` | ✅ 200 | cria e edita qualquer mapa |

Gate único: `requireRole(req, min)` em `src/lib/session.ts`.
Promoção: `npm run db:set-role -- <username> <papel>` (sem endpoint HTTP, de propósito).

---

## 2. O que falta implementar segundo o roadmap

- [x] **FASE 0 — Higiene** ✅ 2026-08-25 (commit `fca7f6a`)
- [x] **FASE 1 — Blindagem (segurança)** ✅ 2026-08-25 (commit `f22672f`)
- [x] **FASE 1.1 — Papéis de acesso e Editor de Mundos admin-only** ✅ 2026-08-25 (detalhes na seção 3)

- [x] **FASE 3 — Consertar o que já está construído** ✅ 2026-08-25 (detalhes na seção 3)
  - [x] **B1** Ginásio: `?mapId=0` → `GET /api/gym` + tela de erro em vez de "Carregando..." eterno
  - [x] **B2** Pokédex: +Geodude(74), Onix(95), Staryu(120), Starmie(121), Dragonair(148) — 16 → 21 espécies — **e fallback silencioso removido** (agora lança)
  - [x] **B3** `spAttack`/`spDefense` reais (antes literais 15 e 13)
  - [x] **B10** Antídoto removido da loja (dava Poção; não há sistema de status)
  - [x] **B11** Chat global ligado de verdade: `GET /api/pvp` chamado, mensagens renderizadas, fake e `pvpRooms` removidos
  - [x] **B12** AirSlash criado · limites por `width`/`height` · save de posição a cada 10 passos · teleporte livre restrito a portais
  - [x] Soft-lock de derrota resolvido (botões desabilitados + aviso + botão de saída)

- [x] **FASE 2 — Motor de jogo no servidor** ✅ 2026-08-26 (detalhes na seção 3)
  - [x] Fórmula de dano no servidor (`power`, `accuracy`, `category`, STAB, tipos, crítico)
  - [x] Tabela de efetividade de tipos 18×18
  - [x] **B4** variante afeta os status
  - [x] **B5** XP + level up com recálculo de status
  - [x] Rolagem de captura com `catchRate`
  - [x] HP persistido + recompensas reais de vitória
  - [x] `won` decidido no servidor (endpoint farmável removido)
  - [x] Times de ginásio derivados da Pokédex

- [ ] **FASE 4 — PvP de verdade** (turnos assíncronos ou WebSocket)

- [x] **FASE 5 — Infraestrutura e qualidade** ✅ 2026-08-26 (detalhes na seção 3)
  - [x] **⚡ Rate limit real**: store no **Postgres** (tabela `rate_limits`), compartilhado
        entre réplicas e sobrevivente a restart. Redis não entrou porque o binário é
        bloqueado neste ambiente — e o Postgres já resolve os dois requisitos sem
        dependência nova. Store Redis fica como upgrade opcional se o banco ficar quente.
  - [x] **106 testes** (77 unit + 29 integração) com Vitest
  - [x] **Migrations versionadas** (`drizzle/0000_*`, `drizzle/0001_*`) + `npm run db:migrate`
  - [x] **CI** no GitHub Actions: lint, typecheck, unit, integration, build
  - [x] **Painel administrativo** `/admin` + `POST /api/admin`
  - [x] **Poderes concretos de `moderator`**: moderação do chat (antes o papel não fazia nada)
  - [x] PostgreSQL local embutido (`npm run db:local`) para os testes não dependerem de Docker

- [ ] **FASE 6 — Conteúdo e mundo** (Pokédex 21→50+, evoluções, status, ranking, premium)
- [ ] **⚠️ Risco legal a decidir antes da Fase 6:** sprites/nomes da Nintendo/Game Freak via CDN de terceiros

---

## 3. Qual foi a última etapa aplicada

### ✅ FASE 5 — Infraestrutura e qualidade (2026-08-26)

Feita **antes** da Fase 4 de propósito: a Fase 2 tinha acabado de adicionar
1.328 linhas de regras de jogo sem um único teste.

#### 1. Testes — 106 no total
| Suíte | Qtde | Cobre |
|---|---|---|
| `types.test.ts` | 13 | ×2/×4/×0.5/×0.25, imunidades, tipo inexistente, imunidade vencendo fraqueza |
| `damage.test.ts` | 12 | fórmula completa, STAB = 1.5× isolado, físico vs. especial, crítico, erro, imunidade, defesa 0 |
| `xp.test.ts` | 14 | curva cúbica, level up múltiplo, carry-over, teto no nível 100 |
| `capture.test.ts` | 12 | valores de referência, Master Ball, ordem das bolas, clamps |
| `password.test.ts` | 9 | round-trip, salt aleatório, normalização unicode, hash malformado |
| `validation.test.ts` | 7 | os schemas que fecharam V3/V4 |
| `security.integration.test.ts` | 29 | as invariantes de segurança de ponta a ponta |

#### 2. Rate limit real (pendência explícita da Fase 1)
Store em **Postgres** (tabela `rate_limits`), atrás de uma interface com dois
backends (`MemoryStore` / `PostgresStore`). Resolve os dois problemas do limite
em memória: sobrevive a restart e vale entre réplicas.

**Por que não Redis:** o binário é baixado de `download.redis.io`, que está
bloqueado neste ambiente — não havia como testar. Entregar um adaptador Redis
não verificado seria pior do que não entregar. O Postgres já é dependência do
projeto, resolve o requisito e **pôde ser testado aqui**. A interface
`RateLimitStore` está pronta para receber um store Redis depois.

**Falha aberta de propósito:** se o banco cair, o limite é ignorado e o erro vai
para o log. Derrubar o jogo por causa do rate limit seria pior.

#### 3. Migrations versionadas
`drizzle-kit generate` produziu `drizzle/0000_military_kitty_pryde.sql` e
`drizzle/0001_useful_vin_gonzales.sql`. Antes só existia `db:push`, que não
gera histórico — insuficiente para produção.

#### 4. CI (`docs/ci.yml` — pronto, ainda inativo)
5 jobs: `lint`, `typecheck`, `unit`, `integration` (com serviço Postgres 18) e
`build` (depende dos três primeiros).

#### 5. Painel administrativo
- `POST /api/admin` com `set_role` e `list_staff` (só **admin**), `list_chat` e
  `delete_chat` (**moderator** ou superior).
- Página `/admin` + botão **ADMIN** no HUD (só aparece para staff).
- Admin **não pode rebaixar a si mesmo** — evita trancar a porta do painel.
- Isso finalmente dá função ao papel `moderator`, que existia na hierarquia mas
  não fazia nada.

#### 6. `npm run db:local`
PostgreSQL embutido com dados em `.pgdata/` (gitignored). Os testes de
integração não dependem mais de Docker nem de Postgres instalado na máquina.

#### Bug real encontrado pelos testes
`POST /api/shop` **não chamava `ensureShopSeeded()`** — eu o tinha removido na
Fase 1, deixando o seed só no `GET`. Na prática a UI sempre lista antes de
comprar, então nunca apareceu; mas um `POST` direto num banco novo devolvia 404.
Encontrado por `compra legítima debita o valor exato`.

---

## 4. Passo a passo de validação da última etapa

### 4.1 Checagem completa
```bash
npm run check     # lint + typecheck + test + build
```
✅ **exit 0** — lint 0/0 · `tsc` 0 erros · **77 unit tests** · build **14 rotas**
(inclui `/admin` e `/api/admin`).

```bash
npm run test:integration
```
✅ **29 testes** passando contra `app_db_test` (criado e derrubado a cada run).

### 4.2 Bugs que os testes pegaram (e foram corrigidos)
| Bug | Teste que pegou |
|---|---|
| `rollCapture` usava `<=`: com `Math.random() === 0` capturava mesmo com chance 0 | `chance 0 nunca captura` |
| `POST /api/shop` sem seed (regressão minha da Fase 1) | `compra legítima debita o valor exato` |
| XP calculado mas não gravado *(já corrigido na Fase 2, agora travado por teste)* | `vitória concede XP persistido no banco` |

Dois testes meus também estavam errados e foram corrigidos (valor de referência
da captura calculado com hp=3.6 mas escrito hp=4; monotonicidade do XP ignorando
o piso de 20).

### 4.3 Rate limit no Postgres
```
rateLimitStoreName()            → "postgres"
14 tentativas de login          → 429 na 11ª
tabela rate_limits após 1 req   → +1 linha (contador no banco, não em memória)
app_db rate_limits              → 2 entradas após o smoke test
```

### 4.4 Migrations
```bash
CREATE DATABASE mig_test2
DATABASE_URL=.../mig_test2 npm run db:migrate   → "migrations applied successfully!"
```
Resultado: **11 tabelas** (`battles, chat_messages, game_maps, gym_leaders,
pvp_battles, rate_limits, sessions, shop_items, user_badges, user_pokemon, users`),
`users.role` presente, `rate_limits` com `key, count, reset_at`.

### 4.5 Painel admin em runtime
```
GET  /admin                      → 200
POST /api/admin {list_staff}     → 200 (admin)   |  401 sem sessão
POST /api/admin {list_chat}      → 200 (admin/mod)
moderator tentando set_role      → 403 (testado)
admin rebaixando a si mesmo      → 400 (testado)
set_role com papel inexistente   → 400 (testado)
```

### 4.6 Smoke test do ambiente
`GET /` 200 · `GET /admin` 200 · `health` 200 `{"ok":true}` · `db:set-role` ✔.

### 4.7 O que **não** foi validado
1. **O CI não está ativo — e não depende do mantenedor habilitar nada.**
   O push de `.github/workflows/ci.yml` foi rejeitado: a App
   (`arena-ai-coding-agent[bot]`) não declara a permissão `workflows` no
   manifesto, então **o toggle nem aparece** na tela de permissões do
   repositório. Confirmado por `PUT .github/workflows/probe.yml` → `403
   "Resource not accessible by integration"`.
   O arquivo foi preservado em `docs/ci.yml`; `docs/CI.md` traz as três saídas
   (criar o arquivo manualmente, token com escopo `workflow`, ou não usar CI).
   Além disso ele nunca rodou — o YAML foi validado só estruturalmente, então a
   primeira execução real pode revelar divergência de versão de action.
2. **A interface de `/admin` não foi aberta num navegador** (item 7 das
   pendências manuais). A API por trás está coberta por testes.
3. **Store Redis** não existe — decisão documentada na seção 3.

---

## 5. Qual a próxima etapa a ser aplicada

### ⚔️ FASE 4 — PvP de verdade

Agora é a hora: o motor autoritativo da Fase 2 já resolve turnos, dano, tipos e
persistência, e a Fase 5 o cobriu de testes. PvP é o último recurso anunciado
que não existe — hoje `create_room`/`join_room` gravam a sala e param aí.

1. **Resolver a batalha PvP no motor existente**, reaproveitando
   `battle-service` com `kind: "pvp"` e dois `activePokemonId`.
2. **Matchmaking**: `join_room` precisa acoplar os dois jogadores e iniciar a
   batalha — hoje só preenche `player2Id` e nada acontece.
3. **Turnos**: assíncronos com polling (mais simples, usa só Postgres) **ou**
   tempo real com WebSocket/SSE. Decisão a tomar antes de começar.
4. **Sincronização de estado**: ambos os lados precisam ver o mesmo turno.
5. **Recompensa e ranking**: `wins`/`losses` já existem no schema.
6. **Desafiantes lendários**: `LEGENDARY_CHALLENGERS` em `/api/pvp` é decorativo
   — ou vira batalha real de PvE, ou sai da tela.

**Critério de aceite sugerido:** dois navegadores logados em contas diferentes,
um cria a sala, o outro entra, trocam golpes e um vence — com o resultado
decidido pelo servidor e visível para os dois.

**Antes de começar:** reler este arquivo (regra do protocolo).

---

## Histórico de etapas

| Data | Etapa | Status | Registro |
|---|---|---|---|
| 2026-08-25 | Auditoria completa | ✅ Concluída | `AUDITORIA.md` |
| 2026-08-25 | **Fase 0** — Higiene + protocolo AI_State | ✅ Concluída e validada | commit `6496bff` |
| 2026-08-25 | **Fase 1** — Blindagem de segurança | ✅ Concluída e validada | commit `6496bff` |
| 2026-08-25 | **Fase 1.1** — Papéis + Editor admin-only | ✅ Concluída e validada | commit `660aeb0` |
| 2026-08-26 | **Correção** — `allowedDevOrigins` (preview não hidratava) | ✅ Concluída e validada | commit `660aeb0` |
| 2026-08-26 | **Fase 3** — Consertar o que já estava construído | ✅ Concluída e validada | commit `212ea1d` |
| 2026-08-26 | **Fase 2** — Motor de jogo no servidor | ✅ Concluída e validada | commit `003ef41` |
| 2026-08-26 | **Fase 5** — Infraestrutura e qualidade | ✅ Concluída e validada | 106 testes + CI |
| — | **Fase 4** — PvP de verdade | ⬜ Próxima | — |

> **Nota sobre o histórico git:** o `.git` do sandbox é resetado entre sessões.
> Os commits originais por fase (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos
> e reunidos em `6496bff`. O código nunca foi afetado, e o push para o GitHub é
> o que preserva o histórico. Por isso a memória do projeto vive **neste
> arquivo**, não no git.
