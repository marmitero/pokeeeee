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

> ## 💾 RECUPERAÇÃO (ler se o ambiente resetou)
>
> Este sandbox perde coisas entre sessões. O que acontece e como recuperar:
>
> | O que | Persiste? | Recuperação |
> |---|---|---|
> | Arquivos do workspace (código, docs, **este arquivo**) | ✅ sim | nada a fazer |
> | Histórico de commits local (`.git`) | ❌ **reseta** para `6d70b24` | `git fetch docs/repo-backup.bundle 'refs/heads/*:refs/remotes/backup/*'` e depois `git reset --hard backup/arena/01a03ad9-pokeeeee` |
> | `.env` (gitignored) | ❌ some | `cp .env.example .env` |
> | `.pgdata/`, `node_modules/` | ❌ somem | `npm install` e `npm run db:local` |
> | Branch remota no GitHub | ✅ **fonte da verdade** | `git fetch origin` |
>
> **Estado em 2026-08-27:** tudo até `0080c84` está no GitHub (CI 5/5 verde), com o histórico
> completo de fases preservado. O `.git` local foi resetado duas vezes e
> realinhado com `git fetch` + `git reset --soft origin/...` (mantém os
> arquivos, reposiciona o HEAD). **Prefira sempre o remoto.**
>
> **Se o `.git` resetou:** os arquivos continuam corretos no disco. Basta
> `git add -A && git commit` de novo — não é preciso reescrever nada.
> O histórico completo também está em `docs/repo-backup.bundle`.

