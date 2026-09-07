# Fase 7 — Mundo até 100 mapas

> Roadmap completo em `AI_State.md` §2 (Etapa B). Esta fase é o lote de mapas:
> **7.1 (21–40)** → 7.2 (41–60) → 7.3 (61–80) → 7.4 (81–100), cada um com a
> redistribuição das 649 espécies pelo novo lote. Este arquivo é a continuação
> direta de `docs/FASE-6.md` §6.4-A (o mundo de 20 mapas).

## 7.1 — Mapas 21–40 + redistribuição das 649 espécies (2026-09-07)

**Pedido:** gerar os mapas 21–40 com biomas coerentes e progressão de
dificuldade, e redistribuir as 649 espécies do catálogo (rebalanceando os 20
mapas existentes) para que *nenhuma* espécie fique de fora do mundo.

Contrato travado pelo mantenedor antes de codar:

- `content/world/maps/` + `src/lib/default-world.ts` são a fonte de verdade;
  o fluxo é `default-world.ts → world:seed → world:export → testes → PR →
  World activation`;
- o **mapa 1 é intocado** (contrato da 6.2-C: iniciais nv 3–8, Pikachu 4–9,
  Eevee 4–10) — byte a byte igual ao que estava versionado;
- cada uma das 649 espécies em **exatamente um** mapa, pesos somando **100**
  por mapa;
- evolução **nunca** em mapa anterior ao da própria pré-evolução;
- lendários só em mapa **≥ 10** com peso **≤ 20**;
- cadeia de portais navegável a partir do mapa 1;
- `content/world/shops/` **intocada** (nenhum item novo nesta etapa).

### Arquitetura: layout → gerador → artefato commitado → runtime

Antes, o elenco dos 20 mapas estava **digitado à mão** em
`default-world.ts` (254 linhas de `[id, peso]`). Com 644 entradas isso deixa de
ser editável — e passa a ser possível *provar* as propriedades em vez de torcer
para que alguém conte. Três módulos, cada um com um papel:

| Arquivo | Papel | Vive no bundle do app? |
|---|---|---|
| `src/lib/world-layout.ts` | **dados puros**: 40 mapas (identidade, bioma, grade, Centro Pokémon, banda de nível) + listas travadas (mapa 1, lendários, ases de ginásio) | sim |
| `src/lib/world-distribute.ts` | **algoritmo** determinístico que decide onde cada espécie mora, quanto pesa e em que nível aparece | não (só CLI/teste) |
| `src/lib/world-encounters.ts` | **artefato gerado** (`[id, peso, nv mín, nv máx, água]` × 644) | sim |
| `src/lib/default-world.ts` | **renderizador**: layout + artefato → `DefaultMapData[]` (grade, portais, NPCs) | sim |

O gerador fica **fora** do bundle do app de propósito: `world-encounters.ts` é
importado pela runtime e não pode arrastar `pokedex.ts` + o distribuidor inteiro
para o browser. Pesos e níveis já saem calculados do artefato, então o runtime
não reimplementa nenhuma regra — e a escada não diverge entre os dois lados.

```
npm run world:distribute -- --report   # diagnóstico mapa a mapa
npm run world:distribute -- --write    # regrava src/lib/world-encounters.ts
npm run world:distribute -- --check    # falha se o commitado ≠ regerado
```

### Como o distribuidor decide

1. **Grafo de evolução** (`buildGraph`): uma passada no catálogo gera
   `childrenOf`/`parentsOf`/`stage`/`evolutionIn`. O grafo é uma **floresta**
   (0 merges no catálogo atual) e 294 espécies têm `evolvesTo`.
2. **Score de progressão** `0.38·BST + 0.22·raridade + 0.16·estágio +
   0.24·nívelDeEvolução`, normalizado. Lendários ignoram o score: entram na
   **janela da própria geração** (Kanto 18–22, Johto 22–27, Hoenn 26–31,
   Sinnoh 30–35, Unova 34–40), então Mewtwo não vira commons do meio do jogo.
3. **Alvo por rank** (`targetMapForRank`), não por score absoluto: as cotas
   ficam equilibradas por construção. Com score absoluto os valores se
   amontoam em 0,05–0,4 e o mapa 2 ficava com 8 espécies enquanto o resto
   estourava.
