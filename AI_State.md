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
| 8 | **Editor de camadas (6.2-B)**: abrir o EDITOR como admin, alternar TERRENO/ENCONTROS/COLISÃO, liberar uma célula de água e marcá-la como área de caça, salvar e andar na água no jogo | Botão EDITOR (admin) | Fase 6.2-B |
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
**Branch da sessão atual:** `arena/01a05735-pokeeeee`
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
21 espécies (com learnset por nível) · 41 golpes · 6 variantes · 3 mapas · 3 líderes de ginásio · 11 itens de loja · 10 tipos de tile

### Estado funcional real
| Feature | Estado |
|---|---|
| Registro / Login / Sessão | ✅ Funciona (inseguro — ver Fase 1) |
| Exploração + movimento + portais | ✅ Funciona |
| Encontros selvagens | ✅ Funciona (decididos no cliente) |
| Batalha selvagem | ✅ **Servidor** — dano, tipos, XP, captura e HP persistidos |
| Captura | ✅ **Servidor** — `catchRate` + HP + bola; pode falhar |
| XP / Nível up | ✅ **Servidor** — XP acumula, nível sobe e o Pokémon **aprende golpes** (6.1) |
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

- [x] **FASE 6.1 — Balanceamento do início do jogo** ✅ 2026-08-31
- [x] **FASE 6.2-A — Camadas de mapa (colisão + área de caça) no servidor** ✅ 2026-08-31
- [x] **FASE 6.2-B — Pintar as camadas no Editor de Mundos** ✅ 2026-08-31
- [ ] **FASE 6.2-C — Golpes fracos 15–35, fim do teto de dano, curva `nível³ × 0,8`** ⬅️ próxima

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


### 🟡 Fase 5.1-D — produção controlada: deploy oficial validado, backup pendente (2026-08-30)

O Supabase oficial de produção **Catchbound** foi validado pelo mantenedor com
11 tabelas, 5 migrations e RLS nas 11 tabelas. O papel `catchbound_runtime`
existe e não tem `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION` nem
`BYPASSRLS`.

A Vercel oficial foi conectada à `main` e publicada em
`https://catchbound.vercel.app/`. A primeira tentativa falhou com `28P01`
(password authentication failed) para `catchbound_runtime`; a correção foi
ajustar credenciais/usuário do Session Pooler na Vercel. Depois disso,
`/api/health` respondeu `{ "ok": true }`.

Smoke de produção autenticado passou no navegador do mantenedor: mapa, batalha
selvagem, ginásio, loja, PvP e admin. Endpoints públicos também foram checados
pelo agente. `/api/maintenance` com `CRON_SECRET` foi validado após rotação do
segredo e redeploy. O papel `catchbound_backup` foi validado e a senha foi
salva fora do chat. Falta ativar e executar o backup criptografado de produção.

Foram preparados:

- `docs/supabase-production-backup-role.sql` — cria `catchbound_backup`, papel
  somente-leitura para `pg_dump` sem usar `postgres` nem `catchbound_runtime`;
- `docs/supabase-production-backup-rotate-password.sql` — rotaciona a senha se
  `catchbound_backup` já existir ou a senha tiver sido perdida, reaplicando
  grants/policies idempotentes sem conceder escrita. No Supabase a rotação
  altera apenas a senha, pois o usuário administrativo do projeto não pode
  tocar novamente em flags como `NOSUPERUSER`. A senha e as validações saem em
  uma única tabela final porque o SQL Editor pode exibir apenas o último result
  set;
- `docs/backup-production.yml` — workflow de referência para copiar manualmente
  para `.github/workflows/backup-production.yml`; usa `--enable-row-security`
  porque o papel de backup não possui `BYPASSRLS` e depende das policies de
  leitura; a GitHub App da Arena não tem permissão `workflows`.

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

### Correção — sessão perdida dentro do iframe (2026-08-31)

**Sintoma relatado:** depois de pintar as camadas, o passo na área de caça
tocava o som do encontro e a batalha nunca começava; o editor "aparentemente
funcionou".

