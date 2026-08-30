# Relatório de Auditoria — `marmitero/pokeeeee`

**Data:** 2026-08-25
**Branch auditada:** `main` @ `6d70b24` (commit único)
**Escopo:** 34 arquivos, 5.655 linhas em `src/`
**Método:** leitura integral do código + execução real do projeto (PostgreSQL 18.4 + `next dev`) com reprodução das falhas apontadas.

> Nenhuma alteração de código foi feita. Este documento é somente leitura.

---

## 1. Sumário executivo

O projeto é um **MMORPG de Pokémon jogável no navegador**, inspirado no Pokémon Deluge, com estética 16-bit. Está **funcionalmente bem avançado em interface** e **bastante frágil em backend**: a camada de regras do jogo mora quase toda no cliente, e o servidor é um gravador de estado sem validação.

O retrato honesto é este:

| Dimensão | Estado |
|---|---|
| UI / experiência / direção de arte | **Boa** — coesa, carismática, já tem cara de jogo |
| Modelagem de dados | **Boa** — 9 tabelas bem pensadas, várias ainda não usadas |
| Regras de jogo no servidor | **Crítica** — quase tudo é decidido no cliente |
| Segurança | **Crítica** — senha em texto puro, zero autorização, exploits de economia |
| Engenharia (testes, CI, docs, lockfile) | **Inexistente** |
| Build / TypeScript | **Saudável** — compila limpo |
| Lint do próprio projeto | **Quebrado** — 19 erros |

**Conclusão:** o projeto não precisa de features novas agora. Ele precisa de uma **camada de servidor confiável** antes que qualquer feature nova seja construída em cima. Construir mais conteúdo sobre esta fundação multiplicaria a dívida.

---

## 2. O que é o projeto

**Pokémon Deluge RPG** — um RPG multiplayer online com:

- **Exploração em grade 16×16** com movimento por WASD/setas/D-pad, colisão por tile, encontros aleatórios na grama alta e na água.
- **3 mapas interligados** por portais (Vale Pallet → Floresta de Viridian → Pico Celeste), cada um com tabela de encontros própria e progressão de níveis.
- **6 "variantes" de raridade** no espírito do Deluge: Normal, Shiny, Metallic, Mystic, Dark e Ghostly, cada uma com bônus de status e filtro visual.
- **Captura, PC Box, time de 6**, venda/soltura de Pokémon, itens de cura.
- **3 ginásios** (Brock, Misty, Lance) com insígnias, pré-requisito de insígnias e recompensa.
- **Lojas** (3, uma por região) com progressão de itens.
- **Editor de Mundos**: o jogador pinta tiles, cria mapas novos, define portais, tabelas de encontro e NPCs — tudo persistido no banco. É o diferencial mais interessante do projeto.
- **Arena PvP** com salas por código e chat global (parcialmente ligada — ver §7).

A UI está **100% em português (pt-BR)**. O código e os comentários misturam inglês e português.

---

## 3. Linguagem e stack

| Camada | Tecnologia | Versão |
|---|---|---|
| **Linguagem** | **TypeScript** (`strict: true`) | 5.9.3 |
| Framework | **Next.js** (App Router, Turbopack) | 16.2.6 |
| UI | React | 19.2.6 |
| Estilo | **Tailwind CSS** v4 (via `@tailwindcss/postcss`) | 4.1.17 |
| Ícones | lucide-react | ^1.34.0 |
| **Banco** | **PostgreSQL** via `pg` | 8.20.0 |
| ORM | **Drizzle ORM** + drizzle-kit | 0.45.2 / 0.31.10 |
| Lint | ESLint 9 flat config + `eslint-config-next` | 9.39.4 |

**Ponto de atenção:** o `package.json` ainda se chama `"name": "nextjs-postgresql-template"` — o projeto nasceu de um template e nunca foi renomeado. Não há lockfile versionado, `.gitignore`, `README`, testes, CI ou migrations SQL.

---

## 4. "Linguagem de arte" — a direção visual

Este é um dos pontos mais fortes do projeto e vale detalhar, porque é uma escolha deliberada e consistente:

### Estilo
**Pixel art 16-bit retrô**, no espírito Game Boy Advance / Nintendo DS, com uma camada **CRT de arcade** por cima.

