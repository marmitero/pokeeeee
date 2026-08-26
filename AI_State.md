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

### ✅ FASE 2 — Motor de jogo no servidor (2026-08-26)

A maior fase até aqui: **1.328 linhas de motor novo**, 17 arquivos tocados
(+2.048 / −1.096). Todas as regras que viviam no cliente passaram para o
servidor.

| Item | Antes | Depois |
|---|---|---|
| **Dano** | `(level * 2.4 + 14) * crit` — os 4 golpes causavam dano **idêntico**; nome do golpe era só texto | Fórmula clássica com `power`, `accuracy`, `category`, **STAB**, tipos, crítico (1/16) e variância 0.85–1.00 |
| **Tipos** | Não existia. Água vs. Fogo = Normal vs. Normal | Tabela 18×18 esparsa + STAB + rótulos no log |
| **B4 variante** | Gravava `"Shiny"` e calculava com `"Normal"` | `sideFromSpecies` usa a variante real |
| **B5 XP** | Colunas `xp`/`xp_to_next_level` **nunca recebiam UPDATE** | Acumula, sobe de nível e **recalcula os status** |
| **Captura** | Sempre succeedia, decidida no cliente | `catchRate` + HP + bola, fórmula de chacoalhada; **pode falhar** |
| **HP** | Só `setState`; fechar a modal restaurava tudo | Gravado em `user_pokemon` a cada turno |
| **Recompensa** | Log anunciava "+650 Pokedólares" e **nenhuma API era chamada** | Dinheiro real (`level*12+40` no selvagem, `rewardMoney` no ginásio) |
| **Ginásio** | Cliente mandava `{action:"battle_result", won:true}` pronto | Luta turno a turno; o **servidor** decide e concede a insígnia |
| **Times de ginásio** | `hp`/`attack`/golpes escritos à mão em `seed-gym.ts` | Só `pokedexId`/`level`/`variant`; o resto vem da Pokédex |

#### Rotas
- **Nova:** `POST /api/battle` com `start_wild` · `start_gym` · `attack` ·
  `switch` · `catch` · `flee`, e `GET /api/battle?battleId=`.
- **Removidas:** `POST /api/pokemon/catch` (captura sem rolagem, superseded) e
  `POST /api/gym {action:"battle_result"}` (o endpoint farmável — hoje **405**).
- **Removido:** `src/lib/battle.ts` (a fórmula antiga).

#### Decisões
1. **Ordem do turno** é decidida por `speed`, com empate resolvido no aleatório.
2. **Golpes de status** (`category: "Status"`) causam 0 de dano e logam
   "Mas nada aconteceu...". Efeitos próprios (buff/debuff/status) ainda não
   existem — é conteúdo futuro, não bug.
3. **Fórmula de captura:** a primeira versão usava `a/255` linear e dava ~6%
   num comum com HP cheio. Trocada pela fórmula de chacoalhada clássica:
   12% / 20% / 26% (HP cheio / metade / 10%) com Pokébola em catchRate 45.
   Números medidos e registrados no docstring.
4. **Encontro selvagem:** o cliente só diz "pisei num tile de encontro"; o
   servidor valida a coordenada contra a grade gravada e sorteia espécie,
   variante e nível da tabela do mapa. `playerX/Y` ainda vêm do cliente, mas
   só podem apontar para tiles de encontro do mesmo mapa — sem ganho.
5. **Não dá para fugir de ginásio**, e não dá para capturar o Pokémon do líder.

---

## 4. Passo a passo de validação da última etapa

Tudo executado contra PostgreSQL 18.4 + a aplicação em `next dev`.

### 4.1 Checagens
```bash
npm run check     # lint + typecheck + build
```
✅ **exit 0** — lint 0/0 · `tsc` 0 erros · build **11 rotas** (inclui `/api/battle`).
Tabela `battles` criada via `npm run db:push` (10 tabelas no total).

### 4.2 Efetividade de tipos (o teste central)
Mesmo atacante (Charmander), golpes diferentes, alvos diferentes:
```
Lança-Chamas (Fire, pw90) vs Bulbasaur (Grass/Poison) → 186 de dano   ← super efetivo + STAB
Lança-Chamas (Fire, pw90) vs Pikachu  (Electric)      → 102 e 66      ← neutro, variância
```
Antes os quatro golpes dariam os mesmos 62 pontos contra qualquer alvo.
Log real observado: `Squirtle usou Jato d'Água! | É super efetivo! | Causou 51 de dano.`

### 4.3 Validação do tile de encontro
```
start_wild em (8,10) = stone → 400 "Não há encontros nesse tile."
start_wild em (7,0)  = portal → 400 "Não há encontros nesse tile."
start_wild em (3,9)  = tall_grass → 200, encontro sorteado pelo servidor
```

### 4.4 XP, level up e persistência de HP
```
batalha 1 → xp no banco: 0/264
batalha 2 → xp 33/264        (recompensas {"xp":33,"money":112})
batalha 3 → xp 66/264
com xp 810/822 + 43 ganhos → ★ nível 19 · xp 31/913 · stats recalculados
Charmander desmaiado → hp 0 persistido; nova batalha recusada:
  400 "Toda a sua equipe está desmaiada. Cure-a num Centro Pokémon (✚)."
```

