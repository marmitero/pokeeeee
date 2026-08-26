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
21 espécies · 19 golpes · 6 variantes · 3 mapas · 3 líderes de ginásio · 11 itens de loja · 10 tipos de tile

### Estado funcional real
| Feature | Estado |
|---|---|
| Registro / Login / Sessão | ✅ Funciona (inseguro — ver Fase 1) |
| Exploração + movimento + portais | ✅ Funciona |
| Encontros selvagens | ✅ Funciona (decididos no cliente) |
| Batalha selvagem | ⚠️ Cosmética — nada persiste (derrota agora tem saída; motor é Fase 2) |
| Captura | ⚠️ Grava, mas não valida nada |
| XP / Nível up | ❌ Morto — colunas existem, nunca recebem UPDATE |
| PC Box / time / itens | ✅ Funciona |
| Ginásio | ✅ **FUNCIONA** (B1/B2 corrigidos na Fase 3) — insígnias em sequência; `won` ainda vem do cliente (Fase 2) |
| Loja (comprar) | ⚠️ Funciona, com exploit de `quantity` negativa |
| Loja (vender item) | ❌ Não existe (`sellPrice` é coluna morta) |
| Loja (Antídoto) | 🗑️ Removido na Fase 3 — dava Poção e não havia status para curar |
| Editor de Mundos | ✅ Funciona — melhor parte do projeto, sem autorização |
| PvP real | ❌ Falso — luta contra Mewtwo fixo |
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

### ✅ FASE 3 — Consertar o que já está construído (2026-08-25)

Sete defeitos corrigidos. Todos em código que já existia — nenhuma feature nova.

| Bug | Antes | Depois |
|---|---|---|
| **B1** Ginásio | `fetch('/api/gym?mapId=0')` → lista vazia → `setLeader` nunca roda → **preso em "Carregando Ginásio..." para sempre** | `fetch('/api/gym')` (sem filtro, filtra no cliente) + `loadError` com tela de erro e botão VOLTAR em vez de travar |
| **B2** Sprites | 5 dos 6 Pokémon de ginásio viravam **Bulbasaur** (`getPokemonSpecies` caía em `\|\| POKEDEX[0]`) | +5 espécies (Geodude 74, Onix 95, Staryu 120, Starmie 121, Dragonair 148) + 7 golpes novos; fallback **removido** — id inválido agora lança |
| **B3** Status | `spAttack: 15, spDefense: 13` literais — todo Pokémon lutava igual | `p.spAttack` / `p.spDefense` do banco (campos adicionados ao tipo `BoxPokemon`) |
| **B10** Antídoto | `itemKey: "potions"` — comprar antídoto dava Poção | Item **removido** + limpeza idempotente para bancos já semeados |
| **B11** Chat | `GET /api/pvp` nunca era chamado; `chatMessages` **nem era renderizado**; 2 mensagens fake | Busca ao abrir + polling de 5s + uso da resposta do POST; lista renderizada; fake e `pvpRooms` (estado morto) removidos |
| **B12a** AirSlash | `ALL_MOVES.AirSlash \|\| QuickAttack` — não existia, caía no fallback em silêncio | Golpe `AirSlash` criado; Charizard agora tem Corte Aéreo de verdade |
| **B12b** Limites | `nextX >= 16` hardcoded, ignorando `width`/`height` | `currentMap.width` / `.height` |
| **B12c** Posição | `Math.random() < 0.15` — **85% dos passos não eram gravados** | a cada `SAVE_EVERY_STEPS = 10` passos, determinístico |
| **B12d** Teleporte | A lista lateral trocava para **qualquer** mapa, ignorando portais e progressão | Só mapas ligados por portal ao atual são clicáveis; os demais ficam com 🔒 |
| **—** Derrota | `handleUseMove` retornava em silêncio com `playerHp <= 0`, mas os botões seguiam ativos → **soft-lock sem saída** | Botões desabilitados + linha de log de derrota + botão "VOLTAR PARA A BASE" |