### Assets gráficos
- **Zero assets binários no repositório.** Nenhum PNG, nenhum sprite local — o repo é 100% código.
- Todos os sprites vêm de CDN: `raw.githubusercontent.com/PokeAPI/sprites`, no conjunto **Generation V (Black & White) *animated*** — GIFs animados, não sprites estáticos.
- São **48 URLs distintas**: 16 frontais + 16 traseiros + 16 shiny (16 espécies × 3 poses).
- Renderização forçada em `image-rendering: pixelated` (global, em `globals.css`) para preservar o pixel duro ao escalar.

### Tipografia (três famílias, com papel definido)
| Fonte | Uso |
|---|---|
| **Press Start 2P** | Títulos, HUD, botões — a voz "console 8-bit" |
| **VT323** | Diálogos, logs de batalha, banners — a voz "terminal/CRT" |
| **IBM Plex Mono** | Dados, números, labels técnicos |

Carregadas via `@import` do Google Fonts dentro do `globals.css`.

### Os "shaders" de variante
Aqui está o truque mais esperto do projeto: **5 das 6 variantes não têm arte própria**. Elas são **filtros CSS aplicados em runtime** sobre o sprite base:

```
Metallic → grayscale(0.65) contrast(1.4) brightness(1.25)
Mystic   → hue-rotate(240deg) saturate(1.8) brightness(1.15)
Dark     → brightness(0.72) contrast(1.45) sepia(0.55) hue-rotate(320deg)
Ghostly  → invert(0.18) hue-rotate(160deg) opacity(0.92)
Shiny    → saturate(1.45) hue-rotate(-20deg) + sprite shiny real
```

Somado a `drop-shadow(...)` colorido como "aura". É uma solução de custo zero que produz 96 combinações visuais a partir de 16 sprites. **Porém a UI afirma "96 sprites"** (`SpritePackModal.tsx`), o que é enganoso — são 48 assets reais e o resto é filtro.

> ⚠️ Isso também significa que a "arte" não é propriedade do projeto: depende de um repositório de terceiros no GitHub e de material com copyright da Nintendo/Game Freak. Relevante se a intenção for publicar.

### Áudio
**Não há arquivos de áudio.** Toda a trilha de efeitos é **sintetizada em tempo real via Web Audio API** (`src/lib/sound.ts`): osciladores `square`/`triangle`/`sawtooth`/`sine` com envelopes de ganho exponenciais, imitando o chip de som de um console 8-bit. São 5 efeitos: passo, flash de encontro, warp de portal, ataque (6 timbres) e sucesso de captura.

### Efeitos de tela
- Overlay de **scanlines CRT** (gradiente repetido a cada 3px) fixo sobre toda a página.
- Sombra dura `shadow-[Npx_Npx_0px_#000]` em todos os botões — o clássico "relevo sem antialias" de UI retrô.
- Flash branco de 200ms no warp de portal, screen-shake em batalha.

**Veredito da arte:** direção consistente, execução criativa e barata. É o ativo mais valioso do projeto e deve ser preservado.

---

## 5. Arquitetura

```
src/
├── app/
│   ├── layout.tsx              # metadata + <html lang="en">  ← deveria ser "pt-BR"
│   ├── page.tsx          722L  # TUDO: mundo, HUD, input, estado global
│   ├── globals.css             # fontes, CRT, pixelated
│   └── api/                    # 10 rotas (Route Handlers)
│       ├── auth/               # register | login | resume
│       ├── maps/  + maps/[id]/ # GET | POST | PUT
│       ├── pokemon/catch | heal | manage
│       ├── gym/  shop/  pvp/  health/
├── components/                 # 7 modais (Auth, Box, Battle, Gym, Shop, Sprites, Editor)
├── db/                         # schema.ts (9 tabelas) + index.ts (Pool global)
└── lib/                        # pokedex, tiles, sound, seed-maps, seed-gym, seed-shop
```

### Banco de dados — 9 tabelas
`users`, `sessions`, `user_pokemon`, `game_maps`, `shop_items`, `gym_leaders`, `user_badges`, `pvp_battles`, `chat_messages`.

A modelagem é **boa**. Detalhe bem feito: inventário como colunas tipadas (`pokeballs`, `potions`...) em vez de JSON, e `party_slot NULL` = no PC.

