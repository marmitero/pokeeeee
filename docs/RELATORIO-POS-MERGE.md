# Relatório pós-merge — PR #6 (o que entrou no `main`)

> **Para a próxima conversa começar aqui.** Este relatório assume que o merge
> já foi feito (2026-09-06, merge commit no estilo do repo). Ele resume tudo
> que a branch `arena/01a07639-pokeeeee` entregou e o que o mantenedor precisa
> fazer em produção. Protocolo da próxima conversa: ler `AI_State.md` primeiro
> (regra do handoff), depois este arquivo.

---

## 1. Os commits que entraram no merge

| Commit | Fase | Resumo |
|---|---|---|
| `882bffd` | **6.2-C** | Golpes fracos 15–35, teto de dano APOSENTADO, curva `nível³ × 0,8`, Brock 12/14 e Misty 18/21 restaurados |
| `922c392` | **6.3** | Evolução no servidor por nível, dirigida por dados (`evolvesTo`), sem endpoint chamável |
| `331c0a6` | fix flaky | Teste de integração de batalha reescrito (`bestMoveIndex` + flee/heal/retry) |
| `68c1879` | **6.3-A** | Catálogo Kanto completo: 25 → 156 espécies, linhas evolutivas fechadas |
| `43499a9` | **6.3-B** | Golpes com identidade da era GBA: 52 → 133 golpes, learnsets das 156 espécies por tipo e raça |
| `eb309a9` | **6.4-A** | Mundo até o mapa 20: 17 regiões temáticas + as 156 espécies distribuídas |
| *(este)* | pós-merge | Relatório + `AI_State` atualizado para o estado pós-merge |

## 2. O que o jogo tem agora (estado do `main`)

- **156 espécies** — Kanto 1–151 completa + Umbreon (197), Steelix (208),
  Gardevoir (282), Rayquaza (384), Lucario (448). Tipagem/status-base
  canônicos modernos (Fairy em Clefairy/Jigglypuff/Mr. Mime; Magnemite
  Electric/Steel).
- **133 golpes com identidade** — pesquisa nos jogos de GBA (Ruby/Sapphire/
  Emerald/FireRed/LeafGreen, mais Gen 1/2): assinaturas (Hiperpresa, Agulha
  Dupla, Ossomerangue, Martelo Pinça, Chute de Salto Alto, Gancho do Céu,
  Cabeçada Ossuda, Dia de Pagamento, Velocidade Extrema, Chupavidas, Poder
  Antigo…), os três socos elementais do Hitmonchan, 10 golpes de Lutador.
  Todos os 18 tipos com ≥ 4 golpes de dano. Rúbrio de conversão entre fontes
  documentada no código (`pokedex.ts`, bloco 6.3-B).
- **Learnsets de 1.102 entradas** (~7 golpes/espécie) por tipo E raça;
  larvas/Magikarp/Ditto fracos de propósito (canon).
- **Evoluções por nível**: 43 linhas canônicas + 17 provisórias (pedra/troca
  viram nível, marcadas `// pedra`/`// troca` para trocar quando os itens
  existirem). Vaporeon/Jolteon/Flareon existem sem gatilho (exige mecânica
  de escolha); Eevee→Umbreon@30.
- **20 mapas temáticos** em cadeia de portais 3↔20 (ver tabela na seção 3).
- Motor de batalha com STAB/tipos/crítico/precisão, captura, XP/level-up com
  aprendizado de golpe, 3 ginásios (Brock 12/14, Misty 18/21, Lance 38/45),
  11 itens de loja, 6 variantes de sprite, Editor de Mundos com camadas.