#### Arquivos alterados (8)
`src/lib/pokedex.ts` · `src/lib/seed-shop.ts` · `src/app/page.tsx` ·
`src/components/GymModal.tsx` · `src/components/BattleArenaModal.tsx` ·
`src/components/PokemonBox.tsx` · `AI_State.md` · `README.md`

#### ⚠️ Decisões e observações

1. **Antídoto foi removido, não consertado.** Não existe sistema de status
   (veneno/queimadura/paralisia) para ele curar. Quando o sistema chegar, o
   item volta com **coluna própria** — não reaproveitar `potions`.
2. **Stats dos times de ginásio continuam hardcoded** em `seed-gym.ts`
   (Geodude lvl 12 com `hp: 52`, por exemplo). A batalha usa esses valores
   direto, não `computeDelugeStats`. Recalcular é trabalho da **Fase 2**, junto
   com o motor de combate — mexer agora só desbalancearia sem resolver.
3. **A Pokédex tem 21 espécies**, não as 16 originais. O rodapé do
   `SpritePackModal` mostra `POKEDEX.length × 6`, então o número exibido
   atualiza sozinho.
4. **B1 e B4 continuam pendentes de propósito:** `won` ainda vem do cliente
   (Fase 2) e a captura ainda calcula status como `"Normal"` (`TODO` no código,
   Fase 2).

---

## 4. Passo a passo de validação da última etapa

### 4.1 Checagens do projeto

```bash
npm run check     # lint + typecheck + build
```
✅ **exit 0** — lint 0 erros/0 warnings · `tsc` 0 erros · build 11 rotas.

### 4.2 B2 — Pokédex (`npx tsx /tmp/poke.ts`)

```
Espécies na Pokédex: 21
Golpes em ALL_MOVES: 19

Times de ginásio (B2):
  OK  #74  Geodude   → Geodude   [Rock/Ground]     4 golpes
  OK  #95  Onix      → Onix      [Rock/Ground]     4 golpes
  OK  #120 Staryu    → Staryu    [Water]           4 golpes
  OK  #121 Starmie   → Starmie   [Water/Psychic]   4 golpes
  OK  #148 Dragonair → Dragonair [Dragon]          4 golpes
  OK  #149 Dragonite → Dragonite [Dragon/Flying]   4 golpes

Charizard: Lança-Chamas, Garra Dragão, Terremoto, Corte Aéreo   ← AirSlash real
Fallback removido?  ✔ lança: "Espécie desconhecida na Pokédex: 9999. Ids disponíveis: [...]"
Toda espécie tem 4 golpes válidos?  ✔
Bugs restantes nos times de ginásio: 0
```

### 4.3 B1 — o que a `GymModal` consome

```
GET /api/gym → 3 líderes
  - Brock | mapId 1 | Insígnia Pedra    | Geodude(74), Onix(95)
  - Misty | mapId 2 | Insígnia Cascata  | Staryu(120), Starmie(121)
  - Lance | mapId 3 | Insígnia do Dragão| Dragonair(148), Dragonite(149)
```
Antes: `GET /api/gym?mapId=0` → `{"gymLeaders":[]}`.

### 4.4 Fluxo completo do ginásio (critério de aceite)

| Passo | Resultado |
|---|---|
| Insígnias iniciais | `0` |
| Enfrentar Brock (requiredBadges 0) | `200` · money 3000 → **4500** |
| Insígnias | `1` — 🪨 Insígnia Pedra |
| Enfrentar Misty (requiredBadges 1) | `200` · money → **6700** |
| Enfrentar Lance (requiredBadges 2) | `200` · money → **11700** |
| Insígnias finais | **🪨 💧 🐉 — 3/3** |

O gate de pré-requisito foi respeitado em sequência.

### 4.5 B10 e B11