**Tabelas/colunas criadas mas nunca usadas de verdade:** `isPremium`, `premiumSkins`, `nickname`, `isPremiumSkin` (só é escrita como `false`), `stock`, `sellPrice`, `chat_messages.channel` (fixo), `pvp_battles` (só sala vazia), `xp`/`xpToNextLevel` (nunca atualizados).

### Conteúdo seedado
16 espécies · 12 golpes · 6 variantes · 3 mapas · 3 líderes de ginásio · 12 itens de loja · 10 tipos de tile.

---

## 6. Estado real de cada feature

| Feature | UI | Backend | Veredito |
|---|---|---|---|
| Registro / Login / Sessão | ✅ | ⚠️ funciona, mas inseguro | **Funciona** |
| Exploração + movimento | ✅ | — (só posição, e só 15% das vezes) | **Funciona** |
| Portais entre mapas | ✅ | ✅ | **Funciona** |
| Encontros selvagens | ✅ | — (decididos no cliente) | **Funciona** |
| Batalha selvagem | ✅ | ❌ nada persiste | **Cosmética** |
| Captura | ✅ | ⚠️ grava, mas não valida nada | **Quebrada** |
| XP / Nível up | barra na UI | ❌ nunca roda | **Morto** |
| PC Box / time / itens | ✅ | ✅ | **Funciona** |
| **Ginásio** | ✅ | ❌ | **MORTO — trava em "Carregando..."** |
| Loja (comprar) | ✅ | ⚠️ | **Funciona, com exploit** |
| Loja (vender item) | ❌ | ❌ (`sellPrice` morto) | **Não existe** |
| Editor de Mundos | ✅ | ✅ | **Funciona — melhor parte** |
| PvP real | parcial | ❌ | **Falso** (luta contra Mewtwo fixo) |
| Chat global | ✅ | ⚠️ grava, nunca carrega | **Meio-morto** |
| Pacote de Sprites | ✅ | — | **Funciona** (vitrine) |

---

## 7. Vulnerabilidades de segurança — **todas reproduzidas**

Subi PostgreSQL 18.4 + a aplicação real e executei cada ataque. Seguem as saídas literais.

### 🔴 V1 — Senhas em texto puro, e vazadas na resposta da API
`src/app/api/auth/route.ts:53` grava `passwordHash: password` — a senha **crua**, sem hash. O login compara `found[0].passwordHash !== password`.

```
select id,username,password_hash from users;
 id | username | password_hash
----+----------+---------------
  1 | ash      | senha123
```

Pior: a resposta da API **devolve o campo** ao navegador —
`{"user":{"id":1,"username":"ash",...,"passwordHash":"senha123",...}}`.
Qualquer pessoa com DevTools aberto lê a senha de qualquer login. Não há política de tamanho mínimo de senha nem rate limiting.

### 🔴 V2 — Zero autorização em todas as rotas (IDOR total)
Nenhuma rota além de `/api/auth` lê sessão, cookie ou header:

```
$ grep -rn "sessions|Authorization|headers()" src/app/api/  (excluindo auth)
>>> nenhuma ocorrência
```

Toda rota recebe `userId` **do corpo da requisição** e confia nele: `auth`, `gym`, `pokemon/catch`, `pokemon/manage`, `pvp`, `shop`.

Ataque real — sem token nenhum, vendi o Pokémon de outro jogador:

```
POST /api/pokemon/manage {"action":"sell","userId":1,"pokemonId":2}
→ "Mewtwo vendido por 5150 Pk$!"
```

Isso permite ler e alterar **qualquer conta**: roubar Pokémon, zerar dinheiro, dar insígnias a si mesmo, usar itens alheios.

### 🔴 V3 — Duplicação infinita de dinheiro
`src/app/api/shop/route.ts` não valida `quantity`. Com valor negativo, `totalCost` fica negativo e `money - totalCost` **soma**:

```
money inicial: 3000 | pokeballs: 10
POST /api/shop {"action":"buy","userId":1,"itemId":1,"quantity":-50}
→ "Comprou -50x Pokébola por -10000 Pk$!"
→ money: 13000 | pokeballs: -40
```

Uma request = +10.000 Pk$. Repetível à vontade. A economia do jogo acaba em 10 segundos.