**Auditoria.** A API estava certa: `POST /api/battle` com `start_wild` em (3,9)
devolve 200 no matinho e 400 na grama comum, e responde 200 **só** com
`Authorization: Bearer`. O log do dev server mostrou o que de fato acontecia no
navegador: `PUT /api/maps/1 401`, `POST /api/battle 401`, `POST
/api/pokemon/heal 401` — tudo depois de um `POST /api/auth 200`. E o banco
confirmou: as três camadas do mapa 1 continuavam vazias, ou seja, **o salvamento
do editor nunca chegou a gravar**.

**Causa raiz.** Dentro de iframe cross-site o navegador não bloqueia só o
cookie: ele particiona ou nega o `localStorage`. `setToken` gravava no vazio,
`getToken` devolvia `null`, nenhuma request levava `Authorization`, e o
servidor respondia 401 a tudo. O som tocava porque é disparado **antes** da
request; a batalha nunca vinha porque a request era anônima.

**Dois defeitos secundários que esconderam o primeiro:**

1. o aviso do editor era **sempre verde** — a mensagem de erro do 401 aparecia
   com cara de sucesso, e o mapa parecia salvo;
2. no jogo, o 401 virava a mensagem genérica "não foi possível iniciar a
   batalha", que faz pensar em bug de mapa, não em sessão.

**Correções (`src/lib/api-client.ts`, `WorldMapEditor.tsx`, `page.tsx`):**

- cópia do token **em memória**, que não depende de permissão de armazenamento
  e dura o que dura a página; `localStorage` segue como persistência
  best-effort para sobreviver ao F5;
- captura central do token em **qualquer** resposta 2xx de `/api/auth`, para
  nenhuma tela precisar lembrar de chamar `setToken`;
- aviso do editor colorido pelo conteúdo (verde só quando começa com "✓");
- 401 no encontro agora diz "Sua sessão caiu. Faça login de novo para
  batalhar.".

10 testes novos em `src/lib/api-client.test.ts` simulam o `localStorage` que
lança exceção e provam que o header `Authorization` continua sendo enviado.

### Fase 6.2-B — Editor de Mundos pinta as camadas (2026-08-31)

A 6.2-A criou as camadas no banco; sem interface, só dava para editá-las por
`curl`. Agora o `WorldMapEditor` tem uma barra de modos **TERRENO · ENCONTROS ·
COLISÃO**, e o pincel muda de alvo conforme o modo (clique e arrasto nos três).

Decisões que valem registro:

1. **O overlay usa `map-rules`**, as mesmas funções do servidor. O que aparece
   pintado é o que o motor vai fazer, não uma segunda interpretação da camada
   que pode divergir com o tempo.
2. **Ligar a camada de encontro converte em vez de zerar.** Como a camada
   ligada vira a única fonte da verdade, ligá-la vazia apagaria todo o matinho
   de uma vez. O primeiro traço (ou o botão "usar o matinho atual") semeia a
   grade com o comportamento vigente. Há "limpar tudo" e "desligar camada".
3. **`null` ≠ grade toda falsa no estado do editor.** `null` é "camada
   desligada, o tipo do tile decide"; grade falsa é "aqui não tem nada". Só ao
   salvar `null` vira `[]`, que é como o banco representa o legado.
4. **Mapa novo nasce sem espécie.** O editor criava todo mapa novo com Mewtwo,
   Rayquaza e Dragonite nível 25–50 fixos no código — o oposto da dificuldade
   progressiva que o mantenedor pediu.

Lista de espécies agora editável: peso **com a chance real em %** ao lado
(peso 20 é 100% num mapa com uma espécie e 5% num com vinte), nível mín/máx por
espécie com faixa invertida sinalizada antes de o servidor recusar, **faixa de
nível do mapa** com "aplicar a todas", e **taxa de encontro por passo** (era um
`0.22` fixo no cliente).

Funções puras em `src/lib/map-layers.ts` (`loadLayer`, `countMarked`,
`countOverrides`, `weightShare`, `sanitizeLevelRange`, `applyLevelRange`),
fora do componente para poderem ser testadas sem interface.

