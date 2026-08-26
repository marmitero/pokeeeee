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
16 espécies · 12 golpes · 6 variantes · 3 mapas · 3 líderes de ginásio · 12 itens de loja · 10 tipos de tile

### Estado funcional real
| Feature | Estado |
|---|---|
| Registro / Login / Sessão | ✅ Funciona (inseguro — ver Fase 1) |
| Exploração + movimento + portais | ✅ Funciona |
| Encontros selvagens | ✅ Funciona (decididos no cliente) |
| Batalha selvagem | ⚠️ Cosmética — nada persiste |
| Captura | ⚠️ Grava, mas não valida nada |
| XP / Nível up | ❌ Morto — colunas existem, nunca recebem UPDATE |
| PC Box / time / itens | ✅ Funciona |
| Ginásio | ❌ **MORTO** — `GymModal` chama `?mapId=0`, líderes têm map_id 1/2/3 |
| Loja (comprar) | ⚠️ Funciona, com exploit de `quantity` negativa |
| Loja (vender item) | ❌ Não existe (`sellPrice` é coluna morta) |
| Editor de Mundos | ✅ Funciona — melhor parte do projeto, sem autorização |
| PvP real | ❌ Falso — luta contra Mewtwo fixo |
| Chat global | ⚠️ Grava, nunca carrega (`GET /api/pvp` nunca é chamado) |
| Pacote de Sprites | ✅ Funciona (vitrine) |

### Direção de arte (preservar — é o ativo mais valioso)
Pixel art 16-bit + overlay CRT. **Zero assets binários no repo**: 48 GIFs animados Gen V via CDN (`raw.githubusercontent.com/PokeAPI/sprites`). 5 das 6 variantes são **filtros CSS em runtime** sobre o sprite base. Tipografia Press Start 2P (HUD) / VT323 (diálogos) / IBM Plex Mono (dados). **Áudio 100% sintetizado via Web Audio API**, sem arquivos de som.

### Infraestrutura de projeto (Fase 0)
`.gitignore` · `README.md` · `.env.example` · `drizzle.config.ts` · `package-lock.json` versionado · `AI_State.md`

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

- [ ] **FASE 3 — Consertar o que já está construído** ← *⚡ PRÓXIMA ETAPA*
  - [ ] **B1** Ginásio: `GymModal` pede `?mapId=0` → trava em "Carregando..." *(preservado na Fase 1 de propósito)*
  - [ ] **B2** Pokédex: adicionar Geodude(74), Onix(95), Staryu(120), Starmie(121), Dragonair(148) **e remover o fallback silencioso** `|| POKEDEX[0]`
  - [ ] **B3** `spAttack: 15, spDefense: 13` hardcoded em `page.tsx`
  - [ ] **B11** Chat: chamar `GET /api/pvp`, renderizar de verdade, remover mensagens fake e o estado morto `pvpRooms`
  - [ ] Soft-lock de derrota na batalha selvagem (botões ativos com `playerHp <= 0`)
  - [ ] **B10** Antídoto gravando em `potions` / sistema de status
  - [ ] **B12** Teleporte livre pela lista de mapas; salvamento de posição determinístico (hoje `Math.random() < 0.15`); limites do mapa por `width`/`height` em vez de 16; `ALL_MOVES.AirSlash` inexistente

- [ ] **FASE 2 — Motor de jogo no servidor**
  - [ ] Fórmula de dano no servidor usando `power`, `accuracy`, `category`, stats reais
  - [ ] Tabela de efetividade de tipos (18×18) — hoje não existe
  - [ ] **B4** Corrigir `computeDelugeStats(..., "Normal")` na captura — variante não afeta status *(preservado na Fase 1 de propósito, há `TODO` no código)*
  - [ ] Sistema de XP e level up real (**B5** — hoje nenhuma coluna de XP recebe UPDATE)
  - [ ] Rolagem de captura no servidor usando `catchRate` (hoje nunca é lido)
  - [ ] Persistir HP ao fim da batalha; recompensas reais de vitória (**B6**)
  - [ ] **Resolver a batalha de ginásio no servidor e parar de aceitar `won` do cliente.** Enquanto `won` vier do cliente, a recompensa do ginásio segue farmável por curl — autenticação não resolve isso. É o motivo de a Fase 2 ser obrigatória.

- [ ] **FASE 4 — PvP de verdade** (turnos assíncronos ou WebSocket)

