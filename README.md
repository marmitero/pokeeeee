# 🎮 Pokémon Deluge RPG

MMORPG 16-bit jogável no navegador, inspirado no Pokémon Deluge. Explore mapas interligados por portais, capture Pokémon com variantes de raridade, enfrente líderes de ginásio e — o diferencial do projeto — **crie seus próprios mapas** no Editor de Mundos.

> 📋 **Documentação de estado:** leia [`AI_State.md`](./AI_State.md) antes de qualquer alteração.
> 🔍 **Auditoria técnica:** [`AUDITORIA.md`](./AUDITORIA.md).

---

## ✨ Recursos

- **Exploração** em grade 16×16 com WASD / setas / D-pad na tela, colisão por tile e encontros aleatórios.
- **3 mapas interligados** por portais: Vale Pallet → Floresta de Viridian → Pico Celeste, cada um com sua tabela de encontros e faixa de nível.
- **6 variantes de raridade** no espírito do Deluge: Normal, Shiny, Metallic, Mystic, Dark e Ghostly.
- **Captura, PC Box e time de 6**, com itens de cura, venda e soltura.
- **3 ginásios** (Brock, Misty, Lance) com insígnias e pré-requisitos.
- **Lojas** com progressão de itens por região.
- **Editor de Mundos**: pinte tiles, crie mapas, ligue portais e defina encontros — tudo persistido.
- **Arena PvP** amistosa: turnos assíncronos às cegas, salas por código, chat global. O dano persiste; não conta para ranking (a Arena ranqueada com ELO é futura).
- **Efeitos sonoros 8-bit** sintetizados em tempo real.

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | **TypeScript** (`strict`) |
| Framework | **Next.js 16** (App Router, Turbopack) |
| UI | React 19 · Tailwind CSS v4 · lucide-react |
| Banco | **PostgreSQL** |
| ORM | **Drizzle ORM** + drizzle-kit |
| Lint | ESLint 9 (flat config) |

---

## 🚀 Como rodar

### 1. Pré-requisitos

- **Node.js** ≥ 20
- **PostgreSQL** ≥ 14 em execução

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar o ambiente

```bash
cp .env.example .env
```

Edite `.env` e aponte `DATABASE_URL` para o seu banco:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
```

### 4. Criar as tabelas

O projeto usa *push* de schema (sem migrations versionadas ainda — ver roadmap, Fase 5):

```bash
npm run db:push
```

### 5. Subir o servidor de desenvolvimento

```bash
npm run dev
```

Abra <http://localhost:3000>.

> 💡 **Seed automático:** mapas, líderes de ginásio e itens de loja são inseridos na primeira request, se as tabelas estiverem vazias. Não é preciso rodar um script de seed.

---

## 📜 Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check` | **lint + typecheck + build** — rode antes de commitar |
| `npm run db:push` | Aplica o schema no banco |
| `npm run db:generate` | Gera migrations SQL |
| `npm run db:studio` | Abre o Drizzle Studio |
| `npm run test` | Testes unitários (Vitest) |
| `npm run test:integration` | Testes de integração — sobe e derruba um banco de teste |
| `npm run db:migrate` | Aplica as migrations versionadas de `drizzle/` |
| `npm run db:local` | Sobe um PostgreSQL local embutido (dados em `.pgdata/`) |
| `npm run db:migrate-passwords` | Converte senhas legadas em texto puro para scrypt |
| `npm run db:set-role` | Define o papel de um treinador (sem argumentos: lista a equipe) |

---

## 🔑 Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | String de conexão PostgreSQL. Usada por `src/db/index.ts` (runtime) e `drizzle.config.ts` (schema). |
| `RATE_LIMIT_STORE` | — | `postgres` (padrão quando há `DATABASE_URL`) ou `memory`. |
| `ALLOWED_DEV_ORIGINS` | — | Hosts extras aceitos pelo `next dev` (separados por vírgula). |
| `DATABASE_SSL` | — | Força/desliga SSL. Automático para hosts `supabase.com`/`neon.tech`/`render.com`. |
| `COOKIE_SAME_SITE` | — | `lax` (padrão) ou `none`. Use **`none`** quando o app for acessado dentro de iframe de outro site (caso do preview embutido): com `lax` o navegador não reenvia o cookie e toda request devolve 401. `none` exige HTTPS e ativa a validação de `Origin` (`src/lib/csrf.ts`) como proteção CSRF. |
| `TEST_PG_URL` | — | Postgres usado pelos testes de integração. Padrão: local. |

