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

### ✅ FASE 4 — PvP de verdade (2026-08-27)

Desenho completo em [`docs/pvp-design.md`](../docs/pvp-design.md). Modelo
escolhido: **turnos assíncronos com polling** (2,5 s), sem WebSocket — não há
servidor com estado em memória nem conexão longa, e para um jogo por turnos a
latência é imperceptível.

#### Como funciona

Os dois jogadores travam a ação **às cegas**; quando ambos travaram, o servidor
resolve a troca de uma vez e os dois veem o resultado no próximo poll.

```
P1 trava "Lança-Chamas"  → gravado (P2 não vê o quê)
P2 trava "Jato d'Água"   → gravado
   ↓ ambos travaram
RESOLUÇÃO (transação única com SELECT ... FOR UPDATE)
  1. trocas acontecem antes; quem troca não ataca no turno
  2. ordem dos golpes pela velocidade (empate → aleatório)
  3. se o alvo desmaiou, a 2ª ação é descartada
  4. desmaiou → phase = "SWITCH" para aquele lado
  5. sem Pokémon de pé → FINISHED + wins/losses
   ↓
HP gravado em user_pokemon · turn++ · version++
```

#### Arquivos

| | |
|---|---|
| **Novos** | `src/lib/pvp-service.ts` · `src/components/PvpLobby.tsx` · `src/components/PvpArena.tsx` · `tests/integration/{client,routes,pvp.integration.test}.ts` · `drizzle/0002_long_squadron_sinister.sql` |
| **Alterados** | `schema.ts` (`users.elo`, `pvp_battles.mode`) · `api/pvp/route.ts` (reescrita) · `validation.ts` · `battle-service.ts` (losses) · `engine/damage.ts` (`DamageMove`) · `page.tsx` |

#### Decisões do mantenedor implementadas

| Decisão | Implementação |
|---|---|
| Recompensa = `wins`/`losses`/ranking só | `awardResult()` incrementa `wins` e `losses`; nada mais |
| Amistoso não conta ranking | `mode: "friendly"`; **nenhum código escreve em `users.elo`** |
| Dano persiste | `persistHp()` grava os dois lados em `user_pokemon` a cada turno |
| ELO entra como complemento | Coluna criada (default 1000), dormente, com teste garantindo |

#### Vetor de trapaça fechado

`create_room`/`join_room` aceitavam o Pokémon **inteiro do cliente**
(`battlePokemonSchema`: `hp` e `attack` até 9999). Agora aceitam só
`pokemonId` e o servidor lê o registro com `sideFromUserPokemon()`.

#### Regressão corrigida

`users.losses` **nunca era incrementado** (regressão da Fase 2, quando removi o
`POST /api/gym battle_result` farmável e os caminhos `LOST` não assumiram o
contador). Centralizado em `persistTurn()`, cobrindo ginásio, selvagem e falha
de captura num lugar só.

#### Limitações assumidas (não são bugs)

- **Troca tática** só existe como ação do turno ou troca forçada pós-desmaio;
  não há "trocar e ainda atacar".
- **Timeout** é preguiçoso: só dispara quando alguém consulta a sala. Se
  ninguém abrir, a sala fica pendurada — aceitável, some da listagem.
- **Balanceamento**: inicial lvl 5 nocauteia outro inicial lvl 5 em um golpe
  (Squirtle deu 28–32 em Charmander: Água×Fogo + STAB). É matemática correta,
  mas o jogo fica rápido demais. Assunto da **Fase 6**.

---

## 4. Passo a passo de validação da última etapa

### 4.1 Checagens
```bash
npm run check                     # lint + typecheck + test + build
npm run test:integration
```
✅ `npm run check` **exit 0** — lint 0/0 · tsc 0 · **77 unit** · build 14 rotas.
✅ Integração: **41 testes** (29 de segurança + **12 novos de PvP**).

### 4.2 Os testes que importam

| Teste | O que garante |
|---|---|
| `o estado NÃO expõe qual golpe o oponente escolheu` | `opponentCommitted: true`, mas nem `moveIndex` nem `turnAction` aparecem no payload; `opponent.moves` é `undefined` |
| `envio SIMULTÂNEO resolve a troca exatamente uma vez` | `Promise.all` com os dois `submit_turn`; **ambos 200** e `turn` avança **1** (não 2) |
| `não aceita stats forjados` | mandar `{hp: 9999}` é ignorado; o estado traz `hp < 100` e `level 5` do banco |
| `o dano PERSISTE em user_pokemon` | `monA.hp === view.you.hp` e `monB.hp === view.opponent.hp` |
| `amistoso NÃO mexe em users.elo` | elo continua **1000** para vencedor e perdedor |
| `forfeit dá a vitória e registra wins/losses` | `ub.wins === 1` e `ua.losses === 1` |
| `quem não participa não lê nem age na sala` | 403 em GET e em submit |
| `não deixa entrar na própria sala nem em sala cheia` | 400 nos dois casos |