### 🔴 V4 — Captura gratuita e sem limite
`src/app/api/pokemon/catch/route.ts` faz `Math.max(0, currentCount - 1)` e **insere o Pokémon antes de checar se a bola existe**. Não há verificação de estoque nem rolagem de captura:

```
usuário com masterballs = 0
POST /api/pokemon/catch {"userId":1,"pokedexId":150,"variant":"Shiny","level":99,"ballUsed":"masterballs"}
→ capturado: Mewtwo | variant: Shiny | level: 99 | maxHp: 338
→ masterballs após captura: 0
```

Ganhou um Mewtwo nível 99 de graça. `level` e `variant` também vêm do cliente **sem teto nem validação** — dá para pedir `level: 99999`.

Note também: **`catchRate` é declarado nas 16 espécies e nunca é lido em lugar nenhum.** O jogo não tem mecânica de captura, só uma gravação no banco.

### 🔴 V5 — `reward_win` sobrescreve o dinheiro do jogador
`src/app/api/pvp/route.ts` faz `set({ money: 3500 + 750, wins: 1 })` — **atribuição**, não incremento:

```
ash antes:  money 18150 | wins 0
POST /api/pvp {"action":"reward_win","userId":1}
ash depois: money  4250 | wins 1
```

Perde 13.900 Pk$ e tem o histórico de vitórias apagado. Também serve de exploit: qualquer um fixa o próprio dinheiro em 4.250.

### 🟠 V6 — Escrita irrestrita no mundo compartilhado
`POST /api/maps` e `PUT /api/maps/[id]` não autenticam. **Qualquer visitante anônimo pode sobrescrever o `tileGrid` de qualquer mapa de todos os jogadores.** O Editor de Mundos é a melhor feature do projeto e está completamente aberta.

### 🟠 V7 — Sessões que nunca morrem
Tokens de 30 dias, sem rotação, sem revogação. **Não existe endpoint de logout** — o botão "SAIR" só apaga o `localStorage`; o token continua válido no banco. A tabela `sessions` cresce para sempre e tokens antigos de navegadores vazados funcionam indefinidamente.

### 🟠 V8 — Vazamento de erro interno
Todas as rotas fazem `catch (err) { return json({ error: err.message }) }`. Mensagens de driver, stack e detalhes de SQL chegam ao cliente.

---

## 8. Bugs funcionais — **todos confirmados**

### 🔴 B1 — O Ginásio está 100% quebrado
`GymModal.tsx:64` busca `fetch('/api/gym?mapId=0')`, mas os líderes foram semeados com `map_id` 1, 2 e 3.

```
GET /api/gym?mapId=0  →  {"gymLeaders":[],"badges":[]}
gym_leaders: id 1 Brock(map 1), id 2 Misty(map 2), id 3 Lance(map 3)
```

`.find()` sobre array vazio → `undefined` → `setLeader` nunca é chamado → `if (loading || !leader)` é sempre verdadeiro → a modal exibe **"Carregando Ginásio..." para sempre**. Insígnias, pré-requisito de insígnias e recompensas: tudo inacessível. É provavelmente o bug mais visível do jogo hoje.

### 🔴 B2 — 5 dos 6 Pokémon de ginásio viram Bulbasaur
`getPokemonSpecies()` faz `return found || POKEDEX[0]` — fallback silencioso para Bulbasaur. A Pokédex tem 16 espécies (ids 1,4,6,7,9,25,94,130,131,133,149,150,197,282,384,448) e os times de ginásio usam ids que **não estão nela**:

```
BUG  #74  Geodude  (Brock)  → devolve #1 Bulbasaur
BUG  #95  Onix     (Brock)  → devolve #1 Bulbasaur
BUG  #120 Staryu   (Misty)  → devolve #1 Bulbasaur
BUG  #121 Starmie  (Misty)  → devolve #1 Bulbasaur
BUG  #148 Dragonair(Lance)  → devolve #1 Bulbasaur
OK   #149 Dragonite(Lance)  → devolve #149 Dragonite
```

Mesmo com B1 corrigido, você enfrentaria cinco Bulbasaurs. O mesmo fallback engole qualquer id inválido (`getPokemonSpecies(9999)` → Bulbasaur), mascarando erros em vez de expô-los.

### 🔴 B3 — `spAttack` e `spDefense` são hard-coded no combate
`page.tsx`, ao montar o time:

```ts
spAttack: 15, spDefense: 13,   // ← literais, ignoram o banco
```

Todo Pokémon em batalha tem Sp.Atk 15 e Sp.Def 13, do Bulbasaur nível 5 ao Rayquaza nível 50. Os valores reais existem no banco e são lidos em `attack`/`defense`/`speed` logo ao lado — só esses dois foram esquecidos.

### 🔴 B4 — Variante não afeta os status
`catch/route.ts:29` chama `computeDelugeStats(species, level, "Normal")` — sempre `"Normal"` — embora grave `variant` vindo do cliente. Comprovado com o Mewtwo capturado acima:

```
gravado no banco: variant "Shiny", maxHp 338
Mewtwo lvl99 Normal → maxHp 338   ← o que foi salvo
Mewtwo lvl99 Shiny  → maxHp 371, speed 318   ← o que deveria ser
```

O jogador vê o selo ★SHINY dourado e a aura, mas recebe status de um Normal. Toda a economia de raridade do Deluge — o coração do conceito — é decorativa.

### 🔴 B5 — Nenhum XP, nenhum level up
`xp` e `xp_to_next_level` são escritos **só na criação** (registro e captura). Não existe nenhum `UPDATE` de `level` ou `xp` no código inteiro. A barra de XP na `PokemonBox` calcula `xp % xpToNextLevel` e **nunca sai do lugar**. O loop central de progressão de um RPG não existe.

### 🔴 B6 — Batalha selvagem não vale nada
`BattleArenaModal.tsx`: ao vencer, o log anuncia *"Você venceu a batalha e ganhou +650 Pokedólares!"* — e **não há nenhuma chamada de API**. O dinheiro nunca é concedido. O dano sofrido pelo jogador fica só em `setPlayerHp` local e **nunca é persistido**: fechar a modal restaura o HP integralmente.

Além disso o soft-lock: `handleUseMove` retorna cedo se `playerHp <= 0`, mas o atributo `disabled` dos botões checa apenas `enemyHp <= 0 || caughtSuccess`. Quando seu Pokémon desmaia, **os botões continuam clicáveis e nada acontece** — sem tela de derrota, sem mensagem. Só resta "FUGIR".

### 🔴 B7 — Dano ignora tudo que o jogo modelou
A fórmula de batalha selvagem é:

```ts
baseDmg = Math.floor((level * 2.4 + 14) * (isCrit ? 1.5 : 1.0))
```

Não entram **`power` do golpe, `accuracy`, tipo, efetividade, ataque, defesa**. Os 4 golpes causam exatamente o mesmo dano — o nome é só texto. Os 12 golpes com power/accuracy/categoria em `ALL_MOVES` são decorativos. Não existe tabela de tipos, então Água vs. Fogo = Normal vs. Normal.

### 🟠 B8 — Log de batalha duplicado *não* ocorre (verificação negativa)
Suspeitei de duplicação no `setTimeout` de contra-ataque, mas o ramo de vitória tem `return` antes. **Confirmado que não é bug.** Registrado aqui para não virar lenda.

### 🟠 B9 — `useItem` é nomeado como um Hook do React
`PokemonBox.tsx` define uma função comum chamada `useItem`. O ESLint a trata como Hook e reporta **4 erros `react-hooks/rules-of-hooks`**. Funciona hoje por acaso (é sempre chamada de um handler), mas é frágil e quebra o lint.

### 🟠 B10 — "Antídoto" grava na coluna de Poções
`seed-shop.ts`: o Antídoto tem `itemKey: "potions"`. Comprar um antídoto dá uma poção. Não há sistema de status (envenenamento/queimadura/paralisia) — o item não tem o que curar.

### 🟠 B11 — Chat e PvP são fachada
`GET /api/pvp` devolve batalhas, chat e desafiantes lendários — e **nunca é chamado**. Os dois usos de `/api/pvp` no cliente são `POST`. O chat mostra só eco local com duas mensagens fake hardcoded. `pvpRooms` é um `useState` **escrito mas nunca renderizado**. "PVP" abre uma luta contra um Mewtwo Mystic nível 35 fixo.