`.env` está no `.gitignore` e **nunca** deve ser commitado. Use `.env.example` como modelo.

---

## 🐞 Painel de depuração

Botão 🐞 no canto inferior direito, ou `?debug=1` na URL. Mostra o diagnóstico
de sessão (tem token? está em iframe? `cookieEnabled`?) e as últimas 60 chamadas
de API com status, duração e a mensagem de erro real do servidor.

## ☁️ Supabase

O banco pode rodar no Supabase sem mudar nenhuma linha de código — só o
`DATABASE_URL`. Guia completo em [`docs/SUPABASE.md`](./docs/SUPABASE.md).

## 🔐 Modelo de segurança

Implantado na Fase 1. Qualquer mudança nas rotas deve respeitá-lo.

- **Sessão:** cookie `deluge_session` (`HttpOnly`) **ou** header `Authorization: Bearer`. O Bearer existe porque o cookie não é reenviado em iframe cross-site quando o navegador bloqueia cookies de terceiros. O token **bruto nunca é gravado** — o banco guarda o SHA-256.
- **Identidade:** toda rota que escreve chama `requireUser(req)` e deriva o usuário **da sessão**. Nenhum endpoint aceita `userId` no corpo.
- **Senhas:** scrypt (N=16384, r=8, p=1) com salt aleatório e comparação em tempo constante. Contas legadas em texto puro são migradas no primeiro login, ou em lote via `npm run db:migrate-passwords`.
- **Entrada:** todo payload passa por um schema Zod (`src/lib/validation.ts`) antes de tocar o banco.
- **Erros:** o detalhe técnico vai para o log do servidor; o cliente recebe mensagem genérica (`routeError`).
- **Dinheiro e itens:** sempre `UPDATE ... WHERE saldo > 0` dentro de transação — nunca read-then-write.
- **Rate limit:** contadores na tabela `rate_limits` (Postgres) — compartilhados entre réplicas e sobreviventes a restart. 10 tentativas de login/registro por IP a cada 10 min. Falha **aberta** de propósito: se o banco cair, o limite é ignorado e o erro vai para o log. Use `RATE_LIMIT_STORE=memory` para o comportamento por processo.

### Papéis de acesso

| Papel | Pode |
|---|---|
| `player` | Jogar. Não altera nada do mundo compartilhado. *(padrão)* |
| `moderator` | Reservado para moderação de comunidade. **Não** edita mapas. |
| `admin` | Tudo, incluindo criar e editar **qualquer** mapa no Editor de Mundos. |

O **Editor de Mundos é exclusivo de `admin`** — o mundo é um recurso compartilhado
por todos os jogadores, então sua estrutura não é editável por jogadores comuns.
Para eles, os botões **EDITOR** e **+ CRIAR** nem aparecem na interface.

Há também um **painel administrativo** em `/admin` (botão ADMIN no HUD, visível
só para staff): admin gerencia papéis, moderador remove mensagens do chat.

#### Como promover alguém

```bash
npm run db:set-role -- <username> admin          # promove a administrador
npm run db:set-role -- <username> moderator      # promove a moderador
npm run db:set-role -- <username> player         # rebaixa
npm run db:set-role                              # lista a equipe atual
```

Não há endpoint HTTP para isso — **é deliberado**: criar um abriria exatamente a
superfície que a Fase 1 fechou. O efeito é imediato, pois o papel é lido do banco
a cada request (um rebaixamento vale mesmo com a sessão já aberta).

---

## 📁 Estrutura