```
GET /api/shop?shopId=1 → Pokébola, Poção, Reviver
  Antídoto presente? ✔ NÃO            (limpeza idempotente rodou num banco já semeado)

POST /api/pvp {action:"chat"} → 200
GET  /api/pvp → chatMessages: 1  →  "admin: Fase 3: chat funcionando de verdade"
```

### 4.6 O que **não** foi validado por curl

Os itens **puramente visuais** dependem de abrir a interface e não foram
conferidos no navegador: sprites aparecendo corretos na tela de batalha do
ginásio, a lista de mensagens do chat renderizada, os cards 🔒 na lista de
mapas e o botão "VOLTAR PARA A BASE" na derrota. A lógica por trás de cada um
foi verificada acima; a pintura em si, não.

---

## 5. Qual a próxima etapa a ser aplicada

### 🔥 FASE 2 — Motor de jogo no servidor

**Por que agora:** as três pendências que restam são todas do mesmo tipo —
regras de jogo decididas no cliente. Não dá para corrigi-las uma a uma; elas
exigem o mesmo motor.

1. **Fórmula de dano no servidor** usando `power`, `accuracy`, `category` e os
   status reais. Hoje `src/lib/battle.ts` ignora tudo isso: os 4 golpes causam
   dano idêntico e o nome é só texto.
2. **Tabela de efetividade de tipos (18×18)** — hoje não existe; Água vs. Fogo
   é igual a Normal vs. Normal.
3. **B4** — `computeDelugeStats(..., "Normal")` na captura. A variante é gravada
   e exibida com selo dourado, mas não afeta nenhum status. Há `TODO` no código.
4. **B5 — XP e level up.** As colunas `xp`/`xp_to_next_level` existem e **nunca
   recebem UPDATE**. A barra de XP na `PokemonBox` nunca sai do lugar. É o loop
   central de progressão de um RPG e ele não existe.
5. **Rolagem de captura no servidor** usando `catchRate` (declarado nas 21
   espécies, nunca lido em lugar nenhum).
6. **Persistir HP** ao fim da batalha (hoje o dano é só `setState` local: fechar
   a modal restaura o HP) e **recompensas reais de vitória** (o log anuncia
   "+650 Pokedólares" e nenhuma API é chamada).
7. **`won` decidido no servidor** na batalha de ginásio. Enquanto vier do
   cliente, a recompensa segue farmável por curl.
8. **Recalcular os stats dos times de ginásio** a partir da Pokédex em vez dos
   valores hardcoded em `seed-gym.ts`.

**Critério de aceite sugerido:** um mesmo curl repetido não pode mais dar
insígnia nem dinheiro; uma captura pode falhar; uma batalha selvagem vencida
concede XP visível na barra e, ao subir de nível, os status mudam.

**Antes de começar:** reler este arquivo (regra do protocolo).

---

## Histórico de etapas

| Data | Etapa | Status | Registro |
|---|---|---|---|
| 2026-08-25 | Auditoria completa | ✅ Concluída | `AUDITORIA.md` |
| 2026-08-25 | **Fase 0** — Higiene + protocolo AI_State | ✅ Concluída e validada | commit `6496bff` |
| 2026-08-25 | **Fase 1** — Blindagem de segurança | ✅ Concluída e validada | commit `6496bff` |
| 2026-08-25 | **Fase 1.1** — Papéis + Editor admin-only | ✅ Concluída e validada | commit `6496bff` |
| 2026-08-25 | **Fase 3** — Consertar o que já está construído | ✅ Concluída e validada | 10 defeitos corrigidos |
| 2026-08-26 | **Correção** — `allowedDevOrigins` (preview não hidratava) | ✅ Concluída e validada | `next.config.ts` |
| — | **Fase 2** — Motor de jogo no servidor | ⬜ Próxima | — |

> **Nota sobre o histórico git:** os commits originais por fase
> (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos num reset do `.git` do
> sandbox e reunidos em `6496bff`. O código nunca foi afetado. Por isso a
> memória do projeto vive **neste arquivo**, não no histórico do git.
