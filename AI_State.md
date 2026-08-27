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

### Sessão em iframe cross-site (correção de 2026-08-27)
| Item | Onde |
|---|---|
| `COOKIE_SAME_SITE` = `lax` \| `none` | `.env` — use `none` quando o app roda dentro de iframe de outro site |
| Validação de `Origin` (CSRF) | `src/lib/csrf.ts`, chamada dentro de `requireUser()` |

O preview embutido é um iframe cross-site: com `SameSite=Lax` o navegador **não
reenvia o cookie**, então o login parecia funcionar (a UI é preenchida pela
resposta) mas toda request seguinte devolvia 401. Com `none` o cookie exige
`Secure` e a proteção CSRF é refeita validando o `Origin`.

### PvP assíncrono (Fase 4)
| Módulo | Responsabilidade |
|---|---|
| `src/lib/pvp-service.ts` | Orquestração: salas, turno às cegas, resolução atômica, timeout |
| `src/components/PvpLobby.tsx` | Criar/entrar em sala escolhendo o Pokémon |
| `src/components/PvpArena.tsx` | Batalha com polling de 2,5 s |
| `pvp_battles.mode` | `"friendly"` (hoje) \| `"ranked"` (Arena futura) |
| `users.elo` | Existe (default 1000) mas **dormente** — só a Arena escreverá |

Amistoso atualiza `wins`/`losses` e o dano persiste; **não** mexe em ELO nem em ranking.

### Infraestrutura de qualidade (Fase 5)
| Item | Onde |
|---|---|
| **106 testes** (77 unit + 29 integração) | `src/**/*.test.ts` · `tests/integration/` |
| Vitest | `vitest.config.mts` · `vitest.integration.config.mts` |
| Banco de teste isolado | `tests/global-setup.ts` (cria/derruba `app_db_test`) |
| **CI** com 5 jobs | `.github/workflows/ci.yml` — **ativo e verificado** (5/5 success) |
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

- [x] **FASE 4 — PvP de verdade** ✅ 2026-08-27 (detalhes na seção 3)
  - [x] Turnos assíncronos com polling (2,5 s), sem WebSocket
  - [x] Resolução no servidor com lock de linha (`SELECT ... FOR UPDATE`)
  - [x] Ação travada **às cegas** — o estado expõe só `opponentCommitted: boolean`
  - [x] Sub-estado `SWITCH`, forfeit e timeout preguiçoso de 60 s
  - [x] `users.elo` (default 1000) **dormente** — amistoso não escreve nele
  - [x] `pvp_battles.mode` = `"friendly"` | `"ranked"` (Arena futura sem retrabalho)
  - [x] `create_room`/`join_room` agora usam `pokemonId` (fim do vetor hp/attack 9999)
  - [x] Regressão corrigida: `users.losses` voltou a ser incrementado no PvE
  - [ ] _Futuro:_ **Arena PvP ranqueada** — ranking global, ELO, recompensas por posição

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

### ✅ Correção — sessão quebrada no preview (2026-08-27)

Reportado pelo mantenedor durante a validação manual: criar mapa não fazia nada,
criar sala PvP dava "Sessão inválida ou expirada", e desafiar ginásio idem —
mesmo logado, e mesmo com conta recém-criada.

#### Diagnóstico (a partir dos logs, não de suposição)

O padrão nos logs era inequívoco:

```
POST /api/auth 200      ← login funciona
GET  /api/auth 401      ← mas a sessão seguinte já não existe
POST /api/maps 401 · POST /api/pvp 401 · POST /api/battle 401
POST /api/pokemon/heal 401 · GET /api/pvp 401
```

E com o cookie enviado manualmente, tudo funcionava:

```
curl -b cookie  GET  /api/auth  → 200
curl -b cookie  POST /api/maps  → 400 (validação — ou seja, PASSOU na auth)
```

Logo o servidor estava correto e o problema era o cookie não sobreviver no
navegador. O cabeçalho emitido era:

```
set-cookie: deluge_session=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000
```

#### Causa raiz

**O preview é um iframe cross-site** (`arena.ai` incorporando
`https://3000-<sandbox>.e2b.app`). Em contexto de terceiro, o navegador **não
reenvia cookies `SameSite=Lax`**.

Isso explica os três relatos de uma vez, e também um detalhe que parecia
contraditório:

- o login **parecia** funcionar porque `applyLogin()` preenche a interface com o
  usuário vindo da **resposta** — os botões ADMIN/EDITOR aparecem por estado em
  memória, não por sessão;
- toda request seguinte ia sem cookie → 401;
- "não chega a deslogar verdadeiramente" porque o estado em memória continua
  intacto — só o servidor discorda.

#### Correção

1. **`COOKIE_SAME_SITE`** (`lax` padrão · `none` para iframe). Com `none` o
   cookie sai `SameSite=None; Secure` — o navegador exige `Secure` junto.
2. **CSRF por validação de `Origin`** (`src/lib/csrf.ts`), chamada dentro de
   `requireUser()`. Necessário porque `SameSite=None` desliga a proteção CSRF do
   navegador. Se o `Origin` vier e não bater com o `Host` → 403. Sem `Origin`,
   permite (preserva curl e testes sem abrir o vetor clássico, que depende
   justamente do navegador enviar o Origin).