### 🟠 B12 — Detalhes que acumulam
- **Teleporte livre:** a lista lateral de mapas troca de mapa ao clique, ignorando portais e progressão.
- **Salvamento aleatório:** a posição é salva com `if (Math.random() < 0.15)` — 85% dos passos não são gravados.
- **Limite 16×16 hardcoded** em `page.tsx:234` (`nextX >= 16`), ignorando as colunas `width`/`height` que existem no banco.
- **`<html lang="en">`** num jogo 100% em português.
- **`ALL_MOVES.AirSlash`** não existe — `AirSlash || QuickAttack` cai no fallback silenciosamente (o `Record<string, ...>` esconde isso do TypeScript).
- **Seed por contagem:** `ensure*Seeded()` roda a cada request e só checa `count() > 0`. Se uma seed falhar no meio, o estado fica parcial para sempre.
- **`drizzle.config.json`** tem a URL do banco hardcoded em vez de ler `DATABASE_URL`.

---

## 9. Verificação — o que rodei

| Checagem | Comando | Resultado |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ **0 erros** |
| Build de produção | `npm run build` | ✅ **Compila, 11 rotas** |
| Lint do projeto | `npm run lint` | ❌ **19 erros, 13 warnings** |
| Health + DB | `GET /api/health` | ✅ `{"ok":true}` |
| Homepage | `GET /` | ✅ `HTTP 200` |
| Reprodução V1–V5, B1–B7 | curl + SQL direto | ✅ **todas reproduzidas** |

Detalhamento do lint:

```
11  @next/next/no-img-element        (warning)
10  react/no-unescaped-entities      (erro)
 4  react-hooks/rules-of-hooks       (erro — o useItem, B9)
 3  react-hooks/purity               (erro)
 2  react-hooks/exhaustive-deps      (warning)
 1  react-hooks/set-state-in-effect  (erro)
 1  react-hooks/immutability         (erro)
```

**Nota de reproducibilidade:** o repo não tem lockfile nem `.gitignore`. Tive que rodar `npm install` para conseguir testar; `node_modules/`, `.next/` e `tsconfig.tsbuildinfo` aparecem como *untracked* e seriam commitados por engano.

---

## 10. Roadmap proposto

Ordenado por **dependência**, não por empolgação. Cada fase destrava a seguinte.

### FASE 0 — Higiene (½ dia) · *pré-requisito para tudo*
Não é feature, é condição de trabalho. Sem isso, qualquer PR futuro é ruído.
1. `.gitignore` (`node_modules`, `.next`, `*.tsbuildinfo`, `.env*`)
2. `README.md`: o que é, como rodar, variáveis de ambiente
3. Commitar o `package-lock.json`
4. Renomear o package para `deluge-rpg`
5. `.env.example` + `drizzle.config.json` lendo `DATABASE_URL`
6. `<html lang="pt-BR">`
7. Zerar o lint (`useItem` → `applyItem`; escapar aspas)

### FASE 1 — Blindagem (2–3 dias) · **🔥 prioridade máxima**
Nada de feature nova antes disto.
1. **Hash de senha** com `bcrypt`/`argon2` + migração dos registros existentes
2. **Parar de retornar `passwordHash`** — DTO de resposta em todas as rotas
3. **Middleware de sessão**: cookie `httpOnly` + `requireUser()` que injeta o `userId` autenticado; **remover `userId` do corpo de todas as requests**
4. **Endpoint de logout** + expiração/rotação de token + limpeza de sessões vencidas
5. **Validação de entrada** com Zod em todas as rotas (`quantity` inteiro ≥ 1, `level` entre 1 e 100, `variant` no enum, `itemKey` em allowlist)
6. **Sanar erros**: log interno, resposta genérica ao cliente
7. **Autorização no Editor de Mundos** (só o dono ou admin edita)
8. **Rate limiting** mínimo em login/registro

### FASE 2 — Motor de jogo no servidor (4–6 dias) · *onde o jogo vira jogo*
1. **Mover a fórmula de dano para o servidor**, usando de verdade `power`, `accuracy`, `category`, `attack`/`spAttack`/`defense`/`spDefense`
2. **Tabela de efetividade de tipos** (18×18) — hoje não existe
3. **Corrigir B3** (spAttack/spDefense hard-coded) e **B4** (stats da variante)
4. **Sistema de XP e level up real** — curva de XP, ganho por batalha, recálculo de status, evolução de golpes por nível
5. **Rolagem de captura no servidor** usando `catchRate` + HP restante + multiplicador de bola
6. **Persistir HP** ao fim de cada batalha
7. **Recompensas reais de vitória** (dinheiro + XP) — corrigir B6
8. **Transações** (`db.transaction`) em toda operação que toca dinheiro/itens

