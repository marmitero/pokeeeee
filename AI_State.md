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

> ## 🌐 REGRA — o mantenedor trabalha **online**, sem console
>
> Não existe projeto na máquina do mantenedor: tudo vive em **GitHub**,
> **Vercel** e **Supabase**. Portanto:
>
> - **nunca** entregar a ele um passo que exija terminal (`git`, `npm`,
>   `git apply`, `cp`, `psql`) — nem "rode tal comando para conferir";
> - cada passo humano é: **abrir arquivo no GitHub** (link direto + o que
>   editar/copiar, com o botão Copy raw), **clicar** em Actions/Vercel/Supabase,
>   ou **colar SQL** no Editor do Supabase (uma única tabela de resultado, porque
>   o Editor mostra só o último result set);
> - comando de shell aqui é **coisa do sandbox do agente**: ele produz e prova a
>   mudança. O §4 continua listando esses comandos como evidência, mas com o
>   rótulo de que não são tarefa do mantenedor;
> - se um passo **precisa** de algo que só console faz (ex.: aplicar um `.patch`,
>   rodar `drizzle-kit` na máquina dele), o passo está mal projetado — converter
>   em arquivo commitado + botão de workflow, ou em SQL colável;
> - arquivos `.patch` em `docs/` não têm uso aqui e já causaram acidente real
>   (foram colados como se fossem workflow): **não criar mais patches**; entregar
>   o arquivo final pronto para colar na interface.