- [ ] **FASE 5 — Infraestrutura e qualidade**
  - [ ] **⚡ Rate limit real (pendência explícita da Fase 1).** Hoje `src/lib/rate-limit.ts`
        é uma janela fixa **em memória**: não sobrevive a restart, não compartilha
        contagem entre réplicas e pode ser contornado abrindo outra instância.
        Trocar por **Redis/Upstash** (janela deslizante + `INCR`/`EXPIRE` atômicos),
        mantendo a assinatura `enforceRateLimit(req, scope, limit, windowMs)` para
        que as rotas não mudem. Adicionar `RATE_LIMIT_URL` no `.env.example`.
        Estender a cobertura para `catch`, `shop` e `maps`, não só `auth`.
  - [ ] **Painel administrativo** para gestão de papéis pela interface. Hoje promover
        alguém exige acesso direto ao banco (`npm run db:set-role`) — deliberado,
        mas impraticável em produção. Exige endpoint com `requireRole(req, "admin")`
        + trilha de auditoria.
  - [ ] **Poderes concretos de `moderator`.** O papel existe na hierarquia mas ainda
        não tem capacidade distinta de `player`. Implementar moderação de chat
        (`DELETE /api/pvp/chat/:id` com `requireRole(req, "moderator")`) e, se
        desejado, silenciamento temporário de jogadores.
  - [ ] Vitest para `src/lib/` + testes de integração das rotas
  - [ ] GitHub Actions: `lint` + `typecheck` + `test` + `build`
  - [ ] **Migrations versionadas** (`drizzle-kit generate`) — hoje só existe `db:push`
  - [ ] Logging estruturado + monitoramento de erros

- [ ] **FASE 6 — Conteúdo e mundo** (Pokédex 16→50+, evoluções, status, ranking, premium)
- [ ] **⚠️ Risco legal a decidir antes da Fase 6:** sprites/nomes da Nintendo/Game Freak via CDN de terceiros

---

## 3. Qual foi a última etapa aplicada

### ✅ FASE 1.1 — Papéis de acesso + Editor de Mundos admin-only (2026-08-25)

Etapa pedida pelo mantenedor após a Fase 1, para fechar o risco residual que a
Fase 1 documentou (mapas de sistema editáveis por qualquer autenticado).

#### Papéis (em `src/db/schema.ts`)

| Papel | Nível | Pode |
|---|---|---|
| `player` | 0 | Jogar. **Não** altera nada do mundo compartilhado. |
| `moderator` | 1 | O mesmo que `player` **por enquanto** — o nível existe na hierarquia, mas ainda não há capacidade distinta implementada (ver roadmap, Fase 5). **Não** edita mapas. |
| `admin` | 2 | Tudo, incluindo criar e editar **qualquer** mapa. |

- Coluna `users.role` — `text NOT NULL DEFAULT 'player'`.
- `text` em vez de `pgEnum` **de propósito**: adicionar um papel novo vira uma
  linha de código, não uma migration de tipo. A validação de valor fica na
  aplicação (`ROLES`, `ROLE_LEVEL`, `toRole`).
- `toRole()` converte qualquer valor vindo do banco e **falha para `"player"`**
  — sempre para o lado mais restritivo.

#### Como transformar um usuário em admin

```bash
npm run db:set-role -- <username> admin          # promove
npm run db:set-role -- <username> moderator      # promove a moderador
npm run db:set-role -- <username> player         # rebaixa
npm run db:set-role                              # sem argumentos: lista a equipe
```

Não existe endpoint HTTP para isso — **é deliberado**. Um endpoint de gestão de
papéis abriria exatamente a superfície que a Fase 1 fechou. Painel
administrativo com trilha de auditoria está no roadmap (Fase 5).

O efeito é **imediato**: como o papel é lido do banco a cada request, um
rebaixamento vale na hora, mesmo com a sessão já aberta.

#### Autorização

- `requireRole(req, min)` em `src/lib/session.ts` — exige sessão **e** papel
  igual ou superior. A comparação é por nível, então pedir `"moderator"`
  também aceita `"admin"`. Lança `403` com mensagem clara.
- `POST /api/maps` e `PUT /api/maps/[id]` agora usam `requireRole(req, "admin")`.
- A checagem anterior "só o dono edita o próprio mapa" foi **removida**: com a
  porta restrita a admin, ela só serviria para impedir um admin de mexer num
  mapa criado por outro. `creatorId` continua gravado, agora como
  **autoria/auditoria**, não como autorização.

#### Interface

- Botão **EDITOR** e o link **+ CRIAR** só aparecem para `admin`.
- A modal `WorldMapEditor` só renderiza para `admin`.
- Selo **ADMIN** / **MOD** no HUD para a equipe.
- `role` passa a vir na resposta da sessão (`publicUser` já o incluía por
  não ser sensível) — a UI nunca decide permissão por ele, só esconde entrada.

> ⚠️ **Consequência de produto:** o Editor de Mundos era anunciado como
> feature de jogador ("crie seus próprios mapas") e agora é ferramenta de
> administração. O `README` e o texto de marketing precisam refletir isso.
> Se a intenção for voltar a abrir para jogadores, o caminho é um sistema de
> mapas *privados* por usuário, e não reabrir a escrita no mundo compartilhado.

#### Arquivos

- **Novo:** `scripts/set-role.ts`
- **Alterados:** `src/db/schema.ts` (+`role`, `ROLES`, `ROLE_LEVEL`, `toRole`) ·
  `src/lib/session.ts` (+`requireRole`) · `src/lib/validation.ts` (+`roleSchema`) ·
  `src/app/api/maps/route.ts` · `src/app/api/maps/[id]/route.ts` ·
  `src/app/page.tsx` · `package.json` (+`db:set-role`)

---

## 4. Passo a passo de validação da última etapa

Tudo executado de fato contra PostgreSQL 18.4 + a aplicação em `next dev`.