Infra: em **desenvolvimento** o CSP passou a aceitar `frame-ancestors
https://*.e2b.app` e o `X-Frame-Options: DENY` é omitido — sem isso o preview
do sandbox fica em branco. **Produção continua recusando qualquer moldura.**

### Fase 6.2-A — Camadas de mapa: colisão e área de caça editáveis (2026-08-31)

Pedido do mantenedor: o Editor de Mundos precisa decidir **onde** aparecem
bichos e **onde** dá para andar. Dois defeitos concretos estavam no caminho:

1. água era `walkable: false` **e** `hasEncounter: true` — encontro aquático
   era impossível, porque ninguém pisa na água;
2. só o matinho gerava encontro, e a área de caça era o mapa inteiro.

A causa era a mesma nos dois: passagem e encontro eram **propriedade do tipo de
tile**, fixas em `TILE_DEFINITIONS`. Viraram **dado por mapa**:

| Coluna nova em `game_maps` | Tipo | Papel |
|---|---|---|
| `encounter_grid` | `jsonb` `boolean[][]` | o "tile invisível" de encontro, aplicável sobre qualquer tile |
| `collision_grid` | `jsonb` `(null \| "blocked" \| "walkable")[][]` | override de passagem por célula |
| `encounter_rate` | `integer` 0–100 (default 22, com CHECK) | chance de encontro por passo |

Migration `0005_mysterious_bloodstrike.sql` — **aditiva**, tudo com `DEFAULT`.
Grade vazia = comportamento legado bit a bit, então o deploy não altera
nenhum mapa existente.

Regras num módulo puro novo, `src/lib/map-rules.ts` (sem banco, sem React, sem
`Math.random` implícito), usado **pelo servidor e pelo cliente** para não haver
duas implementações da mesma regra:

- `isWalkableAt` — override manda, mas nunca fura a borda do mapa;
- `hasEncounterAt` — com a camada preenchida ela é a única fonte da verdade;
- `encounterPoolAt` — com a camada em uso, `tileTypes` deixa de filtrar
  (decisão do mantenedor: **uma área de caça por mapa**);
- `pickWeighted` / `rollEncounterLevel` — `rng` injetável, como na 6.1;
- `validateMapLayers` — recusa camada com dimensão errada e área de caça
  pintada sem nenhuma espécie na lista.

Aplicado em: `startWildBattle` (autoridade do servidor), `POST /api/maps` e
`PUT /api/maps/[id]` (no PUT a validação usa o valor final: entrada ?? banco) e
o movimento em `src/app/page.tsx` — sem o cliente, o admin liberaria a água e o
jogador continuaria barrado. `ENCOUNTER_RATE` fixo no cliente foi removido.

**Pendente no deploy:** aplicar a migration `0005` em produção **antes** de
fazer o merge em `main` — o código novo lê as colunas e quebra sem elas.
Passo a passo, hash do journal e consultas de conferência em
`docs/DEPLOY-6.2-A.md`.

### Fase 6.1 — Balanceamento do início do jogo (2026-08-31)

O defeito de abertura da Fase 6: **um inicial nível 5 nocauteava outro inicial
nível 5 em um golpe**. Medido antes de mexer em qualquer linha, com o motor
real (500 execuções por confronto): Charmander → Bulbasaur com Lança-Chamas
causava 23,9 de dano em 20 de HP — **100% de OHKO**; Bulbasaur → Squirtle, 29,2
em 20; Squirtle → Charmander, 24,2 em 19 (80%). Sem vantagem de tipo, 3 a 5
turnos. O combate inicial era binário.

**A fórmula de dano não era a culpada.** Ela é a clássica e está correta. A
causa era conteúdo: **não existia learnset**. `PokemonSpecies.moves` era uma
lista fixa de 4 golpes de fim de jogo (poder 80–110) que a espécie carregava
desde o nível 1. Com STAB 1,5 × tipo 2,0, um Lança-Chamas fazia 3,5× o HP total
de um alvo de nível 5.

O que mudou:

1. **Learnset por nível** (`learnset` + `movesAtLevel`) em todas as 21
   espécies, mais **22 golpes novos** de poder 30–70 para o começo ter o que
   entregar. `PokemonSpecies.moves` continua existindo, mas agora é **derivado**
   (os 4 últimos golpes do learnset) e serve só para vitrine.
2. **Teto de dano por golpe em níveis baixos** (`capDamage`): um golpe não pode
   arrancar mais que 30% do HP máximo de um alvo nível 5, subindo linearmente
   até 100% no nível 30. Meio e fim de jogo ficam com a fórmula clássica intacta.
3. **RNG injetável** (`Rng`) no motor: balanceamento passou a ser testável com
   semente fixa, sem espionar `Math.random`.
4. **Level up ensina golpes** (`refreshMovesForLevel`) e persiste em
   `move1..move4`; slot vazio é string vazia, não repetição do primeiro golpe.
5. **Curva de XP** de `nível³ × 0,8` para `nível^2,5 × 2,5`: o começo continua em
   ~3 batalhas por nível e o meio de jogo deixa de dobrar (era 11,2 batalhas
   para sair do nível 25, agora 5,8).
6. **Níveis de ginásio** revisados e movidos para `src/lib/gym-teams.ts` (fonte
   única): Brock 12/14 → **10/12**, Misty 18/21 → **16/19**.
7. **`npm run balance:report`** imprime a tabela de confrontos, o teto por
   nível, a prévia do primeiro ginásio e a curva — para o próximo ajuste ser
   comparado, não chutado.
8. **`npm run db:rebalance`** faz o backfill de produção (movesets dos Pokémon
   já capturados + níveis dos ginásios já semeados), idempotente e com
   `--dry-run`.

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


### 4.6 Produção real Catchbound — 2026-08-30

Validações observadas nesta sessão:

```bash
npm ci
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db npm run check
npm run db:local
TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db \
  npm run test:integration
npm audit --audit-level=moderate
```

Resultados locais: `npm ci` com 0 vulnerabilidades, `npm run check` exit 0
(lint, typecheck, 87 unit tests e build), integração com 56 testes passando e
`npm audit` com 0 vulnerabilidades.

GitHub: PR #1 integrado na `main`; CI do merge `33305394208` passou com lint,
typecheck, unit, integration e build.

Supabase produção informado pelo mantenedor: `game_tables=11`, `migrations=5`,
`rls_tables=11`, `catchbound_runtime` existe e flags privilegiadas falsas.

Vercel produção: `https://catchbound.vercel.app/api/health` respondeu
`{ "ok": true }` depois da correção de credenciais do Session Pooler.

Endpoints públicos checados pelo agente:

- `/api/health` → ok;
- `/api/maps` → 3 mapas;
- `/api/gym` → 3 líderes;
- `/api/shop?shopId=1/2/3` → itens seedados;
- `/api/maintenance` sem secret → não autorizado;
- `/api/auth`, `/api/pvp`, `/api/battle` sem sessão → bloqueados;
- `/admin` sem sessão → acesso negado.

Smoke manual/autenticado informado pelo mantenedor: script passou; visual de
mapa, batalha selvagem, ginásio, loja, PvP e admin ok.

Concluído: `/api/maintenance` com `CRON_SECRET` retornou 200 após rotação do segredo e redeploy.

### 4.7 Fechamento da Fase 5.1-D — backup de produção (2026-08-31)

Confirmado no GitHub nesta sessão, sem alterar produção:

```bash
git fetch origin
gh pr list --state all       # PR #1 MERGED, PR #2 MERGED
gh run list --limit 12
gh run view 33378414585      # Encrypted production backup → success, 30s
```

- **PR #2** (`Fase 5.1-D: registra produção e prepara backup`) está **mergeado
  na `main`**; a `main` está em `a87e965` (`Fix restore-db cleanup and
  verification logic`).
- **CI verde na `main`**: run `33378159885` (lint, typecheck, unit, integration,
  build).