> ⚠️ **Bug encontrado e corrigido durante esta validação:** a primeira versão
> calculava o XP (`rewards.xp: 37`) mas **não o gravava** — o banco seguia em 0,
> e `applyXp` era chamado com `currentXp = 0` em vez do XP acumulado.
> Corrigido adicionando `xp` ao `SideState` e ao `UPDATE`.

### 4.5 Captura pode falhar
```
20 arremessos de Pokébola em alvo com HP cheio:
  capturou 4 | escapou 16   → 20% observados (esperado ~12%, dentro do ruído p/ n=20)
  pokébolas 500 → 480 (1 debitada por arremesso, inclusive nas falhas)
Log real: "Ah não! Eevee escapou! (chance era de 6%)"  ← antes da troca de fórmula
```

> ⚠️ **Erro de método meu, registrado para não se repetir:** a primeira
> bateria fez 60+ requests e estourou o rate limit de 60/min. As "escapadas"
> eram rejeições **429**, não falhas de captura — o resultado de 0% era
> inválido. Refeito com 20 tentativas e ritmo controlado.

### 4.6 Ginásio: o critério de aceite
```
POST /api/gym {action:"battle_result", won:true}  → 405 (rota removida)
  insígnias: 0 · money: 3624 · wins: 0        ← nada concedido

POST /api/battle {action:"start_gym", gymLeaderId:1}
  → Geodude lvl 12 (hp 34, derivado da Pokédex) · fila com Onix
  → 4 turnos de luta → status WON
  → recompensas {"xp":96,"money":1500,"badge":"Insígnia Pedra"}
  → insígnia gravada no banco · money 3624 → 5124 · wins 0 → 1
```

### 4.7 Regressão das outras rotas
`health` · `maps` · `gym` · `shop?shopId=1` · `pvp` → 200.
`shop` (comprar) · `pokemon/heal` · `pvp` (chat) → 200.

### 4.8 O que **não** foi validado
A **interface** das duas batalhas reescritas (`BattleArenaModal`, `GymModal`)
não foi aberta num navegador. As chamadas de API, os payloads e o motor foram
verificados de ponta a ponta; a pintura em tela, não. É o item de maior risco
residual desta fase e merece uma passada manual no preview.

---

## 5. Qual a próxima etapa a ser aplicada

### 🧪 FASE 5 — Infraestrutura e testes

**Por que ela antes da Fase 4 (PvP):** acabamos de escrever **1.328 linhas de
regras de jogo sem um único teste**. O motor é agora o coração do produto —
tabela de tipos, fórmula de dano, curva de XP e rolagem de captura são funções
puras, determinísticas e triviais de testar. Blindar isso custa pouco e protege
todo o resto. Construir PvP em cima de um motor sem testes é acumular risco.

1. **Vitest** para `src/lib/engine/*` — os casos que mais valem:
   - `typeMultiplier`: cada par imune (×0), ×2, ×4 e ×0.25; tipo desconhecido = ×1
   - `computeDamage`: STAB ligado/desligado, físico vs. especial, crítico, erro
   - `xpToNextLevel` / `applyXp`: level up múltiplo, teto em 100, carry-over de XP
   - `captureChance`: Master Ball = 1, HP 0 vs. HP cheio, cada bola
2. **Testes de integração** das rotas com Postgres de teste — em especial
   "o mesmo curl repetido não concede insígnia duas vezes".
3. **⚡ Rate limit real** (pendência explícita da Fase 1): o atual é em memória,
   não sobrevive a restart nem compartilha entre réplicas. Trocar por
   Redis/Upstash mantendo a assinatura `enforceRateLimit(req, scope, limit, windowMs)`
   e adicionar `RATE_LIMIT_URL` ao `.env.example`.
4. **Migrations versionadas** (`drizzle-kit generate`): hoje só existe `db:push`,
   que não gera histórico — insuficiente para produção.
5. **GitHub Actions**: `lint` + `typecheck` + `test` + `build`.
6. **Painel administrativo** para gestão de papéis (hoje só via
   `npm run db:set-role`) + **poderes concretos de `moderator`** (moderação de chat).

**Critério de aceite sugerido:** `npm test` verde cobrindo as quatro funções do
motor; CI rodando a cada push; uma migration versionada gerada e aplicada.

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
| 2026-08-26 | **Fase 3** — Consertar o que já estava construído | ✅ Concluída e validada | 10 defeitos corrigidos |
| 2026-08-26 | **Fase 2** — Motor de jogo no servidor | ✅ Concluída e validada | 1.328 linhas de motor |
| — | **Fase 5** — Infraestrutura e testes | ⬜ Próxima | — |

> **Nota sobre o histórico git:** os commits originais por fase
> (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos num reset do `.git` do
> sandbox e reunidos em `6496bff`. O código nunca foi afetado. Por isso a
> memória do projeto vive **neste arquivo**, não no histórico do git.