> ## ☁️ SUPABASE — testado e BLOQUEADO neste sandbox (2026-08-27)
>
> A conexão foi tentada com a URL fornecida pelo mantenedor. **Não é problema
> de credencial nem de configuração** — é o proxy de saída do sandbox:
>
> ```
> TLS github.com:443                                → ✅ OK
> TLS aws-0-sa-east-1.pooler.supabase.com:5432      → ❌ ECONNRESET
> db.cpkcvtjzdfsagvyjlazy.supabase.co               → só tem registro AAAA (IPv6),
>                                                    e o sandbox não tem rota IPv6 global
> ```
>
> O TCP chega a abrir, mas o TLS é derrubado para hosts fora da allowlist
> (só `github.com` e `registry.npmjs.org` passam). Varri 17 regiões × 2 portas
> do pooler: todas com o mesmo erro.
>
> **Consequência:** o código de suporte a Supabase está pronto e correto
> (`src/db/index.ts`), mas **não pôde ser exercitado aqui**. Funciona se o app
> rodar fora deste sandbox (máquina local, Vercel, etc.).
>
> ⚠️ **A senha do banco foi colada no chat** e deve ser considerada exposta.
> Rotacionar em Project Settings → Database → Reset database password.

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
├── db/                       # schema.ts (11 tabelas) + index.ts (Pool global)
└── lib/                      # pokedex, tiles, sound, battle, seed-maps, seed-gym, seed-shop
```

### Banco de dados — 11 tabelas
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

### Sessão: cookie **ou** Bearer (correção de 2026-08-27, 2ª tentativa)
| Item | Onde |
|---|---|
| Token no `localStorage` + `Authorization: Bearer` | `src/lib/api-client.ts` |
| Servidor aceita cookie **ou** Bearer | `src/lib/session.ts` → `readSessionToken()` |
| Painel de depuração na tela | `src/components/DebugPanel.tsx` (botão 🐞 ou `?debug=1`) |
| Suporte a Supabase (SSL automático) | `src/db/index.ts` |

O cookie `httpOnly` **não é reenviado em iframe cross-site** quando o navegador
aplica bloqueio de cookies de terceiros — e nenhum atributo de cookie contorna
isso, nem `SameSite=None; Secure` (tentado e não resolveu). O Bearer token
resolve porque não depende de cookie, e é **mais** seguro contra CSRF: um site
externo não consegue setar header `Authorization` cross-origin sem CORS.

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

### ✅ Fase 5.1-A — segurança básica de produção (2026-08-29)

Concluída sem iniciar staging. A migration `0003` adiciona foreign keys,
índices, unicidade e constraints de integridade. Produção direta usa cookie
HttpOnly e não entrega/consome Bearer em localStorage. CSRF foi reforçado,
headers de segurança e `no-store` foram adicionados, e o painel de debug não é
renderizado em produção. Validação completa e decisões estão em
`docs/PRODUCAO-5.1.md`.

Próxima etapa: 5.1-B (Supabase/Vercel staging), **não iniciar sem autorização do
mantenedor** e fornecer passo a passo para toda ação manual.

### ✅ Fase 5.1.1 — baseline e atualização de dependências (2026-08-29)

A preparação para produção foi documentada em `docs/PRODUCAO-5.1.md`. O audit
inicial tinha 7 vulnerabilidades (3 altas e 4 moderadas). Next.js,
`eslint-config-next`, React, React DOM, PostCSS, pg, dotenv, lucide-react e Zod
foram atualizados. Um override limitado atualiza o esbuild vulnerável carregado
pela cadeia legada do Drizzle Kit sem fazer o downgrade incorreto sugerido por
`npm audit fix --force`.

Validação final: lint e typecheck aprovados, 84 testes unitários, 52 testes de
integração, build de 14 rotas e `npm audit` com zero vulnerabilidades. Próxima
subetapa: 5.1.2, endurecimento do schema PostgreSQL.

### ✅ Correção 2 — sessão por Bearer token + painel de debug (2026-08-27)

A correção anterior (`SameSite=None; Secure`) **não resolveu**. O mantenedor
retestou e os três fluxos continuavam com "Sessão inválida ou expirada".

#### O que a tentativa anterior errou

Eu tratei o problema como de **atributo** de cookie quando era de **política do
navegador**. Em iframe cross-site, navegadores com bloqueio de cookies de
terceiros não reenviam o cookie **independentemente** de `SameSite=None; Secure`.
Não existe atributo que contorne isso.

#### A correção real: não depender de cookie

- O login agora devolve o `token` no corpo (além do cookie).
- O cliente guarda em `localStorage` e envia `Authorization: Bearer <token>`.
- O servidor aceita **cookie OU Bearer** (`readSessionToken`).
- Todas as 29 chamadas de API passaram pelo novo `api()` (`src/lib/api-client.ts`).

Bearer é **mais** seguro contra CSRF que cookie, não menos: um site externo não
consegue setar header `Authorization` em requisição cross-origin sem aprovação
de CORS. A validação de `Origin` da correção anterior foi mantida.

#### Painel de debug (pedido do mantenedor)

Botão 🐞 no canto inferior direito (ou `?debug=1` na URL). Mostra:

- **Diagnóstico de sessão**: tem token? está em iframe? `cookieEnabled`? origin?
- **Log das últimas 60 chamadas**: método, rota, **status**, duração e a
  **mensagem de erro real** do servidor.

Existe porque o sintoma original era "carrega e para" sem nenhum sinal na tela.

#### Bug extra encontrado no caminho

`startGymBattle` e `startWildBattle` **não chamavam o seed**. Num banco
recém-criado, chamar `start_gym` antes de `GET /api/gym` devolvia 404
("Líder de ginásio não encontrado"). É o mesmo padrão do bug da loja corrigido
na Fase 5 — e passou despercebido nas duas fases.

#### Supabase (preparado, aguardando credencial)

Supabase **é** PostgreSQL, então não muda nada no código — só `DATABASE_URL`.
Duas armadilhas tratadas em `src/db/index.ts`:

1. **SSL é obrigatório no Supabase.** `new Pool({ connectionString })` não
   negocia SSL sozinho. Agora é ligado automaticamente quando o host contém
   `supabase.com`/`neon.tech`/`render.com`, com override `DATABASE_SSL`.
2. **A conexão pooled (6543) usa transaction pooling**, que não suporta
   prepared statements e quebra Drizzle/drizzle-kit. O app **avisa no log** se
   detectar a 6543. O recomendado é a conexão direta (5432).

---

## 4. Passo a passo de validação da última etapa

### 4.1 Checagens
```bash
COOKIE_SAME_SITE=none npm run check
```
✅ **exit 0** — lint 0/0 · tsc 0 · **84 unit** · build 14 rotas.
✅ Integração: **50 testes** (31 segurança + 12 PvP + **7 novos de Bearer**).
   **Total: 134 testes.**

### 4.2 Simulando o iframe: SEM cookie, só Bearer
```
login → token de 43 caracteres devolvido no corpo

sem cookie e sem token          GET /api/auth → 401
só Authorization: Bearer        GET /api/auth → 200
                                GET /api/pvp  → 200
                                POST /api/pvp (create_room) → 200  sala DLG-9527
                                POST /api/battle (start_gym) → 200 vs Geodude lvl 12
                                POST /api/pokemon/heal → 200