4. **Varredura mapa-a-mapa**: cada mapa, na ordem da jornada, escolhe suas 16–17
   melhores entre as espécies **prontas** (pais já colocados) — monotonicidade
   de evolução é garantida *por construção*, não por reparo posterior. O custo
   é `|mapa − alvo| · 1,2 − afinidadeDeBioma · 1,7`, com **teto macio de desvio**
   (6 mapas, custo explode depois): bioma nenhum vale levar uma espécie para o
   outro lado da jornada.
5. **Afinidade de bioma** (+3 tipo primário no tema, +2 secundário, +1 se é
   Water e o mapa tem água, −0,5 se é terrestre em mapa alagado, lendário +2,5
   nos santuários, +1,2 se o pai mora no mesmo mapa) é pré-computada por
   `(espécie, mapa)` — sem isso o passe de troca levava 290 s.
6. **Passe de troca** entre mapas vizios (|Δ| ≤ 5, ganho mínimo 0,4, limite de
   iterações): melhora coerência sem mexer nas cotas, porque troca preserva
   contagem. Toda leitura do estado é **fresca** dentro do laço — guardar a
   referência fora corrompia a tabela (espécie repetida 84×; o bug está
   corrigido e é o motivo do comentário no código).
7. **Pesos** em agenda geométrica (decaimento 0,87) pela raridade da espécie no
   mapa, com teto 10 para lendários e 30 para comuns, ajustada ±1 até fechar
   os 100 exatos. É isso que reproduz o desenho antigo (commons em 14–18,
   cauda rara em 2–5) em vez de um bolo achatado.
8. **Níveis**: banda do mapa + altura conforme o peso + **piso de evolução**
   (`max(base, nívelDeEvolução + 1)`, limitado ao topo da banda). *Proxy*:
   evolução por troca/felicidade não tem nível, então recebe o nível médio da
   linha como piso — é o mesmo proxy já usado nos gatilhos de evolução do
   motor. Trade/felicidade de verdade continuam sendo do jogador.

### Bandas reescaladas (e por quê)

A 6.4-A subia +4 por mapa em 20 mapas e terminava em 82–95. Com 40 mapas a
escada precisava continuar subindo sem estourar o teto de nível 100
(`levelSchema` é 1–100). Nova regra: `lo = 6 + round((n − 2) · 80 / 38)`,
`hi = min(100, lo + 14)` — ~2 níveis por mapa, 14 de largura, sempre
sobrepostos. **A âncora do contrato não se mexe: mapa 1 = 3–10.**

### Os 40 mapas