- **Encrypted production backup**: run `33378414585` → `success`, com o artifact
  criptografado `production-db-33378414585`. O passo de verificação do workflow
  imprime `Restore verified: 11 game tables, 5 migrations` e aborta com
  `exit 1` se as contagens não baterem — o download bruto do log via
  `gh run view --log` é bloqueado pelo egress deste sandbox, então a evidência
  usada foi o `success` do job somado ao artifact publicado.
- Runs `failure` anteriores do mesmo workflow (duração `0s`) são execuções
  disparadas por `push` antes da correção do YAML/verificação; a última execução
  em `main` é a válida.
- **Dessincronia corrigida aqui:** `docs/backup-production.yml` estava atrás de
  `.github/workflows/backup-production.yml` (faltavam `--inserts`,
  `--verbose --exit-on-error`, o `docker rm -f restore-db` defensivo e a
  verificação numérica com diagnóstico). O arquivo de `docs/` foi
  **ressincronizado por cópia** do workflow real.

Produção esperada e confirmada: `/api/health` → `{ "ok": true }`;
`/api/maintenance` sem segredo → não autorizado; com `CRON_SECRET` → `200 ok`.

Armadilha registrada: no Session Pooler do Supabase o usuário precisa do sufixo
com project ref (`catchbound_runtime.PROJECT_REF` na Vercel,
`catchbound_backup.PROJECT_REF` no GitHub Actions); sem isso o erro é `28P01`.

Validação local desta sessão (banco embutido `npm run db:local`):

```bash
npm ci
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db npm run check
TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db \
  npm run test:integration
npm audit --audit-level=moderate
```

**Fase 5.1-D concluída.** Produção controlada online, backup criptografado ativo
com restore testado, `CRON_SECRET` validado. Próxima etapa: **Fase 6**.

### 4.8 Validação da Fase 6.1 (2026-08-31)

```bash
npm ci
npm run db:local
npm run balance:report
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db npm run check
TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
  DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db \
  npm run test:integration
npm run db:rebalance -- --dry-run
```

Resultados observados:

- `npm run check` **exit 0**: lint 0, tsc 0, **106 testes unitários** (eram 87;
  19 novos em `balance.test.ts`), build 14 rotas.
- Integração: **56 testes**. Um deles falhou primeiro e a falha estava certa:
  `pvp.integration.test.ts` mandava `moveIndex: 2` e um inicial nível 5 agora
  conhece **2** golpes, então o índice 2 passou a ser inválido de verdade. O
  teste foi corrigido para o índice 1.
- Relatório de balanceamento, nível 5, 2000 execuções: **0% de OHKO em todos os
  seis confrontos** (era 100% com vantagem de tipo); 4,0 turnos com vantagem e
  4,8–5,1 sem ela.
- Meio de jogo intocado: no nível 30 o teto não vale mais (56,7 de dano em 73 de
  HP) e no nível 50 a fórmula clássica está inteira.
- Curva: 3,0 batalhas para sair do nível 5, 3,9 do 10, 5,8 do 25 (era 2,7 / 4,8
  / 11,2).
- Backfill exercitado em banco real: `--dry-run` lista, aplicação converte
  `[Lança-Chamas, Garra Dragão, Ataque Rápido, Pulso Sombrio]` de um Charmander
  nível 5 em `[Arranhão, Brasa, "", ""]` e Brock de `[12, 14]` para `[10, 12]`;
  segunda execução não escreve nada (idempotente).
- Ponta a ponta contra o banco local (registro → batalha selvagem): inicial
  nasce com `Arranhão`/`Brasa` e `xp_to_next_level = 81`; o selvagem gerado veio
  com golpes do nível dele (`Investida`, `Choque`, `Ataque Rápido`), e a batalha
  durou 3 turnos em vez de 1.

**Não validado aqui:** a tela. Nenhuma destas medições passou por um navegador —
o PC Box agora esconde slots de golpe vazios e o log de batalha ganhou a linha
"aprendeu X!", e as duas coisas precisam de uma olhada visual.

**Pendente de operação:** rodar `npm run db:rebalance` **em produção** depois do
deploy. Sem isso os Pokémon já capturados continuam com os golpes antigos
gravados no banco, e o rebalanceamento só valeria para contas novas.

### 4.9 Validação da Fase 6.2-A (2026-08-31)