token falso                     GET /api/auth → 401
cookie (deploy normal)          GET /api/auth → 200  ← não regrediu
```

### 4.3 Os três fluxos reportados, com Bearer
| Fluxo | Resultado |
|---|---|
| Criar mapa (admin) | **200** · `createdMap.id = 4`, `creatorId` gravado |
| Criar sala PvP | **200** · sala `DLG-9527` |
| Desafiar ginásio | **200** · "Brock enviou Geodude (LV. 12)!" |

### 4.4 Segurança não regrediu
- `passwordHash` continua fora da resposta (teste assertando).
- IDOR continua bloqueado: Bearer de outro usuário tentando vender Pokémon
  alheio → **404**.
- CSRF por `Origin` mantido: origem externa → **403**.

### 4.5 O que **não** foi validado
**Novamente, a confirmação final é no navegador.** Provei que o servidor aceita
Bearer, que os três fluxos funcionam com ele, e que cookie/CSRF/IDOR não
regrdiram. Mas **não tenho navegador aqui** para confirmar que o `localStorage`
do iframe guarda e reenvia o token.

⚠️ Risco residual honesto: se o iframe do preview também bloquear
`localStorage` (Safari com ITP faz isso em alguns casos), o Bearer falha igual.
**É exatamente para isso que o painel 🐞 existe** — se ainda falhar, abra o 🐞 e
me diga o que aparece em "token no localStorage" e o status das requests.

---

## 5. Qual a próxima etapa a ser aplicada

### 🟡 Fase 5.1-B — staging no Supabase e na Vercel

Em andamento. O projeto Supabase staging foi criado em São Paulo no plano Free.
O código separa `DATABASE_URL` (runtime/Session Pooler) de
`DIRECT_DATABASE_URL` (migrations), limita o pool serverless e valida TLS por
padrão. O bootstrap transacional `docs/supabase-staging-bootstrap.sql` foi aplicado:
11 tabelas, 4 migrations no journal e RLS nas 11 tabelas. Vercel está conectada
ao Session Pooler 5432 por parâmetros separados e CA validada; health, mapas,
cadastro, cookie HttpOnly, persistência e logout passaram no smoke test.

Painel Admin corrigido e validado. Duas correções finais aguardam reteste: o
botão PVP agora abre o `PvpLobby` real (a modal legada não enviava `pokemonId`)
e o palco exclusivo do ginásio foi invertido para oponente à direita/jogador à
esquerda, sem alterar batalhas selvagens. Plano: `docs/PRODUCAO-5.1.md`.

### Depois da Fase 5.1: FASE 6 — Conteúdo e mundo

1. **Balanceamento do início do jogo** *(o mais urgente)* — inicial lvl 5
   nocauteia outro inicial lvl 5 em **um** golpe.
2. **XP e evolução** — Charmander nunca vira Charizard.
3. **Pokédex 21 → 50+** e mais golpes.
4. **Sistema de status** (veneno, queimadura, paralisia).
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
| 2026-08-27 | **Correção 1** — `SameSite=None` | ❌ **Não resolveu** (problema era política do navegador, não atributo) | commit `7f6b806` |
| 2026-08-27 | **Correção 2** — Bearer token + painel de debug + Supabase-ready | ✅ Validada no servidor; **aguardando reteste no navegador** | commit `0799cb9` |
| 2026-08-27 | **Supabase** testado | ❌ Bloqueado pelo egress do sandbox (código pronto) | `docs/SUPABASE.md` |
| 2026-08-27 | **Correção 3** — colisão de código de sala PvP (bug real achado pelo CI) | ✅ Concluída e validada | commit `0080c84` |
| 2026-08-29 | **Fase 5.1.1** — baseline e dependências | ✅ Concluída e validada | `docs/PRODUCAO-5.1.md` |
| 2026-08-29 | **Fase 5.1-A** — segurança básica de produção | ✅ Concluída e validada | migration `0003` |
| 2026-08-29 | **Fase 5.1-B** — staging Supabase/Vercel | 🟡 Em andamento; aguardando projeto staging | — |
| — | **Fase 6** — Conteúdo e mundo | ⬜ Após a 5.1 | — |

> **Nota sobre o histórico git:** o `.git` do sandbox é resetado entre sessões.
> Commits originais por fase (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos e
> reunidos em `6496bff`. O código nunca foi afetado, e o push para o GitHub é o
> que preserva o histórico. Por isso a memória do projeto vive **neste
> arquivo**, não no git.