> O teste de concorrência foi **fortalecido depois de escrito**: a primeira
> versão passaria mesmo se uma das requests tivesse falhado. Agora asserta que
> as duas retornaram 200.

### 4.3 Teste de ponta a ponta no app rodando (dois clientes HTTP reais)

```
sala DLG-8274 · A=Charmander lvl5 (19 HP) · B=Squirtle lvl5 (20 HP)

turno 1 → log:
  ▸ Squirtle usou Jato d'Água!
  ▸ É super efetivo!          ← Água×Fogo = 2
  ▸ Causou 28 de dano.
  ▸ Charmander desmaiou!
  ▸ 🏆 live_b venceu a batalha!
  ▸ live_a ficou sem Pokémon em condições de lutar.
status: FINISHED · phase: ACTION · turn: 2
```

Banco depois:
```
username    | wins | losses | elo
live_a      |  0   |   1    | 1000   ← ELO intacto (amistoso)
live_b      |  1   |   0    | 1000

Charmander hp 0/19 · Squirtle hp 15/20   ← dano persistido
```

Agir depois de encerrada → `400 "Esta batalha não está ativa."`

### 4.4 Migrations
`npm run db:generate` → `drizzle/0002_long_squadron_sinister.sql`.
Aplicada: `users.elo` default `1000`, `pvp_battles.mode` default `'friendly'`.

### 4.5 O que **não** foi validado
1. **A interface do lobby e da arena não foi aberta num navegador** — o motor,
   os payloads e o sigilo foram verificados por HTTP e por testes; a pintura
   não. Acrescentado às pendências manuais.
2. **O timeout de 60 s não foi testado em tempo real** (exigiria esperar um
   minuto por caso). A lógica `applyTimeoutIfNeeded` está coberta por
   inspeção, não por teste automatizado.
3. **Troca tática e forçada** têm endpoint e validação, mas nenhum teste de
   integração as exercita ainda.

---

## 5. Qual a próxima etapa a ser aplicada

### 🎮 FASE 6 — Conteúdo e mundo

Fases 0 a 5 e a 4 estão concluídas: segurança, motor autoritativo, PvP, testes,
CI e painel admin. O que falta é **conteúdo e equilíbrio**, não infraestrutura.

**Sugestão de ordem (a decidir com o mantenedor):**

1. **Balanceamento do início do jogo** *(o mais urgente na prática)*
   Inicial lvl 5 nocauteia outro inicial lvl 5 em **um** golpe. Opções: subir o
   nível inicial, reduzir o poder dos golpes iniciais, ou dar mais HP. Sem isso
   toda batalha dura um turno.
2. **XP e evolução** — Charmander nunca vira Charizard; a curva de XP existe mas
   o ganho por vitória selvagem é baixo perto do necessário.
3. **Pokédex 21 → 50+** e golpes novos (o catálogo tem 19 golpes para 21 espécies).
4. **Sistema de status** (veneno, queimadura, paralisia) — o Antídoto foi
   removido na Fase 3 por não ter o que curar; voltaria com coluna própria.
5. **Arena PvP ranqueada** — o `mode: "ranked"` e o `users.elo` já existem
   dormentes; falta o cálculo de ELO, o ranking global e as recompensas por
   posição.
6. **NPCs editáveis no Editor de Mundos** (o campo `npcs` existe no schema, mas
   o editor não o expõe).
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
| 2026-08-27 | **Fase 4** — PvP assíncrono | ✅ Concluída e validada | 12 testes novos |
| — | **Fase 6** — Conteúdo e mundo | ⬜ Próxima | — |

> **Nota sobre o histórico git:** o `.git` do sandbox é resetado entre sessões.
> Commits originais por fase (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos e
> reunidos em `6496bff`. O código nunca foi afetado, e o push para o GitHub é o
> que preserva o histórico. Por isso a memória do projeto vive **neste
> arquivo**, não no git.