- **Qualidade**: unitários 16 arquivos/**231** · integração **6/73** ·
  `balance:report` limpo · CI verde (Lint/Typecheck/Unit/Integration/Build,
  dois workflows).

## 3. O mundo até o mapa 20 (6.4-A)

Cada tema justifica os tipos encontrados; faixa de nível sobe +4 por mapa
(com sobreposição) e o peso decide a altura na faixa (comum na base,
raro/lendário no topo):

| # | Mapa | Tema | Faixa | Destaques |
|---|---|---|---|---|
| 1 | Vale Pallet | prado inicial | 3–10 | iniciais + Pikachu + Eevee (**intocado — contrato 6.2-C**) |
| 2 | Floresta de Viridian | mata fechada | 8–16 | Caterpie/Weedle/Pidgey/Oddish/Bellsprout |
| 3 | Pico Celeste | colinas rochosas | 14–24 | Geodude/Machop/Nidoran; Onix e Rhyhorn raros |
| 4 | Caverna do Monte Lua | caverna | 18–28 | Zubat/Clefairy/Abra; **Chansey 2%** |
| 5 | Litoral de Vermilion | praia / mar raso | 22–32 | Magikarp/Krabby/Horsea/Poliwag; Shellder raro |
| 6 | Pântano Venenoso | pântano | 26–36 | Grimer/Koffing/Gastly; Ivysaur no lodo |
| 7 | Usina de Volt | usina elétrica | 30–40 | Magnemite/Voltorb/Raichu; Jolteon 6% |
| 8 | Deserto das Ruínas | deserto | 34–44 | Sandslash/Tauros/Pinsir; Graveler/Kangaskhan |
| 9 | Planícies Douradas | campos | 38–48 | Ponyta/Growlithe/Vulpix; Snorlax na trilha |
| 10 | Ilhas Glaciais | gelo | 42–52 | Seel/Jynx/Wartortle; Lapras 8%, **Articuno 2%** |
| 11 | Torre dos Espíritos | fantasma | 46–56 | Haunter/Hypno/Kadabra/Mr. Mime |
| 12 | Vulcão de Cinnabar | vulcão | 50–60 | Charmeleon→Ninetales/Arcanine/Rapidash; **Moltres 4%** |
| 13 | Cidade Sombria | becos + dojo | 54–64 | Umbreon/Lucario/Hitmonlee/Hitmonchan/Machamp |
| 14 | Vale das Fadas | fada | 58–68 | Clefable/Gardevoir/Venusaur/Vileplume |
| 15 | Fossa Abissal | mar profundo | 62–72 | Starmie/Vaporeon/Seadra; **Blastoise** |
| 16 | Cânion dos Fósseis | fósseis | 66–76 | Omanyte/Kabuto/Aerodactyl/Golem/Nidoking |
| 17 | Selva Profunda | selva | 70–80 | Butterfree/Beedrill/Scyther; Dratini 18% |
| 18 | Rota do Céu | céu | 74–84 | **Charizard**/Gyarados/Pidgeot/Dodrio |
| 19 | Caverna Suprema | fim do mundo | 78–90 | Gengar/Alakazam/Steelix/Rhydon; **Mewtwo 10%**, Ditto |
| 20 | Santuário Celeste | santuário lendário | 82–95 | Dragonite/Dragonair; **Rayquaza 16%, Zapdos 12%, Mew 8%** |

Regras (todas viraram teste em `src/lib/world-expansion.test.ts`): cada
espécie em **exatamente um** mapa; **evolução nunca regride de mapa**;
lendários só ≥ mapa 10 com peso ≤ 20; pesos somam 100 por mapa; mapa 1
pinado; cadeia de portais 3↔20 íntegra. Centro Pokémon apenas em
4/8/13/16/20 — trecho sem curar é dificuldade de propósito.

## 4. ✅ PASSOS DO MANTENEDOR EM PRODUÇÃO (após o deploy automático)

Mapas vivem no **banco** — o merge só sobe código. Uma vez em produção:

1. Conferir o deploy (catchbound.vercel.app) — **sempre testar em
   produção, nunca em preview** (regra do handoff).
2. **`DATABASE_URL=<produção> npm run world:seed`** — leva os 20 mapas ao
   banco de produção. Idempotente por slug; preserva as camadas pintadas no
   Editor (`encounterGrid`/`collisionGrid`); nunca apaga nada. (Num banco
   novo, o seed da aplicação já cria os 20 sozinho.)