### FASE 3 — Consertar o que já está construído (2–3 dias)
Barato e de altíssimo retorno: o código já existe, só está quebrado.
1. **B1 — Ginásio**: `mapId=0` → buscar pelo id do líder (ou `GET /api/gym/:id`)
2. **B2 — Pokédex**: adicionar Geodude, Onix, Staryu, Starmie, Dragonair **e remover o fallback silencioso** (lançar erro em id desconhecido)
3. **B11 — Chat**: chamar `GET /api/pvp`, renderizar de verdade, remover as mensagens fake
4. **B5/B9/B10/B12**: level cap, soft-lock de derrota, Antídoto, teleporte livre, salvamento de posição determinístico, limites do mapa por `width`/`height`
5. **Limpeza**: remover `pvpRooms` morto e o `GET /api/pvp` não usado — ou ligá-los

### FASE 4 — PvP de verdade (5–7 dias)
Hoje é o recurso mais prometido e mais falso. Duas rotas possíveis:
- **4a — Turnos assíncronos** (mais simples, usa só Postgres): estado da batalha em `pvp_battles.battleState`, validado no servidor, polling do cliente.
- **4b — Tempo real** com WebSocket/Pusher/Server-Sent Events: matchmaking, salas, turno validado no servidor, chat vivo.

A tabela `pvp_battles` já está modelada para isso — falta só o motor.

### FASE 5 — Qualidade de engenharia (contínuo)
1. **Vitest** para `src/lib/` (é código puro, testável hoje): `computeDelugeStats`, curva de XP, fórmula de dano, tabela de tipos, rolagem de captura
2. **Testes de integração** das rotas com Postgres de teste
3. **GitHub Actions**: `typecheck` + `lint` + `test` + `build`
4. **Migrations versionadas** (`drizzle-kit generate`) — hoje não existe nenhuma
5. **Logging estruturado** + monitoramento de erros

### FASE 6 — Conteúdo e mundo (só depois de tudo acima)
1. **Expandir a Pokédex** de 16 → 50+ (a estrutura já suporta)
2. **Evoluções** — hoje Charmander nunca vira Charizard
3. **Sistema de status** (veneno, queimadura, paralisia) — dá sentido ao Antídoto
4. **NPCs de cura/loja/ginásio editáveis** no Editor de Mundos (o `npcs` jsonb já existe, mas o editor não o expõe)
5. **Missões diárias / streak de login**
6. **Ranking e leaderboard** (`wins`/`losses` já existem)
7. **Monetização real** para `isPremium`/`premiumSkins`, hoje colunas mortas

### ⚠️ Risco legal a decidir cedo
Sprites e nomes são propriedade da Nintendo/Game Freak, servidos de um repositório de terceiros. Se a intenção é publicar ou monetizar, isso precisa ser resolvido **antes** da Fase 6 — depois, o conteúdo é grande demais para trocar. Alternativas: assets originais próprios, ou reposicionar como projeto de estudo/paródia sem monetização.

---

## 11. O que eu **não** recomendo agora

- ❌ **Adicionar Pokémon, mapas ou ginásios novos.** O motor de dano ignora os status; mais conteúdo = mais coisa quebrada.
- ❌ **Trabalhar em PvP** antes da Fase 1. Sem auth, PvP competitivo é impossível.
- ❌ **Refatorar a `page.tsx` (722L)** agora. É dívida real, mas não bloqueia nada — vem depois da Fase 2.
- ❌ **Trocar a direção de arte.** É o melhor ativo do projeto.

---

## 12. Resumo em uma frase

> É um jogo com **excelente pele** e **esqueleto de protótipo**: a interface e a direção de arte estão prontas para um produto, mas o servidor ainda não valida nada — e, antes de crescer, ele precisa deixar de confiar no cliente.

**Recomendação:** executar **Fase 0 + Fase 1** primeiro (≈3 dias de trabalho), depois **Fase 3** (consertos baratos de alto impacto visual), e só então o motor da **Fase 2**.