| # | slug | nv | bioma | entradas | notas | maior → menor peso |
|---|---|---|---|---|---|---|
| 1 | `vale-pallet` | 3–10 | Grass / Fire / Water / Electric / Normal | 5 | contrato 6.2-C, **pinado fora do gerador** | Bulbasaur → Eevee |
| 2 | `floresta-viridian` | 6–20 | Bug / Grass / Poison | 17 | — | Caterpie → Paras |
| 3 | `pico-celeste` | 8–22 | Rock / Ground / Fighting / Normal | 17 | — | Pidgey → Swinub |
| 4 | `caverna-monte-lua` | 10–24 | Poison / Rock / Fairy / Bug | 17 | Centro Pokémon | Ekans → Cleffa |
| 5 | `litoral-vermilion` | 13–27 | Water / Rock / Psychic | 17 | — | Poliwag → Makuhita |
| 6 | `pantano-venenoso` | 14–28 | Poison / Water / Grass | 17 | — | Oddish → Foongus |
| 7 | `usina-volt` | 17–31 | Electric / Steel / Poison | 17 | — | Bronzor → Klink |
| 8 | `deserto-das-ruinas` | 19–33 | Rock / Ground / Normal | 17 | Centro Pokémon | Geodude → Happiny |
| 9 | `planicies-douradas` | 21–35 | Normal / Grass / Fire | 17 | — | Numel → Darumaka |
| 10 | `ilhas-glaciais` | 23–37 | Ice / Water | 17 | — | Psyduck → Oshawott |
| 11 | `torre-dos-espiritos` | 25–39 | Ghost / Psychic / Normal / Flying | 17 | — | Audino → Shedinja |
| 12 | `vulcao-cinnabar` | 27–41 | Fire / Ground / Electric | 17 | — | Plusle → Tepig |
| 13 | `cidade-sombria` | 29–43 | Dark / Fighting / Poison | 17 | Centro Pokémon | Vullaby → Deino |
| 14 | `vale-das-fadas` | 31–45 | Fairy / Normal / Grass | 17 | — | Maractus → Ditto |
| 15 | `fossa-abissal` | 33–47 | Water / Dragon / Ice | 17 | — | Alomomola → Mantyke |
| 16 | `canion-dos-fosseis` | 36–50 | Rock / Flying / Ground | 17 | Centro Pokémon | Shuckle → Murkrow |
| 17 | `selva-profunda` | 38–52 | Bug / Grass / Poison / Dragon | 17 | — | Roselia → Ivysaur |
| 18 | `rota-do-ceu` | 40–54 | Flying / Normal / Dragon | 17 | — | Zangoose → Chatot |
| 19 | `caverna-suprema` | 42–56 | Psychic / Steel / Ghost / Dark | 17 | — | Spiritomb → Beldum |
| 20 | `santuario-celeste` | 44–58 | Dragon / Flying / Psychic | 17 | Centro Pokémon + **lendários** | Crobat → Lugia |
| 21 | `trilha-do-ocaso` | 46–60 | Normal / Flying | 17 | — | Raticate → Cryogonal |
| 22 | `bosque-da-seiva` | 48–62 | Grass / Bug | 16 | — | Sunflora → Servine |
| 23 | `gruta-do-eco` | 50–64 | Psychic / Rock / Fighting | 16 | — | Hariyama → Pignite |
| 24 | `praia-do-coral` | 53–67 | Water / Rock / Bug | 16 | Centro Pokémon | Crawdaunt → Suicune |
| 25 | `forja-abandonada` | 54–68 | Steel / Rock / Dark | 16 | — | Mightyena → Registeel |
| 26 | `pantano-do-silencio` | 57–71 | Poison / Bug / Water | 16 | — | Cofagrigus → Dustox |
| 27 | `cratera-de-brasa` | 59–73 | Fire / Ground / Dragon | 16 | — | Camerupt → Groudon |
| 28 | `lago-espelhado` | 61–75 | Water / Psychic | 16 | — | Bronzong → Mesprit |
| 29 | `jardim-da-lua` | 63–77 | Fairy / Grass / Dark | 16 | Centro Pokémon | Scrafty → Zoroark |
| 30 | `recife-da-tempestade` | 65–79 | Water / Fighting / Flying | 16 | — | Golduck → Rayquaza |
| 31 | `duna-de-vidro` | 67–81 | Ground / Rock / Electric | 16 | — | Golurk → Azelf |
| 32 | `geleira-suspensa` | 69–83 | Ice / Water | 16 | — | Dewgong → Palkia |
| 33 | `serra-fumegante` | 71–85 | Fire / Rock / Fighting | 16 | — | Arcanine → Terrakion |
| 34 | `mata-noturna` | 73–87 | Dark / Bug / Ghost | 16 | — | Escavalier → Darkrai |
| 35 | `farol-do-fim` | 76–90 | Ghost / Water | 16 | Centro Pokémon | Tentacruel → Manaphy |
| 36 | `planalto-do-raio` | 78–92 | Electric / Flying / Steel | 16 | — | Mandibuzz → Thundurus |
| 37 | `ninho-do-dragao` | 80–94 | Dragon / Grass / Fire | 16 | — | Roserade → Charizard |
| 38 | `tundra-ancestral` | 82–96 | Ice / Ground / Normal | 16 | — | Braviary → Landorus |
| 39 | `santuario-submerso` | 84–98 | Water / Psychic / Ghost / Grass | 16 | Centro Pokémon + **lendários** | Alakazam → Keldeo |
| 40 | `coroa-do-mundo` | 86–100 | Dragon / Steel / Normal | 16 | Centro Pokémon + **lendários** | Slaking → Genesect |

*(a tabela acima é gerada de `world-layout.ts` + `world-encounters.ts`; se mexer
no layout, regenere a documentação com o mesmo `--report`.)*

### Decisões de conteúdo registradas

- **Nenhum NPC de loja nos mapas novos.** Sem item novo não há o que vender, e
  loja apontando para `shopId` inexistente violaria o contrato do export.
  `content/world/shops/{1,2,3}.json` ficaram **byte a byte** iguais.
- **Ginásios continuam só nos mapas 1–3** (Brock/Misty/Lance). Ginásios novos
  são Etapa C (8.2), junto com Elite Four; `GYM_ACE_MIN_MAP` já trava que os
  ases atuais não aparecem como selvagens antes do próprio desafio.