Banco local de pé (`npm run db:local`) e migration aplicada:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npx drizzle-kit migrate
→ [✓] migrations applied successfully!   (0005_mysterious_bloodstrike)
```

Suíte completa:

```
DATABASE_URL=... npm run check
→ tsc --noEmit limpo · eslint limpo · build 15 rotas
→ Test Files 9 passed · Tests 136 passed   (30 novos em src/lib/map-rules.test.ts)

TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
DATABASE_URL=... npm run test:integration
→ Test Files 5 passed · Tests 64 passed    (8 novos em tests/integration/encounters.integration.test.ts)
```

O que os testes provam, e não só "passam":

| Prova | Onde |
|---|---|
| mapa legado responde **exatamente** como antes (camada vazia não muda nada) | unitário + integração |
| água pintada como `walkable` + área de caça → `start_wild` devolve 200 | integração (era 400 antes) |
| matinho marcado `blocked` → 400 "Não dá para estar nesse tile." | integração |
| grama comum pintada gera encontro; matinho fora da pintura para de gerar | integração |
| override não atravessa a borda do mapa | unitário |
| `pickWeighted` respeita a proporção dos pesos com RNG injetado | unitário |
| `validateMapLayers` pega dimensão errada e área pintada sem espécie | unitário |

**Não validado ainda (precisa de navegador):** andar na água num mapa com a
camada pintada. Não há como pintar pela interface antes da 6.2-B; o teste de
integração cobre a rota, que é a autoridade.

### 4.10 Validação da Fase 6.2-B (2026-08-31)

```
DATABASE_URL=... npm run check
→ lint limpo · tsc limpo · build 15 rotas
→ Test Files 10 passed · Tests 157 passed   (21 novos em src/lib/map-layers.test.ts)

TEST_PG_URL=... DATABASE_URL=... npm run test:integration
→ Test Files 5 passed · Tests 70 passed     (6 novos no PUT /api/maps/:id)
```

O que os 6 de integração provam, que é o contrato que o editor usa:

| Prova | Resultado |
|---|---|
| PUT grava `encounterGrid`, `collisionGrid` e `encounterRate` | 200, e o `start_wild` na água liberada passa a devolver 200 |
| PUT com `[]` desliga as camadas | volta ao legado: matinho gera, grama comum não |
| camada com dimensão errada | 400 "altura 16", **nada gravado pela metade** |
| área pintada sem espécie | 400 "nenhuma espécie" |
| faixa de nível invertida · taxa 150% | 400 nos dois |
| jogador comum tentando gravar camada | 401/403 e `encounter_rate` intacto |

**Falta validação no navegador** (o agente não tem browser): abrir o EDITOR
como admin, alternar os três modos, pintar a água como liberada + área de caça,
salvar e andar na água no jogo. Preview de dev no sandbox em `:3100`, conta
`admin` / `admin12345` (banco local, não é credencial de produção).

### 4.11 Validação da correção de sessão em iframe (2026-08-31)

```
curl -s -X POST /api/battle  (só com Bearer, sem cookie)   → 200
curl -s -X POST /api/battle  (sem cookie e sem Bearer)     → 401 "Sessão inválida ou expirada."
SELECT ... FROM game_maps                                   → camadas vazias: o PUT do editor nunca gravou

DATABASE_URL=... npm run check          → Test Files 11 · Tests 167 (10 novos)
TEST_PG_URL=... npm run test:integration → Test Files 5 · Tests 70
```

**Falta reteste no navegador:** entrar de novo no preview, pintar, salvar (o
aviso deve ficar **verde** com "✓") e andar na área pintada.

---

## 5. Qual a próxima etapa a ser aplicada

### ✅ Fase 5.1 encerrada — a próxima etapa é a FASE 6

Produção controlada online (`https://catchbound.vercel.app/`), Supabase de
produção validado, runtime mínimo `catchbound_runtime`, `/api/health` ok,
`/api/maintenance` protegido e validado com `CRON_SECRET`, backup criptografado
de produção **ativo com restore testado** (run `33378414585`, artifact
`production-db-33378414585`).