3. **`npm run db:rebalance`** em produção (dependência pendente das fases
   anteriores de balanceamento).
4. Testar no navegador (checklist completo no `AI_State.md` §2): evolução
   ao vivo (#10), vitrine de sprites 156×6 (#11) e, novo, **caminhar do
   mapa 3 para o norte** — cadeia até o mapa 20, temas, encontros coerentes
   (Chansey raríssima na Caverna do Monte Lua; lendários do mapa 10 em
   diante).
5. **`DATABASE_URL=<produção> npm run world:export`** + commit — versionar o
   estado real de produção em `content/world/` (MUNDO-COMO-CODIGO).
6. (Opcional) mapa 1 à mão no Editor — o seed o mantém como hoje.

Conexão de produção: `DATABASE_USER`/`PRODUCTION_DB_USER` no Session Pooler
do Supabase no formato `role.PROJECT_REF`, porta **5432** (nunca 6543).
**Nunca** commitar `.env`/connection strings/segredos.

## 5. Decisões de design vigentes (não refazer o que já foi decidido)

- **Pedra/troca = nível provisório** (marcado `// pedra`/`// troca`) até os
  itens de evolução existirem; quando existirem, os gatilhos trocam de
  `level` para `item`.
- Pedras na loja + espécies de **Johto e além** = restante da 6.4 (só com
  decisão do mantenedor; sprites animados existem até o **id 649** — Gen 6+
  exige outra fonte).
- Sprites: PokeAPI/sprites, Gen V B/W **animadas** (front/back/shiny),
  builder único por id (`spriteUrl` em `pokedex-gen1.ts`) — quando o jogo
  tiver estética própria, a troca é um ponto só.
- Mapa 1 é contrato da 6.2-C (iniciais 3–8, Pikachu 4–9, Eevee 4–10;
  ginásio Brock 12/14) — guardado por testes.
- O jogo deve ser **difícil** (diretriz do mantenedor): por isso Centro
  Pokémon esparso, lendários com peso baixo, evolução sem atalho.
- Nome/sprites Pokémon/Deluge são **temporários**; rebranding completo antes
  de divulgação, monetização, anúncios ou microtransações. Premium (6.8)
  bloqueado até lá.

## 6. Roadmap a partir daqui

```
6.4 restante (Johto + pedras na loja — decidir com o mantenedor)
  →  6.5 status (paralisia/queimadura/veneno etc.)  →  6.6 PvP ranqueado
  →  6.7 NPCs editáveis  →  6.8 premium (bloqueado até rebranding)
```

## 7. Onde as coisas vivem (mapa rápido de arquivos)

| Arquivo | Conteúdo |
|---|---|
| `src/lib/pokedex.ts` | `ALL_MOVES` (133 golpes) + 25 espécies base + `movesAtLevel` |
| `src/lib/pokedex-gen1.ts` | 131 espécies Kanto (builder de sprites + learnsets) |
| `src/lib/default-world.ts` | Os 20 mapas como dados (grades, encontros, portais) |
| `src/lib/seed-maps.ts` | Semeia os 20 mapas em banco vazio |
| `scripts/world-seed.mts` | `npm run world:seed` — idempotente em banco existente |
| `content/world/maps/` | Os 20 mapas versionados (MUNDO-COMO-CODIGO) |
| `src/lib/world-expansion.test.ts` | 9 guardas do mundo (progressão, pesos, lendários…) |
| `src/lib/pokedex-gen1.test.ts` | 18 guardas do catálogo (roster, golpes, assinaturas…) |
| `src/lib/engine/` | Motor: dano, tipos 18×18, evolução, XP, captura, combate |
| `docs/FASE-6.md` | Histórico completo das fases 6.1 → 6.4-A |
| `AI_State.md` | Estado + protocolo + validações (ler SEMPRE primeiro) |

---

*Gerado em 2026-09-06 para a conversa pós-merge. Números da validação final:
check 16 arquivos/231 testes · integração 6/73 · balance-report "✓ todas as
espécies ok" · CI verde nos dois workflows.*