```
src/
├── app/
│   ├── layout.tsx            # <html lang="pt-BR"> + metadata
│   ├── page.tsx              # mundo, HUD, input e estado global do jogo
│   ├── globals.css           # fontes, overlay CRT, image-rendering: pixelated
│   └── api/                  # Route Handlers
│       ├── auth/             # register | login | resume
│       ├── maps/  maps/[id]/ # GET | POST | PUT
│       ├── pokemon/          # catch | heal | manage
│       ├── gym/  shop/  pvp/  health/
├── components/               # AuthModal, BattleArenaModal, GymModal,
│                             # PokemonBox, ShopModal, SpritePackModal, WorldMapEditor
├── db/
│   ├── schema.ts             # 11 tabelas Drizzle
│   └── index.ts              # Pool global
└── lib/
    ├── pokedex.ts            # espécies, golpes, variantes, cálculo de status
    ├── battle.ts             # fórmulas de combate (migra p/ o servidor na Fase 2)
    ├── tiles.ts              # definição dos tiles do mundo
    ├── sound.ts              # motor de áudio 8-bit (Web Audio API)
    └── seed-*.ts             # mapas, ginásios e loja
```

### Banco de dados — 11 tabelas

`users` · `sessions` · `user_pokemon` · `game_maps` · `shop_items` · `gym_leaders` · `user_badges` · `pvp_battles` · `chat_messages`

---

## 🎨 Direção de arte

Pixel art 16-bit com overlay CRT, construída com **zero assets binários no repositório**:

- **48 sprites GIF animados** (Gen V, Black & White) carregados da CDN do PokeAPI — 16 espécies × frontal/traseiro/shiny.
- **5 das 6 variantes são filtros CSS em runtime** (`hue-rotate`, `grayscale`, `sepia`, `invert`) aplicados sobre o sprite base + `drop-shadow` como aura. Isso gera 96 combinações visuais a partir de 16 sprites.
- **Tipografia com papel definido:** `Press Start 2P` (HUD e títulos), `VT323` (diálogos e logs), `IBM Plex Mono` (dados e números).
- **Áudio 100% sintetizado** via Web Audio API — osciladores com envelopes, imitando o chip de som de um console 8-bit. Nenhum arquivo de áudio.
- `image-rendering: pixelated` global para preservar o pixel duro ao escalar.

> ⚠️ Os `<img>` são crus de propósito (GIF animado + filtros CSS não são otimizados pelo `next/image`). A decisão está documentada em `eslint.config.mjs`.

---

## 🗺️ Roadmap

O estado completo, a última etapa aplicada e a próxima a executar estão em **[`AI_State.md`](./AI_State.md)**.

| Fase | Escopo | Status |
|---|---|---|
| **0** | Higiene de projeto | ✅ Concluída |
| **1** | Blindagem de segurança | ✅ Concluída |
| **1.1** | Papéis de acesso + Editor admin-only | ✅ Concluída |
| **3** | Consertar o que já está construído | ✅ Concluída |
| **2** | Motor de jogo no servidor | ✅ Concluída |
| **5** | Infraestrutura: testes, rate limit real, painel admin, migrations | ✅ Concluída (CI pronto, inativo — ver `docs/CI.md`) |
| **4** | PvP de verdade (turnos assíncronos) | ✅ Concluída |
| **5.1** | Preparação para produção (segurança, Supabase e Vercel) | 🟡 5.1-A concluída; aguardando autorização para 5.1-B |
| **6** | Conteúdo e mundo (balanceamento, evoluções, Arena ranqueada) | ⬜ Depois da 5.1 |

> A ordem é por **dependência**, não numérica: não adicione conteúdo novo antes da Fase 1. O motor de combate ainda não valida nada no servidor.

---

## 🧠 Protocolo `AI_State`

Toda etapa de trabalho segue um protocolo obrigatório, definido em [`AI_State.md`](./AI_State.md):

1. **No início** de cada etapa — ler o `AI_State.md` **antes de tudo**.
2. **No final** de cada etapa — atualizá-lo com: o que já existe, o que falta, a última etapa aplicada, o passo a passo de validação dela e a próxima etapa.

---

## ⚠️ Aviso

Projeto de estudo. Sprites e nomes de Pokémon são propriedade da Nintendo / Game Freak e são carregados de um repositório de terceiros. **Não usar comercialmente** sem resolver essa questão — ver o risco legal apontado na auditoria.