### 4.1 Schema e checagens

```bash
npm run db:push
```
```
information_schema.columns → role | text | 'player'::text | NOT NULL
```
```bash
npm run check     # lint + typecheck + build
```
✅ **exit 0** — lint 0 erros/0 warnings · `tsc` 0 erros · build 11 rotas.

### 4.2 Script de papéis

```bash
npm run db:set-role                              # → "Nenhum moderador ou admin cadastrado ainda."
npm run db:set-role -- nao_existe admin          # → ✗ Treinador "nao_existe" não encontrado.
npm run db:set-role -- audit_test superuser      # → ✗ Papel inválido: superuser
                                                 #   Papéis aceitos: player | moderator | admin
npm run db:set-role -- audit_test admin          # → ✔ audit_test (id 4): "player" → "admin"
npm run db:set-role -- smoke_final moderator     # → ✔ smoke_final (id 7): "player" → "moderator"
npm run db:set-role                              # → #4 audit_test  admin  último acesso: …
```

### 4.3 Autorização na API (3 sessões reais)

`role` devolvido pela sessão: `admin` / `moderator` / `player` ✔

| Rota | admin | moderator | player |
|---|---|---|---|
| `POST /api/maps` | **200** (mapa id 5 criado) | **403** | **403** |
| `PUT /api/maps/1` | **200** | **403** | **403** |

Mensagem do 403: `"Esta ação exige papel \"admin\" ou superior. O seu é \"player\"."`

### 4.4 Rebaixamento com sessão aberta

```bash
npm run db:set-role -- audit_test player    # ✔ "admin" → "player"
```
```
ex-admin tenta PUT /api/maps/1  → HTTP 403
role na sessão                  → "player"
```
A troca vale na hora, sem precisar re-login.

### 4.5 Regressão — jogador comum segue jogando

`GET /api/maps` 200 · `GET /api/shop` 200 · comprar 1 Pokébola 200 ·
capturar Pikachu 200 · curar equipe 200 · chat global 200.

### 4.6 O que **não** foi validado por curl

O **ocultamento dos botões** EDITOR / + CRIAR no navegador é decisão de render
no cliente (depende do `role` que chega na sessão). Está correto no código
(`{isAdmin && …}` nos três pontos), mas **não foi verificado visualmente** —
exige abrir a interface logado como admin e como jogador. Fica como verificação
manual pendente.

---

## 5. Qual a próxima etapa a ser aplicada

### ⚡ FASE 3 — Consertar o que já está construído

**⏸️ Aguardando autorização do mantenedor para começar.**

**Por que ela antes da Fase 2:** são defeitos de 1 a 5 linhas cada, em código
que já existe e já está ligado. Retorno em experiência imediato, risco baixo.
A Fase 2 (motor de jogo no servidor) é bem maior e fica melhor sobre uma base
que pelo menos funciona na tela.

**Ordem sugerida:**

1. **B1 — Ginásio quebrado** *(o defeito mais visível do jogo)*
   `GymModal.tsx` chama `fetch('/api/gym?mapId=0')`, mas os líderes têm
   `map_id` 1/2/3 → lista vazia → `setLeader` nunca roda → trava em
   "Carregando Ginásio..." para sempre. Trocar por `GET /api/gym/:id`.
2. **B2 — Pokémon de ginásio viram Bulbasaur**
   Adicionar Geodude(74), Onix(95), Staryu(120), Starmie(121), Dragonair(148)
   à Pokédex **e remover o fallback silencioso** `return found || POKEDEX[0]`.
3. **B11 — Chat morto**
   Ligar `GET /api/pvp`, renderizar de verdade, remover as 2 mensagens fake
   hardcoded e o estado `pvpRooms` (escrito, nunca renderizado).
4. **Soft-lock de derrota** na batalha selvagem.
5. **B3** `spAttack: 15, spDefense: 13` hardcoded em `page.tsx`.
6. **B10** Antídoto gravando em `potions`.
7. **B12** Teleporte livre · salvamento de posição determinístico · limites do
   mapa por `width`/`height` · `ALL_MOVES.AirSlash` inexistente.

**Critério de aceite:** abrir o Ginásio pela interface e chegar à tela de
batalha com os sprites corretos (Onix é Onix, não Bulbasaur); vencer, receber a
insígnia e vê-la no HUD; chat global carregando mensagens reais.

**Antes de começar:** reler este arquivo (regra do protocolo).

---

## Histórico de etapas

| Data | Etapa | Status | Registro |
|---|---|---|---|
| 2026-08-25 | Auditoria completa | ✅ Concluída | `AUDITORIA.md` |
| 2026-08-25 | **Fase 0** — Higiene + protocolo AI_State | ✅ Concluída e validada | commit `fca7f6a` |
| 2026-08-25 | **Fase 1** — Blindagem de segurança | ✅ Concluída e validada | commit `f22672f` |
| 2026-08-25 | **Fase 1.1** — Papéis + Editor admin-only | ✅ Concluída e validada | 403 para player/moderator, 200 para admin |
| — | **Fase 3** — Consertar o que já está construído | ⏸️ Aguardando autorização | — |