3. **Erro visível no drawer de criar mapa.** Bug de UX separado, encontrado no
   caminho: a falha ia para `statusMsg`, que renderiza em **outro painel**. O
   usuário clicava, a request falhava e a tela não dava sinal — daí o "carrega
   e para". Agora o erro aparece dentro do próprio drawer, com estado de
   "Salvando mapa...".

#### Arquivos

| | |
|---|---|
| **Novos** | `src/lib/csrf.ts` · `src/lib/csrf.test.ts` |
| **Alterados** | `src/lib/session.ts` (SameSite configurável + CSRF em `requireUser`) · `src/components/WorldMapEditor.tsx` (erro no drawer) · `.env.example` (documentação) · `tests/integration/security.integration.test.ts` |

---

## 4. Passo a passo de validação da última etapa

### 4.1 Checagens
```bash
COOKIE_SAME_SITE=none npm run check
```
✅ **exit 0** — lint 0/0 · tsc 0 · **84 testes unitários** (7 novos de CSRF) · build 14 rotas.
✅ Integração com `COOKIE_SAME_SITE=none`: **43 testes** (31 segurança + 12 PvP).
   **Total: 127 testes.**

### 4.2 Cookie antes × depois
```
ANTES  deluge_session=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000
AGORA  deluge_session=...; Path=/; HttpOnly; SameSite=None; Max-Age=2592000; Secure
```

### 4.3 Os três fluxos reportados, testados de ponta a ponta
```
1) criar mapa (admin)   → 200 · "Mapa do Teste" id 4, autor teste_mapa · 4 mapas
2) criar sala PvP       → 200 · sala DLG-6918
3) desafiar ginásio     → 200 · batalha vs Geodude lvl 12
```

### 4.4 CSRF não foi sacrificado
```
POST /api/pvp com Origin: https://evil.example.com
  → 403 {"error":"Requisição bloqueada: origem não corresponde ao servidor."}
```
Coberto por teste: Origin igual ao Host passa; Origin diferente bloqueia (403);
porta diferente bloqueia; sem Origin passa; GET/HEAD ignoram; PUT/DELETE também
são checados; Origin malformado não quebra.

### 4.5 O que **não** foi validado
**A confirmação final é sua, no navegador.** Eu provei que o servidor emite o
cookie com os atributos certos, que o fluxo inteiro funciona com ele, e que o
CSRF continua bloqueando origem externa. Mas **não tenho navegador aqui** para
confirmar que o iframe do preview agora aceita e reenvia o cookie. É exatamente
o ponto que falhou da primeira vez, então vale você repetir os três testes.

---

## 5. Qual a próxima etapa a ser aplicada

### 🎮 FASE 6 — Conteúdo e mundo

**⏸️ Antes dela: aguardando a revalidação manual desta correção no navegador.**

Depois disso, a ordem sugerida da Fase 6 (decisão do mantenedor):

1. **Balanceamento do início do jogo** *(o mais urgente na prática)* — inicial
   lvl 5 nocauteia outro inicial lvl 5 em **um** golpe. Sem isso toda batalha
   dura um turno.
2. **XP e evolução** — Charmander nunca vira Charizard.
3. **Pokédex 21 → 50+** e mais golpes.
4. **Sistema de status** (veneno, queimadura, paralisia) — o Antídoto voltaria
   com coluna própria.
5. **Arena PvP ranqueada** — `mode: "ranked"` e `users.elo` já existem dormentes.
6. **NPCs editáveis no Editor de Mundos.**
7. **Premium** — `isPremium`/`premiumSkins` continuam colunas mortas.

**Antes de começar:** reler este arquivo (regra do protocolo).

---

## Histórico de etapas

| Data | Etapa | Status | Registro |
|---|---|---|---|
| 2026-08-25 | Auditoria completa | ✅ Concluída | `AUDITORIA.md` |
| 2026-08-25 | **Fase 0** — Higiene + protocolo AI_State | ✅ Concluída e validada | commit `6496bff` |
| 2026-08-25 | **Fase 1** — Blindagem de segurança | ✅ Concluída e validada | commit `6496bff` |
| 2026-08-25 | **Fase 1.1** — Papéis + Editor admin-only | ✅ Concluída e validada | commit `660aeb0` |
| 2026-08-26 | **Correção** — `allowedDevOrigins` | ✅ Concluída e validada | commit `660aeb0` |
| 2026-08-26 | **Fase 3** — Consertar o que já estava construído | ✅ Concluída e validada | commit `212ea1d` |
| 2026-08-26 | **Fase 2** — Motor de jogo no servidor | ✅ Concluída e validada | commit `003ef41` |
| 2026-08-26 | **Fase 5** — Infraestrutura e qualidade | ✅ Concluída e validada | commit `a559f1a` |
| 2026-08-26 | **CI ativado** pelo mantenedor | ✅ 5/5 jobs success | commit `e02bb30` |
| 2026-08-27 | **Fase 4** — PvP assíncrono | ✅ Concluída e validada | commit `c1e8187` |
| 2026-08-27 | **Correção** — cookie SameSite no iframe + CSRF | ✅ Validada no servidor; **aguardando revalidação no navegador** | 127 testes |
| — | **Fase 6** — Conteúdo e mundo | ⬜ Próxima | — |

> **Nota sobre o histórico git:** o `.git` do sandbox é resetado entre sessões.
> Commits originais por fase (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos e
> reunidos em `6496bff`. O código nunca foi afetado, e o push para o GitHub é o
> que preserva o histórico. Por isso a memória do projeto vive **neste
> arquivo**, não no git.