### FASE 6 — Conteúdo e mundo (plano detalhado em `docs/FASE-6.md`)

Ordem: **6.1 balanceamento → 6.2 editor/camadas de mapa → 6.3 evolução →
6.4 Pokédex → 6.5 status → 6.6 PvP ranqueado → 6.7 NPCs**. Premium (6.8) segue
bloqueado até haver IP própria, termos, privacidade, pagamento e antifraude.

#### 6.1 — Balanceamento do início do jogo — ✅ concluída em 2026-08-31

Causa achada e corrigida: não existia learnset. Resultado medido: **0% de OHKO**
no nível 5 (era 100% com vantagem de tipo), 4 turnos com vantagem e ~5 sem ela.
Detalhes e números em `docs/FASE-6.md`.

Fica registrada uma decisão de design, não um bug: **o inicial de Fogo perde os
dois confrontos 1 contra 1 com o Brock**, porque Pedra causa dano dobrado em
Fogo. O jogo dá as saídas (time de até 3, Squirtle e Bulbasaur na grama do mapa
1, poções). Se isso for indesejado, muda-se o conteúdo — não o número.

#### 6.2 — Editor de Mundos, camadas e golpes fracos (em andamento)

Entrou na frente da evolução a pedido do mantenedor: sem editor de camadas não
há como montar o mapa 1 fácil que valida o balanceamento da 6.1. Plano completo
em `docs/FASE-6.2-PLANO.md`.

- **6.2-A — camadas no servidor** ✅ concluída em 2026-08-31 (seções 3 e 4.9).
- **6.2-B — editor pinta as camadas** ✅ concluída em 2026-08-31 (seções 3 e
  4.10). Falta a passada no navegador, registrada nas pendências manuais.
- **6.2-C — próximo passo imediato:** golpes fracos na faixa útil **15–35**, aposentar o teto de dano da
  6.1, voltar a curva original `nível³ × 0,8` e subir os ginásios (Brock 12/14,
  Misty 18/21). O jogo deve continuar difícil de evoluir.

Depois da 6.2 a ordem segue: **6.3 evolução → 6.4 Pokédex → 6.5 status →
6.6 ranked → 6.7 NPCs**.

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
| 2026-08-29 | **Fase 5.1-B** — staging Supabase/Vercel | ✅ Concluída e validada | Supabase + Vercel |
| 2026-08-29 | **Fase 5.1-C** — operação, cron e backup | ✅ Concluída e validada | workflow `backup.yml` |
| 2026-08-30 | **Fase 5.1-D** — produção controlada | ✅ Concluída e validada | `https://catchbound.vercel.app/` |
| 2026-08-31 | **Fase 5.1-D** — backup criptografado de produção | ✅ Concluída e validada | run `33378414585` · restore verificado |
| 2026-08-31 | **Fase 6.1** — balanceamento do início do jogo | ✅ Concluída e validada | learnset + teto de dano · `npm run balance:report` |
| 2026-08-31 | **Fase 6.2-A** — camadas de colisão e área de caça no servidor | ✅ Concluída e validada | migration `0005` · `src/lib/map-rules.ts` |
| 2026-08-31 | **Fase 6.2-B** — Editor pinta as camadas (3 modos) | ✅ Concluída e validada | `src/lib/map-layers.ts` · 27 testes novos |
| 2026-08-31 | **Correção** — sessão perdida no iframe (401 silencioso) | ✅ Concluída e validada | token em memória · `src/lib/api-client.test.ts` |
| — | **Fase 6.2-C** — golpes fracos 15–35 e volta da curva original | ⬜ Próxima | `docs/FASE-6.2-PLANO.md` |
| — | **Fase 6.3** — Evolução no servidor | ⬜ Planejada | `docs/FASE-6.md` |

> **Nota sobre o histórico git:** o `.git` do sandbox é resetado entre sessões.
> Commits originais por fase (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos e
> reunidos em `6496bff`. O código nunca foi afetado, e o push para o GitHub é o
> que preserva o histórico. Por isso a memória do projeto vive **neste
> arquivo**, não no git.