- **Centro Pokémon é TILE** (`center`), não entidade: os mapas com `center` no
  layout têm o tile na grade; trecho longo sem curar é dificuldade de propósito.
- **Mapas 2 e 3 trocaram de elenco** (era a época das 25 espécies: Gengar,
  Lucario e Rayquaza como commons de mapa 2–3). Grades, lojas, ginásios e
  portais originais permanecem; o mapa 3 mantém a saída norte que inicia a
  cadeia até o 40.
- **Mapa 40 é o fim da linha** (só portal sul), e o `world:export` é quem grava
  os `targetMapId` resolvidos por slug.

### Validação (rodada 2026-09-07, sandbox com Postgres local)

```
npx tsc --noEmit                      → limpo
npm run lint                          → limpo
npm run test                          → 22 arquivos, 308 testes
npm run test:integration              → 9 arquivos, 112 testes
npm run build                         → 15 rotas

npm run world:distribute -- --report  → 644 distribuídas + 5 pinadas = 649
                                        por mapa: min 16, max 17
                                        bioma: 80% tipo primário / 89% qualquer tipo
                                        lendários: peso máx 4, mapa mín 10
npm run world:distribute:check        → tabela em dia com o layout e a Pokédex ✓
npm run world:seed                    → 20 criado(s), 20 atualizado(s), 40 mapa(s)
npm run world:export                  → 40 mapa(s), 3 ginásio(s), 32 item(ns) de loja
                                        15 criado(s), 19 atualizado(s), 9 igual(is), 0 removido(s)
npm run world:import -- --dry-run     → 40 igual / 3 igual / 32 igual (round-trip estável)
git diff content/world/maps/vale-pallet.json → VAZIO (mapa 1 intacto)
git status --porcelain content/world/shops   → VAZIO
```

Os testes novos/reescritos:

- `src/lib/world-expansion.test.ts` (12 guardas) — lê os **JSONs versionados** e
  confere: 40 mapas numerados sem buraco, mapa 1 verbatim, 649 espécies × 1,
  pesos 100, `tileTypes` que existem na grade, evolução monotônica, lendários
  ≥M10 e ≤20, banda citada na descrição = banda real, cadeia de portais,
  **smoke do pipeline de encontro** (1.000 sorteios/mapa por `pickWeighted` +
  `rollEncounterLevel` reais) e a identidade **semente em código ↔ conteúdo
  versionado**;
- `src/lib/world-distribute.test.ts` (8 guardas) — determinismo, artefato
  commitado == regerado, cotas, tetos de peso, janelas de lendários, piso de
  nível de evolução e o piso de coerência de bioma (70%), acima do qual a
  curadoria à mão de 6.4-A estava (72%).

### ⚠️ Passo manual antes de ativar (permissão de workflow)

O agente não tem permissão `workflows` no app do GitHub, então **este PR não
mexe em `.github/workflows/world-activation.yml`** — mas o arquivo ainda gateda
`/api/maps` em **20** mapas e o conteúdo versionado agora tem **40**. Sem o
ajuste, a ativação falha no step "Verify public API".

Como o espelho `docs/world-activation.yml` **está** no PR (já atualizado para
40 + o step novo de `world:distribute:check`), basta o mantenedor aplicar e
commitar no branch do PR:

```bash
git apply docs/patches/world-activation-40-mapas.patch   # idêntico ao espelho docs/
# ou: cp docs/world-activation.yml .github/workflows/world-activation.yml
git add .github/workflows/world-activation.yml && git commit -m "ci(7.1): World activation 20 → 40 mapas + gate world:distribute:check"
```

Depois disso o fluxo normal vale: `World activation` → `staging apply=false` →
`production apply=false` → `production apply=true`.

### Para 7.2 (mapas 41–60)

O gerador já é parametrizado por `WORLD_MAP_COUNT`/`WORLD_MAP_LAYOUT`: o lote
novo é (1) acrescentar 20 entradas de layout, (2) reescalonar as bandas para
terminar em ~100 no mapa 60, (3) `--write` + `world:seed` + `world:export`.
O que vai exigir decisão: as bandas passam a ter ~1 nível de largura — ou o
teto de 100 se redistribui (compressão no fim da jornada) ou os mapas 41–60
recebem bandas *sobrepostas* de propósito (duas regiões de mesmo nível). Vale
registrar a escolha em `docs/FASE-7-MUNDO.md` antes de codar.