> ## 📌 PENDÊNCIAS DE VALIDAÇÃO MANUAL
>
> **2026-09-06 — o mantenedor validou em produção (catchbound.vercel.app) TODOS
> os itens #1–#14 abaixo** (vitrine de sprites, Ferramentas GM, evoluções por
> nível e por pedra, batalha, captura, ginásio, editor de camadas, e-mail real,
> chat — que hoje existe **só no painel admin e na arena PvP** — e o restante).
> Ficam aqui como registro do que foi conferido.
>
> **2026-09-07 — o mantenedor validou em produção o item #15 (Sinnoh): loja 3
> com os 7 itens, Rhydon + Protetor → Rhyperior, vitrine com 493 espécies.
> PR #12 (6.4-D) já está na `main` (`f6f0d98`). Validado em produção.**
>
> **2026-09-07 — Fase 6.4-E (Unova) concluída no sandbox, aguardando merge.
> Nenhum SQL novo de produção — Unova reutiliza pedras existentes. Pendência
> aberta: #16 (Unova em produção, vitrine 649 + evoluções GM).**
>
> **2026-09-07 — Decisão do mantenedor: (B) parar em 649 — Pokédex completa.
> Fase 8.8 (Chat no jogo: global/local/whisper) concluída no sandbox,
> aguardando merge. Pendência #17: migration 0009 + chat no HUD (💬 GLOBAL/LOCAL/PRIVADO).**
>
> **2026-09-07 (noite) — o mantenedor declarou CONCLUÍDAS as pendências #16
> (Unova), #17 (chat) e a ativação 7.1 em produção (run `34163835861`
> APPLY-production verde, 40 mapas servidos). Decisão nova: **mundo travado
> em 40 mapas por enquanto** (Etapa B 7.2–7.4 congelada) e **seguir para a
> Etapa C** com regras próprias: pedras absurdamente caras + drop raro nv
> 40+; cidade a cada 5 mapas (loja+ginásio+cura); 2 Arenas Boss (mapas 20 e
> 40, lendários semanais diferentes, 2 tentativas/dia/arena, vitória trava
> a semana, boss nv 80–100, prêmio = XP + dinheiro + pedra à escolha +
> 1/1200 o lendário nv 5).**
>
> **2026-09-08 — o mantenedor declarou VALIDADAS em produção as pendências
> A (Arena Boss E2E, 8.3), B (passada visual 8.1/8.2) e C (artefato
> `world-diff`). O backup de produção que falha em "Verify restoration"
> (hipótese: role `catchbound_maint` ausente em `backup-production.yml` L107)
> fica **adiado por decisão dele** ("o backup nós vemos depois"). Ordem
> combinada do roadmap: 8.4 → 8.5 → 8.6 → 8.7 → Etapa D. Pendência nova
> abaixo: #18 (8.4 em produção).**
>
> **2026-09-08 — o mantenedor validou em produção a pendência #18 (8.4 —
> status de batalha): SQL 0011 colado no Supabase antes do merge, PR #17
> mergeado em `main` (squash `3e223d2`), Vercel `Ready`; no navegador, loja 1
> com Antídoto/Anti-Paralisia, Pikachu nv 12 + Onda Trovão → "está
> paralisado!" + etiqueta PAR, barra ITENS curando e gastando o turno,
> Pokémon Box com a etiqueta, Centro Pokémon limpa, PvP com Pó do Sono. A
> **8.4 está em produção**.**
>
> | # | O que testar | Como | Origem | Status |
> |---|---|---|---|---|
> | 1 | **Batalha selvagem**: pisar na grama alta, ver o sprite do oponente, as barras de HP, o log com "É super efetivo!", os 4 golpes com tipo/poder, e o botão FUGIR | Login → andar até a grama alta (WASD) | Fase 2 | ✅ 2026-09-06 |
> | 2 | **Captura na tela**: arremessar Pokébola e ver a mensagem de escape com a % de chance | idem, botão 🔴 | Fase 2 | ✅ 2026-09-06 |
> | 3 | **Ginásio**: falar com o Brock (🏟️), ver a tela de introdução com os sprites corretos (Geodude/Onix, **não** Bulbasaur), lutar e ver a insígnia no HUD | Mapa 1, NPC 🏟️ | Fases 2 e 3 | ✅ 2026-09-06 |
> | 4 | **Chat global**: abrir o PVP, ver as mensagens reais carregadas (não as fake) e enviar uma | Botão PVP | Fase 3 | ✅ 2026-09-06 (funciona; só admin + arena PvP — ver Etapa C) |
> | 5 | **Editor de Mundos**: confirmar que o botão EDITOR some para jogador comum e aparece para admin | Logar como admin e como jogador | Fase 1.1 | ✅ 2026-09-06 |
> | 6 | **Mapas com cadeado**: confirmar que só os mapas ligados por portal são clicáveis | Sidebar "MAPAS INTERLIGADOS" | Fase 3 | ✅ 2026-09-06 |
> | 7 | **Painel admin**: abrir `/admin`, ver a lista de equipe, promover alguém e remover uma mensagem do chat | Botão ADMIN no HUD (só aparece para staff) | Fase 5 | ✅ 2026-09-06 |
> | 8 | **Editor de camadas (6.2-B)**: abrir o EDITOR como admin, alternar TERRENO/ENCONTROS/COLISÃO, liberar uma célula de água e marcá-la como área de caça, salvar e andar na água no jogo | Botão EDITOR (admin) | Fase 6.2-B | ✅ 2026-09-06 |
> | 9 | **Balanceamento 6.2-C na prática**: batalha inicial com vantagem termina em ~2 golpes, sem vantagem em ~7; subir do nível 5 exige ~3 vitórias; Brock 12/14 no diálogo do ginásio | Login → grama alta → ginásio | Fase 6.2-C | ✅ 2026-09-06 |
> | 10 | **Evolução (6.3)**: subir um Charmander até 16 (ou usar um save acima do limiar) e ver o log `★ … evoluiu para Charmeleon!` e o nome novo no PC Box | Login → batalhar até cruzar nível 16 | Fase 6.3 | ✅ 2026-09-06 |
> | 11 | **Vitrine de sprites (6.3-A + 6.4-B + 6.4-C)**: abrir o Pacote de Sprites e conferir que lista as 387 espécies × 6 variantes (2322 sprites) sem quebrados — em especial os Hoenn novos (Treecko/Torchic/Mudkip, Metagross, Deoxys) | Botão de sprites no HUD | Fase 6.3-A/6.4-B/6.4-C | ✅ 2026-09-06 |
> | 12 | **Cadastro com e-mail real em produção (pós-incidente 2026-09-06)**: após colar `docs/supabase-production-0006-runtime.sql`, `/api/health` → `emailVerification:"ok"`, criar conta → tela de código → e-mail chega → entrar | catchbound.vercel.app | Incidente §4.27 | ✅ 2026-09-06 |
> | 13 | **Pedras de evolução em produção (6.4-B)**: após colar `docs/supabase-production-0007-runtime.sql`, abrir as lojas 1–3 e ver os 15 itens, comprar uma Pedra de Trovão, usar no Pikachu no Pokémon Box e ver `★ … evoluiu para Raichu!` | catchbound.vercel.app | Fase 6.4-B/§4.28 | ✅ 2026-09-06 |
> | 14 | **Hoenn em produção (6.4-C)**: abrir a vitrine de sprites e conferir 387 espécies; capturar/dar via GM um Treecko e subir ao nível 16 para ver `★ … evoluiu para Grovyle!` | catchbound.vercel.app | Fase 6.4-C/§4.29 | ✅ 2026-09-06 |
> | 15 | **Sinnoh em produção (6.4-D)**: **antes do merge** colar `docs/supabase-production-0008-runtime.sql` no SQL Editor (conferência: `sinnoh_columns 7 · check_exists 1 · runtime_grants 4 · migrations 9`); após o deploy, abrir a loja 3 (Pico Celeste) e ver os 7 itens novos (🪖 Protetor, 🔋 Eletrizador, 🌋 Magmatizador, 🪝 Garra Afiada, 🦷 Presa Afiada, 💽 Disco Dúbio, 🕯️ Manto do Ceifador); via GM dar um Rhydon + 1 Protetor, usar no Pokémon Box → `★ Rhydon evoluiu para Rhyperior!`; dar um Riolu lv19 e vencer uma batalha → Lucario; vitrine de sprites com 493 espécies (2958 sprites). Encontros de Sinnoh **ainda não existem no mundo** (decisão do mantenedor) — use as Ferramentas GM | catchbound.vercel.app | Fase 6.4-D/§4.30 | ✅ 2026-09-07 (validado em produção pelo mantenedor) |
| 16 | **Unova em produção (6.4-E)**: **sem SQL novo** (reutiliza pedras); após o deploy, vitrine de sprites com 649 espécies (3894 sprites); via GM dar Snivy lv16 → vencer batalha → Servine (lv17) → lv36 → Serperior; dar Pansage + Pedra de Folha → Pokémon Box → usar pedra → Simisage; Boldore lv39 → Gigalith (proxy troca lv40); Woobat lv24 → Swoobat | catchbound.vercel.app | Fase 6.4-E/§4.31 | ✅ 2026-09-07 (mantenedor declarou concluída) |
| 18 | **Status de batalha em produção (8.4)**: **antes do merge** colar `docs/supabase-production-0011-runtime.sql` no SQL Editor (conferência: `status_columns 2 · cure_columns 7 · status_check 1 · inventory_check 1 · runtime_grants 8 · migrations 12`); após o deploy: loja 1 lista 🧫 Antídoto (100) e 💛 Anti-Paralisia (200); via GM dar um Pikachu nv 12 → grama do mapa 1 → usar ✨ Onda Trovão → log "está paralisado!" + etiqueta **PAR** amarela na caixa de HP do selvagem; ser envenenado/queimado por um selvagem e ver a barra "ITENS (usar gasta o turno)" → usar Antídoto → turno passa e etiqueta some; fugir com status → Pokémon Box mostra a etiqueta → Centro Pokémon (✚) limpa; PvP amistoso: Pó do Sono de um Bulbasaur nv 15 adormece o adversário ("está dormindo profundamente") | catchbound.vercel.app | Fase 8.4/§4.36 | ✅ 2026-09-08 |
| 19 | **Arena PvP ranqueada em produção (8.5)**: **antes do merge** colar `docs/supabase-production-0012-runtime.sql` no SQL Editor (conferência: `rls_on true · runtime_privs 4 · runtime_policy 1 · backup_policy 1 · indexes 2 · checks 2 · migrations 13`); após o deploy: abrir ARENA PVP → aba RANQUEADA → "BUSCAR RIVAL RANQUEADO" com 2 contas (pareia sozinho; no fim do duelo o ELO muda); aba RANKING → top 50 + a posição do jogador (aparece quem tiver 10+ partidas); desistir antes do turno 3 paga ½ K ao vencedor | catchbound.vercel.app | Fase 8.5/§4.37 | ⬜ |
| 20 | **Presença multiplayer + interação em produção (8.9)**: **antes do merge** colar `docs/supabase-production-0013-runtime.sql` no SQL Editor (conferência: `rls_on true · runtime_privs 4 · runtime_policy 1 · backup_policy 1 · indexes 3 · checks 1 · last_seen_col 1 · migrations 14`); após o deploy: logar com 2 contas no MESMO mapa → cada um vê o crachá do outro; clicar no outro (ou botão 👤 ao pisar na mesma célula) → menu ➕ amigo / 💬 PM (abre sussurro) / ⚔️ desafiar (cria sala PvP e sussurra o código) | catchbound.vercel.app | Fase 8.9/§4.39 | ⬜ |
| 17 | **Chat no jogo em produção (8.8)**: **antes do merge** colar `docs/supabase-production-0009-runtime.sql` no SQL Editor (conferência: `chat_columns 2 · channel_check 1 · indexes 3 · migrations 10`); após o deploy, 💬 GLOBAL/LOCAL/PRIVADO + `/w` + badge de não-lidas | catchbound.vercel.app | Fase 8.8/§4.32 | ✅ 2026-09-07 (mantenedor declarou concluída) |
>
> **Conta de admin para teste:** `admin` / `admin12345`
>
> **Dica (2026-09-06):** para espécies que não aparecem no mundo (Hoenn, Sinnoh)
> e para itens, o painel admin (admin-only) tem **Ferramentas GM** — subir
> nível, dar Pokémon, dar item/dinheiro, curar, teleportar e dar insígnia
> (§3/§4.24). O select de "dar item" lista os 21 itens de evolução.
>
> Quando validar, marcar a linha com ✅/❌ e registrar o resultado na seção 4.

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
> **Estado em 2026-09-04:** tudo que existe no projeto está no GitHub. A
> `main` é um único commit de squash (`92936e9`), **sem ancestralidade** — por
> isso as branchs antigas (`01a03ad9`, `01a0439a`, `01a052dc`) são **histórias
> separadas** e **não devem ser mescladas** (`--allow-unrelated-histories`
> reanimaria código obsoleto em cima do atual). O trabalho delas já está em
> `main` (PRs #1–#3). Após o merge do branch de handoff
> (`arena/01a06d75-pokeeeee`, que já carrega a Fase 6.2-D + este AI_State),
> fecha-se o PR #4 (commit vira ancestral — nada se perde) e apagam-se
> `01a03ad9`, `01a0439a`, `01a052dc` e `01a05735` (o único conteúdo dela — o
> registro do deploy 6.2 em produção — foi absorvido em §4.13).
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
**Branch da sessão atual:** `arena/01a08723-pokeeeee` (fix #19 do pareamento da 8.5 + **8.9 presença multiplayer**; o `main` está em `3e223d2` — merge do PR #17, 8.4 em produção)
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
└── lib/                      # pokedex (+ pokedex-gen1/-johto/-hoenn/-sinnoh), tiles, sound, battle, seed-maps, seed-gym, seed-shop, world-content (6.2-D), gm (comandos GM do painel)
content/world/                # mundo versionado: maps/<slug>.json (com ginásios) + shops/<shopId>.json (6.2-D)
scripts/world-export.mts      # banco → content/world/     (npm run world:export)
scripts/world-import.mts      # content/world/ → banco     (npm run world:import [-- --dry-run])
```

### Banco de dados — 15 tabelas
`users` (+ `last_seen_at`, 8.9) · `sessions` · `user_pokemon` (+ `status`/`status_turns`, 8.4) · `game_maps` · `shop_items` · `gym_leaders` · `user_badges` · `pvp_battles` · `pvp_seasons` (8.5) · `chat_messages` · `email_verification_codes` (2026-09-06) · `battles` · `boss_fights` (8.3) · `rate_limits` · `friendships` (8.9). Migrations **0000–0013**.

### Conteúdo seedado
**649 espécies** (1–151 Kanto + 152–251 Johto + 252–386 Hoenn + 387–493 Sinnoh + 494–649 Unova, com learnset e linhas evolutivas completas — 6.4-E) · **142 golpes** (133 + 9 de Status na 8.4; 27 com efeito secundário) · 6 variantes · **40 mapas temáticos (6.4-A → 7.1, cadeia 1↔40)** — as **649** espécies distribuídas, cada uma em exatamente um mapa · 3 líderes de ginásio · **32 itens de loja** (11 base + 21 de evolução) · 10 tipos de tile · 21 itens de evolução como colunas de `users` (14 da 0007 + 7 da 0008)

### Estado funcional real
| Feature | Estado |
|---|---|
| Registro / Login / Sessão | ✅ Funciona — scrypt, cookie httpOnly, **confirmação por e-mail** (código de 6 dígitos, 2026-09-06) |
| Exploração + movimento + portais | ✅ Funciona |
| Encontros selvagens | ✅ Funciona (decididos no cliente) |
| Batalha selvagem | ✅ **Servidor** — dano, tipos, XP, captura e HP persistidos |
| Captura | ✅ **Servidor** — `catchRate` + HP + bola; pode falhar |
| XP / Nível up | ✅ **Servidor** — XP acumula, nível sobe e o Pokémon **aprende golpes** (6.1) |
| Evolução | ✅ **Servidor** (6.3) — por nível, no fluxo de vitória; stats recalculados, % de HP e apelido preservados, tipos trocam na hora, sem endpoint chamável |
| PC Box / time / itens | ✅ Funciona |
| Ginásio | ✅ **Servidor** — luta turno a turno, insígnia só vencendo de verdade |
| Loja (comprar) | ⚠️ Funciona, com exploit de `quantity` negativa |
| Loja (vender item) | ❌ Não existe (`sellPrice` é coluna morta) |
| Loja (Antídoto) | ✅ **Voltou na 8.4** com coluna própria (`antidotes`) + 6 curas irmãs; o legado `itemKey: "potions"` continua sendo limpo pelo seed |
| **Status de batalha (8.4)** | ✅ **Servidor** — PSN/TOX/BRN/PAR/SLP/FRZ em PvE e PvP, persistem em `user_pokemon.status` até Centro/item; `use_item` em batalha consome o turno |
| Editor de Mundos | ✅ Funciona — melhor parte do projeto, sem autorização |
| PvP amistoso | ✅ **Servidor** (Fase 4) — turnos às cegas, polling 2,5 s, dano/status persistidos, revanche |
| **Arena PvP ranqueada (8.5)** | ✅ **Servidor** — ELO K32/24 (piso 100, só em `ranked`), fila `join_ranked` por ELO, ranking top 50 (`GET /api/pvp?ranking=1`), temporada semanal (`pvp_seasons`, fechamento preguiçoso), antifarm (3×/dia por par, mínimo 10 partidas, forfeit cedo ½ K, mesmo IP não pareia) |
| Chat global | ✅ **FUNCIONA** (B11 corrigido) — busca ao abrir, polling 5s, mensagens renderizadas |
| Pacote de Sprites | ✅ Funciona (vitrine) — 649 espécies × 6 variantes (3894 sprites) |
| **Presença multiplayer (8.9)** | ✅ **Servidor** — heartbeat `POST /api/presence` (rate limit 60/min) devolve os players do mesmo mapa online nos últimos 30 s; crachás no mapa (`MapPlayers`) com clique → menu de interação |
| **Amizade (8.9)** | ✅ **Servidor** — tabela `friendships` (par canônico, idempotente); `GET /api/friends` + `POST /api/friends {add\|remove}` |

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
| `src/lib/pvp-service.ts` | Orquestração: salas, turno às cegas, resolução atômica, timeout · **8.5: fila ranked, ELO, ranking, temporada** |
| `src/components/PvpLobby.tsx` | Criar/entrar em sala escolhendo o Pokémon · **8.5: abas SALAS/RANQUEADA/RANKING** |
| `src/components/PvpArena.tsx` | Batalha com polling de 2,5 s · **8.5: modo ranqueado + espera de fila** |
| `pvp_battles.mode` | `"friendly"` (amistoso) \| `"ranked"` (Arena, ELO) |
| `users.elo` | ELO do jogador (default 1000) — escrito **só** pela Arena ranqueada |

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
| **Painel administrativo** | `/admin` + `POST /api/admin` — papéis, moderação de chat e **ferramentas GM de teste** (`gm_*`, só admin) |

### Motor de jogo no servidor (Fase 2)
| Módulo | Responsabilidade |
|---|---|
| `src/lib/engine/types.ts` | Tabela de efetividade 18×18 (esparsa: só os pares não-neutros) |
| `src/lib/engine/damage.ts` | Fórmula de dano: `power`, `accuracy`, `category`, STAB, tipos, crítico, variância |
| `src/lib/engine/xp.ts` | Curva de XP, ganho por batalha, level up |
| `src/lib/engine/capture.ts` | Rolagem de captura com `catchRate` + fórmula de chacoalhada |
| `src/lib/engine/combatant.ts` | Monta os combatentes; variante **afeta** os status (B4); `SideState.status/statusTurns` (8.4) |
| `src/lib/engine/status.ts` | **8.4** — regras puras de status (Gen III): imunidades, `inflictStatus`, `beforeMove`, `residualDamage`, `effectiveSpeed`, bônus de captura |
| `src/lib/engine/turn.ts` | **8.4** — `performStrike` / `endOfTurn` / `chooseOpponentMove`, compartilhados por PvE e PvP |
| `src/lib/status-items.ts` | **8.4** — os 7 itens de cura (coluna, `use_item`, o que cura, preço Gen III) |
| `src/lib/battle-service.ts` | Orquestra turno (`runRound`), item em batalha (`applyBattleItem`), troca, captura, fuga e o resultado do ginásio/boss |
| `src/app/api/battle/route.ts` | `start_wild` · `start_gym` · `start_boss` · `attack` · `switch` · `catch` · `flee` · **`use_item`** (8.4) |
| tabela `battles` | Estado de batalha persistido (`state` jsonb + `status`) |

O cliente não calcula mais nada: escolhe uma ação e desenha o que o servidor devolver.

### Mundo como código (Fase 6.2-D)

`content/world/` é a cópia versionada de mapas + ginásios + lojas; o banco
continua sendo a fonte da verdade em runtime. `npm run world:export` tira a
foto do banco de `DATABASE_URL`; `npm run world:import [-- --dry-run]` aplica
em qualquer outro banco — idempotente (chave natural), transacional, nunca
apaga. **Nada no arquivo usa id serial**: portal guarda `targetMapSlug`, NPC
guarda `gymLeaderName`, ginásio mora dentro do arquivo do mapa; `shopId` fica
porque é id lógico. Detalhes em `docs/MUNDO-COMO-CODIGO.md`.

**Desde a 7.1 o elenco dos mapas é artefato gerado**: `world-layout.ts` (dados
puros) + `world-distribute.ts` (algoritmo) → `src/lib/world-encounters.ts`
commitado → `default-world.ts` renderiza. Ninguém digita `[id, peso]` à mão, e
`npm run world:distribute -- --check` (agora também step do workflow `World
activation`) falha se o arquivo gerado divergir do layout/catálogo. Ver
`docs/FASE-7-MUNDO.md`.

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
- [x] **FASE 6.2-D — Mundo como código (export/import de mapas, ginásios e lojas)** ✅ 2026-09-02
- [x] **FASE 6.2-C — Golpes fracos 15–35, fim do teto de dano, curva `nível³ × 0,8`, Brock 12/14 e Misty 18/21** ✅ 2026-09-06
- [x] **FASE 6.3 — Evolução no servidor (por nível, dirigida por dados, sem endpoint chamável)** ✅ 2026-09-06
- [x] **FASE 6.3-A — Catálogo Kanto completo: 25 → 156 espécies, +11 golpes (Poison/Bug/Fairy), linhas fechadas** ✅ 2026-09-06
- [x] **FASE 6.3-B — Golpes com identidade da era GBA: 52 → 133 golpes, learnsets das 156 espécies reescritos por tipo e raça** ✅ 2026-09-06
- [x] **FASE 6.4-A — Mundo até o mapa 20: 17 mapas temáticos novos + 156 espécies redistribuídas (bandas 8–16 → 82–95)** ✅ 2026-09-06
- [x] **FASE 6.4-B — Johto (152–251) + pedras de evolução por item** ✅ 2026-09-06 (PR #10, produção validada)
- [x] **FASE 6.4-C — Catálogo Hoenn (252–386): 254 → 387 espécies (só catálogo, sem redistribuir no mundo)** ✅ 2026-09-06
- [x] **FASE 6.4-D — Catálogo Sinnoh (387–493): 387 → 493 espécies + 7 itens de evolução novos na loja + migration 0008** ✅ 2026-09-06
- [x] **Ferramentas GM no painel admin** — agilizar a validação manual (subir nível, dar Pokémon/item/dinheiro, curar, teleportar, dar insígnia) ✅ 2026-09-06

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
  - [x] `users.elo` (default 1000) — amistoso não escreve nele; a Arena ranqueada (8.5) sim
  - [x] `pvp_battles.mode` = `"friendly"` | `"ranked"`
  - [x] `create_room`/`join_room` agora usam `pokemonId` (fim do vetor hp/attack 9999)
  - [x] Regressão corrigida: `users.losses` voltou a ser incrementado no PvE
  - [x] **Arena PvP ranqueada** ✅ 2026-09-08 — ranking global, ELO, recompensas por posição (8.5)

- [x] **FASE 5 — Infraestrutura e qualidade** ✅ 2026-08-26 (detalhes na seção 3)
  - [x] **⚡ Rate limit real**: store no **Postgres** (tabela `rate_limits`), compartilhado
        entre réplicas e sobrevivente a restart. Redis não entrou porque o binário é
        bloqueado neste ambiente — e o Postgres já resolve os dois requisitos sem
        dependência nova. Store Redis fica como upgrade opcional se o banco ficar quente.
  - [x] **106 testes** (77 unit + 29 integração) com Vitest
  - [x] **Migrations versionadas** (`drizzle/0000_*`, `drizzle/0001_*`) + `npm run db:migrate`
  - [x] **CI** no GitHub Actions: lint, typecheck, unit, integration, build
  - [x] **Painel administrativo** `/admin` + `POST /api/admin` (+ ferramentas GM de teste em 2026-09-06, ver §3/§4.24)
  - [x] **Poderes concretos de `moderator`**: moderação do chat (antes o papel não fazia nada)
  - [x] PostgreSQL local embutido (`npm run db:local`) para os testes não dependerem de Docker

- [ ] **FASE 6 — Conteúdo e mundo** (Pokédex 21→50+, evoluções, status, ranking, premium)
- [ ] **⚠️ Risco legal a decidir antes da Fase 6:** sprites/nomes da Nintendo/Game Freak via CDN de terceiros

---

### 🧭 ROADMAP REDEFINIDO PELO MANTENEDOR (2026-09-06, após a 6.4-C)

> Direção declarada, em ordem e sem atalhos:
> **1º) terminar TODOS os Pokémon → 2º) construir o mundo até 100 mapas, com
> lojas, arenas de bosses lendários, ginásios, arena PvP e NPCs de missão.**
> As fases numeradas abaixo substituem a ordem antiga (6.5 status → 6.6 PvP →
> 6.7 NPCs), que passa a ser **absorvida dentro da Fase 8** — status, PvP
> ranqueado e NPCs viram requisitos do mundo, não etapas soltas.

#### 🅰️ ETAPA A — Pokédex completa (as espécies primeiro)

Regra de ouro do lote (herdada da 6.4-B/6.4-C): espécies em lotes por geração,
**linhas evolutivas completas**, learnset cobrindo os tipos, evolução dirigida
por dados (`trigger:"level"|"item"`), **sem** mexer nos encontros dos mapas —
a distribuição acontece só na Etapa B.

- [x] **6.4-A** — mundo até o mapa 20 + 156 espécies redistribuídas ✅ 2026-09-06
- [x] **6.4-B** — Johto (152–251) + pedras de evolução ✅ 2026-09-06
- [x] **6.4-C** — Hoenn (252–386) — Pokédex **387** ✅ 2026-09-06
- [x] **6.4-D** — Sinnoh (387–493) — Pokédex **493** (Lucario 448 já existia,
      por isso +106) + 7 itens de evolução novos (Protetor, Eletrizador,
      Magmatizador, Garra Afiada, Presa Afiada, Disco Dúbio, Manto do Ceifador)
      vendidos na loja 3 + **migration 0008** + `docs/supabase-production-0008-runtime.sql` ✅ 2026-09-06
- [x] **6.4-E — Unova (494–649)**: +156 espécies → **649**. É o **teto do CDN
      animado** (`black-white/animated` vai até o id 649) — a partir daqui a
      direção de arte precisa de decisão (ver 6.4-F) ✅ 2026-09-07
- [x] **6.4-F — Decisão B: Pokédex completa em 649** — mantenedor escolheu **parar em 649** (honesto com a arte, sem Kalos, sem quebra visual). Etapa A fechada ✅ 2026-09-07
- [ ] **6.4-G — Formas especiais** (Mega, regionais, Rotom, Deoxys): só depois
      de fechar a lista base; exige coluna de forma em `user_pokemon`.

#### 🅱️ ETAPA B — O mundo até 100 mapas

Só começa quando a Etapa A fechar (ou quando o mantenedor mandar). Cada lote de
mapas leva junto a redistribuição das espécies daquela faixa, `world:export`,
PR e aplicação em produção pelo workflow **World activation**.

- [x] **7.1 — Mapas 21–40** + redistribuição das **649** espécies nos 40 mapas
      ✅ 2026-09-07 (`docs/FASE-7-MUNDO.md`). Nasceu a infraestrutura que os
      lotes seguintes reutilizam: `world-layout.ts` (dados puros dos 40 mapas),
      `world-distribute.ts` (algoritmo determinístico) e
      `world-encounters.ts` (**artefato gerado** commitado) — o elenco deixou de
      ser digitado à mão em `default-world.ts`, que virou renderizador.
      Comandos: `npm run world:distribute -- --report|--write|--check`.
- [ ] **7.2 — Mapas 41–60** — 🧊 CONGELADA em 2026-09-07: mantenedor mandou
      manter 40 mapas por enquanto e seguir para a Etapa C
- [ ] **7.3 — Mapas 61–80** — 🧊 congelada (idem)
- [ ] **7.4 — Mapas 81–100** (fecha o mundo) — 🧊 congelada (idem)

Invariantes de todo lote: **mapa 1 intocado** (contrato 6.2-C); bandas de nível
crescentes e sem buraco; toda espécie em **exatamente um** mapa; linhas
evolutivas na mesma região; pesos somando 100 por mapa; portais formando cadeia
navegável a pé. **Novo no 7.1**: `world:distribute:check` no workflow
`World activation` — se o artefato gerado não bate com o layout, a ativação
falha antes de escrever no banco.

#### 🅲 ETAPA C — Povoar o mundo (sistemas que os 100 mapas exigem)

Cada item aqui é pré-requisito de "mundo vivo" e pode andar em paralelo à
Etapa B assim que o primeiro lote de mapas existir.

- [x] **8.1 — Lojas por região + pedras absurdas + drops + venda** ✅ 2026-09-07:
      11 lojas (3 originais + 8 das cidades, consumíveis por tier, Masterball
      só do mapa 30 em diante); as 21 pedras em TODAS as lojas a 100k–200k
      (sync idempotente de preço no seed, sem migration); drop de 0,2% de
      selvagens nv 40+ (`src/lib/engine/drops.ts`); venda de consumíveis
      (pedras sem recompra). O "exploit de quantity" citado no roadmap
      antigo já estava corrigido desde a Fase 1 (schema 1–99).
- [x] **8.2 — Ginásios das cidades** ✅ 2026-09-07: 8 líderes novos
      (Coralina→Magnus, mapas 5→40, times da tabela da própria cidade no topo
      da banda), escada de pré-requisito 0→10, recompensas 1.500→30.000 —
      total **11 ginásios**. Elite 4 continua futura.
- [x] **8.3 — Arenas de bosses lendários** ✅ 2026-09-07 (ESPEC DO MANTENEDOR):
      NPC "Arena Boss" 👹 nos mapas **20 e 40**, lendário semanal por arena
      (offset 23, sem repetição na semana), **nv 80–100**; **2 tentativas/dia/
      arena** (lock `FOR UPDATE`); vitória trava a semana; prêmio = XP + Pk$
      (15.000+100×nv) + **1 pedra à escolha** + **1/1200 o lendário nv 5**.
      Migration **0010** (`boss_fights` + `kind='boss'`) + companheiro idempotente
      validado 2×. Captura/fuga bloqueadas. Docs: `docs/FASE-8-ARENA-BOSS.md`.
- [x] **8.4 — Status de batalha** ✅ 2026-09-08 (sandbox + produção —
      pendência #18 ✅ 2026-09-08): PSN/TOX/BRN/PAR/SLP/FRZ com regras da Gen III em PvE + PvP,
      persistentes em `user_pokemon.status` (**migration 0011** + companheiro
      `docs/supabase-production-0011-runtime.sql`), 9 golpes de Status + 27
      efeitos secundários em 107 learnsets, 7 itens de cura na loja (Antídoto
      de volta, com coluna própria), `use_item` dentro da batalha, etiqueta de
      status e barra de itens nas 4 telas de luta. Docs: `docs/FASE-8-STATUS.md`.
- [x] **8.5 — Arena PvP ranqueada** ✅ 2026-09-08 (era a 6.6): ELO K32/K24
      (piso 100, só em `ranked`), fila `join_ranked` com janela de ELO e hash de
      IP, ranking global top 50 (`GET /api/pvp?ranking=1`), temporada semanal
      com recompensas (tabela `pvp_seasons`, migration **0012** + companheiro),
      antifarm (3×/dia por par, mínimo 10 partidas, forfeit cedo ½ K).
      Docs: `docs/FASE-8-ARENA-PVP.md`.
- [ ] **8.6 — NPCs de missão**: tipo de NPC novo (hoje só `shop`/`gym`),
      máquina de estado de missão por jogador (**tabela nova**), diálogo com
      ramificação, recompensa e travas de progresso. É o maior item da etapa.
- [ ] **8.7 — Treinadores de rota** (NPCs de batalha não-ginásio), reusando o
      motor de ginásio.
- [x] **8.8 — Chat dentro do jogo** ✅ 2026-09-07: agora existe **no mundo** — widget 💬 no HUD, 3 canais GLOBAL (servidor todo), LOCAL (mesmo mapa, `map_id`), PRIVADO (whisper, `recipient_id`, só remetente/destinatário, `/w <nome> <msg>`), recolhível com badge de não-lidas, estética Press Start 2P/CRT, polling 4s com `afterId`, reusa tabela + moderação + rate limit. Migration 0009 + `docs/supabase-production-0009-runtime.sql`
- [x] **8.9 — Presença multiplayer + interação no mapa** ✅ 2026-09-09 (pedido
      do mantenedor, **em paralelo ao fix #19**): VER os outros jogadores no
      mapa e INTERAGIR quando em cima de outro player — desktop: clicar no
      player; mobile: botão 👤 ao lado das setas. Opções: ➕ adicionar amigo,
      💬 mandar PM (reusa o whisper da 8.8), ⚔️ desafiar/duelo (reusa o PvP) e,
      futuramente, trocar itens/Pokémon (**fora desta rodada**). Presença por
      **polling de 2,5 s** (`PRESENCE_POLL_MS`, sem WebSocket), posição via
      `users.currentMapId/playerX/playerY` + heartbeat
      (`PRESENCE_ONLINE_MS = 30 s`); **tabela nova `friendships`** (par
      canônico `least/greatest`, unique index, check distinto) +
      `users.last_seen_at` → migration **0013** +
      `docs/supabase-production-0013-runtime.sql`.

#### 🅳 ETAPA D — Antes de divulgar (bloqueia monetização)

- [ ] **9.1 — Rebranding completo**: identificadores internos
      (`computeDelugeStats`, `DelugeRPGPage`, `DelugeVariant`, `DELUGE_VARIANTS`),
      `package.json` (`name: "deluge-rpg"`), README/docs.
- [ ] **9.2 — Decisão legal sobre nomes/sprites** (Nintendo/Game Freak via CDN
      de terceiros). Casa com a 6.4-F: arte própria resolve as duas de uma vez.
- [ ] **9.3 — Remetente próprio**: domínio + SPF/DKIM para o `SMTP_FROM` sair
      do Gmail.
- [ ] **9.4 — Premium (era 6.8)**: **BLOQUEADO** até 9.1–9.3, mais termos,
      privacidade, pagamento e antifraude.

---

## 3. Qual foi a última etapa aplicada

### ✅ FASE 8.9 — Presença multiplayer + interação no mapa (ver players, menu ➕ amigo / 💬 PM / ⚔️ desafio) (2026-09-09, Etapa C)

**Pedido do mantenedor (2026-09-09):** em paralelo ao fix #19, implementar a
8.9 com escopo fechado: **VER** os outros jogadores no mapa e **INTERAGIR**
quando em cima de outro player — desktop: clicar no player; mobile: botão 👤 ao
lado das setas. Opções: ➕ adicionar amigo, 💬 mandar PM (reusa o whisper da
8.8), ⚔️ desafiar/duelo (reusa o PvP). **Troca de itens/Pokémon fica fora
desta rodada.** Presença por **polling 2–3 s** (sem WebSocket).

**Banco (migration 0013 + companheiro):** `users.last_seen_at`
(`timestamp with time zone DEFAULT to_timestamp(0)`) + tabela nova
**`friendships`** — `user_a_id`/`user_b_id` FK users (par canônico
menor-primeiro, quem pediu não importa), `unique (user_a_id, user_b_id)`,
`check (user_a_id <> user_b_id)`, índices por lado, `created_at`. Companheiro
`docs/supabase-production-0013-runtime.sql` idempotente (RLS + policy
runtime/backup + grants + journal), **validado 2× num prodsim** — conferência
`rls_on true · runtime_privs 4 · runtime_policy 1 · backup_policy 1 ·
indexes 3 · checks 1 · last_seen_col 1 · migrations 14`.

**Presença (`src/lib/presence.ts`):** `heartbeat(userId, mapId, x, y)` grava a
posição + `last_seen_at = now()`; `nearbyPlayers(userId, mapId)` devolve os
online nos últimos `PRESENCE_ONLINE_MS = 30_000` do mesmo mapa (menos o
próprio), com username + posição + amizade; `listFriends`/`addFriend`/
`removeFriend` (add/remove idempotentes pelo par canônico). Rota
`POST /api/presence` (auth + rate limit 60/min) devolve `{players}`.

**Amizade (`src/app/api/friends/route.ts`):** `GET` lista amigos;
`POST {action:"add"|"remove", username}` devolve `{added|removed, isFriend}`;
alvo inexistente → 404; a si mesmo → 400.

**UI:** `src/components/MapPlayers.tsx` (crachás dos players na posição em % da
grade; clique → menu), `src/components/PlayerMenu.tsx` (menu fixo ➕ amigo /
💬 PM / ⚔️ desafiar), `ChatWidget.tsx` aceita `whisperTarget` externo (abre o
whisper já no alvo), `src/app/page.tsx` faz polling `PRESENCE_POLL_MS = 2500`,
renderiza os crachás + botão 👤 mobile (pisa na mesma célula de outro player)
e o `handleDuel` (cria sala PvP amistosa e sussurra o código ao alvo).
Avatares extraídos para `src/lib/avatars.ts` (fonte única dos 4 emojis).

**Testes:** `tests/integration/presence.integration.test.ts` (7: heartbeat
devolve players do mesmo mapa, isolamento por mapa, expiração por
`last_seen_at`, add/remove amigo idempotente, listFriends, 404 alvo
inexistente, 400 self). Suíte completa: **374 unit + 151 integração**
(28 unit files + 15 integração files), `npm run check` verde (lint + tsc +
unit + build com `/api/presence` e `/api/friends`).

**Pós-merge (ordem):** ① colar o companheiro **0013** no Supabase SQL Editor
(production) **antes** do merge → ② merge → ③ deploy Vercel `Ready` → ④ validar
a pendência **#20** (2 contas no mesmo mapa se veem; clique/👤 → menu ➕/💬/⚔️).
Validação em §4.39.

### ✅ FASE 8.5 — Arena PvP ranqueada: ELO, fila de pareamento, ranking top 50 e temporada semanal com recompensas (2026-09-08, Etapa C)

**Pedido do mantenedor:** a 8.5 — Arena PvP ranqueada — com o spec combinado:
ELO (K 32/24, piso 100, só em `mode = "ranked"`), pareamento por fila (`join_ranked`),
ranking global (top 50 + posição), temporada semanal com recompensas (tabela nova
`pvp_seasons` + migration 0012 + companheiro) e antifarm (3×/dia por par, mínimo
10 partidas, forfeit cedo ½ K, mesmo IP não pareia).

**ELO (`src/lib/elo.ts`, puro):** `kFactor` (32, 24 acima de 2000), `applyElo`
com piso 100, `halfKForWinner` para o vencedor de forfeit antes do turno 3,
`eloMatchWindow` (150 → +50 a cada 30 s) e `hashIp` (FNV-1a, base 36). O ELO é
atualizado **só** em `pvp_battles.mode = "ranked"`, dentro da transação do
`FINISHED` (`awardResult`), com o antifarm `rankedMatchesBetweenToday` (cap 3).

**Fila (`joinRanked`):** procura sala `WAITING` ranked com `|elo − meu|` dentro
da janela por idade do anfitrião e `hash_ip` diferente; senão cria
(`createRankedRoom`). `listWaitingRooms` devolve só amistosas; `join_room` em
sala ranked → 400. `closeSeasonIfNeeded` roda antes do pareamento.

**Ranking (`getRanking`):** top 50 por ELO (≥ 10 partidas) + posição do jogador
(`you.position` null antes das 10), via raw SQL com `rankedMatchCount` correlato.

**Temporada (`src/lib/pvp-season.ts`):** mesma semana ISO do boss (`weekIdOf`);
fechamento preguiçoso com advisory lock (`pg_advisory_xact_lock`), fotografia o
top 10 em `pvp_seasons` e paga na hora (1º 50.000+5+5, 2º 30.000+3+3, 3º
20.000+2+2, 4º–10º 10.000+1+1); idempotente (não paga duas vezes).

**Banco:** migration **0012** (`pvp_seasons` com unique week/user, índice
week/rank, checks rank ≥ 1 / elo_final ≥ 0; `users.elo` já existia — sem
migration) + companheiro `docs/supabase-production-0012-runtime.sql` idempotente
(RLS + policy runtime/backup + grants + journal), **validado 2× num banco
prodsim** (0000–0011 + papéis + RLS): conferência idêntica `rls_on 1 ·
runtime_privs 4 · runtime_policy 1 · backup_policy 1 · indexes 2 · checks 2 ·
migrations 13`; checks e policies provados.

**UI:** `PvpLobby.tsx` reescrito com abas **SALAS / RANQUEADA / RANKING**;
`PvpArena.tsx` mostra o modo ranqueado e a espera de fila ("procurando rival de
ELO próximo").

**Testes:** `elo.test.ts` (11) + `pvp-season.test.ts` (5) + integração
`pvp-ranked.integration.test.ts` (8: pareamento, ELO distante, mesmo IP,
join_room em ranked, forfeit cedo ½ K, antifarm 3×, ranking + posição null,
fechamento da temporada + idempotência). Suíte completa: **374 unit + 141
integração**, `npm run check` verde (lint + typecheck + unit + build, 17 rotas).

**Pós-merge (ordem):** ① colar o companheiro **0012** no Supabase SQL Editor
(production) **antes** do merge → ② merge → ③ deploy Vercel `Ready` → ④ validar
a pendência **#19** (fila/ranking/ELO/forfeit ½ K).

**Próxima:** 8.6 — NPCs de missão (ver §5). Aguardando.

### ✅ FASE 8.4 — Status de batalha: veneno/queimadura/paralisia/sono/gelo com regras da Gen III, 7 itens de cura e item em batalha (2026-09-08, Etapa C, entrega C)

**Pedido do mantenedor (2026-09-08):** dar como validadas as pendências A/B/C,
adiar o backup, atualizar este arquivo, e implementar a 8.4 **pesquisando os
jogos** (GBA em especial) para basear efeitos, balanceamento e itens de cura.

**Pesquisa → decisões** (tabela completa em `docs/FASE-8-STATUS.md` §1): Gen III
como base — veneno 1/8, veneno grave 1/16·n (teto 15/16, contador zera ao
trocar), queimadura 1/8 + físico ×0,5, paralisia Speed ×0,25 + 25% de não agir,
congelamento 20%/turno para descongelar + golpe de Fogo descongela, dano
residual **depois** de os dois agirem (mais rápido primeiro), um status por vez,
persiste após a batalha até Centro/item, desmaiar limpa, bônus de captura
×2 (sono/gelo) e ×1,5 (demais). Duas concessões modernas, registradas: sono
1–3 turnos (Gen V+, porque as batalhas aqui duram 2–7 turnos) e Elétrico imune
a paralisia (Gen VI+, intuitivo). Preços dos itens 1:1 com a Gen III (a Poção
do jogo já custa os 300 do GBA).

**Motor:** `engine/status.ts` (puro, rng injetável) + `engine/turn.ts`
(`performStrike`/`endOfTurn`/`chooseOpponentMove` — **um** motor para PvE e
PvP, para as regras não divergirem). `battle-service.attack` reescrito em
`runRound` (velocidade efetiva, desmaio entre ações e por residual passando
pelo mesmo `resolveFaint` → XP/ginásio/boss/drop continuam corretos);
`attemptCatch` com bônus de status e contra-ataque pelo mesmo motor;
`persistTurn`/`pvp persistHp` gravam o status (desmaio limpa; só o sono guarda
turnos); Centro Pokémon e `gm_heal` limpam. IA do oponente: golpe de Status
**útil** em 40% das vezes.

**Catálogo:** `PokemonMove.effect {status, chance, typeChart?}`; 9 golpes novos
(Onda Trovão, Pó Paralisante, Fogo-Fátuo, Tóxico, Pó Venenoso, Pó do Sono,
Esporo, Hipnose, Canção) e 27 efeitos secundários (Trovoada 30% PAR, Brasa
10% BRN, Raio de Gelo 10% FRZ, Bomba de Lodo 30% PSN…); 107 learnsets
alterados nos níveis da Gen III (Pikachu 10, Bulbasaur 13/15, Paras 7/27,
Gastly 1, Vulpix 17, Koffing 30…). Guardas de learnset intactas (poder 0).

**Banco:** migration **0011** (`user_pokemon.status/status_turns` + check;
7 colunas de cura em `users` + `users_inventory_nonnegative` com 36 colunas).
Companheiro `docs/supabase-production-0011-runtime.sql` idempotente,
**validado 2×** em clone `TEMPLATE` revertido ao estado 0010 (conferência
`2·7·1·1·8·12` nas duas) e as duas checks provadas.

**Itens/loja/rotas:** `src/lib/status-items.ts` (Antídoto 100, Anti-Paralisia
200, Despertador 250, Anti-Queimadura 250, Descongelante 250, Cura Total 600,
Restaurador Total 3000 — lojas por progressão, `content/world/shops/*.json`
reexportados); `POST /api/battle use_item` (poções + curas, **consome o
turno**, 400 sem débito quando não teria efeito, débito atômico antes do
efeito); `manage use_item` com as curas; `INVENTORY_KEYS`/`gm_give_item`
aceitam as colunas novas.

**UI:** `components/battle/StatusTag.tsx` (etiqueta PAR/ENV/TÓX/QUE/SON/GEL ao
lado do LV. em `BattleArenaModal`/`GymModal`/`BossModal`/`PvpArena`/`PokemonBox`),
`components/battle/BattleItemBar.tsx` ("ITENS (usar gasta o turno)", só o que
o jogador tem, destaca o útil), golpes de Status com ✨/"STATUS", sfx do golpe
pelo catálogo, curas no Pokémon Box, select do GM.

**Testes:** +20 (`status.test.ts`) +15 (`turn.test.ts`) +5 integração
(`status.integration.test.ts`) → **358 unit + 133 integração**, `npm run
check` verde (lint + typecheck + unit + build).

**Pós-merge (ordem):** ① colar o companheiro **0011** no Supabase SQL Editor
(production) **antes** do merge → ② merge → ③ deploy Vercel `Ready` → ④ a loja
seeda os itens sozinha no 1º acesso → ⑤ validar a pendência #18.

**Próxima:** 8.5 — Arena PvP ranqueada (ver §5). Aguardando confirmação do
mantenedor.

**✅ Validação em produção (2026-09-08, pelo mantenedor):** SQL 0011 colado no
Supabase **antes** do merge → conferência OK (`status_columns 2 · cure_columns 7
· status_check 1 · inventory_check 1 · runtime_grants 8 · migrations 12`); PR
#17 mergeado em `main` (squash `3e223d2`, commits do PR `c9cfc52` + `533d6b9`);
Vercel `Ready`; pendência **#18 validada** (loja 1 com Antídoto/Anti-Paralisia,
Pikachu nv 12 + Onda Trovão → "está paralisado!" + etiqueta PAR, barra ITENS
curando e gastando o turno, Pokémon Box com a etiqueta, Centro Pokémon limpa,
PvP com Pó do Sono). **8.4 fechada em produção.** Backup de produção ("Verify
restoration") continua **adiado** por decisão do mantenedor.

### ✅ FASE 8.3 — Arena Boss: lendário semanal nv 80–100 nos mapas 20 e 40, 2 tentativas/dia, pedra à escolha + 1/1200 (2026-09-07, Etapa C, entrega B)

Motor `startBossBattle` (tentativa registrada no início, `FOR UPDATE`),
vitória `WON` (XP + Pk$ + `bossStoneChoice` + rolagem do lendário nv 5),
derrota `LOST` com retry, captura/fuga bloqueadas. Rotas `/api/battle`
(`start_boss`) e `/api/boss` (GET status + `claim_stone` 1×/semana/arena).
`BossModal.tsx` (intro/luta/resultado + `StonePicker` das 21 pedras), NPC tipo
`"boss"` 👹 nos mapas 20/40, migration **0010** + companheiro
`docs/supabase-production-0010-runtime.sql` **validado idempotente 2×** em clone
`TEMPLATE` (conferência `1·1·3·true·1·11` nas duas). Testes: 7 rotação + 8
integração (vitória simulada via `boss_fights → WON`); suíte **323 unit + 128
integração** verde. Entrega A+B no mesmo PR #15. Detalhe:
`docs/FASE-8-ARENA-BOSS.md`.

**Pós-merge (ordem):** ① merge do PR → ② rodar o companheiro **0010** no
Supabase SQL Editor (production) → ③ aguardar deploy Vercel (`Ready`) → ④
Actions → `World activation` em `main` (`production`/`apply=true`, digitar
`APLICAR-production`) — leva os NPCs boss ao jsonb dos mapas 20/40 → ⑤
navegador: teleportar (GM) aos mapas 20/40 → NPC 👹 → status do lendário semanal
→ iniciar (2 tentativas) → vitrine/batalha sem regressão.

> Etapas 7.2–7.4 (mundo até 100 mapas) estão 🧊 congeladas por decisão do
> mantenedor de 2026-09-07 — manter 40 mapas por enquanto.

### ✅ FASE 8.1+8.2 — Cidades a cada 5 mapas: 8 lojas + 8 ginásios + cura, pedras 100k–200k, drop nv 40+ e venda de itens (2026-09-07, Etapa C, entrega A)

**Pedido do mantenedor:** travar o mundo em 40 mapas, dar as pendências
(#16, #17, ativação 7.1) como concluídas e seguir para a Etapa C com regras
próprias. Esta é a **entrega A** (cidades); a Arena Boss (8.3) é a entrega B.

**Entregue**

- **8 cidades** (mapas 5, 10, 15, 20, 25, 30, 35, 40 — `CITY_NPCS` em
  `default-world.ts`): cada uma com NPC de **loja** (🏪), **ginásio** (🏟️) e
  **curandeira** (✚, tipo `healer` que a UI já tratava) sobre a trilha de
  pedra central, + tile Centro Pokémon garantido (5 cidades ganharam
  `center` no layout; 20/35/40 já tinham). Mapas 1–3 intactos; mapa 1 byte
  a byte igual.
- **Lojas 4–11** (`seed-shop.ts` reescrito): consumíveis por tier (Masterball
  só nas lojas 9–11, Hiper Poção da 7 em diante) e as **21 pedras em todas
  as 11 lojas** a 100k–200k. Seed reestruturado para 1 SELECT (era 1 por
  item/loja) + **sync idempotente de preço** — produção recebe os preços
  novos no primeiro request de loja, sem migration. `content/world/shops/`
  agora tem 11 JSONs (274 itens).
- **8 ginásios** (`gym-teams.ts` + `seed-gym.ts` virado insert-if-absent por
  nome): Coralina 24/27 → Magnus 95/97/100, times da tabela da própria
  cidade, escada `requiredBadges` 0→10, recompensas 1.500→30.000. Total 11.
- **Drop de pedra** (`src/lib/engine/drops.ts`, 0,2% de selvagem nv 40+,
  uniforme nas 21) hookado na vitória selvagem em `battle-service.ts`
  (log `✨` + `rewards.stone`).
- **Venda de itens**: `sell` no schema + rota (atômico, valida posse);
  pedras sem recompra (decisão econômica). `ShopModal` ganhou aba
  COMPRAR/VENDER.
- **Artefato `world-encounters.ts` regenerado**: os 22 ases novos mudaram a
  entrada do gerador → `--write` + re-export (37 mapas com tabelas
  remexidas, mapa 1 intacto). 21/22 espécies de ginásio ficaram nas
  próprias cidades; Nidoking 35→38 foi trocado por Mismagius 429 (da tabela
  nova do 35) e o gerador convergiu (22/22, `--check` verde).

**Sem migration e sem SQL companheiro**: só conteúdo (jsonb de mapas +
linhas de loja/ginásio via seed). Produção precisa do workflow **World
activation** (NPCs/centros/tabelas) após o merge.

### ✅ FASE 7.1 — Mundo até 40 mapas: mapas 21–40 + redistribuição das 649 espécies (2026-09-07, Etapa B)

**Pedido do mantenedor (roadmap de 2026-09-06):** terminar a Pokédex (fechada
em 649 na 6.4-E/F) e construir o mundo até 100 mapas em lotes de 20. Esta é a
**primeira metade do lote 7.1**: 20 mapas novos (21–40) **e** redistribuição de
todas as 649 espécies pelos 40 mapas — os 20 mapas antigos foram reequilibrados
porque o elenco deixou de ser curadoria manual.

**Entregue**

- `src/lib/world-layout.ts` (novo) — os 40 mapas como dados puros: identidade,
  bioma, chão/retângulos da grade, Centro Pokémon, `legendaryHaven`, bandas de
  nível (`WORLD_BANDS`), `WORLD_LEGENDARIES` (47 lendários/míticos até Unova),
  `MAP1_PINNED`, `GYM_ACE_MIN_MAP`, `bandFor`/`descriptionFor`.
- `src/lib/world-distribute.ts` (novo) — o algoritmo: score de progressão →
  **alvo por rank** → cotas → varredura mapa-a-mapa com afinidade de bioma e
  teto de desvio → passe de troca → pesos em agenda geométrica → faixas de
  nível com **piso de evolução**. Determinístico (~0,9 s) e autoauditorável
  (`validateDistribution`).
- `src/lib/world-encounters.ts` (novo, **gerado**) — `[id, peso, nv mín, nv máx,
  água]` das 644 espécies (as 5 do mapa 1 ficam pinadas em `default-world.ts`).
- `scripts/world-distribute.mts` + `npm run world:distribute[:check]` — CLI com
  `--report`, `--write`, `--check`.
- `src/lib/default-world.ts` — reescrito como **renderizador**: 40 mapas a
  partir do layout + artefato; grades dos mapas 1–3 verbatim; cadeia de portais
  1→…→40 gerada em laço.
- **Bandas reescaladas** (só o mapa 1 é travado): `lo = 6 + round((n−2)·80/38)`,
  `hi = min(100, lo+14)` ⇒ M2 6–20 … M40 86–100. A escada antiga (+4/mapa em
  20 mapas) não cabia em 40 mapas sem estourar o nível 100 do `levelSchema`.
- `content/world/maps/` versiona **40** mapas; `content/world/shops/` **intacta**
  (nenhum item novo, portanto nenhuma loja nova — NPC de loja em mapa novo
  violaria o contrato do export).
- `.github/workflows/world-activation.yml` (+ espelho `docs/`): "20 mapas" →
  **40**, gate da API pública `maps.length == 40`, e um step novo de
  `world:distribute:check`.

**Números observados**: 644 distribuídas + 5 pinadas = **649 em exatamente um
mapa**; cotas **16–17** por mapa; pesos somando **100** nos 40 mapas; coerência
de bioma **80%** (tipo primário) / **89%** (qualquer tipo) — acima dos **72%**
da curadoria à mão da 6.4-A; lendários com peso **máx 4** e mapa **mín 10**;
0 espécie não colocada; drift médio de **1,26** mapa em relação ao alvo.

**Decisões de conteúdo registradas** (ver `docs/FASE-7-MUNDO.md`): nenhum NPC de
loja nos mapas novos; ginásios continuam só em 1–3 (Etapa C adiciona os
outros); Centro Pokémon é **tile** `center`, não entidade nova; proxy
troca/felicidade → nível médio da linha para o piso de evolução; mapa 40 é o fim
da linha (só portal sul).

**Sem migration e sem SQL companheiro**: nenhum dado novo de banco — só conteúdo
de `game_maps` (jsonb) já existente.

### ✅ FASE 8.8 — Chat no jogo: global/local/whisper (decisão B — Pokédex completa em 649) (2026-09-07)

**Pedido do mantenedor:** decisão **B — parar em 649 e chamar de "Pokédex completa" do jogo** + implementar chat no jogo com 3 modos: local (mesmo mapa), global (servidor todo) e privado (whisper).

**O que entrou**

| Item | Detalhe |
|---|---|
| `src/db/schema.ts` + `drizzle/0009_chat_local_whisper.sql` | `chat_messages` ganhou `map_id integer` (local) e `recipient_id integer FK users.id` (whisper), 3 índices novos (`map_id`, `recipient_id`, `channel+map_id`), check `channel IN ('global','local','whisper','arena-global')` (mantém legacy arena-global) |
| `docs/supabase-production-0009-runtime.sql` (novo) | companheiro de produção: `ADD COLUMN IF NOT EXISTS` ×2, FK idempotente, índices `IF NOT EXISTS`, drop/create check, grants runtime/backup, registro no journal (hash `7e0f69…ca7dee`, when `1788782655373`), conferência `chat_columns 2 · channel_check 1 · indexes 3 · migrations 10`. **Testado 2× num banco prodsim (0000–0008 + papel runtime): idempotente** |
| `src/lib/validation.ts` | `chatChannelSchema` enum global/local/whisper, `chatQuerySchema` (channel, mapId, withUser, afterId, limit 50), `chatSendSchema` (channel, message 1–500, mapId, recipientUsername) |
| `src/app/api/chat/route.ts` (novo) | GET: global (channel=global), local (channel=local + map_id), whisper com `withUser` (conversa 1-1) ou sem (lista geral + conversations agrupadas por outro participante, com lookup de usernames em lote). Suporta `afterId` para polling incremental. POST: send com rate limit 30/min, valida mapId para local, lookup de recipient para whisper (não pode para si mesmo, 404 se não existe). Reusa `chat_messages` + moderação admin existente |
| `src/components/ChatWidget.tsx` (novo) | Widget no HUD: botão colapsado 💬 com badge total unread (global+local+whisper) no canto inferior direito; expandido 380px×420px, border 4px amber, bg slate-900, shadow, estética Press Start 2P/CRT. Tabs GLOBAL/LOCAL/PRIVADO com badges individuais, info de canal (🌍 todo servidor, 📍 mapa atual, 🔒 privado), lista de conversas recentes (whisper), mensagens com VT323, cores por canal (amber=me, purple=whisper, cyan=local), timestamp HH:MM, scroll auto, input com placeholder por canal, suporte a atalho `/w <nome> <msg>` que muda para whisper, recipient input (ou whisperWith), contador 0/500, polling 4s com afterId, unread por canal quando colapsado ou canal diferente |
| `src/app/page.tsx` | Import + `<ChatWidget currentMapId={...} currentMapName={...} userId={...} username={...} isLoggedIn={...} />` no final, só quando logado |
| `tests/integration/routes.ts` | Adiciona `/api/chat` GET/POST ao mapa de rotas |
| `tests/integration/chat.integration.test.ts` (novo) | 9 testes: global envia/lista + vazia 400, local envia/lista por mapa + sem mapId 400 + isolamento por mapa, whisper envia privado e só participantes veem + self 400 + 404 + lista conversas, polling afterId |

**Decisão de arte (6.4-F):** mantenedor escolheu **(B) parar em 649** — honesto com a arte (CDN animado até 649), foca na Etapa B (mundo 100 mapas). Pokédex completa = 649. Sem Kalos. Documentado em `docs/PROMPT-NOVA-CONVERSA.md`.

**Validação (sandbox, banco local 0000→0009):** `npm run check` verde (lint 0 · tsc 0 · 297 unit, build 15 rotas com `/api/chat`), `test:integration` **112 verdes** (103 + 9 chat), `world:export/import` idempotente, runtime SQL idempotente. Detalhes em §4.32.

---

### ✅ FASE 6.4-E — Catálogo Unova (494–649): Pokédex 493 → 649 (teto do CDN animado, sem migration) (2026-09-07)

**Pedido do mantenedor:** implementar Fase 6.4-E — Unova (494–649) per spec detalhada: criar `src/lib/pokedex-unova.ts` exportando `unovaRest(M)` modelado no `sinnohRest`, helper `sp()`, `spriteUrl` usando `black-white/animated` (cobre até 649), descrições PT, header documentando proxies, +156 espécies, sem linhas cruzadas, só formas base.

Como nas fases anteriores, **só catálogo**: espécies entram na Pokédex, vitrine, motor de evolução e GM, mas **não** entram nas tabelas de encontro dos 20 mapas (`content/world/maps/*` intocado; contrato mapa 1 preservado). A distribuição acontece na Etapa B.

**O que entrou**

| Item | Detalhe |
|---|---|
| `src/lib/pokedex-unova.ts` (novo) | `unovaRest(ALL_MOVES)` — **156 espécies novas** (494–649). Sprites Gen V animados, descrições PT, mesmo formato dos módulos anteriores. Header documenta proxies e itens |
| `src/lib/pokedex.ts` | `...unovaRest(ALL_MOVES)`; **Pokédex 493 → 649** (151+100+135+107+156) |
| `src/lib/pokedex-unova.test.ts` (novo) | 14 testes de contrato (156 ids, 649 na Pokédex final, tipos/stats/catchRate canônicos amostrados, sprites CDN, STAB forte, curva ≤50 lvl≤7, iniciais 17/36, pedras reutilizadas, troca→nível, felicidade→nível, lendários sem evolução, itens válidos) |
| testes atualizados | `pokedex-gen1.test.ts` (ESPERADAS 494–649, length 649), `pokedex-sinnoh.test.ts` (≥493), `world-expansion.test.ts` (comentário 254 de 649) |
| `/tmp/gen-unova.mts` (descartável) | gerador TS que lê `/tmp/pokeapi/data/v2/csv` (sparse clone), extrai tipos/status/capture_rate/evoluções, mapeia itens e gera learnsets a partir de `ALL_MOVES` (133) com receita STAB cedo (nível1 ≤35 fallback ≤50, nível7 ≤50, mid 14/22 e 32/42, strong 52/62/70/80, primary ≥70 nos últimos 4). Saída em `/tmp/unova_generated.ts` copiada para `src/lib/pokedex-unova.ts` |

**Fonte dos dados:** `PokeAPI/pokeapi` `data/v2/csv` (sparse clone, `raw.githubusercontent.com` bloqueado). Tipos, bases e `capture_rate` canônicos conferidos (header verificado, como lição da 6.4-C). Learnsets derivados dos 133 golpes existentes com a mesma receita 6.4-B/6.4-C/6.4-D.

**Evolução dirigida por dados — Unova reutiliza pedras (nenhuma migration)**

| Linha | Gatilho |
|---|---|
| Pansage 511 → Simisage 512 | Pedra de Folha (leafStone) |
| Pansear 513 → Simisear 514 | Pedra de Fogo (fireStone) |
| Panpour 515 → Simipour 516 | Pedra d'Água (waterStone) |
| Munna 517 → Musharna 518 | Pedra da Lua (moonStone) |
| Cottonee 546 → Whimsicott 547 | Pedra do Sol (sunStone) |
| Petilil 548 → Lilligant 549 | Pedra do Sol (sunStone) |
| Minccino 572 → Cinccino 573 | Pedra Brilhante (shinyStone) |
| Eelektrik 603 → Eelektross 604 | Pedra de Trovão (thunderStone) |
| Lampent 608 → Chandelure 609 | Pedra do Entardecer (duskStone) |

**Proxies declarados (mesma convenção das fases anteriores, no header do módulo):**
- troca → nível: Boldore 525→Gigalith 526 lv40, Gurdurr 533→Conkeldurr 534 lv40, Karrablast 588→Escavalier 589 lv36 (troca mútua com Shelmet no cânone), Shelmet 616→Accelgor 617 lv36;
- felicidade → nível: Woobat 527→Swoobat 528 lv25, Swadloon 541→Leavanny 542 lv32;
- formas: Darmanitan 555 só base (Zen via item 885 ignorado), Basculin 550 só base vermelha, Deerling 585/Sawsbuck 586 só Primavera, Tornadus 641/Thundurus 642/Landorus 645 só Incarnate, Kyurem 646 base, Keldeo 647 base, Meloetta 648 Aria, Genesect 649 base; Vanillite/Cubchoo por nível (Pedra de Gelo não existe em Gen V);
- sem evolução: Victini 494, Audino 531, Throh 538/Sawk 539, Basculin 550, Maractus 556, Sigilyph 561, Emolga 587, Alomomola 594, Cryogonal 615, Stunfisk 618, Druddigon 621, Bouffalant 626, Heatmor 631, Durant 632 e lendários/míticos 638–649.

**Validação (sandbox, banco local 0000→0008, sem migration nova):** `npm run check` verde (lint 0 · tsc 0 · **297 unit**), `npm run test:integration` **103 verdes**, `npm run build` verde, e smoke via `npx tsx` com `evolutionAtLevel`/`evolutionWithItem` (Snivy lv17→Servine, lv36→Serperior; Pansage+leafStone→Simisage; Boldore lv40→Gigalith; Woobat lv25→Swoobat). Detalhes em §4.31.

**Sem pendência de banco:** Unova não precisa de migration — todas as pedras já existem (`evolution-items.ts` 21 itens, ids 1..21). Por isso o merge pode ir **sem passo de SQL em produção**, só vitrine + GM.

---

### ✅ FASE 6.4-D — Catálogo Sinnoh (387–493): Pokédex 387 → 493 + 7 itens de evolução + migration 0008 (2026-09-06)

**Pedido do mantenedor:** *"Prossiga para a próxima etapa (6.4-D – Sinnoh).
Adicione os itens de evolução ao jogo e disponibilize-os na loja para compra.
Crie a migration 0008 com as tabelas."* — ou seja, Sinnoh **inteiro** e os
itens novos como **inventário real** (coluna em `users`, comprável), não como
proxy de pedra.

Como na 6.4-C, a fase é **só catálogo + itens**: as espécies entram na Pokédex,
na vitrine de sprites, no motor de evolução e nas Ferramentas GM, mas **não**
entram nas tabelas de encontro dos 20 mapas (`content/world/maps/*` intocado;
contrato do mapa 1 preservado). A distribuição acontece na Etapa B.

**O que entrou**

| Item | Detalhe |
|---|---|
| `src/lib/pokedex-sinnoh.ts` (novo) | `sinnohRest(ALL_MOVES)` — **106 espécies novas** (387–493 exceto 448 Lucario, que já existia). Sprites Gen V animados, descrições em PT, mesmo formato dos arquivos Johto/Hoenn. Cabeçalho documenta cada proxy adotado |
| `src/lib/pokedex.ts` | `...sinnohRest(ALL_MOVES)`; **Pokédex 387 → 493** (151+100+135+107); Eevee ganhou Leafeon (Pedra de Folha) e Glaceon (Pedra do Amanhecer — proxy da Pedra de Gelo) |
| `src/lib/pokedex-gen1.ts` / `-johto.ts` / `-hoenn.ts` | **20 linhas cruzadas** para evoluções de Sinnoh de espécies antigas, cada uma marcada `// 6.4-D:` (ver tabela abaixo) |
| `src/lib/evolution-items.ts` | 14 → **21 itens**: ids 15–21 `protector` 🪖 Protetor, `electirizer` 🔋 Eletrizador, `magmarizer` 🌋 Magmatizador, `razorClaw` 🪝 Garra Afiada, `razorFang` 🦷 Presa Afiada, `dubiousDisc` 💽 Disco Dúbio, `reaperCloth` 🕯️ Manto do Ceifador |
| `src/db/schema.ts` + **`drizzle/0008_sinnoh_evolution_items.sql`** | 7 colunas `integer NOT NULL DEFAULT 0` em `users` (`protector, electirizer, magmarizer, razor_claw, razor_fang, dubious_disc, reaper_cloth`) + check `users_inventory_nonnegative` recriada com as 29 colunas de inventário |
| **`docs/supabase-production-0008-runtime.sql`** (novo) | companheiro de produção: `ADD COLUMN IF NOT EXISTS` ×7, pré-condição (falha alto se faltar a 0007), check, grants ao `catchbound_runtime`/`catchbound_backup`, registro no journal do Drizzle (hash sha256 real + `when`), bloco de conferência. **Testado 2× num banco que simula produção (0000–0007 + papel runtime): idempotente** |
| `src/lib/seed-shop.ts` + `content/world/shops/3.json` | loja 3 (Pico Celeste) vende os 7 itens: 4500 Pk$ (Protetor/Eletrizador/Magmatizador/Garra/Presa, estoque 4) e 5500 Pk$ (Disco Dúbio/Manto, estoque 3). O JSON foi regenerado por `world:export` (ordem por `itemKey`) |
| `src/app/page.tsx`, `src/components/PokemonBox.tsx`, `src/app/admin/page.tsx` | inventário tipado como `Record<EvolutionItemKey, number>` (o Box já iterava `EVOLUTION_ITEM_VALUES`, então os 7 botões novos aparecem sozinhos); `GM_ITEM_LABEL` do painel agora deriva dos 21 itens (antes só listava os 14) |
| `src/lib/pokedex-sinnoh.test.ts` (novo) | 18 testes de contrato (faixa, tipos/stats canônicos amostrados, curva ≤50 em níveis ≤7, linhas evolutivas, 1 espécie por item novo, lendários sem evolução) |
| testes atualizados | `pokedex-gen1.test.ts` (493, Eevee 7 pedras), `pokedex-hoenn.test.ts` (≥387), `engine/evolution.test.ts` (itemId ≤21), `world-expansion.test.ts` (254 de 493), `tests/integration/evolution.integration.test.ts` (+3: loja 3 lista e vende os 7 itens, Rhydon+Protetor→Rhyperior pela rota real, item na espécie errada → 400 sem consumir) |

**Fonte dos dados:** `PokeAPI/pokeapi` `data/v2/csv` (sparse clone, como na
6.4-C). Tipos, status-base e `capture_rate` canônicos — conferidos
explicitamente desta vez (a 6.4-C teve um susto com coluna errada). Learnsets
derivados dos 133 golpes existentes com a receita 6.4-B/6.4-C (STAB cedo,
nada acima de poder 50 nos níveis ≤7, golpe forte do tipo primário nos 4
últimos slots).

**Evolução dirigida por dados — os 7 itens novos (1 linha cada, testado)**

| Item | Linha |
|---|---|
| Protetor | Rhydon 112 → Rhyperior 464 |
| Eletrizador | Electabuzz 125 → Electivire 466 |
| Magmatizador | Magmar 126 → Magmortar 467 |
| Garra Afiada | Sneasel 215 → Weavile 461 |
| Presa Afiada | Gligar 207 → Gliscor 472 |
| Disco Dúbio | Porygon2 233 → Porygon-Z 474 |
| Manto do Ceifador | Dusclops 356 → Dusknoir 477 |

**Proxies declarados (mesma convenção das fases anteriores):**
- pedras existentes: Roselia→Roserade e Togetic→Togekiss (Pedra Brilhante),
  Murkrow→Honchkrow e Misdreavus→Mismagius (Pedra do Entardecer), Magneton→
  Magnezone e Nosepass→Probopass (Pedra de Trovão — campo magnético), Kirlia→
  Gallade e Snorunt→Froslass (Pedra do Amanhecer, mantendo Gardevoir lv30 /
  Glalie lv42), Eevee→Glaceon (Pedra do Amanhecer, no lugar da Pedra de Gelo);
- golpe conhecido → nível: Aipom→Ambipom 32, Lickitung→Lickilicky 33, Tangela→
  Tangrowth 33, Yanma→Yanmega 33, Piloswine→Mamoswine 45, Bonsly→Sudowoodo 17,
  Mime Jr.→Mr. Mime 18;
- felicidade/especial → nível: Budew 16, Buneary 22, Chingling 18, Munchlax 30,
  Riolu→Lucario 20, Happiny→Chansey 20, Mantyke→Mantine 30;
- Burmy→Wormadam lv20 (Mothim fica standalone — não há gênero); Rotom só na
  forma base; lendários 480–493 sem evolução.

**Validação (sandbox, banco local 0000→0008):** `npm run check` verde
(lint 0 · tsc 0 · **284 unit**), `npm run test:integration` **103 verdes**
(inclui os 3 novos), `npm run build` verde, e o fluxo completo pela API real
com o `next dev` (cadastro → GM dá Rhydon + Protetor → `use_item` →
`★ Rhydon evoluiu para Rhyperior!` → compra de Manto do Ceifador na loja 3).
Detalhes em §4.30.

**Pendência de produção (item #15 do cabeçalho):** colar
`docs/supabase-production-0008-runtime.sql` no SQL Editor **antes** do merge,
depois conferir loja 3 e a evolução por Protetor em `catchbound.vercel.app`.

---

### ✅ FASE 6.4-C — Catálogo Hoenn (252–386): Pokédex 254 → 387 (2026-09-06)

**Decisão do mantenedor nesta rodada:** *"vamos focar nos pokémons primeiro.
não precisa redistribuir eles nos mapas ainda, apenas adicione-os no jogo. pois
depois iremos construir mais mapas, aí sim adicionaremos os encounters
corretamente."* — e Hoenn **inteiro** de uma vez (não fatiado).

Portanto esta fase é **só catálogo**: as espécies entram na Pokédex, na vitrine
de sprites, no motor de evolução e nas Ferramentas GM, mas **não** entram nas
tabelas de encontro dos 20 mapas. Nenhum arquivo de `content/world/` foi tocado
e o contrato do mapa 1 (6.2-C) segue intacto.

**O que entrou**

| Item | Detalhe |
|---|---|
| `src/lib/pokedex-hoenn.ts` (novo) | `hoennRest(ALL_MOVES)` — **133 espécies novas** (252–386 exceto 282 Gardevoir e 384 Rayquaza, que já existiam). Mesmo formato do `pokedex-johto.ts` da 6.4-B |
| `src/lib/pokedex.ts` | `...hoennRest(ALL_MOVES)` no `POKEDEX_DATA`; **Pokédex 254 → 387** |
| `src/lib/pokedex-hoenn.test.ts` (novo) | 9 testes de contrato da fase |
| `src/lib/pokedex-gen1.test.ts` | lista esperada e contagem atualizadas (387) |
| `src/lib/world-expansion.test.ts` | o mundo cobre **254 das 387** espécies — o teste passou a travar isso explicitamente, com o porquê no comentário |

**Fonte dos dados:** `PokeAPI/pokeapi` `data/v2/csv` (clonado com
`--filter=blob:none --sparse` — `raw.githubusercontent.com` é bloqueado pelo
egress do sandbox, mas `github.com` passa). Tipos, status-base e catchRate são
os canônicos; learnsets são **derivados** do catálogo de 133 golpes já
existente (mesma receita da 6.4-B: STAB de cada tipo cedo, curva de poder
crescente, golpe forte do tipo primário nos 4 últimos slots, nada acima de
poder 50 nos níveis 1 e 7 — a regra da 6.2-C).

**Evolução dirigida por dados (sem motor novo)**

- 66 gatilhos `trigger:"level"` nos níveis canônicos (iniciais em 16/36,
  Bagon 30/50, Beldum 20/45, Ralts 20/30…);
- gatilhos `trigger:"item"` reaproveitando as **pedras que já existem na loja**
  desde a 6.4-B — nenhum item novo, nenhuma coluna nova, **nenhuma migration**:
  - Lombre → Ludicolo (Pedra d'Água), Nuzleaf → Shiftry (Pedra de Folha),
    Skitty → Delcatty (Pedra da Lua), Roselia (Pedra do Sol),
    Clamperl → Huntail (Escama de Dragão) / Gorebyss (Pedra d'Água);
  - **proxies declarados**: Feebas → Milotic usava *beleza* e virou Pedra
    Brilhante; linhas de *felicidade* viram Pedra da Lua — mesma convenção que
    a 6.4-B adotou para Togepi/Espeon/Umbreon, até a 6.5 trazer esses estados.
- **Shedinja (292)** existe como espécie **sem** gatilho: o cânone exige slot
  vazio no time + Pokébola sobrando, mecânica que o jogo não tem. Nincada
  evolui normalmente para Ninjask.

**O que NÃO mudou (de propósito):** `content/world/maps/*`, `default-world.ts`,
o motor (`engine/evolution.ts`), o schema, a loja e os itens. Esta fase é
aditiva no conteúdo e neutra na infraestrutura.

---

### (rodadas anteriores)

### 🚑 Incidente pós-merge — cadastro em produção respondia "Falha na autenticação" (2026-09-06)

**Sintoma (mantenedor, produção):** ao criar conta nova, em vez da tela
"CONFIRME SEU E-MAIL" aparecia `Falha na autenticação.`; nenhum e-mail chegou.

**Causa-raiz (reproduzida em sandbox com build de produção + papel
`catchbound_runtime` + RLS, §4.27):** a migration 0006 cria a tabela
`email_verification_codes`, mas em produção **todas as tabelas têm RLS ligado
e o papel de runtime só opera onde existe policy própria**
(`docs/supabase-production-runtime-role.sql` lista as 11 tabelas antigas —
a nova não está lá). O `INSERT` do código falhou com `42501 new row violates
row-level security policy` (ou `permission denied`, se os default privileges
não cobriram). Dois agravantes de código:
1. o `catch` da rota usava `GENERIC_AUTH_ERROR` como fallback de **erro
   inesperado** → incidente de infraestrutura apareceu como senha errada;
2. usuário + inicial eram gravados **antes** do código, fora de transação →
   conta "presa" (existe, não verificada, sem código, e o mesmo username /
   e-mail passam a ser recusados como duplicados).

**Correção (2 partes):**
- **Banco (mantenedor, SQL Editor):** `docs/supabase-production-0006-runtime.sql`
  — RLS + grants + policy `catchbound_runtime_all` (e `catchbound_backup_select`)
  na tabela nova, registro da 0006 no journal Drizzle; idempotente, com
  pré-condições e tabela final de conferência.
- **Código:** cadastro **atômico** (`db.transaction`: usuário + inicial +
  código; envio do e-mail fora da transação); fallback de erro inesperado
  passa a ser `GENERIC_SERVER_ERROR` ("Erro interno ao processar…") — `Falha
  na autenticação.` fica só para usuário/senha; **cadastro repetido de conta
  pendente** (mesmo usuário + e-mail + senha correta) não é mais "duplicado":
  só reenvia o código (respeitando o cooldown de 60 s) — resolve as contas
  presas de hoje sem SQL; `/api/health` ganhou `emailVerification: ok |
  unavailable` (sonda via `has_table_privilege` + `pg_policies`, sem vazar
  detalhes) para este tipo de falha ser visível de fora.
- Teste novo de integração (cadastro repetido de pendente: 429 no cooldown →
  200 com código novo → senha errada recusada → única conta/único inicial).

**Regra nova de protocolo:** toda migration que **cria tabela** precisa de um
SQL companheiro em `docs/` com RLS + grants + policies para
`catchbound_runtime`/`catchbound_backup` — e ele é pré-requisito do merge
junto com a própria migration. Validação em **§4.27**.

**Status desta rodada (2026-09-06, pós-merge do PR #9):** o PR #9
(`arena/01a077fb-pokeeeee`) foi **mergeado em `main`** no commit `6c18858` e
o CI do merge (run `34053895267`) ficou **verde**. O código do fix já está
deployável na Vercel; **ainda falta** o mantenedor colar
`docs/supabase-production-0006-runtime.sql` no SQL Editor de produção e
refazer o teste do cadastro/`/api/health`.

### ✅ Confirmação de e-mail no cadastro + rebrand final (título, description, cookies) (2026-09-06)

Pedido do mantenedor (4 itens): (a) título da aba só `Catchbound • MMORPG
Retro Pixel Online`; (b) remover "inspirado no Pokémon Deluge" da description
("deixaremos isso oculto"); (c) renomear `deluge_session`/`deluge_token`
("não temos players ainda"); (d) o jogador cadastra **seu próprio e-mail** e
confirma a conta com **código de 6 dígitos enviado a ele** — conta vinculada
ao e-mail real; o e-mail em si deve ser **estilizado, digno do jogo** (não
formal).

**Fluxo novo do cadastro:**
- `POST /api/auth {action:"register", username, email, password, starterId}`
  → cria usuário **não verificado** + inicial, envia código para o e-mail
  (SMTP configurado) ou devolve `devCode` no corpo (dev/teste sem SMTP;
  produção sem SMTP → 503). **Sem sessão/token** na resposta.
- `action:"verify_email" {email, code}` → confirma, apaga o código e **já
  faz o login** (cookie `catchbound_session` + Bearer em dev). Respostas
  genéricas (400/429) — não vazam existência de conta/código.
- `action:"resend_code" {email}` → reenvia (cooldown 60 s, 5 tentativas de
  verificação, expiração 10 min; código guardado só como SHA-256).
- Login de conta não confirmada → **403** com orientação (AuthModal abre a
  tela de verificação). Contas antigas (admin/testes) grandfatheradas na
  migration 0006 (`email_verified = true`).

**Mudanças:**
- `src/db/schema.ts`: `users.email` único, `users.emailVerified`, tabela
  `email_verification_codes` → **migration `drizzle/0006_melodic_maginty.sql`**
  (aplicada no banco local; **na produção precisa ser colada no SQL Editor do
  Supabase ANTES do merge**).
- `src/lib/mailer.ts` (novo): nodemailer/SMTP (`SMTP_HOST/PORT/SECURE/USER/
  PASS/FROM` + `APP_URL` no botão).
- `src/lib/email-verification.ts` (novo): ciclo do código + **e-mail HTML
  estilizado** (tema do jogo: fundo `#020617`, borda âmbar, monoespaçada,
  badge PKM, botão "▶ ENTRAR NA JORNADA") — preview em
  `docs/EMAIL-CONFIRMACAO-PREVIEW.html`.
- `src/app/api/auth/route.ts`: register/verify_email/resend_code + trava 403
  no login.
- `src/components/AuthModal.tsx`: campo E-MAIL no cadastro + passo
  "CONFIRME SEU E-MAIL" (código de 6 dígitos, REENVIAR com contagem 60 s,
  devCode visível em teste).
- `src/lib/session.ts` / `src/lib/api-client.ts`: `catchbound_session` /
  `catchbound_token` (4 refs em testes atualizadas).
- `src/app/layout.tsx`: título da aba e description sem menção ao Deluge.
- `tests/integration/helpers.ts` (novo): `registerVerified()` — fluxo
  completo via devCode; os 8 testes de integração que faziam register foram
  atualizados (registro agora exige e-mail + verificação).
- `.env.example`: bloco SMTP + `APP_URL`.

**⚠️ Pré-requisitos de PRODUÇÃO antes do merge (ordem obrigatória):**
1. Aplicar a **migration 0006** no banco de produção (SQL Editor do Supabase)
   — sem `email_verified`, todo `SELECT` de `users` quebra em produção.
2. Adicionar envs `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` (+ `APP_URL`) na
   Vercel — sem SMTP, o cadastro em produção responde 503.
Depois disso, o merge (GM + rebrand + e-mail + sync de docs) deploya sozinho.
Merge segue em **STANDBY** a pedido do mantenedor. Validação em **§4.26**.

### ✅ MUNDO ATIVADO EM PRODUÇÃO — 20 mapas + rebalance via GitHub Actions (2026-09-06)

O mundo da 6.4-A está **no banco de produção** desde 2026-09-06, aplicado
pelo workflow `World activation` (sem máquina local do mantenedor).
Sequência: 4 runs de falha/ajuste (`Invalid URL` no 1º — bug do
`$GITHUB_ENV`; TLS self-signed nos seguintes — fix `verify-full` + CA do
projeto, commit `dca8645`), no-op `apply=false` verde (38 s) e
**`APLICAR-production` verde** (run `34043394359`, 1 m 02 s). Conferência:
`SELECT count(*) FROM game_maps` = **20** em produção, `/api/maps` público
com 20, espelho git sem divergência. Detalhe e reprodução em
**`docs/RELATORIO-POS-ATIVACAO.md`** e validação em **§4.20–4.23**.
Sobram para o mantenedor: passada no navegador (evolução ao vivo, vitrine
156×6, caminhar do mapa 3 → 20) e, opcional, mapa 1 à mão no Editor.

### ✅ Rebrand leve — "DELUGE RPG" → "CATCHBOUND" na estética do jogo (2026-09-06)

Pedido do mantenedor: substituir o branding "DELUGE RPG" por **CATCHBOUND**
(título e demais lugares visíveis) + ajuste do texto da tela de escolha do
inicial. Merge em standby (vai junto com o resto).

**O que mudou (só strings visíveis, zero lógica):**

- Título da aba: `Pokémon Deluge RPG • …` → `Catchbound • MMORPG Retro Pixel Online & Editor de Mundos`
- Logo no HUD (`page.tsx`) e no cabeçalho do AuthModal: `DELUGE RPG` → `CATCHBOUND`
- Banner de boas-vindas: `Bem-vindo ao DelugeRPG!` → `Bem-vindo ao Catchbound!`
- Placeholder do chat: `Arena Deluge...` → `Arena Catchbound...`
- Modal de sprites: `PACOTE DE SPRITES & CLASSES DELUGERPG` → `… CATCHBOUND` e rodapé `× 6 Variantes Deluge` → `× 6 Variantes Especiais`
- Editor de Mundos: `… FUNCIONAL • DELUGERPG` → `… • CATCHBOUND`
- Descrição padrão de mapa novo (API): `… Editor de Mundos DelugeRPG.` → `… Catchbound.`
- Tela do inicial: `ESCOLHA SEU POKÉMON INICIAL: (apenas squirtle, charmander ou bulbasaur)` → `ESCOLHA SEU PARCEIRO INICIAL!`
- Caixa de variantes premium → `Escolha com sabedoria`
- Removida a frase `Outros Pokémon são capturados explorando o mundo!`

**De propósito NÃO trocado** (rebranding completo ainda é decisão pendente,
ver §5): `DELUGE_VARIANTS`/`computeDelugeStats`/`DelugeRPGPage` (identificadores
internos invisíveis), cookie `deluge_session`/`deluge_token` (trocar derruba
sessões ativas), e-mail placeholder `@delugerpg.net` (dados de usuário
existente), `package.json` name `deluge-rpg`, README/docs, e a menção
`"inspirado no Pokémon Deluge"` (é o jogo real de inspiração, não o nosso
branding). Validação em **§4.25**.

### ✅ Ferramentas GM no painel admin — agilizar a validação manual (2026-09-06)

Pedido do mantenedor: comandos de game master no painel admin para **agilizar
o processo de testes** (o agente não tem navegador; a passada manual #9–#11
exigia grind até o estado a testar). Antes de decidir a próxima fase.

**O que existe agora** (admin-only; moderador continua só com o chat):

1. `gm_list` — visão do alvo: dinheiro, inventário e time/PC Box completo
   (id, espécie, nível, HP, golpes, slot).
2. `gm_set_level` — nível 1–100 de **um Pokémon (id) ou do time inteiro**;
   reusa o motor: status por `computeDelugeStats`, golpes por
   `refreshMovesForLevel`, evolução pendente por `applyEvolution` (catch-up
   da 6.3); cura o alvo; XP zera no nível novo.
3. `gm_give_pokemon` — espécie (id) + nível + variante + apelido; entra no
   1º slot livre do time (senão PC Box); espécie que já teria evoluído no
   nível pedido chega no estágio certo (Charmander nv 40 → Charizard).
4. `gm_give_item` — 8 itens de inventário, quantidade 1–999.
5. `gm_give_money` — 1 a 10.000.000.
6. `gm_heal` — time + PC Box a 100% (idem Centro Pokémon).
7. `gm_teleport` — mapa (select dos 20) + cai no centro ou x/y dentro da
   grade; alvo refaz login para a posição valer.
8. `gm_give_badge` — insígnia por líder (idempotente; desbloqueia o
   pré-requisito de ginásio: Misty pede 1, Lance pede 2).

**Design:** lógica pura em `src/lib/gm.ts` (testável, sem banco); a rota
`/api/admin` exige `admin`, age só sobre o alvo por username (mesmo padrão
do `set_role`), audita cada ação em log (`[gm] quem → alvo → o quê`) e tudo
passa pelo rate limit existente (30/min). UI: seção "FERRAMENTAS GM" em
`/admin` (só aparece para admin) — listar time, formulários por comando,
feedback e auto-refresh após cada mutação. `gm_teleport`/`gm_give_badge`
rodam os seeds idempotentes de mapas/ginásios para bancos recém-criados.
Validação real em **§4.24**.

### 🛠 Pós-merge — Ferramental de ativação dos mapas EM PRODUÇÃO via GitHub Actions (2026-09-06)

Pedido do mantenedor: guiar a ativação dos 20 mapas no catchbound.vercel.app
**sem arquivos na máquina dele** — tudo entre GitHub, Vercel e Supabase.
Vercel não executa scripts avulsos e o SQL Editor do Supabase cobriria só os
mapas (não o rebalance, que precisa da lógica de learnsets), então o caminho
foi **GitHub Actions**, seguindo o mesmo padrão do backup (5.1-D): agente não
tem permissão `workflows`, a referência nasce em `docs/`.

Entregas: `docs/world-activation.yml` (workflow `workflow_dispatch` com
`target=staging|production` e `apply=false|true` + confirmação digitada) e
`docs/supabase-production-maint-role.sql` (papel mínimo `catchbound_maint`:
DML só em `game_maps`/`gym_leaders`/`user_pokemon`/`shop_items` + policies
RLS próprias; idempotente — recriar senha = rodar de novo). O workflow roda os
scripts reais do repo (`world:import --dry-run` → `db:rebalance --dry-run` →
`world:seed` → `db:rebalance` → `world:export` + verificação do espelho git ↔
banco com artefato de patch se divergir → conferência pública
`/api/health` + `/api/maps = 20`). Secrets novos no GitHub:
`PRODUCTION_MAINT_DB_USER/PASSWORD` e `STAGING_MAINT_DB_USER/PASSWORD`
(host/CA já existem do backup). Ensaio completo local com estado simulado de
produção (3 mapas + ginásios antigos + movesets legados) na **§4.20** —
verdes. Validador do fluxo (navegador) continua sendo o mantenedor.

### ✅ Fase 6.4-A — Mundo até o mapa 20, com regiões temáticas (2026-09-06)

Pedido do mantenedor: validar as últimas implementações (6.3-B ✔ — auditoria
re-executada verde) e **gerar mapas até o 20** seguindo o conceito dos
primeiros, com temas/regiões para os encontros fazerem sentido por tipo, e as
**156 espécies distribuídas de forma balanceada e separada** (evoluídos/
raros/nível alto nos mapas avançados; o oposto nos iniciais). Mesma branch do
PR #6 (acumula 6.2-C + 6.3 + 6.3-A + 6.3-B + 6.4-A).

**O que existe agora:**

1. **20 mapas temáticos** em cadeia de portais 3↔20: Caverna do Monte Lua,
   Litoral de Vermilion, Pântano Venenoso, Usina de Volt, Deserto das Ruínas,
   Planícies Douradas, Ilhas Glaciais, Torre dos Espíritos, Vulcão de
   Cinnabar, Cidade Sombria, Vale das Fadas, Fossa Abissal, Cânion dos
   Fósseis, Selva Profunda, Rota do Céu, Caverna Suprema e Santuário
   Celeste. Centro Pokémon só nos mapas 4/8/13/16/20 (dificuldade de
   propósito). Tabela completa com faixas e destaques em `docs/FASE-6.md` §6.4-A.
2. **Escada de nível +4/mapa** com sobreposição: 8–16 (M2) → 14–24 (M3) →
   … → 78–90 (M19) → 82–95 (M20). Peso define a altura na faixa (comum na
   base; raro/lendário no topo: Chansey 2%, Articuno 2%, Moltres 4%,
   Mewtwo 10%, Rayquaza 16%, Zapdos 12%, Mew 8%).
3. **Distribuição 156/156 sem duplicata** — cada espécie em exatamente um
   mapa; evolução NUNCA em mapa anterior ao da forma prévia (Caterpie M2 →
   Butterfree M17; Geodude M3 → Graveler M8 → Golem M16; Gastly M6 → Gengar
   M19). Ases de ginásio protegidos (Dragonite só no 20).
4. **Mapa 1 intocado** (contrato 6.2-C). Mapas 2–3 trocaram de elenco (o
   antigo tinha Gengar/Rayquaza commons — herança das 25 espécies); ginásios,
   lojas, grades e portais originais preservados; mapa 3 ganhou saída norte.
5. **Estrutura**: `src/lib/default-world.ts` (novo, puro — os 20 mapas como
   dados); `seed-maps.ts` reescrito sobre ele (semeia 20 em banco vazio);
   `scripts/world-seed.mts` + `npm run world:seed` (idempotente por slug em
   banco existente, preserva camadas do Editor); `content/world/maps/` com os
   20 JSONs versionados.
6. **Guardas novos no CI** (`world-expansion.test.ts`, 9 testes sobre
   `content/world/`): 20 mapas/slug/numeração, mapa 1 pinado, 156 exatamente
   uma vez, pesos = 100, entradas dentro da faixa, escada crescente,
   evolução sem regressão, lendários ≥ M10 com peso ≤ 20, ases de ginásio,
   cadeia de portais 3↔20.

Validação completa (comandos e saídas) na §4.19.

### ✅ Fase 6.3-B — Golpes com identidade, da era GBA (2026-09-06)

Pedido do mantenedor: pesquisar os movimentos de cada Pokémon nos jogos de
geração antiga (**principalmente GBA** — Ruby/Sapphire/Emerald/FireRed/
LeafGreen, sem excluir Gen 1/2), listar golpes para acabar com os "ataques
genéricos", implementar com balanceamento consistente entre fontes e
**atribuir técnicas a todos os 156 Pokémon conforme tipo e raça**. Mesma
branch do PR #6 (agora acumula 6.2-C + 6.3 + 6.3-A + 6.3-B).

**O que existe agora:**

1. **Catálogo de golpes 52 → 133 (+81)**, com pesquisa em
   `pokemondb.net/pokedex/<espécie>/moves/3` (learnsets Gen 3 completos:
   nível/TM/tutor/HM) e Bulbapedia (assinaturas por linha). Todos os 18 tipos
   com ≥ 4 golpes de dano (antes: Ghost/Dragon/Steel com 2–3, tipos inteiros
   dependendo de golpes de outro elemento). Destaques: Hiper Raio (115/85,
   teto Normal), Superaquecimento (115/90), Nevasca, os três socos elementais
   do Hitmonchan, os 10 golpes de Lutador (Rasteira → Soco Dinâmico 100/50),
   assinaturas (Agulha Dupla, Ossomerangue, Martelo Pinça, Chute de Salto
   Alto, Gancho do Céu, Cabeçada Ossuda, Hiperpresa, Dança das Pétalas,
   Dia de Pagamento, Velocidade Extrema, Chupavidas, Poder Antigo…).
2. **Rúbrio de conversão** (documentado no código, bloco 6.3-B de
   `pokedex.ts`): valores GBA quando divergem (Premonição 80/90, Fúria 90);
   multigolpe = soma com desconto; efeito não modelado (recuo/dreno/carga) =
   −5 de poder ou precisão; "nunca erra" = precisão 100; teto 115 / piso de
   precisão 50; golpes de status fora (motor os trataria como "nada
   aconteceu").
3. **Learnsets das 156 espécies reescritos** (1102 entradas, ~7 por espécie;
   antes ~4,7): cada linha por tipo E raça — Pikachu termina em Soco
   Trovejante/Carga Selvagem; Gyarados em Cachoeira/Salto/Hiper Raio;
   Alakazam ganha Premonição; Charizard fecha com Fúria; Hitmonchan carrega
   os três socos elementais; Nidoran♂ bica e Nidoran♀ morde; larvas
   (Caterpie/Metapod/Weedle/Kakuna), Magikarp e Ditto seguem fracos por
   desenho (canon).
4. **NADA de gameplay/motor mudou**: fórmula de dano, tabelas de
   encontro/ginásio/loja, evoluções e XP intactos. Pokémon capturados em
   produção mantêm os golpes salvos; `refreshMovesForLevel` atualiza ao subir
   de nível, como sempre.
5. **Guardas novos no CI** (5 testes em `pokedex-gen1.test.ts`, agora 18):
   ≥ 4 golpes de dano por tipo; nenhum golpe órfão; teto 115 / precisão
   50–100; golpes até o nível 7 ≤ 50 de poder; STAB de cada tipo até o
   nível 40; formas finais com golpe ≥ 70 do tipo primário nos 4 últimos
   slots; assinaturas clássicas com seus donos.

Validação completa (comandos e diff contra baseline) na §4.18.

### ✅ Fase 6.3-A — Catálogo Kanto completo (2026-09-06)

Pedido do mantenedor, **antes do merge e antes da 6.4**: "implemente mais
variações de pokemon base e suas evoluções… base para criar nossa própria
estética, que não fique nada de fora". Na mesma branch `arena/01a07639-pokeeeee`
(PR #6 agora acumula 6.2-C + 6.3 + 6.3-A).

**O que existe agora:**

1. **Pokédex 25 → 156 espécies**: as **151 de Kanto completas** + Steelix (208,
   fecha a linha do Onix) + as 5 não-Kanto pré-existentes (Umbreon, Gardevoir,
   Rayquaza, Lucario — e o Steelix conta como a 6ª de fora). Novo módulo
   `src/lib/pokedex-gen1.ts` com 131 espécies em dados compactos; sem ciclo de
   módulos (recebe `ALL_MOVES`; só importa tipos).
2. **+11 golpes** (41 → 52), fechando tipos sem NENHUM golpe: Poison (Ferrão,
   Lodo, Bomba de Lodo), Bug (Corte Fúria, Insetada, Tesoura X), Fairy (Vento
   de Fada, Luta Fofa, Força Lunar) + Surf e Trovoada.
3. **Fonte das sprites auditada** (PokeAPI/sprites, Gen V animado
   front/back/shiny): cobertura dos ids 1–151 e 208 confirmada pela árvore Git
   do repositório. **Armadilha documentada**: a API de contents pagina em 1000
   entradas e parecia faltar o shiny de 96–99 — pela árvore existem (1005
   arquivos). Animações vão só até o id 649: **Gen 6+ precisa de outra fonte**.
4. **Tipagem/status canônicos modernos** (Fairy em Clefairy/Jigglypuff/Mr.
   Mime; Magnemite Electric/Steel) — a tabela 18×18 da Fase 2 já cobria.
5. **Evoluções**: 42 linhas de nível canônicas + 17 provisórias (pedra/troca →
   nível, marcadas no código) + Pikachu→Raichu, Geodude→Graveler→Golem,
   Onix→Steelix, Gastly→Haunter→**Gengar existente**, Magikarp→Gyarados,
   Dratini→Dragonair→Dragonite. **Vaporeon/Jolteon/Flareon existem como
   espécie mas não estão ligadas** — escolha entre 3 destinos exige mecânica
   futura (pedras); Eevee segue para Umbreon.
6. **Nada de gameplay mudou**: tabelas de encontro, ginásios e lojas intactos
   (isso é conteúdo da 6.4). Learnsets novos seguem a filosofia 6.2-C; todos
   os testes de balanceamento existentes passam para as 156 espécies.

**Testes:** `src/lib/pokedex-gen1.test.ts` (13: roster exato, sprites no padrão
do CDN, tipos conhecidos, linhas canônicas/provisórias, lendários sem linha) +
ajustes em `evolution.test.ts` (Pikachu agora evolui) e no teste de integração
(o "sem evolução" virou Ditto). Unitários: 14/203 → **15/215**. Integração
permaneceu **6/73**.

### ✅ Fase 6.3 — Evolução no servidor (2026-09-06)

Na mesma branch `arena/01a07639-pokeeeee` (empilhada sobre a 6.2-C — merge
deixado para depois a pedido do mantenedor; o PR #6 acumula as duas fases).
Plano em `docs/FASE-6.md` §6.3, seguido sem reabertura.

**O que existe agora:**

1. **Regras dirigidas por dados** — `PokemonSpecies.evolvesTo`:
   `{ speciesId, trigger: "level"|"item"|"special", level?, itemId? }[]`.
   Só `"level"` é implementado; o teste de sanidade **proíbe** item/special
   antes de existirem (regra morta não entra no catálogo).
2. **+4 espécies** (o buraco das linhas dos iniciais): Ivysaur(2),
   Venusaur(3), Charmeleon(5), Wartortle(8) — bases canônicas, sprites CDN,
   learnset herdado da linha. Pokédex: 21 → **25**.
3. **Motor** `src/lib/engine/evolution.ts`: `evolutionAtLevel(id, nível)`
   segue a cadeia enquanto `nível ≥ limiar` (salto 15→37 atravessa dois
   estágios numa batalha; guarda contra ciclos) e `applyEvolution(side)`
   transforma o combatente no lugar.
4. **Gatilho no fluxo de vitória** (`battle-service.ts`), junto do `applyXp`
   — não existe endpoint de evoluir; cliente nenhum pode pedir evolução.
   Ao evoluir: stats recalculados (variante real), **% de HP preservado**,
   **apelido mantido**, **tipos trocam na mesma batalha**, golpes rederivados
   do learnset novo, log `★ … evoluiu para …!`.
5. **Persistência**: `pokedexId` + `name` entram no `UPDATE user_pokemon` da
   vitória (no-op quando não evolui).
6. **Catch-up automático**: gatilho é `nível ≥ limiar`, não "acabou de
   cruzar" — Pokémon de produção que já passaram de 16 antes da 6.3
   evolucionam no próximo level up, direto pro estágio certo do nível. Sem
   backfill.

**Linhas:** iniciais 16/32 e 16/36 (cânon) · Dragonair 55 → Dragonite (cânon)
· Staryu 30 → Starmie e Eevee 30 → Umbreon (**provisórios**: pedra d'água e
felicidade não existem como sistema; viraram nível até a 6.4/6.5 trazerem
itens). Pikachu/Geodude/Onix/Gengar/Lapras etc. não evoluem nesta fase — os
alvos não estão na Pokédex (conteúdo da 6.4).

**Testes:** `src/lib/engine/evolution.test.ts` (16: integridade de dados,
gatilhos, salto duplo, % HP, apelido, variante, tipos, time/PC agnóstico) +
`tests/integration/evolution.integration.test.ts` (3: cruzar 16 numa vitória
evolui e persiste; fora do gatilho não evolui; catch-up).
Unitários: 13/187 → **14/203**. Integração: 5/70 → **6/73**.

### ✅ Fase 6.2-C — Golpes fracos 15–35, teto aposentado, curva original e ginásios restaurados (2026-09-06)

Sessão `arena/01a07639-pokeeeee`, partindo de `main` `863b36d` (handoff já
mesclado — PRs #4 e #5 fechados). As decisões vieram do mantenedor via
`docs/FASE-6.2-PLANO.md` e **não foram reabertas**: faixa útil 15–35, aposentar
o teto, `nível³ × 0,8`, Brock 12/14, Misty 18/21, Lance 38/45 intacto, fórmula
de dano intocada, uma zona de encontro por mapa.

**O que mudou:**

1. **Golpes** (`src/lib/pokedex.ts`) — o começo do jogo passou a ter duas
   tier: neutra 20–25 (Arranhão 20, Investida 25) e tipada 25 (Brasa, Bolha,
   Chicote de Cipó, Choque, Rajada), com upgrade 35 no nível ~7 (Ataque Rápido,
   Estilhaço de Gelo, Folha Navalha 55→35, Garra de Metal 50→35). Lambida (30)
   e Bofetada de Lama (35) já estavam na faixa. Os valores 25/35 foram medidos
   contra o pior caso (Bolha com STAB ×2 + crítico contra HP 19 do Charmander
   nível 5 — a 30 já seria nocaute em um golpe).
2. **Teto de dano aposentado** (`src/lib/engine/damage.ts`) — removidos
   `maxHitFraction`, `capDamage` e `DAMAGE_CAP_*`. Dano = 100% fórmula clássica
   em todo nível. Proteção do início = conteúdo (golpes 15–35 + mapa 1 com
   criaturas 2–7 sem vantagem de elemento), não motor.
3. **Curva de XP** (`src/lib/engine/xp.ts`) — `xpFloor` volta a
   `floor(nível³ × 0,8)`; piso de 20 XP/nível mantido (só afeta níveis 1–2).
4. **Ginásios** (`src/lib/gym-teams.ts`) — Brock 12/14 e Misty 18/21
   restaurados; Lance 38/45 intocado. Novo `src/lib/gym-teams.test.ts` trava
   os três times.
5. **Testes** — `balance.test.ts`: testes do teto removidos, novo teste da
   faixa 15–35 (escopo: espécies do mapa 1), duelo mínimo 3→2 turnos (sem o
   teto, vantagem de tipo decide em ~2 — era isso que o teto apagava), teste
   de selvagem reescrito para a faixa 2–7 do mapa 1 futuro com contrato
   STAB+super delegado ao conteúdo; `xp.test.ts` recalculado (264/822).
   Unitários: 12/186 → **13/187** (−3 do teto, +1 faixa, +3 ginásios).
6. **Relatório** (`scripts/balance-report.mts`) — seção do teto substituída
   pela varredura "poder × dano neutro no nível 5"; seção da Misty adicionada.
7. **`content/world/` re-exportado** — `db:rebalance` aplicado no banco local +
   `world:export`; o diff versionado são só os 4 níveis de ginásio (sem isso,
   um `world:import` futuro reverteria a mudança). `world:import --dry-run`
   depois: tudo "igual(is)".
8. `backfill-balance.ts` **não precisou mudar** — ele lê de `GYM_TEAMS` e
   `movesAtLevel`, então acompanhou as fontes. Em produção:
   `npm run db:rebalance` (movesets de Pokémon já capturados continuam válidos
   porque os golpes mudaram de **poder**, não de nome).

**Números medidos (antes → depois), semente fixa:**

- Duelo inicial nv 5 com vantagem: 6,0 → **10,5** dmg (4,0 → **2,1** turnos);
  sem vantagem: 6,6–7,6 turnos. **0% OHKO, críticos incluídos** (travado em
  teste).
- Poder × dano neutro nv 5 sem teto: 5→2,0 · 10→2,1 · 15→2,1 · 20→2,7 ·
  25→3,1 · 35→3,6 · 40→4,1 · 55→4,9 (o poder volta a diferenciar).
- Curva (batalhas/nível): 5→2,7 · 10→4,8 · 15→6,9 · 20→9,1 · 25→11,2; de 5 a
  15 = 47 batalhas (eram 38).
- Brock 12/14: Bulbasaur/Squirtle lvl 10–12 ganham; Charmander perde as duas
  (decisão de design da 6.1, mantida). Misty 18/21: no lvl 18 só Bulbasaur
  vence a Staryu; ninguém vence a Starmie sozinho — parede de propósito.

Detalhes e tabela completa de golpes em `docs/FASE-6.md` (seção 6.2-C).

### 📸 Handoff de sessão — consolidação das branchs (2026-09-04)

Sessão `arena/01a06d75-pokeeeee`: leu o repositório, as 6 branchs remotas, os
PRs #1–#4 e o estado do CI, e consolidou o estado num único lugar para o
projeto sobreviver a um reset do sandbox sem perda.

| Branch | Conteúdo | Destino |
|---|---|---|
| `main` (`92936e9`) | único commit squash — Fase 6.2 (A+B) | recebe o merge de handoff |
| `arena/01a061a1` | Fase 6.2-D (PR #4, CI 5/5 verde) | **ancestora deste branch** — PR #4 fecha como duplicado após o merge |
| `arena/01a05735` | só o registro do deploy 6.2 em produção | absorvido em §4.13 — apagar após o merge |
| `arena/01a03ad9` / `01a0439a` / `01a052dc` | snapshots obsoletos (08-27/08-30) | **não mesclar** (histórias separadas de `main`) — só apagar |

Decisão do mantenedor: merge de tudo em `main` e reinício da conversa. Para o
nada se perder nem quebrar: este branch já carrega a 6.2-D + este AI_State
consolidado; o mantenedor mescla **apenas** este branch em `main`, fecha o
PR #4 e apaga as demais. Verificado por diff: nenhuma branch antiga tem
conteúdo único — o AI_State delas é só versão anterior e superada deste
documento (§4.14).

Depois do merge: `main` é a única fonte. Nova conversa: `git fetch origin`,
trabalhar de `main`, reler este arquivo e ir para a **6.2-C**.

### ✅ Fase 6.2-D — Mundo como código (2026-09-02)

**Problema.** O conteúdo do mundo vivia num banco só. O mantenedor montava
mapas num ambiente e não tinha como levá-los a outro sem refazer no Editor;
não dava para revisar mudança de mapa num PR nem recuperar o mundo num banco
novo (o backup diário cobre desastre, não versionamento). Entrou **antes** da
6.2-C a pedido do mantenedor, para o mapa 1 montado à mão não virar retrabalho.

**Entregue.**

- `src/lib/world-content.ts` — módulo puro: `mapToFile`, `shopsToFiles`,
  `resolveMapRefs`, `parseMapFile`/`parseShopFile`, `stringifyContent`.
- `scripts/world-export.mts` → `npm run world:export`: grava
  `content/world/maps/<slug>.json` (ginásios do mapa dentro, lista `gyms`) e
  `content/world/shops/<shopId>.json`; remove arquivo órfão (`pruneStale`).
- `scripts/world-import.mts` → `npm run world:import [-- --dry-run]`: uma
  transação, 4 passos (mapas sem refs → ginásios → portais/NPCs resolvidos →
  lojas). `--dry-run` executa tudo e dá `ROLLBACK`.
- `content/world/` versionado com os 3 mapas, 3 ginásios e 11 itens atuais.
- `docs/MUNDO-COMO-CODIGO.md` — por quê, estrutura, garantias, limites.
- 19 testes em `src/lib/world-content.test.ts`.

**Decisões de desenho.**

| Decisão | Motivo |
|---|---|
| Chave natural: mapa = `slug`; ginásio = `(mapSlug, leaderName)`; item = `(shopId, itemKey)` | id serial não atravessa banco |
| Portal → `targetMapSlug`; NPC → `gymLeaderName`; ginásio dentro do mapa | idem; resolvido para o id **do destino** no import |
| `shopId` mantido | já é id lógico estável, sem FK |
| `id`, `creatorId`, timestamps fora | não são conteúdo |
| Import **nunca apaga** | apagar mapa arrasta FK `restrict` de ginásio e posição de jogador; é decisão humana no banco |
| Referência quebrada **falha alto** (export e import) | melhor abortar que gravar mundo inconsistente |
| `tileGrid` com uma fileira por linha | senão mudar um tile parece reescrita de 256 linhas no diff |
| `updated_at` só muda quando algo mudou | import repetido não suja timestamp |

**Também nesta etapa:** timeout folgado (`LENTO = 30_000`) nos 5 testes
assíncronos de `src/lib/api-client.test.ts`. O `fetch` é stub, mas em worker
frio (logo após `npm install`, com o sandbox compilando) a primeira `Response`
estourou 5s e, uma vez, 15s; nas execuções seguintes o arquivo leva ~300ms.


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

### ✅ FASE 6.4-B — Johto (152–251) no catálogo + pedras de evolução na loja (2026-09-06)

**Objetivo:** fechar as duas partes restantes da 6.4 — catálogo Johto e itens
de evolução. Entrega no branch `arena/01a0782e-pokeeeee`, commit
`2e2c1dc` (pushado) e **PR #10 aberto** (`feat(6.4-b): catálogo Johto +
pedras de evolução`).

**O que entrou:**

1. **`src/lib/pokedex-johto.ts`** (98 espécies, ids 152–251 exceto 197/208 que
   já existiam no catálogo): tipos, 6 bases, catchRate, learnset (133 golpes
   existentes), evoluções dirigidas por dados e sprites Gen V animados.
   O total da Pokédex passa a **254** (151 Kanto + 100 Johto + Gardevoir/
   Rayquaza/Lucario), sem duplicata. Corrigido o caso Heracross, que terminava
   sem golpe forte primário (Bug ≥70) — ganhou `Tesoura X`.
2. **`src/lib/evolution-items.ts`** (14 itens: 7 pedras clássicas, 4 cascos
   raros, 3 pedras modernas) — único mapa entre coluna de inventário, ID do
   motor (`EvolvesTo.itemId`) e nomes/emoji de loja/box.
3. **Gatilhos de evolução**: as linhas `// pedra` viraram `trigger:"item"` com
   `itemId` (Pikachu→thunderStone, Nidorina/Nidorino/Clefairy/Jigglypuff→
   moonStone, Vulpix/Growlithe→fireStone, Gloom→leafStone/sunStone,
   Poliwhirl→waterStone/kingsRock, Slowpoke→kingsRock, Shellder→waterStone,
   Exeggcute→leafStone, Chansey→ovalStone, Seadra→dragonScale,
   Scyther→metalCoat, Porygon→upgrade, Onix→metalCoat, Staryu→waterStone,
   Eevee→5 pedras, Sunkern→sunStone). Linhas de **troca** (Kadabra/Machoke/
   Graveler/Haunter) seguem provisórias por nível, sem item de troca.
4. **Motor**: `evolutionWithItem` + `applyItemEvolution` em
   `src/lib/engine/evolution.ts` (stats recalculados, % HP preservado,
   apelido mantido, tipos atualizados). `use_item` em
   `src/app/api/pokemon/manage/route.ts` valida o gatilho, aplica e **desconta
   em transação**; item que não evolui → 400 e **não consome**.
5. **Schema/loja**: `users` ganhou 14 colunas inteiras `DEFAULT 0 NOT NULL` +
   check não-negativa (migration `0007_flowery_next_avengers`); `INVENTORY_KEYS`
   inclui os itens; `seed-shop.ts` seeda 15 itens idempotente nas lojas 1–3
   (preços 1200–6000, estoque 4–10). Corrigido um bug do seed: antes o `return`
   em loja já semeada pulava os itens de evolução.
6. **Mundo**: as 98 espécies Johto foram distribuídas nos 20 mapas (tabelas de
   encontro em `default-world.ts` + `content/world/maps/*.json` regenerados);
   lendários Johto entram no mapa 20 com peso 3.

**Validação (sandbox, banco local com migration 0007):**
`npm run check` e `npm run test:integration` verdes — **257 unit + 100
integração** (incluindo 2 novos de evolução por item pela rota real).
`npm run build` verde.

**Pendência de produção:** colar `docs/supabase-production-0007-runtime.sql`
no SQL Editor (não cria tabela — não precisa de policy nova) e depois testar
loja/box em `catchbound.vercel.app`. As 15 pedras também exigem os 3
`content/world/shops/*.json` atualizados; em produção a loja seeda o que
faltar via `ensureShopSeeded` (que agora roda com loja já semeada).

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

### 4.12 Validação da Fase 6.2-D (2026-09-02)

Ambiente recriado do zero nesta sessão (`npm install`, `npm run db:local`,
`drizzle-kit migrate`, dev server em `:3100`, seed pelas rotas `/api/maps`,
`/api/gym`, `/api/shop`).

```
DATABASE_URL=<app_db> npm run world:export
→ 3 mapa(s), 3 ginásio(s), 11 item(ns) de loja → 6 criado(s)

# banco novo, só migrations, + mapa "placeholder" e sequências adiantadas de propósito
CREATE DATABASE app_db_world · drizzle-kit migrate · setval(game_maps_id_seq, 4) · setval(gym_leaders_id_seq, 3)

DATABASE_URL=<app_db_world> npm run world:import -- --dry-run
→ mapas 3 criados · ginásios 3 criados · itens 11 criados · "dry-run — ROLLBACK"
→ conferido: game_maps=1, gym_leaders=0 (nada gravado)

DATABASE_URL=<app_db_world> npm run world:import
→ mapas #8 #9 #10 · ginásios #7 #8 #9 (ids deslocados em relação à origem, que era 1/2/3)
→ SQL: 8 portais apontam para o id do slug certo · 3 NPCs de ginásio para o líder certo · 0 referências quebradas · 11 itens

2ª importação → mapas 0/0/3 iguais · ginásios 0/0/3 iguais · itens 0/0/11 iguais   (idempotente)

reexport do destino  vs  export da origem:  diff -r -x placeholder.json → IDÊNTICOS

editar rewardMoney do Brock (1500→1600) e stock da Pokébola (99→77) no JSON + import
→ "1 ginásio atualizado, 1 item atualizado" · banco: reward_money=1600, stock=77

portal com targetMapSlug "nao-existe" (+ outra edição no mesmo arquivo) + import
→ "falhou, nada gravado: mapa vale-pallet: portal "p1-north-1" aponta para "nao-existe"…" · exit 1 · banco intacto

export com mapa a menos no banco → "removido placeholder.json (não existe mais no banco)"

npx vitest run src/lib/world-content.test.ts → 19 passed
npx tsc --noEmit · npx eslint scripts src/lib/world-content*.ts → limpos
```

```
DATABASE_URL=<app_db> npm run check
→ lint ok · typecheck ok · Test Files 12 passed · Tests 186 passed · ✓ Compiled successfully

TEST_PG_URL=<postgres> DATABASE_URL=<app_db> npm run test:integration
→ Test Files 5 passed · Tests 70 passed
```

Nota: eram 167 unitários antes da sessão; 167 + 19 = 186. Integração não mudou
(os scripts de mundo não têm rota; a prova de banco real está na tabela acima).

### 4.13 Deploy da Fase 6.2 em produção (2026-08-31)

*(Registro resgatado da branch `arena/01a05735-pokeeeee`, que não foi mesclada —
colocado aqui para a memória não depender da branch.)*

Decisão do mantenedor: testar direto em produção em vez de staging, porque o
preview em iframe era justamente a fonte de ruído.

Ordem cumprida — **migration antes do código**:

1. migration `0005` aplicada pelo mantenedor no Supabase de produção, com o
   journal corrigido depois (`migrations = 6`);
2. PR #3 renomeado e mesclado em `main` (merge commit `92936e9`, preservando os
   commits `d9acd79`, `90c4dc0`, `c0b5edf`);
3. deploy automático da Vercel.

Verificação em `https://catchbound.vercel.app`:

```
GET /api/health → {"ok":true}
GET /api/maps   → "encounterGrid":[], "collisionGrid":[], "encounterRate":22
```

As três colunas chegam ao cliente e os três mapas estão em **modo legado**, que
é o esperado: nada mudou para quem está jogando. Em produção a sessão volta a
ser só cookie `httpOnly` (Bearer fica desligado), e como o jogo é aberto em aba
de topo o problema do iframe não existe ali.

**Falta o teste manual do mantenedor** (item 8 das pendências).

### 4.14 Validação do handoff (2026-09-04)

Verificações somente-leitura (nenhuma linha de código foi tocada):

```
git fetch origin --prune · git ls-remote --heads origin
→ 6 branchs: main + 5 arena (01a03ad9, 01a0439a, 01a052dc, 01a05735, 01a061a1)

git rev-list --count main · git log --format='%H parents=[%P]' main
→ 1 commit, sem pais: main é raiz (histórico reconstruído por squash)

git merge-tree --write-tree main origin/arena/01a061a1-pokeeeee
→ árvore de merge limpa (sem conflito) — a 6.2-D mescla de boa em main

git diff --stat main..origin/arena/01a05735-pokeeeee
→ 1 arquivo (só AI_State.md, +28 linhas): o registro de deploy — absorvido em §4.13

diff do AI_State de cada branch antiga vs main (01a03ad9, 01a0439a, 01a052dc)
→ só linhas de versão anterior (contagens antigas, etapas já concluídas,
  branch de sessão antiga): nada único para preservar → apagar sem perda

gh pr list --state all
→ #1, #2, #3 MERGED · #4 OPEN (Fase 6.2-D)

gh pr view 4 · gh run list --branch arena/01a061a1-pokeeeee
→ MERGEABLE · CI 5/5 SUCCESS · deploys Vercel SUCCESS (catchbound e staging)
```

**Não validado aqui:** o merge em si (decisão do mantenedor) e o CI deste
branch — o PR de handoff dispara o CI; mergear apenas com ele verde.

### 4.15 Validação da Fase 6.2-C (2026-09-06)

Ambiente recriado do zero (§ RECUPERAÇÃO): `npm install` → `.env` →
`npm run db:local` → `drizzle-kit migrate` → `next dev` → seeds via
`curl /api/maps`, `/api/gym?mapId=1`, `/api/shop?shopId=1`.

```
DATABASE_URL=<app_db> npm run balance:report        # capturado ANTES (teto ativo, 6,0 dmg)
# … edições 6.2-C …
DATABASE_URL=<app_db> npm run balance:report        # DEPOIS: 0% OHKO, 10,5/10,9 dmg com vantagem
                                                     # curva 2,7/4,8/6,9/9,1/11,2 · Brock 12/14 · Misty 18/21
DATABASE_URL=<app_db> npx vitest run src/lib/engine/{balance,xp,damage}.test.ts src/lib/gym-teams.test.ts
→ 4 arquivos · 50 testes · todos verdes

DATABASE_URL=<app_db> npm run check
→ lint ok · typecheck ok · Test Files 13 passed · Tests 187 passed · build ok

TEST_PG_URL=<postgres> DATABASE_URL=<app_db> npm run test:integration
→ Test Files 5 passed · Tests 70 passed

DATABASE_URL=<app_db> npm run db:rebalance -- --dry-run
→ Brock [10,12]→[12,14] · Misty [16,19]→[18,21] · 0 Pokémon afetado(s)
DATABASE_URL=<app_db> npm run db:rebalance           # aplicado
DATABASE_URL=<app_db> npm run world:export           # 2 mapas atualizados (níveis de ginásio)
git diff content/world/ → exatamente 4 linhas (level 12/14 e 18/21)
DATABASE_URL=<app_db> npm run world:import -- --dry-run
→ mapas 3 igual(is) · ginásios 3 igual(is) · itens 11 igual(is) · ROLLBACK
```

Smoke no servidor real (não só unitários): registro `smoke6c` →
`POST /api/battle start_wild` no matinho (2,8) do vale-pallet → resposta traz
jogador e selvagem com `Arranhão (20)` / `Brasa (25)`; `GET /api/gym?mapId=1`
→ Brock `[12,14]`; `mapId=2` → Misty `[18,21]`.

**Não validado aqui:** produção (o `db:rebalance` lá é passo pós-deploy do
mantenedor) e a sensação de jogo no navegador (pendência #9 abaixo).

### 4.16 Validação da Fase 6.3 + persistência de mapas (2026-09-06)

**Persistência de mapas (pergunta do mantenedor: "mapas 4 em diante somem a
cada atualização de versão?"). Resposta: NÃO — provado por execução:**

1. Conta `admin` promovida com `npm run db:set-role` → `POST /api/maps`
   (admin-only) criou o **mapa 4** (`rota-teste-persistencia`, 16×16 com
   matinho e tabela de encontro) → `GET /api/maps` = 4 mapas.
2. `PUT /api/maps/4` editou a descrição → dev server **reiniciado**
   (simulando deploy de nova versão) → `GET /api/maps` = 4 mapas, edição
   intacta, seed não rodou de novo (guard `if (existingCount > 0) return;`
   em `ensureDefaultMapsSeeded`; greps confirmaram que **nenhum** código
   apaga `game_maps`/`gym_leaders`).
3. `npm run world:export` versionou o mapa 4 em `content/world/maps/`.
4. Pior cenário: banco **novo do zero** (`app_db2`) → migrate →
   `npm run world:import` → **4 mapas restaurados** do código (ids até
   mudaram — as referências são por slug/chave natural, então nada quebra).
5. Artefatos da demo removidos em seguida (mapa de teste apagado do banco
   local, `world:export` pruned o JSON, `app_db2` dropada).

Conclusão registrada para o mantenedor: mapas criados no Editor vivem no
banco de produção e **sobrevivem a deploys**; `content/world/` é o backup
versionado — fluxo recomendado após mexer no Editor: `world:export` + commit.

**Fase 6.3 (evolução):**

```
DATABASE_URL=<app_db> npx vitest run src/lib/engine/evolution.test.ts
→ 16 passed (integridade de dados + transformação)

DATABASE_URL=<app_db> npx vitest run --config vitest.integration.config.mts tests/integration/evolution.integration.test.ts
→ 3 passed (cruzar 16 numa vitória → Charmeleon persistido;
   fora do gatilho não evolui; catch-up do acima do limiar)

DATABASE_URL=<app_db> npm run check
→ lint ok · typecheck ok · Test Files 14 passed · Tests 203 passed · build ok

TEST_PG_URL=<postgres> DATABASE_URL=<app_db> npm run test:integration
→ Test Files 6 passed · Tests 73 passed
```

Smoke no servidor dev (rotas reais): vitória cruzando o nível 16 devolve log
com `★ O quê?! Charmander está evoluindo!… evoluiu para Charmeleon!` e a
linha do banco fica `pokedexId=5`, `name=Charmeleon`, HP ≤ maxHp.

**Não validado aqui:** produção (evolução pega Pokémon antigos via catch-up
no próximo level up, sem backfill) e o navegador (pendência #10).

### 4.17 Validação da Fase 6.3-A — catálogo Kanto (2026-09-06)

Auditoria da fonte de sprites (gh api no repositório PokeAPI/sprites):

```
gh api repos/PokeAPI/sprites/contents/.../animated          → 997 entradas (1 página)
gh api repos/PokeAPI/sprites/git/trees/<sha-do-shiny>       → 1005 entradas, truncated:false
→ ids 96–99 (Drowzee/Hypno/Krabby/Kingler) EXISTEM em shiny animado;
  a API de contents corta em 1000 por página e os "escondeu"
→ escopo 1–151 + 208: faltando NADA (front/back/shiny)
→ range animado do repo: id 1–649 (Gen 6+ precisará de outra fonte)
```

Testes (números novos):

```
npx tsc --noEmit
→ limpo

DATABASE_URL=<app_db> npx vitest run
→ Test Files 15 passed · Tests 215 passed
  (novo pokedex-gen1.test.ts: 13 testes; os testes de balanceamento e
   evolução escalam sozinhos para as 156 espécies — inclusive "nenhuma
   começa com golpe forte" e "toda espécie tem golpe no nível 1")

DATABASE_URL=<app_db> npm run check
→ lint ok · typecheck ok · 15 arquivos/215 testes · build ok

TEST_PG_URL=<postgres> DATABASE_URL=<app_db> npm run test:integration
→ Test Files 6 passed · Tests 73 passed
  (o caso "sem evolução" do teste de integração foi trocado de Pikachu
   para Ditto — Pikachu agora evolui; foi o próprio teste que avisou)

DATABASE_URL=<app_db> npm run balance:report
→ "✓ todas as espécies ok" na sanidade do learnset
```

Encontros amarrados ao velho comportamento: `GET /api/maps` e uma batalha
selvagem continuam servindo a tabela atual do mapa 1 (espécies novas não
aparecem — de propósito, é conteúdo da 6.4).

### 4.18 Validação da Fase 6.3-B — golpes com identidade (2026-09-06)

Auditoria estrutural (script descartável, regras depois viraram os 5 testes
novos de `pokedex-gen1.test.ts`):

```
npx tsx /tmp/audit-learnsets.mts
→ espécies: 156 · golpes: 133
→ ✓ todas as regras ok
  (chaves válidas, níveis crescentes sem duplicata, ≤7 ⇒ poder ≤ 50,
   nível 1 ≤ 60, STAB de cada tipo até 40, formas finais com golpe primário
   ≥ 70 nos 4 últimos, sem órfãos, ≥ 4 golpes por tipo, teto 115/precisão 50)
```

Testes e suítes:

```
DATABASE_URL=<app_db> npm run check
→ lint ok · typecheck ok · build ok · 15 arquivos/222 testes
  (pokedex-gen1.test.ts: 13 → 18 testes)

TEST_PG_URL=<postgres> DATABASE_URL=<app_db> npm run test:integration
→ Test Files 6 passed · Tests 73 passed

npx tsx scripts/balance-report.mts
→ "✓ todas as espécies ok"
```

**Diff do balance-report contra o baseline 6.3-A** (via `git worktree` no
commit `68c1879`, antes/depois salvos e comparados):

- todas as **✓/✗ dos ginásios idênticas** (Brock: Bulbasaur/Squirtle ✓,
  Charmander ✗; Misty: só Bulbasaur ✓) — nenhum resultado regrediu;
- números moveram para o lado canônico: Charmander@10 leva 6,5 turnos para
  derrubar o Geodude (antes 3,9) porque Garra de Metal voltou ao nível canônico
  13 (FRLG) em vez de 7; Staryu@18 da Misty ficou mais fraco contra Bulbasaur
  (perdeu Confusão/Water Pulse precoces — agora Swift/Pistola d'Água);
- meio de jogo: Bulbasaur→Squirtle@30 passou de Folha Navalha 35 para Mega
  Dreno 40 (3,1 → 2,2 turnos); Dragonite→Mewtwo@50 usa Fúria 90 STAB.

Encontros, lojas e ginásios **inalterados** (nenhuma tabela mudou — só
catálogo e learnsets).

### 4.19 Validação da Fase 6.4-A — mundo até o mapa 20 (2026-09-06)

Validação da 6.3-B re-executada antes de começar (auditoria estrutural verde:
156 espécies · 133 golpes · todas as regras ok). Depois, da expansão:

```
npx tsx /tmp/check-world.mts            # auditoria offline do builder
→ ✓ builder ok: 20 mapas, 156/156 espécies, cadeia 3↔20 íntegra

DATABASE_URL=<app_db> npm run world:seed
→ 17 criado(s), 3 atualizado(s), 20 mapa(s) no total

DATABASE_URL=<app_db> npm run world:export
→ 20 mapa(s), 3 ginásios, 11 itens → content/world versionado

DATABASE_URL=<app_db> npm run world:import -- --dry-run
→ mapas: 0 criado(s), 0 atualizado(s), 20 igual(is)   ← round-trip idempotente

DATABASE_URL=<app_db> npm run check
→ lint ok · typecheck ok · build ok · 16 arquivos/231 testes
  (novo world-expansion.test.ts: 9 guardas)

TEST_PG_URL=<postgres> DATABASE_URL=<app_db> npm run test:integration
→ Test Files 6 passed · Tests 73 passed

npx tsx scripts/balance-report.mts
→ "✓ todas as espécies ok"
```

Smoke do pipeline real de encontro (DB → encounterPoolAt → pickWeighted →
rollEncounterLevel → espécie → learnset), 2.000 sorteios por mapa:

- Mapa 4: Zubat 23% nv 18–25 … Chansey 2% nv 24–28;
- Mapa 12: Charmeleon 23% nv 50–57 … Moltres 4% nv 52–60;
- Mapa 20: Dragonair 35%/Dragonite 29% nv 82–92, Rayquaza 15%/Zapdos 12%/
  Mew 8% nv 87–95 — pesos e faixas batendo com o desenho.

Smoke da API real (dev server :3100, hot-reload): `GET /api/health` →
`{"ok":true}`; `GET /api/maps` → **20 mapas** com nome/portais/elenco.

**Idempotência/segurança**: world:seed preserva `encounterGrid`/
`collisionGrid` (camadas do Editor) e nunca apaga mapas; world:import
dry-run confirma 20 iguais. Obs. cosmética: no banco de dev os ids têm um
salto (1,2,3,5…21) por causa da sequência do serial (mapa de teste antigo
criado/deletado) — ids são opacos, portais resolvem por slug, sem impacto.


**Não validado aqui:** a vitrine de sprites no navegador com 156 espécies
(pendência #11) e produção (só entra depois do merge).

### 4.20 Validação do ensaio de ativação em produção (2026-09-06, sandbox)

Sandbox não alcança Supabase/Vercel (egress), então o fluxo do
`world-activation.yml` foi ensaiado contra **Postgres local**
(`npm run db:local` + `db:migrate`) num banco simulando a produção
**pré-ativação**: 3 mapas sem portais, ginásios com níveis antigos (+6), 11
itens de loja, 2 Pokémon com movesets legados. Tudo executado como
`catchbound_maint`, com a saída esperada batendo com a do RELATORIO-POS-MERGE:

```
role SQL (docs/supabase-production-maint-role.sql) → policies_rls=4 · grants_tabelas=12 · rolsuper=false · rolbypassrls=false
npm run world:import -- --dry-run  (antes) → mapas: 17 criado(s), 3 atualizado(s), 0 igual(is) · ginásios: 3 atualizado(s) · itens: 11 igual(is)
npm run db:rebalance -- --dry-run          → Movesets: 2 de 2 mudariam · Brock [18,20]→[12,14] · Misty [24,27]→[18,21] · Lance [44,51]→[38,45]
npm run world:seed (como maint)            → 17 criado(s), 3 atualizado(s), 20 mapa(s) no total
npm run db:rebalance                       → Movesets atualizados · Ginásios: 3 atualizado(s)
npm run world:export + git diff            → 23 igual(is), 0 criado/atualizado/removido — diff VAZIO (espelho intacto)
npm run world:import -- --dry-run (depois) → mapas: 20 igual(is) · ginásios: 3 · itens: 11
probes de privilégio mínimo                → SELECT users / SELECT chat_messages / CREATE TABLE → 42501 negados ✔
estado no banco                            → Pikachu nv5: Investida/Choque; ginásios 12|18|38 ✔
docs/world-activation.yml                  → parseia como YAML válido (13 steps)
```

**Coberto pelo ensaio:** grants/policies do papel para todos os scripts,
ordem apply/dry-run do workflow, idempotência e o caso "espelho igual → nada
a commitar". **Não coberto (próprio do destino):** TLS do Session Pooler,
dados reais de produção e o clique no navegador — ficam para a execução
real, que é exatamente o que o workflow automatiza.

### 4.21 Ativação real — tentativa 1: `Invalid URL` (2026-09-06, run `34038129035`)

O workflow rodou pela primeira vez contra o Supabase e morreu em 12 s:
`Invalid URL`. Causa: o step montava o `DATABASE_URL` com `echo >> $GITHUB_ENV`
e o **mesmo step** já o consumia — `$GITHUB_ENV` só vale a partir do **próximo**
step. Corrigido exportando a variável no próprio step.

### 4.22 Ativação real — tentativas 2/3: TLS self-signed (runs `34038223626`, `34038675259`)

Com a URL montada, o `pg` rejeitou o certificado self-signed do Session
Pooler (`sslmode=require` não valida a cadeia). O fix (commit `dca8645` no
`main` + espelho em `docs/`) mudou a política inteira de TLS para a URL — o
`pg` aplica os parâmetros da URL por cima do objeto `ssl`:

```
sslmode=verify-full&sslrootcert=$RUNNER_TEMP/supabase-ca.crt
  + CA gravada com umask 077 + export (não GITHUB_ENV) + DATABASE_SSL* removidos
```

### 4.23 Ativação real — no-op e `APLICAR-production` (runs `34042183890`❌, `34042233626`✅, `34043394359`✅)

- `34042183890` (12 s, ❌): 1ª execução pós-fix — causa não verificável na
  hora (logs da API já não eram baixáveis);
- `34042233626` (38 s, ✅): **no-op** — `apply=false`, só dry-runs, nada
  escrito (confirma o caminho TLS + grants);
- `34043394359` (1 m 02 s, ✅): **`APLICAR-production`** — `world:seed`
  (20 mapas) + `db:rebalance` (movesets + níveis de ginásio) +
  `world:export` + conferência da API pública. **MUNDO ATIVO EM PRODUÇÃO.**

Conferência pós-run (reproduzível, detalhe em
`docs/RELATORIO-POS-ATIVACAO.md`):
```
Summary do run 34043394359 → linha APPLY: + contagem
SQL Editor (produção)      → SELECT count(*) FROM game_maps; → 20
https://catchbound.vercel.app/api/maps → 20 mapas · /api/health → ok
artefato world-diff-*      → ausente = espelho git igual ao banco
```

### 4.24 Ferramentas GM no painel admin (2026-09-06, sandbox)

Sandbox não tem navegador, então a validação foi: (a) suítes completas e
(b) **smoke HTTP real** no dev server (`npm run dev` :3000) contra o
Postgres local (`npm run db:local` + `db:migrate`), com sessão Bearer de um
admin promovido via banco e um alvo registrado:

```
npm run check (com DATABASE_URL local)
→ lint ok · typecheck ok · Test Files 17 passed · Tests 242 passed · build ok

TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db \
  npm run test:integration
→ Test Files 7 passed · Tests 88 passed   (novo gm.integration.test.ts: 15)

smoke HTTP (curl, dev server :3000, banco local):
  GET /api/maps                       → 20 mapas (seed do mundo 6.4-A)
  gm_list (antes)                     → Charmander nv5 (Arranhão/Brasa) · money 3000 · potions 3
  gm_give_money +777                  → 3777
  gm_give_item potions x500           → 503
  gm_give_pokemon Charmander nv 20    → Charmeleon slot 2 · evolvedFrom "Charmander" · golpes Brasa/Redemoinho de Fogo/Garra de Metal/Presa de Fogo
  gm_set_level nv 40 (time inteiro)   → 2× Charizard (evoluíram Charmander→Charizard e Charmeleon→Charizard) · golpes Garra de Metal/Presa de Fogo/Sopro do Dragão/Ataque de Asa
  gm_teleport mapa 2                  → "Mapa 2: Floresta de Viridian" em (8,8) — users.currentMapId/playerX/playerY atualizados
  gm_give_badge 1 (2×)                → 🪨 Insígnia Pedra · badges: 1 (idempotente)
  gm_heal                             → "Equipe ... curada 100% (2 Pokémon)"
  player → gm_give_money              → 403
  alvo inexistente → gm_heal          → 404
  gm_give_item quantity 1000          → 400
  GET /admin                          → 200
```

**Ajuste no caminho:** `gm_give_badge` falhava em banco recém-criado
(`gym_leaders` vazio — o seed de ginásios só rodava via `/api/gym`/batalha).
Conserto: `gm_give_badge` e `gm_teleport` rodam `ensureGymSeeded()`/
`ensureDefaultMapsSeeded()` antes da consulta (idempotentes, idem a rota de
mapas) — sem isso o teste de insígnia era flaky pela ordem de execução dos
arquivos de integração.

**Coberto:** autorização (player/moderator 403, admin ok), 404 de alvo/
mapa/ginásio, 400 de validação (qtd, espécie, posição fora da grade),
cadeia evolutiva completa no level up, learnset persistido, HP cheio,
time→PC Box, idempotência de insígnia e ausência de `passwordHash` nas
respostas. **Não validado aqui:** a seção GM no navegador (mantenedor) e a
própria passada de teste #9–#11 que ela acelera — a UI é um client
component, o que o smoke provou foi o contrato da API por baixo.

### 4.25 Rebrand leve "DELUGE RPG" → "CATCHBOUND" (2026-09-06, sandbox)

Só strings visíveis de UI (título/aba, HUD, AuthModal, banner, chat,
sprites, editor, descrição padrão de mapa) + texto da escolha do inicial.
Como são client components, a prova é: check completo verde + varredura de
strings + o preview em dev server para o mantenedor conferir na tela.

```
grep -rni "deluge" src/ public/ README.md (excluindo identificadores internos)
→ restam só: "inspirado no Pokémon Deluge" (layout description — jogo real de
  inspiração, correto manter), e-mail placeholder @delugerpg.net (dados),
  __delugeRpgPool (chave interna de dev), README (docs, fora do escopo "estética do jogo")

npm run check (DATABASE_URL local)
→ lint ok · typecheck ok · Test Files 17 passed · Tests 242 passed · build ok
```

**Não validado aqui:** a aparência final no navegador (mantenedor) — o
preview dev estava no ar com hot-reload; conferir: aba do navegador,
tela de login (CATCHBOUND + "ESCOLHA SEU PARCEIRO INICIAL!" + "Escolha com
sabedoria" sem a frase de captura), HUD do jogo, chat, modal de sprites e
editor.

### 4.26 Confirmação de e-mail + rebrand final (2026-09-06, sandbox)

Comandos reais executados e saída observada:

```
npm i nodemailer && npm i -D @types/nodemailer
→ +1 pacote (nodemailer), +1 devDep (@types/nodemailer)

# schema: users.email único + emailVerified + email_verification_codes
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run db:generate
→ [✓] SQL migration file ➜ drizzle/0006_melodic_maginty.sql
# + grandfathering colado no fim da migration:
#   UPDATE "users" SET "email_verified" = true;
DATABASE_URL="..." npm run db:migrate
→ [✓] migrations applied successfully

npx tsc --noEmit → 0 erros
npm run test      → Test Files 18 passed · Tests 250 passed
npm run test:integration → Test Files 8 passed · Tests 97 passed
npm run check (DATABASE_URL local)
→ lint ok · typecheck ok · 250 unit + 97 integração · build ok (exit 0)
```

Smoke vivo no dev server (127.0.0.1:3000, hot-reload), sem SMTP (devCode):
```
1) register username+email+password      → 200 · verified:false · devCode · sem cookie/token
2) login antes de confirmar               → 403 "…ainda não confirmou o e-mail…"
3) verify_email código errado             → 400 "Código inválido ou expirado…"
4) verify_email com o devCode             → 200 · set-cookie: catchbound_session=… ·
                                            token (dev) · party com o inicial · verified:true
5) register com e-mail duplicado          → 400 "…já está vinculado a outra conta…"
6) login após confirmar                   → 200
7) login admin/admin12345 (legado)        → 200 (grandfathering funciona)
8) curl / → <title>Catchbound • MMORPG Retro Pixel Online</title>
          description sem "inspirado no Pokémon Deluge"
```

Novos testes: `src/lib/email-verification.test.ts` (8 — código, hash, HTML
estilizado) e `tests/integration/email-verification.integration.test.ts`
(9 — fluxo completo: cadastro não verificado, duplicado, malformado, login
403, código certo/errado/5×+6ª→429, reenvio com cooldown e invalidação do
código antigo, respostas genéricas).

**Não validado aqui:** envio real via SMTP (precisa de credenciais; o
preview `docs/EMAIL-CONFIRMACAO-PREVIEW.html` mostra o visual exato que
sairá) e a aparência do passo "CONFIRME SEU E-MAIL" no navegador (mantenedor
— o preview dev no ar já roda o fluxo com devCode).

---

### 4.27 Incidente do cadastro em produção — reprodução e correção (2026-09-06, sandbox)

Produção não é alcançável do sandbox; o cenário foi **reconstruído localmente**:
build de produção (`NODE_ENV=production`, SMTP configurado com credencial
falsa), banco local com migrations 0000–0006, RLS ligado nas 11 tabelas do
bootstrap e o papel `catchbound_runtime` criado pelo script oficial
(`docs/supabase-production-runtime-role.sql`).

```
# 1) Estado de produção ANTES da correção (tabela nova sem policy):
ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;   -- como no Supabase
POST /api/auth {action:register, username:probe2, email:probe2@example.com, ...}
→ HTTP 500 {"error":"Falha na autenticação."}          ← EXATAMENTE o sintoma
log: [auth] Error: Failed query: insert into "email_verification_codes" ...
     [cause]: error: new row violates row-level security policy for table
     "email_verification_codes"  code: '42501'
SELECT username, email_verified FROM users WHERE username='probe2'
→ [{"username":"probe2","email":"probe2@example.com","email_verified":false}]  ← conta PRESA

# variante sem grant (default privileges não cobriram):
→ HTTP 500 {"error":"Falha na autenticação."} · log: permission denied for table email_verification_codes

# 2) Código corrigido, MESMO banco quebrado:
GET  /api/health → {"ok":true,"emailVerification":"unavailable"}    ← agora visível
POST register     → HTTP 500 {"error":"Erro interno ao processar a solicitação. Tente novamente em instantes."}
SELECT count(*) FROM users WHERE username='probe4' → 0            ← transação: nada preso

# 3) SQL companheiro aplicado (docs/supabase-production-0006-runtime.sql), 2× (idempotente):
→ [{"rls_on":true,"runtime_privs":"4","runtime_policy":"1","backup_policy":"0","migrations":"7","unverified_users":"0"}]
GET  /api/health → {"ok":true,"emailVerification":"ok"}
POST register     → HTTP 503 "Confirmação por e-mail indisponível…"  (SMTP falso: esperado)
SELECT … → [{"username":"probe5","email_verified":false,"codigos":"1"}]  ← conta + código gravados

# 4) Suítes
npx tsc --noEmit                → 0 erros
npm run lint                    → limpo
npm run test                    → Test Files 18 passed · Tests 250 passed
npm run test:integration        → Test Files 8 passed · Tests 98 passed (97 + 1 novo)
npm run build                   → ✓ Compiled successfully
```

**Não validado aqui (sandbox sem egress):** produção real. Fica para o
mantenedor: colar o SQL, conferir `/api/health` → `emailVerification: "ok"`
e refazer o cadastro (o mesmo usuário/e-mail/senha de hoje já funciona: o
servidor reconhece a conta pendente e só reenvia o código).

### 4.28 Fase 6.4-B — Johto + pedras de evolução (2026-09-06, sandbox)

Comandos reais executados e saída observada (banco local em `.pgdata/`,
PostgreSQL 18.4):

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run db:generate
→ [✓] drizzle/0007_flowery_next_avengers.sql (14 colunas + check não-negativa)

DATABASE_URL="..." npm run db:migrate
→ [✓] migrations applied successfully

DATABASE_URL="..." npm run world:seed
→ [world:seed] 20 criado(s), 0 atualizado(s), 20 mapa(s) no total
DATABASE_URL="..." npm run world:export
→ [world:export] 20 mapa(s), 3 ginásio(s), 25 item(ns) de loja
   (0 criado, 17 atualizado, 6 igual)

DATABASE_URL="..." npm run test
→ Test Files 18 passed · Tests 257 passed

DATABASE_URL="..." npm run test:integration
→ Test Files 8 passed · Tests 100 passed
   (novos: Pikachu+thunderStone via /api/pokemon/manage consome e persiste;
    item errado → 400 e não consome)

DATABASE_URL="..." npm run check
→ lint ok · typecheck ok · 257 unit + build ok (exit 0)
```

Notas:
- `POKEDEX` total = **254** (151 Kanto + 100 Johto + 282/384/448). A soma do
  mundo também fecha em 254 (cada espécie em exatamente um mapa).
- Mapa 1 permaneceu intocado (contrato 6.2-C); os pesos das tabelas 2–20 foram
  reequilibrados para caber os Johto novos com soma 100 por mapa.
- Lendários Johto (Raikou/Entei/Suicune/Lugia/Ho-Oh/Celebi) no mapa 20, peso 3.
- Não validado aqui: compra de pedra pelo navegador e UI do Pokémon Box (a
  rota e as lojas estão cobertas por integração; a passada visual é do
  mantenedor).

### 4.29 Fase 6.4-C — catálogo Hoenn (2026-09-06)

Ambiente do sandbox tinha resetado (`node_modules` ausente) — recuperado com
`npm install` antes de qualquer teste.

```bash
# 1. dados canônicos (raw.githubusercontent.com é bloqueado; github.com passa)
git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git /tmp/pokeapi
cd /tmp/pokeapi && git sparse-checkout set data/v2/csv
→ pokemon_species.csv · pokemon_stats.csv · pokemon_types.csv · pokemon_evolution.csv · types.csv

# 2. geração do catálogo (script descartável, saída versionada)
python3 /tmp/gen_hoenn.py
→ espécies: 133   (src/lib/pokedex-hoenn.ts, 533 linhas)

# 3. unit
npx vitest run src/lib/pokedex-hoenn.test.ts
→ Test Files 1 passed · Tests 9 passed

DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check
→ lint ok · typecheck ok · Test Files 19 passed · Tests 266 passed · build 15 rotas (exit 0)

# 4. integração (banco local via `npm run db:local` + drizzle-kit migrate)
DATABASE_URL="..." npm run test:integration
→ Test Files 8 passed · Tests 100 passed
```

Três falhas reais apareceram no caminho e foram corrigidas **no gerador**, não
no teste (o contrato do repo pegou o que era para pegar):

1. `capture` estava lendo a coluna errada do CSV (`r[8]` → `r[9]`): todo Hoenn
   nascia com `catchRate: 1`. Corrigido — Treecko voltou a 45, Poochyena 255.
2. Poochyena/Spoink aprendiam golpe de poder 60/65 no nível 7, violando a curva
   da 6.2-C. O gerador passou a inserir um filler barato (Investida/Arranhão)
   nos dois primeiros aprendizados de tipos pobres em golpes fracos — como o
   catálogo Kanto/Johto já fazia.
3. Tipos sem golpe fraco disponível (Ghost) estouravam o índice ao garantir
   STAB cedo; a rotina passou a rebaixar um golpe do tipo em vez de falhar.

Números observados:
- `POKEDEX.length` = **387** (151 Kanto + 100 Johto + 135 Hoenn + Lucario);
- vitrine de sprites: 387 × 6 = **2322** sprites;
- mundo: continua cobrindo **254** espécies em 20 mapas (Hoenn fora dos
  encontros por decisão do mantenedor) — mapa 1 byte-a-byte intocado;
- **sem migration nova**: nenhuma coluna/tabela criada, logo **nada de SQL em
  produção** neste merge. Migrations seguem em 0000–0007.

Não validado aqui (é do mantenedor, em produção, nunca em preview): a vitrine
de sprites com os Hoenn carregando de fato do CDN, e uma evolução Hoenn ao vivo
(GM → dar Treecko → subir para 16).

### 4.30 Fase 6.4-D — catálogo Sinnoh + 7 itens de evolução + migration 0008 (2026-09-06)

Ambiente do sandbox tinha resetado (`node_modules` ausente) — recuperado com
`npm ci`, `cp .env.example .env`, `npm run db:local` e `drizzle-kit migrate`.

```bash
# 1. dados canônicos (raw.githubusercontent.com é bloqueado; github.com passa)
git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git /tmp/pokeapi
cd /tmp/pokeapi && git sparse-checkout set data/v2/csv
node /tmp/extract.mjs            # → /tmp/sinnoh.json (107 espécies, capture_rate conferido)

# 2. geração do catálogo (script descartável, saída versionada)
npx tsx /tmp/gen-sinnoh.mts > src/lib/pokedex-sinnoh.ts
→ 106 espécies · 39 gatilhos de nível · 0 gatilhos de item internos (todos os itens ficam nas gerações antigas)

# 3. schema → migration 0008 (gerada pelo drizzle-kit, não escrita à mão)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npx drizzle-kit generate --name sinnoh_evolution_items
→ drizzle/0008_sinnoh_evolution_items.sql  (7 ADD COLUMN + DROP/ADD CONSTRAINT)
DATABASE_URL="..." npx drizzle-kit migrate
→ 9 migrations aplicadas · users tem as 7 colunas · check inclui reaper_cloth

# 4. SQL companheiro de produção, testado num banco "prodsim" (0000–0007 + papel catchbound_runtime)
node -e '…aplica docs/supabase-production-0008-runtime.sql 2 vezes…'
→ rodada 1: sinnoh_columns 7 · check_exists 1 · runtime_grants 4 · migrations 9
→ rodada 2: idêntico (idempotente; journal não duplicou)

# 5. unit + lint + typecheck
npx vitest run
→ Test Files 20 passed · Tests 284 passed
npm run lint && npm run typecheck
→ 0 erros

# 6. integração (app_db_test recriado por drizzle-kit push)
DATABASE_URL="..." npm run test:integration
→ Test Files 8 passed · Tests 103 passed   (evolution: 8, com os 3 novos de Sinnoh)

# 7. build
DATABASE_URL="..." npm run build
→ 15 rotas, exit 0

# 8. loja como código
DATABASE_URL="..." npm run world:import        # popula app_db com content/world
ensureShopSeeded()                             # seeda os 7 itens na loja 3
DATABASE_URL="..." npm run world:export
→ loja 3 atualizado (14 item(ns)) — content/world/shops/3.json regenerado, mapas "igual"

# 9. fluxo real com `next dev` (API de verdade, cookies de sessão)
POST /api/auth register → verify_email (devCode) → login
POST /api/admin gm_give_pokemon {112, lv50} · gm_give_item {protector, 1}
POST /api/pokemon/manage use_item {protector}
→ "★ Rhydon evoluiu para Rhyperior! Aprendeu: Disparo de Lama, Arremesso de Rocha, Clava de Osso, Poder Antigo." · protector 1 → 0 · party: Charmander#4, Rhyperior#464
GET  /api/shop?shopId=3 → 14 itens (🪖 Protetor 4500 · 🔋 Eletrizador 4500 · 🌋 Magmatizador 4500 · 🪝 Garra Afiada 4500 · 🦷 Presa Afiada 4500 · 💽 Disco Dúbio 5500 · 🕯️ Manto do Ceifador 5500)
POST /api/shop buy {reaperCloth} → "Comprou 1x Manto do Ceifador por 5500 Pk$!" · reaperCloth 1 · money 9000 → 3500
```

Números observados:
- `POKEDEX.length` = **493** (151 Kanto + 100 Johto + 135 Hoenn + 107 Sinnoh), 0 duplicatas, 0 descrições genéricas;
- gatilhos no catálogo inteiro: **183 por nível + 50 por item**; cada item de Sinnoh tem **exatamente 1** espécie dona;
- vitrine de sprites: 493 × 6 = **2958** sprites;
- mundo: continua cobrindo **254** espécies em 20 mapas — `content/world/maps/*` byte-a-byte intocado (só `shops/3.json` mudou);
- migrations: **0000–0008** (journal idx 8, `when 1788741054279`, sha256 `5f30de13…ca7d65` — os mesmos gravados no SQL companheiro).

Um tropeço de processo, sem efeito no resultado: a 0008 foi gerada duas vezes
(a primeira antes de fechar o catálogo). A primeira foi removida por completo —
arquivo, snapshot e entrada do journal — e o `app_db` recriado do zero antes de
gerar de novo, para o `when`/hash do companheiro corresponderem ao arquivo final.

Não validado aqui (é do mantenedor, em produção): o SQL companheiro no Supabase
real, a loja 3 e a evolução por Protetor em `catchbound.vercel.app`, e os
sprites Sinnoh carregando do CDN no navegador (item #15 do cabeçalho).

### 4.31 Fase 6.4-E — catálogo Unova (494–649), sem migration (2026-09-07)

Ambiente do sandbox tinha resetado parcialmente (`node_modules` ausente) — recuperado com `npm ci`, `cp .env.example .env`, `npm run db:local` (já rodando PID 1867) e `drizzle-kit migrate` (9 migrations ok).

```bash
# 1. dados canônicos (raw.githubusercontent.com bloqueado; github.com passa)
git clone --depth 1 --filter=blob:none --sparse https://github.com/PokeAPI/pokeapi.git /tmp/pokeapi
cd /tmp/pokeapi && git sparse-checkout set data/v2/csv
ls /tmp/pokeapi/data/v2/csv | grep pokemon_species

# 2. geração do catálogo (script descartável, saída versionada)
cat > /tmp/gen-unova.mts << 'MTS'  # imports de /home/user/pokeeeee/src/lib/pokedex.ts e evolution-items.ts
npx tsx /tmp/gen-unova.mts
→ Gerado 156 espécies em /tmp/unova_generated.ts (67K)
head /tmp/unova_generated.ts  # header com proxies e itens documentados
cp /tmp/unova_generated.ts src/lib/pokedex-unova.ts

# 3. wiring
# src/lib/pokedex.ts: import unovaRest + ...unovaRest(ALL_MOVES) → POKEDEX 649
# src/lib/pokedex-gen1.test.ts: ESPERADAS 494–649, length 649
# src/lib/pokedex-sinnoh.test.ts: toBeGreaterThanOrEqual(493)
# src/lib/world-expansion.test.ts: comentário 254 de 649
# src/lib/pokedex-unova.test.ts: 14 testes novos

# 4. check + build + integração
npm ci
→ added 445 packages, 0 vulnerabilities
cp .env.example .env
npx drizzle-kit migrate
→ [✓] migrations applied successfully!
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check
→ Test Files 21 passed · Tests 297 passed (284→297, +13 Unova)
→ ✓ Compiled successfully, 15 rotas
DATABASE_URL="..." npm run test:integration
→ Test Files 8 passed · Tests 103 passed
DATABASE_URL="..." npm run build
→ ✓ Compiled successfully

# 5. smoke de evolução (sem next dev, direto no motor)
npx tsx -e "
  evolutionAtLevel(495,17) → 496 Servine
  evolutionAtLevel(495,36) → 497 Serperior
  evolutionAtLevel(496,36) → 497
  evolutionWithItem(511,'leafStone') → { speciesId:512, itemId:4 }
  evolutionWithItem(513,'fireStone') → { speciesId:514, itemId:1 }
  evolutionAtLevel(527,25) → 528 Swoobat
  evolutionAtLevel(525,40) → 526 Gigalith
  POKEDEX.length → 649
"
→ Snivy 495 lv16 → null (cânone 17), lv17 → 496, lv36 → 497; Pansage+leafStone ok; Boldore/Woobat proxies ok; 649 espécies
```

Números observados:
- `POKEDEX.length` = **649** (151+100+135+107+156), 0 duplicatas, descrições PT (custom para iniciais/legendários, genéricas tipadas para demais);
- gatilhos no catálogo inteiro: **≈ 242 por nível + 59 por item** (9 de Unova reutilizando pedras existentes);
- vitrine de sprites: 649 × 6 = **3894** sprites (Gen V animado até 649, teto do CDN);
- mundo: continua cobrindo **254** espécies em 20 mapas — `content/world/maps/*` byte-a-byte intocado (decisão Etapa A);
- migrations: **0000–0008** (sem nova), logo **sem SQL em produção** neste merge — merge pode ir direto, sem passo de banco;
- curva 6.2-C: nada acima de poder 50 até nível 7 (CI trava); STAB primário ≥70 nos 4 últimos slots para formas finais (exceções: larvas/Magikarp/Ditto).

Não validado aqui (é do mantenedor, em produção): vitrine com 649 carregando do CDN no navegador e evoluções ao vivo via GM (Snivy lv17, Pansage+Folha, item #16 do cabeçalho).

### 4.34 Conferência online do mundo 40 mapas (SQL colável no Supabase)

`docs/world-conferencia.sql` — um `SELECT` que devolve **uma** tabela com 11
checagens (o Editor do Supabase mostra só o último result set, daí o `union all`).
Executado no sandbox contra um banco reconstruído pelo caminho real
(`ensureDefaultMapsSeeded` → `ensureGymSeeded` → `ensureShopSeeded`), saída
observada:

```
✓ 1 mapas                            40      alvo 40
✓ 2 mapas publicados                 40      alvo 40
✓ 3 entradas de encontro             649     alvo 649
✓ 4 espécies distintas                649     alvo 649
✓ 5 mapas com soma de peso <> 100    0       alvo 0
✓ 6 mapas 2-40 com < 14 espécies     0       alvo 0
✓ 7 lendário antes do mapa 10        0       alvo 0
✓ 8 lendário com peso > 20           0       alvo 0
✓ 9 nível fora de 1..100 ou invert.  0       alvo 0
✓ 10 mapa 1: pesos                   22/22/22/18/16
✓ 11 mapa 1: faixas de nível         3-8/3-8/3-8/4-9/4-10
```

Detalhe que o teste pegou: a checagem 6 precisa **excluir o mapa 1** (`numero <>
1`) — ele tem 5 espécies por contrato e não é deficiência do lote.

### 4.33 Fase 7.1 — Mundo até 40 mapas + redistribuição das 649 (2026-09-07, sandbox)

```bash
# 0. Banco local (a migration já estava aplicada; jogo usa DATABASE_URL do .env)
npm run db:local
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db

# 1. Semente limpa num banco vazio (maps → gyms → shops), como na produção
node -e '…TRUNCATE shop_items, gym_leaders, game_maps RESTART IDENTITY CASCADE…'
npx tsx -e '…ensureDefaultMapsSeeded(); ensureGymSeeded(); ensureShopSeeded();'

# 2. Gerador → artefato commitado
npx tsx scripts/world-distribute.mts --report
npx tsx scripts/world-distribute.mts --write
npx tsx scripts/world-distribute.mts --check

# 3. Aplicar no banco e versionar o espelho
npm run world:seed && npm run world:export
npm run world:import -- --dry-run     # round-trip: conteúdo do git == banco

# 4. Qualidade
npx tsc --noEmit && npm run lint
npx vitest run src/lib/world-expansion.test.ts src/lib/world-distribute.test.ts
npm run test && npm run test:integration
npm run build
```

Saídas observadas:

```
--report → espécies distribuídas: 644 | mapa 1 pinado: 5 | total catálogo: 649
           por mapa: min 16, max 17 | ajustes de peso: 20
           bioma: 80% por tipo primário, 89% por qualquer tipo | não colocadas: 0
--write  → [world:distribute] escreveu src/lib/world-encounters.ts (644 espécies em 39 mapas)
--check  → [world:distribute] tabela em dia com o layout e a Pokédex ✓
world:seed   → 20 criado(s), 20 atualizado(s), 40 mapa(s) no total
world:export → 40 mapa(s), 3 ginásio(s), 32 item(ns) de loja → 15 criado(s),
               19 atualizado(s), 9 igual(is), 0 removido(s)
               (2ª rodada: 0 criado, 0 atualizado, 43 igual — idempotente)
world:import --dry-run → mapas: 0 criado, 0 atualizado, 40 igual ·
                         ginásios: 3 igual · itens: 32 igual
npx tsc --noEmit → 0 erros · npm run lint → 0/0
vitest (unit)          → Test Files 22 passed · Tests 308 passed
world-expansion.test   → 12 guardas · world-distribute.test → 8 guardas
npm run test:integration → Test Files 9 passed · Tests 112 passed
npm run build → 15 rotas
npm run check (lint + tsc + test + build, com DATABASE_URL) → ✅ verde
git diff content/world/maps/vale-pallet.json → VAZIO (mapa 1 intacto vs HEAD)
git status --porcelain content/world/shops   → VAZIO (lojas intocadas)
```

⚠️ **Armadilha nova achada no caminho**: `world:export` resolve NPC de ginásio
por `gymId` e recusa líder morando em outro mapa. Numa base reconstruída com
`world:import` (e não com `ensureGymSeeded`), os `gym_leaders.id` vêm em ordem
alfabética (`Brock, Lance, Misty`) e o `gymId` fixo da semente (1/2/3) **quebra
o export** com "NPC "gym-misty" aponta para o ginásio "Lance"". Não é bug do
7.1 — é o contrato id → nome. Reproduza o banco com os seeds da aplicação
(`ensureDefaultMapsSeeded` → `ensureGymSeeded` → `ensureShopSeeded`) ou com o
`world:seed` sobre um banco já semeado, como em produção.

### 4.32 Fase 8.8 — Chat no jogo (global/local/whisper) + decisão B Pokédex completa 649 (2026-09-07)

Ambiente do sandbox tinha resetado (`node_modules` ausente) — recuperado com `npm ci`, `cp .env.example .env`, `npm run db:local` (PID 2662) e `drizzle-kit migrate` 10 migrations ok (0000→0009).

```bash
# 1. schema → migration 0009
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npx drizzle-kit generate --name chat_local_whisper
→ drizzle/0009_chat_local_whisper.sql (map_id, recipient_id, FK, 3 índices, check channel IN global/local/whisper/arena-global)
sha256sum drizzle/0009_chat_local_whisper.sql
→ 7e0f69637b2b8e398c13b1e25dc7a83b11cd9de955be61bfaa949f4ef7ca7dee
cat drizzle/meta/_journal.json | tail
→ idx 9 when 1788782655373 tag 0009_chat_local_whisper

# 2. SQL companheiro de produção + idempotência
cat docs/supabase-production-0009-runtime.sql | head -20
# Teste idempotente num banco prodsim (0000–0008 + papel runtime)
npx tsx /tmp/test-prodsim-0009.ts
→ rodada 1: chat_columns 2 · channel_check 1 · indexes 3 · migrations 10
→ rodada 2: idêntico (idempotente)

# 3. validação + build
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db" npm run check
→ Test Files 21 passed · Tests 297 passed
→ ✓ Compiled successfully, 15 rotas (+ /api/chat)
DATABASE_URL="..." npm run test:integration
→ Test Files 9 passed · Tests 112 passed (103 + 9 chat)
→ chat.integration.test.ts: 9 passed (global, local por mapa, whisper privado só participantes, self 400, 404, conversas, afterId)
DATABASE_URL="..." npm run build
→ ✓ Compiled successfully, 15 rotas

# 4. smoke API real (dev server :3000, 2 usuários)
POST /api/auth register alice/bob → verify → login
POST /api/chat {channel:global, message:"Olá mundo"} → 200 id
GET /api/chat?channel=global → contém Olá mundo
POST /api/chat {channel:local, message:"Alguém aqui?", mapId:1} → 200
GET /api/chat?channel=local&mapId=1 → contém, mapId=2 não contém
POST /api/chat {channel:whisper, message:"segredo", recipientUsername:bob} → 200
GET /api/chat?channel=whisper&withUser=alice (como bob) → contém segredo
GET /api/chat?channel=whisper (como eve) → não contém
GET /api/chat?channel=whisper → conversations inclui bob
```

Números observados:
- `chat_messages` colunas: `map_id`, `recipient_id` + FK + 3 índices + check com 4 canais;
- `POKEDEX.length` continua **649** (decisão B), vitrine 3894 sprites, mundo 254/649 intocado;
- migrations: **0000–0009** (10), journal when 1788782655373, hash `7e0f69…ca7dee` batendo com SQL companheiro;
- UI: ChatWidget 380×420, 3 abas GLOBAL/LOCAL/PRIVADO, badge unread, polling 4s, `/w` atalho, recipient input, cores por canal, timestamp, scroll auto.

Não validado aqui (é do mantenedor, em produção): colar `docs/supabase-production-0009-runtime.sql` no SQL Editor (conferência `chat_columns 2 · channel_check 1 · indexes 3 · migrations 10`), depois no navegador logar, abrir 💬, testar GLOBAL/LOCAL/PRIVADO com 2 contas, badge de não-lidas (item #17).

### 4.35 Fase 8.1+8.2 — cidades, lojas, ginásios, drops e venda (2026-09-07, sandbox)

Comandos executados no sandbox do agente (não são tarefa do mantenedor):

```
# 0. ambiente zerado: npm ci + cp .env.example .env + db:local (PG 18.4 :5432)
#    + drizzle-kit migrate (0000–0009)
# 1. código: gym-teams (8 times), seed-gym (insert-if-absent), seed-shop
#    (11 lojas, pedras 100k–200k, sync de preço), world-layout (5 centers +
#    22 ases), default-world (CITY_NPCS), engine/drops + hook na vitória
#    selvagem, sell no schema/rota, ShopModal COMPRAR/VENDER
npm run lint                    # 0 erros
npm run typecheck               # 0 erros (1 erro intermediário: WorldNpcFile
                                # usa gymLeaderName, não gymId — corrigido no teste)
# 2. gerador → artefato (ases novos mudam a entrada do distribuidor)
npm run world:distribute -- --write   # 37 linhas remexidas
#    21/22 espécies de ginásio nas próprias cidades; Nidoking→Mismagius;
#    --write de novo → 22/22 + --check verde
# 3. banco + espelho
npm run world:seed              # 40 criado(s) [banco novo]
npx tsx scripts/tmp-seed-all.mts  # ensureGymSeeded + ensureShopSeeded (o
                                # world:seed só semeia mapas; o export resolve
                                # ginásio por nome) — script descartado depois
npm run world:export            # 40 mapas, 11 ginásios, 274 itens → 8 criados,
                                # 11 atualizados (2ª rodada: 37 mapas atualizados)
git diff content/world/maps/vale-pallet.json  # VAZIO (mapa 1 intacto)
# 4. qualidade
npm run test                    # 23 arquivos / 315 testes verdes
                                # (308 + 5 drops + 1 níveis dos times + 1 cidades)
npm run test:integration        # 10 arquivos / 120 verdes (112 + 8 city.*)
                                # (1 ajuste: security gym 3→11 líderes)
npm run check                   # lint + tsc + 315 unit + build 15 rotas — verde
# 5. caminhos que os testes não cobrem
npx tsx scripts/tmp-sync-check.mts  # preço 1200→100000 pelo seed (produção) ✓
npm run db:rebalance -- --dry-run   # movesets 0/0, ginásios 0 — no-op limpo ✓
```

### 4.36 Fase 8.4 — Status de batalha (2026-09-08, sandbox)

> Comandos abaixo são do **sandbox do agente** (evidência), não tarefa do
> mantenedor. Os passos dele estão na pendência #18 e em §5.

**Ambiente:** `cp -n .env.example .env && npm ci` (341 pacotes) · `npm run
db:local` (PostgreSQL 18.4 embutido, `127.0.0.1:5432/app_db`) · `npx
drizzle-kit migrate` → 0000–0010 aplicadas.

**Migration 0011 gerada e aplicada:**
```
npx drizzle-kit generate --name battle_status
  → drizzle/0011_battle_status.sql (user_pokemon 26 colunas · users 54 colunas)
npx drizzle-kit migrate → [✓] migrations applied successfully!
sha256sum drizzle/0011_battle_status.sql
  → e28964bfe86d866ef3d8181bf184210998bc13f045b93959b618005e7f8e9fbe
drizzle.__drizzle_migrations: hash e28964bf… · created_at 1788870700554
```

**Companheiro de produção validado (clone `TEMPLATE app_db` revertido ao
estado 0010, roles `catchbound_runtime`/`catchbound_backup` criadas; o SQL
inteiro colado 2×):**
```
rodada 1: status_columns 2 · cure_columns 7 · status_check 1 · inventory_check 1 · runtime_grants 8 · migrations 12
rodada 2: idem (idempotente)
UPDATE user_pokemon SET status='XXX' → ERRO user_pokemon_status_check ✓
UPDATE users SET antidotes=-1        → ERRO users_inventory_nonnegative ✓
```

**Suíte:**
```
npm run check
  eslint .            → 0 problemas (após renomear useItemInBattle → applyBattleItem:
                        o prefixo `use` disparava react-hooks/rules-of-hooks numa rota)
  tsc --noEmit        → 0 erros
  vitest run          → 26 arquivos · 358 testes ✓ (20 status + 15 turn novos;
                        guardas de learnset gen1/hoenn/sinnoh/unova/balance intactas)
  next build          → 17 rotas (16 + /api/boss já existia; nenhuma rota nova — use_item vive em /api/battle)
npm run test:integration → 12 arquivos · 133 testes ✓
  status.integration.test.ts (5): Onda Trovão paralisa pela rota real
  (ou "Não afeta" quando o selvagem é Pikachu — Elétrico imune), status
  persistido + Centro limpa, use_item fora de batalha (recusa sem débito,
  cura e debita 1, Cura Total, Zod 400), use_item em batalha (consome
  turno, debita, recusa sem efeito, Reviver fora do enum), loja 1 vende
  Antídoto 100/Anti-Paralisia 200 e recompra a 50.
  3 execuções seguidas do arquivo novo: 5/5 · 5/5 · 5/5 (sem flake).
```

**Mundo como código:** `npm run world:seed` + `ensureGymSeeded/ensureShopSeeded`
+ `npm run world:export` → 11 lojas `atualizado` (+319 linhas, só itens de
cura). `farol-do-fim.json` voltou a divergir do banco (líder 429 vs 34 — dado
pré-existente da renumeração, **não** desta fase) e foi **revertido** para não
misturar diffs. ⚠️ Lição: `world:export` **poda** arquivos de mapas que não
existem no banco — rodar só com o banco semeado (aconteceu uma vez e foi
restaurado com `git checkout -- content/world` na hora, sem perda).

**O que NÃO foi validado aqui:** Supabase (bloqueado no sandbox) — o
companheiro foi provado em Postgres 18 local, e a UI (etiquetas, barra de
itens, ✨ nos golpes de Status, curas no Pokémon Box) só por build/tipos, não
no navegador. Pendência #18 cobre as duas coisas.

### 4.37 Fase 8.5 — Arena PvP ranqueada (2026-09-08, sandbox)

> Comandos abaixo são do **sandbox do agente** (evidência), não tarefa do
> mantenedor. Os passos dele estão na pendência #19 e em §5.

**Ambiente:** `npm ci` · `cp -n .env.example .env` · `npm run db:local`
(PostgreSQL 18.4 embutido, `127.0.0.1:5432/app_db`, processo
`postgresql-local-a3df6b69`) · `npx drizzle-kit migrate` → 0000–0012 aplicadas.

**Migration 0012 gerada e aplicada:**
```
npx drizzle-kit generate --name pvp_ranked_seasons
  → drizzle/0012_pvp_ranked_seasons.sql (pvp_seasons: week_id/user_id/elo_final/
    rank/reward_claimed + FK + unique(week_id,user_id) + idx(week_id,rank) +
    checks rank ≥ 1 / elo_final ≥ 0)
npx drizzle-kit migrate → [✓] migrations applied successfully!
sha256sum drizzle/0012_pvp_ranked_seasons.sql
  → 23966907c8990e92430df3c664d3095e4af788751d557d567749b9f77101d776
drizzle/meta/_journal.json → idx 12 · when 1788886197168 · tag 0012_pvp_ranked_seasons
```

**Unit do ELO e da temporada:**
```
npx vitest run src/lib/elo.test.ts src/lib/pvp-season.test.ts
  → 2 arquivos · 16 testes ✓
     elo.test.ts (11): simetria, K 32/24, piso 100, vitória ½ K, janela
       crescente, hash de IP estável
     pvp-season.test.ts (5): semana ISO, semana anterior, recompensas por
       colocação, constantes MIN_RANKED_MATCHES/SEASON_TOP_RANKS
```

**Integração nova (8):**
```
TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db \
npx vitest run --config vitest.integration.config.mts tests/integration/pvp-ranked.integration.test.ts
  → 1 arquivo · 8 testes ✓ (1315 ms)
```

**Companheiro de produção validado num banco prodsim** (`app_db_prodsim_0012`,
migrations 0000–0011 aplicadas dos arquivos + journal Drizzle + papéis
`catchbound_runtime`/`catchbound_backup` + RLS ligado em todas as tabelas; o
SQL inteiro colado **2×**):
```
rodada 1: rls_on true · runtime_privs 4 · runtime_policy 1 · backup_policy 1 ·
          indexes 2 · checks 2 · migrations 13
rodada 2: idêntico (idempotente; journal não duplicou)
INSERT rank=0  → ERRO pvp_seasons_rank_check ✓
INSERT elo=-1 → ERRO pvp_seasons_elo_check ✓
SET ROLE catchbound_runtime + INSERT  → ok (policy de escrita) ✓
SET ROLE catchbound_backup + SELECT   → ok (policy de leitura) ✓
```

**Suíte completa:**
```
npm run lint        → 0 problemas (ajuste: loadRanking passou a receber o
                       setter por parâmetro — react-hooks/set-state-in-effect)
npm run typecheck   → 0 erros
npx vitest run      → 28 arquivos · 374 testes ✓ (358 + 16 novos)
npm run test:integration
  → 13 arquivos · 141 testes ✓ (133 + 8 novos)
npm run build       → 17 rotas (nenhuma rota nova — join_ranked e ranking
                       vivem em /api/pvp)
```

**O que NÃO foi validado aqui:** Supabase (bloqueado no sandbox) — o
companheiro 0012 foi provado em Postgres 18 local (prodsim) — e a UI (abas
SALAS/RANQUEADA/RANKING, espera da fila) só por build/tipos, não no navegador.
Pendência #19 cobre as duas coisas.

### 4.38 Fix do bug de pareamento da 8.5 — higiene de salas `WAITING` fantasmas (2026-09-09, sandbox)

> Comandos abaixo são do **sandbox do agente** (evidência), não tarefa do
> mantenedor. Os passos dele seguem em §5.

**Causa-raiz (segunda, após a decisão de MANTER o antifarm de mesmo-IP):** salas
ranqueadas `WAITING` órfãs. Sair da tela de espera (SAIR / trocar de aba /
fechar a aba) não cancelava a fila, e uma nova busca **pulava a própria sala**
(`player1Id === userId → continue`) e criava uma segunda — o rival seguinte
entrava na sala antiga (dono ausente) e o dono ficava preso na nova: "não se
acham". Reproduzido em `tests/integration/repro-stale.integration.test.ts`
(descartável, depois removido): A busca → `DLG-SRGDF`; A busca de novo →
`DLG-LLHMJ` (duplicou); B entra em `DLG-SRGDF` (fantasma) enquanto A fica
`WAITING` em `DLG-LLHMJ`.

**Correção (sem migration; antifarm de mesmo-IP intacto):**
1. `pvp-service.ts` — `joinRanked` **abandona as salas `WAITING` do próprio
   usuário antes de varrer a fila** (`abandonOwnRankedQueue`), e **expira
   preguiçosamente salas sem heartbeat recente** (`RANKED_QUEUE_HEARTBEAT_MS
   = 10 s`, `RANKED_QUEUE_STALE_MS = 45 s`) — o dono vivo faz heartbeat no
   `getState` (atualiza `updated_at`), então esperar muito é legítimo (a janela
   de ELO cresce); quem sumiu vira `ABANDONED`.
2. Ação nova `leave_queue` (`validation.ts` + `pvp/route.ts` + `leaveRanked`)
   para cancelar a fila ao sair da tela de espera.
3. `PvpArena.tsx` chama `leave_queue` ao sair/desmontar durante a espera
   ranqueada.

**Testes:** novo `tests/integration/pvp-ranked-queue.integration.test.ts`
(3: reentrada não cria fantasma e B pareia com a sala viva; `leave_queue`
cancela; sala sem heartbeat é abandonada) + baseline
`pvp-ranked.integration.test.ts` (8) continuam verdes.

```bash
TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db \
npx vitest run --config vitest.integration.config.mts \
  tests/integration/pvp-ranked-queue.integration.test.ts
→ 3 passed

# baseline não regrediu
npx vitest run --config vitest.integration.config.mts \
  tests/integration/pvp-ranked.integration.test.ts
→ 8 passed

npx tsc --noEmit → 0 erros
npx eslint src/lib/pvp-service.ts src/lib/validation.ts \
  src/app/api/pvp/route.ts src/components/PvpArena.tsx \
  tests/integration/pvp-ranked-queue.integration.test.ts → limpo
```

**O que NÃO foi validado aqui:** Supabase (bloqueado no sandbox) e a UI no
navegador (o `leave_queue` no SAIR da espera ranqueada) — pendência #19 cobre.

### 4.39 Fase 8.9 — Presença multiplayer + interação (2026-09-09, sandbox)

> Comandos abaixo são do **sandbox do agente** (evidência), não tarefa do
> mantenedor. Os passos dele estão na pendência #20 e em §5.

**Ambiente:** `npm ci` · `cp -n .env.example .env` · `npm run db:local`
(PostgreSQL 18.4 embutido, `127.0.0.1:5432/app_db`) · `npx drizzle-kit
migrate` → 0000–0013 aplicadas.

**Migration 0013 gerada e aplicada:**
```
npx drizzle-kit generate --name presence_friends
  → drizzle/0013_presence_friends.sql (users.last_seen_at + tabela friendships)
npx drizzle-kit migrate → [✓] migrations applied successfully!
sha256sum drizzle/0013_presence_friends.sql
  → 5b728d561e526461b94d65e9d9fb6e3488a6385b043880a3d82ded694e2900b7
drizzle/meta/_journal.json → idx 13 · when 1788980195288 · tag 0013_presence_friends
```

**Companheiro de produção validado num banco prodsim** (`app_db_prodsim_0013`,
migrations 0000–0012 aplicadas dos arquivos + journal Drizzle + papéis
`catchbound_runtime`/`catchbound_backup` + RLS ligado em todas as tabelas; o
SQL inteiro colado **2×**):
```
rodada 1: rls_on true · runtime_privs 4 · runtime_policy 1 · backup_policy 1 ·
          indexes 3 · checks 1 · last_seen_col 1 · migrations 14
rodada 2: idêntico (idempotente; journal não duplicou)
INSERT friendships least=greatest  → ERRO friendships_least_less_than_greatest ✓
SET ROLE catchbound_runtime + INSERT friendships → ok (policy de escrita) ✓
SET ROLE catchbound_backup + SELECT friendships    → ok (policy de leitura) ✓
```

**Integração nova (7):**
```
TEST_PG_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db \
npx vitest run --config vitest.integration.config.mts \
  tests/integration/presence.integration.test.ts
  → 1 arquivo · 7 testes ✓
     (heartbeat devolve os players do mesmo mapa; isolamento por mapa;
      expiração por last_seen_at; add/remove amigo idempotente; listFriends;
      404 alvo inexistente; 400 self)
```

**Suíte completa:**
```
npm run lint        → 0 problemas
npm run typecheck   → 0 erros (npx tsc --noEmit limpo)
npx vitest run      → 28 arquivos · 374 testes ✓
npm run test:integration
  → 15 arquivos · 151 testes ✓ (141 + 3 do pvp-ranked-queue + 7 presence)
npm run build       → ✓ Compiled successfully (rotas incluem /api/presence e /api/friends)
```

**O que NÃO foi validado aqui:** Supabase (bloqueado no sandbox) — o
companheiro 0013 foi provado em Postgres 18 local (prodsim) — e a UI
(crachás, menu ➕/💬/⚔️, botão 👤 mobile) só por build/tipos, não no navegador.
Pendência #20 cobre as duas coisas.

## 5. Qual a próxima etapa a ser aplicada

### 🐞 Fix #19 + 8.9 prontos no sandbox — entrega (commit/push/PR) pendente (2026-09-09)

**Estado:** a 8.5 está em produção (PR #18 mergeado; pendência #19 aberta com
bug). Sintoma do mantenedor: **duas contas no mesmo nível, na aba RANQUEADA,
não se acham / a batalha não inicia.**

**Investigação (2026-09-09):** 1ª hipótese — o antifarm "mesmo IP não pareia"
(`joinRanked`: `st.p1.ipHash === ipHash → continue`) — reproduzida (mesmo ELO +
mesmo IP → 2 salas `WAITING`, nunca inicia; IPs diferentes → `ACTIVE`).
**Decisão do mantenedor: MANTER o bloqueio de mesmo-IP.** Com isso, a causa real
é a **2ª hipótese**, também confirmada: **salas `WAITING` fantasmas** — sair da
espera sem cancelar deixava a sala na fila e uma nova busca criava uma segunda
(pulando a própria); o rival seguinte caía na sala velha contra um dono ausente.
Reproduzido e **corrigido** (ver §4.38).

**Correção do #19 (sem migration, antifarm de IP intacto):**
- `joinRanked` abandona as salas `WAITING` do próprio usuário antes de varrer a
  fila, e expira preguiçosamente salas sem heartbeat recente (dono sumiu →
  `ABANDONED`); heartbeat no `getState` (10 s) vs expiração (45 s) — esperar
  muito continua legítimo (a janela de ELO cresce).
- Ação nova `leave_queue` (cancela a fila) + `PvpArena` chama ao sair da espera
  ranqueada.
- Teste novo `pvp-ranked-queue.integration.test.ts` (3 ✓) + baseline (8 ✓).

**8.9 implementada por completo** (ver §3 e §4.39): presença por polling 2,5 s
(`POST /api/presence` + `last_seen_at`), amizade (`friendships` + `/api/friends`),
UI de crachás + menu ➕ amigo / 💬 PM (whisper 8.8) / ⚔️ desafio (PvP), migration
**0013** + `docs/supabase-production-0013-runtime.sql` validado 2× em prodsim.
Troca de itens/Pokémon fica para depois (decisão do mantenedor).

**Entrega (autorizada pelo mantenedor):** commit + push na branch da sessão
(`arena/01a08723-pokeeeee`) e PR novo com **fix #19 + 8.9**. Passos do
mantenedor, tudo pela interface:
1. **SQL antes do merge** — colar `docs/supabase-production-0013-runtime.sql`
   no SQL Editor do Supabase (production); conferência esperada:
   `rls_on true · runtime_privs 4 · runtime_policy 1 · backup_policy 1 ·
   indexes 3 · checks 1 · last_seen_col 1 · migrations 14`.
2. **Merge** do PR.
3. **Vercel** → aguardar deploy `Ready`.
4. **Pendências #19 e #20** — navegador:
   - #19: ARENA PVP → RANQUEADA → buscar com 2 contas (pareia sozinho, ELO
     muda no fim); repetir "buscar → SAIR → buscar de novo"; RANKING (top 50
     + posição); forfeit antes do turno 3 (½ K).
   - #20: 2 contas no MESMO mapa → cada um vê o crachá do outro; clicar (ou 👤
     ao pisar na mesma célula) → ➕ amigo / 💬 PM (abre whisper) / ⚔️ desafiar
     (cria sala PvP e sussurra o código).

### 🅲 Etapa C (2026-09-08): 8.4 **em produção** (PR #17, pendência #18 ✅) · **8.5 Arena PvP ranqueada implementada no sandbox** · próxima = **8.6 — NPCs de missão**

**Estado desta rodada:** a 8.4 está em produção (PR #17, `3e223d2`) e a **8.5
— Arena PvP ranqueada** foi implementada e validada no sandbox (unit 16 novos,
integração 8 novos, suíte 374 unit + 141 integração, `npm run check` verde).
O que resta da 8.5 é a **entrega**: PR + SQL 0012 antes do merge + pendência
#19. A implementação está em `src/lib/elo.ts` · `src/lib/pvp-season.ts` ·
`pvp-service.ts` · `route.ts` · `validation.ts` · `PvpLobby.tsx` ·
`PvpArena.tsx` · `drizzle/0012` · `docs/supabase-production-0012-runtime.sql`
(detalhe em `docs/FASE-8-ARENA-PVP.md`).

**Passos do mantenedor (ordem da entrega, tudo pela interface):**
1. **SQL antes do merge** — colar `docs/supabase-production-0012-runtime.sql`
   no SQL Editor do Supabase (production); conferência esperada:
   `rls_on true · runtime_privs 4 · runtime_policy 1 · backup_policy 1 ·
   indexes 2 · checks 2 · migrations 13`.
2. **Merge** do PR da 8.5 (branch `arena/01a081db-pokeeeee`).
3. **Vercel** → aguardar deploy `Ready`.
4. **Pendência #19** — navegador: ARENA PVP → aba RANQUEADA → buscar rival com
   2 contas (pareia sozinho, ELO muda no fim); aba RANKING (top 50 + posição);
   desistir antes do turno 3 (½ K ao vencedor).

**Depois da 8.5:** 8.6 — NPCs de missão (tabela nova, máquina de estado de
missão por jogador, diálogo ramificado, recompensa, travas de progresso) →
8.7 — treinadores de rota → Etapa D (9.1 rebranding, 9.2 legal, 9.3 remetente,
9.4 premium). Backup de produção (Verify restoration) continua **adiado** por
decisão do mantenedor.

**Antes de começar a 8.6:** reler este arquivo inteiro (regra do protocolo) e
`docs/PROMPT-NOVA-CONVERSA.md`; pedir confirmação do mantenedor (a 8.5 ainda
não está em produção).

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
| 2026-08-31 | **Deploy 6.2 em produção** — PR #3 mesclado, migration `0005` aplicada | ✅ Concluída e validada | merge `92936e9` · `/api/maps` com as 3 colunas · §4.13 |
| 2026-09-02 | **Fase 6.2-D** — mundo como código (export/import de mapas, ginásios e lojas) | ✅ Concluída e validada | `content/world/` · `docs/MUNDO-COMO-CODIGO.md` · 19 testes |
| 2026-09-04 | **Handoff de sessão** — consolidação das branchs no AI_State | ✅ Concluída e validada | branch `arena/01a06d75` = 6.2-D + AI_State · §4.14 |
| 2026-09-06 | **Fase 6.2-C** — golpes 15–35, teto aposentado, curva `nível³×0,8`, Brock 12/14 e Misty 18/21 | ✅ Concluída e validada | 13 arquivos/187 testes · `content/world` re-exportado · §4.15 |
| 2026-09-06 | **Verificação de persistência de mapas** — mapa 4 criado, restart, export, banco novo + import | ✅ Provado por execução | §4.16 (pergunta do mantenedor) |
| 2026-09-06 | **Fase 6.3** — evolução no servidor por nível (+Ivysaur/Venusaur/Charmeleon/Wartortle) | ✅ Concluída e validada | 14 arquivos/203 unit · 6/73 integração · §4.16 |
| 2026-09-06 | **Fase 6.3-A** — catálogo Kanto completo: 25 → 156 espécies, +11 golpes, linhas fechadas | ✅ Concluída e validada | 15/215 unit · 6/73 integração · §4.17 |
| 2026-09-06 | **Fase 6.3-B** — golpes com identidade da era GBA: 52 → 133 golpes, learnsets das 156 espécies por tipo e raça | ✅ Concluída e validada | 15/222 unit · 6/73 integração · §4.18 |
| 2026-09-06 | **Fase 6.4-A** — mundo até o mapa 20: 17 mapas temáticos, 156 espécies redistribuídas em bandas 8–95 | ✅ Concluída e validada | 16/231 unit · 6/73 integração · §4.19 |
| 2026-09-06 | **Merge do PR #6** (6.2-C + 6.3 + fix + 6.3-A + 6.3-B + 6.4-A) — ✅ feito; passos de produção pendentes | ⬜ `world:seed` + `db:rebalance` + testes no navegador + `world:export` | `docs/RELATORIO-POS-MERGE.md` |
| 2026-09-06 | **Ferramental de ativação em produção** — workflow `World activation` (Actions) + papel mínimo `catchbound_maint`; roda seed/rebalance/export sem máquina local | ✅ Ensaio local verde (§4.20) · ⬜ execução real pelo mantenedor | `docs/world-activation.yml` · `docs/supabase-production-maint-role.sql` |
| 2026-09-06 | **Ferramentas GM no painel admin** — `gm_list/set_level/give_pokemon/give_item/give_money/heal/teleport/give_badge` (admin-only; reusa o motor de stats/learnset/evolução; UI em `/admin`) | ✅ Concluída e validada | 17/242 unit · 7/88 integração · §4.24 |
| 2026-09-06 | **Rebrand leve** — "DELUGE RPG" → "CATCHBOUND" nas strings visíveis do jogo + texto da escolha do inicial ("Escolha seu parceiro inicial!" / "Escolha com sabedoria") | ✅ Concluída e validada | 17/242 unit · §4.25 · merge em standby |
| 2026-09-06 | **Confirmação de e-mail no cadastro** (e-mail real do jogador + código de 6 dígitos, e-mail HTML estilizado, reenvio/cooldown) + rebrand final (título, description sem Deluge, `catchbound_session`/`catchbound_token`) | ✅ Concluída e validada | 18/250 unit · 8/97 integração · migration 0006 · ⚠️ produção: aplicar migration + envs SMTP ANTES do merge · §4.26 |
| 2026-09-06 | **Ativação do mundo em PRODUÇÃO** — workflow `World activation`: 4 ajustes (`Invalid URL`/GITHUB_ENV → TLS self-signed → fix verify-full+CA `dca8645` → no-op ✅) e `APLICAR-production` ✅ — 20 mapas + rebalance no banco de produção | ✅ Ativado e conferido | run `34043394359` · `SELECT count(*) FROM game_maps` = 20 · `docs/RELATORIO-POS-ATIVACAO.md` · §4.21–4.23 |
| 2026-09-06 | **Merge do PR #8** — rebrand CATCHBOUND + confirmação de e-mail + sync de docs de ativação/handoff → `main` (commit `71c40f1`, CI 100% verde) | ✅ Mergido · ⬜ validação pós-deploy pelo mantenedor (e-mail real + passada no navegador) | `docs/PROMPT-NOVA-CONVERSA.md` (handoff da próxima conversa) |
| 2026-09-06 | **Incidente pós-merge** — cadastro em produção → "Falha na autenticação" (RLS sem policy na tabela `email_verification_codes`; conta presa; erro mascarado). Fix: SQL companheiro `docs/supabase-production-0006-runtime.sql` + cadastro atômico + reenvio para conta pendente + `/api/health.emailVerification` + mensagem de erro honesta | ✅ Reproduzido e corrigido no sandbox · ⬜ SQL em produção pelo mantenedor | 18/250 unit · 8/98 integração · §4.27 |
| 2026-09-06 | **Merge do PR #9** — fix do incidente do cadastro em produção (`arena/01a077fb-pokeeeee` → `main`, commit `6c18858`) | ✅ Mergeado · CI do run `34053895267` verde · ⬜ validação de produção pelo mantenedor (SQL + e-mail real) | `gh pr show 9` · §3/§4.27 |
| 2026-09-06 | **Fase 6.4-B** — catálogo Johto (98 espécies novas; Pokédex 156 → 254) + pedras/evolução por item (14 itens, schema 0007, lojas 1–3, `/api/pokemon/manage`) + redistribuição das 98 no mundo | ✅ Concluída e validada no sandbox · commit `2e2c1dc` · **PR #10** · ⬜ SQL `0007` em produção + passada visual | 18/257 unit · 8/100 integração · `docs/supabase-production-0007-runtime.sql` · §3/§4.28 |
| 2026-09-06 | **Fase 6.4-C** — catálogo Hoenn 252–386: 133 espécies novas (Pokédex 254 → **387**), evolução por nível/pedra dirigida por dados, **sem** redistribuição no mundo (decisão do mantenedor: mapas primeiro) | ✅ Concluída e validada no sandbox · ⬜ passada visual em produção | 19/266 unit · 8/100 integração · `src/lib/pokedex-hoenn.ts` · **sem migration** · §3/§4.29 |
| 2026-09-06 | **Roadmap redefinido pelo mantenedor** — Etapa A (todos os Pokémon) → Etapa B (mundo até 100 mapas) → Etapa C (lojas, bosses lendários, ginásios, status, PvP ranqueado, NPCs de missão) → Etapa D (rebranding/legal/premium). A ordem antiga 6.5→6.6→6.7 foi absorvida na Etapa C | ✅ Registrado | `AI_State.md` §2 |
| 2026-09-06 | **Validação de produção pelo mantenedor** — pendências #1–#14 do cabeçalho (sprites, GM, evoluções por nível e pedra, batalha, captura, ginásio, editor, e-mail real, chat, mapas, admin) conferidas em `catchbound.vercel.app` | ✅ Todas OK · chat só existe no admin e na arena PvP → pedido de **chat no jogo** registrado como 8.8 (Etapa C) | cabeçalho + §2 |
| 2026-09-06 | **Fase 6.4-D** — catálogo Sinnoh 387–493: 106 espécies novas (Pokédex 387 → **493**), 7 itens de evolução **reais** (colunas em `users`, vendidos na loja 3), **migration 0008** + `docs/supabase-production-0008-runtime.sql` (idempotente, testado 2×), 20 linhas cruzadas em Kanto/Johto/Hoenn, **sem** redistribuição no mundo | ✅ Concluída e validada no sandbox · ⬜ SQL `0008` em produção **antes do merge** + passada visual (#15) | 20/284 unit · 8/103 integração · `src/lib/pokedex-sinnoh.ts` · `drizzle/0008_sinnoh_evolution_items.sql` · §3/§4.30 |
| 2026-09-07 | **Fase 6.4-E — Unova (494–649)**: 156 espécies novas (Pokédex 493 → **649**, teto do CDN animado), 9 evoluções por pedra reutilizando itens existentes, 6 proxies (troca→nível, felicidade→nível), **sem migration**, testes 297 unit / 103 integração, sem tocar em `content/world/maps/` | ✅ Concluída e validada no sandbox · ⬜ vitrine 649 + evoluções ao vivo em produção (#16) | 21/297 unit · 8/103 integração · `src/lib/pokedex-unova.ts` · **sem migration** · §3/§4.31 |
| 2026-09-07 | **Decisão B — Pokédex completa em 649** + **Fase 8.8 — Chat no jogo (global/local/whisper)**: chat_messages + map_id + recipient_id, 3 índices, check canal, API /api/chat (global/local/whisper com afterId), ChatWidget HUD (💬 GLOBAL/LOCAL/PRIVADO, badge unread, /w atalho), migration 0009 + `docs/supabase-production-0009-runtime.sql` idempotente | ✅ Concluída e validada no sandbox · ⬜ chat no jogo em produção (#17) | 21/297 unit · 9/112 integração · `src/app/api/chat/route.ts` · `src/components/ChatWidget.tsx` · `drizzle/0009` · §3/§4.32 |
| 2026-09-07 | **Regra nova de protocolo — passos do mantenedor são ONLINE** (GitHub/Vercel/Supabase, sem console): nenhum `git`/`npm`/`git apply` para ele; o ajuste do workflow virou edição de 1 linha pela interface (ou cópia do espelho `docs/world-activation.yml`), `docs/patches/` removido por ser inútil sem terminal, e a conferência do mundo ganhou `docs/world-conferencia.sql` (11 checagens, `SELECT` único, validado no sandbox) | ✅ Registrado (§regra no topo, §1, §4.34, §5) | `docs/FASE-7-MUNDO.md` · §4.34 |
| 2026-09-07 | **Correção de processo (7.1)** — o gate do workflow `World activation` precisava sair de 20 para 40 mapas; o agente não tem permissão `workflows` e o primeiro reparo (colar o patch como arquivo novo `.github/workflows/world-activation-40-mapas`) **não funcionou**: sem `.yml` o GitHub não registra workflow nenhum e o arquivo real continuou o mesmo. Corrigido com `docs/patches/world-activation-40-fix.patch` (aplicar, não colar) + receita de conferência em `docs/FASE-7-MUNDO.md` | ⬜ manter aplicação pelo mantenedor | `gh workflow list` · `diff .github/workflows/… docs/…` |
| 2026-09-07 | **Fase 8.1+8.2 — Cidades (8 lojas + 8 ginásios + cura), pedras 100k–200k, drop 0,2% nv 40+, venda** | ✅ Concluída e validada no sandbox · ⬜ PR + ativação em produção | `docs/FASE-8-CIDADES.md` · §3/§4.35 · 23/315 unit · 10/120 integração · build 15 rotas |
| 2026-09-07 | **Fase 7.1 — Mundo até 40 mapas + redistribuição das 649 espécies**: `world-layout.ts` (40 mapas como dados), `world-distribute.ts` (gerador determinístico: alvo por rank, varredura mapa-a-mapa, afinidade de bioma, teto de desvio, pesos em agenda geométrica, piso de nível de evolução), `world-encounters.ts` (artefato gerado commitado), `default-world.ts` virou renderizador, bandas reescaladas M2 6–20 → M40 86–100 (mapa 1 travado em 3–10), 40 JSONs em `content/world/maps/`, workflow `World activation` 20→40 + `world:distribute:check`, +20 guardas de teste | ✅ Concluída e validada no sandbox · ⬜ PR + ativação em produção | `docs/FASE-7-MUNDO.md` · §3/§4.33 · 22/308 unit · 9/112 integração · build 15 rotas |
| 2026-09-08 | **Fase 8.3 — Arena Boss** (PR #15 A+B) + **incidente `battles_kind_check` pós-renumeração** (PR #16 reparo + `ensureDefaultMapsSeeded`) | ✅ Merged (`c65401d`) · ✅ validado em produção pelo mantenedor 2026-09-08 (pendências A/B/C) | `docs/FASE-8-ARENA-BOSS.md` · `docs/supabase-production-0010-*.sql` · §3/§4.35 |
| 2026-09-08 | **Fase 8.4 — Status de batalha**: PSN/TOX/BRN/PAR/SLP/FRZ (Gen III) em PvE + PvP, `engine/status.ts` + `engine/turn.ts`, 9 golpes de Status + 27 efeitos em 107 learnsets, migration **0011** (`user_pokemon.status/status_turns` + 7 colunas de cura) + `docs/supabase-production-0011-runtime.sql` validado 2×, 7 itens de cura nas lojas por progressão, `POST /api/battle use_item` (consome turno), etiqueta de status + barra ITENS nas 4 telas, curas no Pokémon Box | ✅ Concluída e validada no sandbox · 🔵 **PR #17 aberto** (`c9cfc52`) · ⬜ SQL 0011 antes do merge + pendência #18 em produção | `docs/FASE-8-STATUS.md` · §3/§4.36 · 26/358 unit · 12/133 integração · `drizzle/0011` |
| 2026-09-08 | **8.4 validada em produção pelo mantenedor** — SQL 0011 colado no Supabase antes do merge, PR #17 mergeado em `main` (squash `3e223d2`, commits `c9cfc52`+`533d6b9`), Vercel `Ready`; pendência **#18 ✅** (loja 1 com Antídoto/Anti-Paralisia, Pikachu nv 12 + Onda Trovão → "está paralisado!" + etiqueta PAR, barra ITENS curando e gastando turno, Pokémon Box com etiqueta, Centro limpa, PvP com Pó do Sono) | ✅ 8.4 fechada em produção · próxima = **8.5 Arena PvP ranqueada** | cabeçalho + §2 + §3 + §5 · PR #17 |
| 2026-09-08 | **Fase 8.5 — Arena PvP ranqueada**: ELO K32/K24 (piso 100, só em `ranked`, ½ K no forfeit cedo), fila `join_ranked` (janela 150+50/30s, hash de IP), ranking top 50 (`GET /api/pvp?ranking=1`), temporada semanal (`pvp_seasons`, fechamento preguiçoso + recompensas 1/2/3/10), antifarm (3×/dia por par, mínimo 10, mesmo IP não pareia), migration **0012** + `docs/supabase-production-0012-runtime.sql` (prodsim 2×), UI abas SALAS/RANQUEADA/RANKING | ✅ Concluída e validada no sandbox · ⬜ PR + SQL 0012 antes do merge + pendência **#19** | `docs/FASE-8-ARENA-PVP.md` · §3/§4.37 · 28/374 unit · 13/141 integração · `drizzle/0012` |
| 2026-09-09 | **Investigação do bug de pareamento da 8.5 em produção** (pendência #19): 1ª hipótese = antifarm "mesmo IP não pareia" em `joinRanked` (duas contas do mesmo navegador nunca se acham, ambas presas em `WAITING`) — reproduzida (mesmo ELO+mesmo IP → 2 salas `WAITING`; IPs diferentes → `ACTIVE`); mantenedor decidiu **MANTER** o bloqueio. 2ª hipótese confirmada: **salas `WAITING` fantasmas** (sair sem cancelar + reentrada pulando a própria sala). **8.9 registrada em §2** | 🔍 investigação → ✅ corrigido (linha abaixo) | `AI_State.md` §2/§5 · `pvp-service.ts` (`joinRanked`) · `src/lib/elo.ts` (`hashIp`) · `tests/integration/pvp-ranked.integration.test.ts` |
| 2026-09-09 | **Fix do pareamento da 8.5 (#19)** — mantendo o antifarm de mesmo-IP: `joinRanked` abandona as próprias salas `WAITING` antes da fila + expiração preguiçosa por heartbeat (`updated_at`, 10 s/45 s → `ABANDONED`); ação nova `leave_queue` (`validation.ts` + `pvp/route.ts` + `leaveRanked`) e `PvpArena` cancela a fila ao sair da espera ranqueada. **Sem migration.** Teste novo `pvp-ranked-queue.integration.test.ts` (3) + baseline `pvp-ranked.integration.test.ts` (8) verdes; tsc/eslint limpos | ✅ sandbox · ⬜ PR (sem SQL) + pendência #19 | `pvp-service.ts` · `validation.ts` · `pvp/route.ts` · `PvpArena.tsx` · `tests/integration/pvp-ranked-queue.integration.test.ts` · §4.38 |
| 2026-09-09 | **Fase 8.9 — Presença multiplayer + interação no mapa**: `users.last_seen_at` + tabela `friendships` (par canônico, unique, check) via migration **0013** + `docs/supabase-production-0013-runtime.sql` (prodsim 2×); heartbeat `POST /api/presence` (rate limit 60/min, janela 30 s) com players do mesmo mapa; `GET/POST /api/friends` (add/remove idempotente, 404 alvo, 400 self); crachás `MapPlayers` + menu `PlayerMenu` (➕ amigo / 💬 PM via whisper 8.8 / ⚔️ desafio via PvP), botão 👤 mobile, polling 2,5 s, `whisperTarget` no ChatWidget, avatares em `src/lib/avatars.ts`. Troca de itens/Pokémon fica para depois | ✅ sandbox · ⬜ PR + SQL 0013 antes do merge + pendência **#20** | `src/lib/presence.ts` · `src/app/api/presence/route.ts` · `src/app/api/friends/route.ts` · `MapPlayers.tsx` · `PlayerMenu.tsx` · `drizzle/0013` · §3/§4.39 · 28/374 unit · 15/151 integração |
| — | **Etapa B — Mundo até 100 mapas (7.2 41–60, 7.3 61–80, 7.4 81–100)** | ⬜ Próxima | `AI_State.md` §2/§5 · `docs/FASE-7-MUNDO.md` |

> **Nota sobre o histórico git:** o `.git` do sandbox é resetado entre sessões.
> Commits originais por fase (`fca7f6a`, `f22672f`, `9ea787d`) foram perdidos e
> reunidos em `6496bff`. O código nunca foi afetado, e o push para o GitHub é o
> que preserva o histórico. Por isso a memória do projeto vive **neste
> arquivo**, não no git.

---

### ✅ 2026-09-10 — Convite PvP persistente + arena responsiva + navegação conectada (sessão `arena/01a08aa0-pokeeeee`)

#### 1. O que já existe no projeto

A etapa de convite direto agora está implementada no servidor e na UI:

- `pvp_challenges` foi adicionada ao schema e à migration `drizzle/0014_clever_kid_colt.sql`, com os estados `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED` e `CANCELLED`, FKs para `users`/`pvp_battles`, índices, checks de status e de jogadores distintos.
- `docs/supabase-production-0014-runtime.sql` é o companheiro pronto para o SQL Editor: DDL idempotente, FKs, índices, checks, RLS, revogação para `anon`/`authenticated`, grants/policies de `catchbound_runtime` e `catchbound_backup` quando existente, journal Drizzle e uma única consulta final de conferência.
- `src/lib/pvp-service.ts` implementa convite, consulta, aceite, recusa e cancelamento. O aceite é transacional, cria uma batalha `friendly` diretamente e congela todos os Pokémon vivos dos times atuais, sem IDs escolhidos pelo cliente. A recusa grava cooldown de 10 s; o convite expira em 60 s.
- Requests concorrentes do mesmo usuário/par são serializadas por locks consultivos PostgreSQL; o aceite trava a linha do desafio, portanto duas aceitações não criam duas batalhas.
- `src/app/api/pvp/route.ts` e `src/lib/validation.ts` expõem/validam as quatro ações novas e `GET /api/pvp?challenges=1`.
- `src/components/PvpChallengeModal.tsx` mostra popup central com nome do desafiante e botões `ACEITAR`/`RECUSAR`; o desafiante vê espera/cancelamento. `src/app/page.tsx` usa polling serial de 750 ms e abre a arena para os dois assim que o estado compartilhado informa o `roomCode`.
- `src/components/PvpArena.tsx` usa polling adaptativo serial (~300 ms ativo, ~750 ms aguardando, retry 1,2 s), ignora versões antigas e mostra “Conexão instável” mantendo o último estado, em vez de substituir a arena por erro transitório.
- `src/lib/map-navigation.ts` restringe a lista ao mapa atual e aos destinos diretos dos portais. O desktop agora usa a ordem mapas → jogo → time; no mobile o jogo vem primeiro e `MAPAS`/`TIME` abrem drawers independentes, mantendo HUD e `ChatWidget`.
- Testes novos: `src/lib/pvp-challenge.test.ts`, `src/lib/map-navigation.test.ts` e `tests/integration/pvp-challenges.integration.test.ts` cobrem TTL/cooldown, mapas não conectados, fluxo de arena, expiração, recusa e concorrência.

#### 2. O que falta implementar segundo o roadmap

- [x] Convite PvP persistente, aceite/recusa/cancelamento, TTL/cooldown e composição automática do time vivo.
- [x] Resolução concorrente no servidor e transporte compartilhado por polling.
- [x] Redução dos estados de travamento percebidos na arena com polling serial, versão monotônica e backoff transitório.
- [x] Lista visível de mapas limitada às conexões diretas e layout responsivo solicitado.
- [ ] Aplicar o SQL 0014 no Supabase de produção antes do deploy; conferir a linha final `rls_on=true · runtime_privs=4 · runtime_policy=1 · indexes=3 · checks=2 · fks=3 · migration_0014=1`.
- [ ] Deploy pela Vercel e validação manual com duas contas no mesmo mapa: desafio, popup, recusa + cooldown, aceite + arena simultânea, expiração e concorrência.
- [ ] A integração real contra PostgreSQL ainda não foi executada nesta sessão porque não havia PostgreSQL ouvindo em `127.0.0.1:5432`; os testes foram adicionados e o typecheck os compilou.
- [ ] Troca de itens/Pokémon permanece fora desta rodada, conforme decisão do mantenedor.

#### 3. Qual foi a última etapa aplicada

Apliquei a entrega completa do fluxo solicitado nesta sessão, incluindo o endurecimento final de presença (alvo precisa estar no mesmo mapa e com heartbeat recente), locks consultivos para evitar convites duplicados em corrida, composição apenas com Pokémon vivos, migration/SQL de produção, adaptação de latência da arena, filtro de mapas e layout mobile/desktop.

#### 4. Qual foi o passo a passo de validação da última etapa aplicada

Comandos executados no sandbox do agente e resultados observados:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pokeeeee npm run db:generate
→ [✓] drizzle/0014_clever_kid_colt.sql; schema reportou 16 tabelas e pvp_challenges com 9 colunas, 3 índices e 3 FKs
sha256sum drizzle/0014_clever_kid_colt.sql
→ dcd6afde5c5fae5b7f752ca733227031ab8fca4d7ba3d6173f7bd789fc7b0a9c
npm run typecheck
→ exit 0
npm run lint
→ exit 0
npm test -- --reporter=dot
→ 30 arquivos · 380 testes passando
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pokeeeee npm run build
→ Compilado; TypeScript, páginas estáticas e 17 rotas concluídos

git diff --check
→ sem whitespace inválido
npm run test:integration
→ não executável neste sandbox: ECONNREFUSED 127.0.0.1:5432 durante o global setup; nenhum banco local estava disponível
```

Uma execução unitária anterior teve timeout isolado de 5 s em `world-expansion.test.ts`; a repetição direcionada com `--testTimeout=15000` passou (14/14), e a suíte completa seguinte passou com 380/380. O arquivo de integração novo foi mantido para execução no CI/banco PostgreSQL, mas não foi falsamente declarado verde.

#### 5. Qual a próxima etapa a ser aplicada

1. Pelo GitHub, abrir `docs/supabase-production-0014-runtime.sql`, copiar o arquivo inteiro e colar no SQL Editor do projeto Supabase de produção; executar e guardar a única linha de conferência. Não publicar a aplicação antes de `runtime_policy=1` e `migration_0014=1`.
2. Aguardar o deploy `Ready` na Vercel após o merge/branch desta sessão.
3. No navegador de produção, usar duas contas com heartbeat no mesmo mapa: desafiar pelo menu do player; confirmar popup central; recusar e testar bloqueio por 10 s; enviar novo convite e aceitar; confirmar que os dois abrem a mesma sala `friendly`; deixar outro convite expirar; repetir aceite concorrente se possível.
4. Conferir em desktop a ordem `MAPAS | JOGO | TIME`; em viewport mobile conferir jogo prioritário, botões independentes `MAPAS`/`TIME`, ChatWidget e navegação apenas para portais diretos.
5. Só depois registrar a validação online nesta memória e fechar a pendência correspondente do roadmap.
