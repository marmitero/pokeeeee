# Fase 6 — Conteúdo e mundo

> Pré-requisito cumprido: **Fase 5.1 encerrada** (produção controlada online,
> backup criptografado com restore testado, `CRON_SECRET` validado).
> Ver `docs/PRODUCAO-5.1.md` e `AI_State.md`.

## Princípios da fase

1. **O servidor decide.** Nada de balanceamento, evolução ou status resolvido no
   cliente. O motor já vive em `src/lib/engine/*` e `src/lib/battle-service.ts`;
   toda regra nova entra lá, com teste unitário.
2. **Uma sub-fase por PR**, cada uma com CI verde e `AI_State.md` atualizado.
3. **Migrations aditivas.** Nenhum `DROP COLUMN` em produção; colunas novas com
   `DEFAULT` e backfill, para o deploy da Vercel não quebrar entre migrar e
   publicar.
4. **Sem monetização nesta fase.** `isPremium`/`premiumSkins` continuam
   dormentes até o rebranding e os documentos legais existirem.
5. **Rebranding continua pendente.** Nomes/sprites de Pokémon seguem via CDN
   apenas para fechar mecânicas. Toda estrutura nova (evolução, learnset,
   status) deve ser **agnóstica de IP** — dados em tabela/catálogo, não regras
   hardcoded com nomes próprios — para que a troca de criaturas depois seja
   só troca de dados.

---

## 6.1 — Balanceamento do início do jogo — ✅ **implementada em 2026-08-31**

### O diagnóstico, medido

Simulação executada neste repositório com o motor real
(`computeDamage` + `sideFromSpecies`, 500 rolls por matchup, nível 5, variante
Normal):

| Atacante → alvo | Golpe | Dano médio | HP do alvo | OHKO | Turnos p/ KO |
|---|---|---|---|---|---|
| Charmander → Bulbasaur | Lança-Chamas (90) | 23,9 | 20 | **100%** | 0,8 |
| Bulbasaur → Squirtle | Raio Solar (105) | 29,2 | 20 | **100%** | 0,7 |
| Squirtle → Charmander | Jato d'Água (110) | 24,2 | 19 | **80%** | 0,8 |
| Charmander → Squirtle | Lança-Chamas (90) | 5,7 | 20 | 0% | 3,5 |
| Squirtle → Bulbasaur | Jato d'Água (110) | 4,8 | 20 | 0% | 4,2 |
| Bulbasaur → Charmander | Raio Solar (105) | 8,1 | 19 | 0% | 2,4 |

Stats nível 5: `hp≈19-20`, `atk/def/spA/spD≈10-12`.

### A causa raiz (não é a fórmula de dano)

A fórmula em `src/lib/engine/damage.ts` é a clássica e está correta. O problema
é **conteúdo**, em três camadas que se somam:

1. **Não existe learnset.** `PokemonSpecies.moves` é uma lista fixa de 4 golpes
   de fim de jogo (`power` 80–110) que o Pokémon carrega desde o nível 1.
   Um inicial nível 5 ataca com Lança-Chamas.
2. **A curva de HP é a de Pokémon, a de poder não.** `hp = ((2*base+20)*lvl)/100
   + lvl + 10` dá ~20 HP no nível 5 (correto), mas o pool de golpes assume
   níveis 40+. Poder 90 com STAB 1,5 e tipo 2,0 gera 3,5× o HP total do alvo.
3. **Multiplicadores empilhados sem piso de duração.** STAB × tipo × crítico
   pode chegar a 4,5× num jogo onde a diferença entre "vantagem de tipo" e
   "vitória automática" ainda não existe.

O efeito prático é binário: quem tem vantagem de tipo vence em 1 turno, quem não
tem precisa de 3–4 turnos. Não há decisão de jogo no meio.

### O alvo de design

- Combate de nível 5 entre iniciais: **3 a 5 turnos** com vantagem de tipo,
  **6 a 9 turnos** sem ela.
- Nenhum OHKO garantido antes do nível ~25, exceto crítico + vantagem dupla.
- Vantagem de tipo deve **encurtar** a luta (~40%), não decidi-la sozinha.

### Implementação proposta

**6.1.1 — Learnset por nível (a correção principal)**

- Novo campo em `PokemonSpecies`: `learnset: { level: number; move: string }[]`,
  ordenado. `moves` continua existindo como derivado para compatibilidade, ou é
  substituído por `movesAtLevel(species, level)` retornando os **4 últimos**
  golpes aprendidos até aquele nível.
- Golpes iniciais de baixo poder para todo mundo (`Tackle` 40, `Ataque Rápido`
  45 já existem); adicionar ~8 golpes de poder 35–60 por tipo (Ember, Bolha,
  Folha Navalha, Faísca, Investida de Pedra etc.) para o começo não ser genérico.
- Aplicar em: criação do inicial, encontro selvagem (`sideFromSpecies`), líder
  de ginásio (`seed-gym`), time de PvP.
- **Migration + backfill**: Pokémon já existentes em `user_pokemon` têm
  `move1..move4` gravados; um script de migração reescreve os movesets de
  Pokémon com nível abaixo do desbloqueio, sem apagar Pokémon do jogador.

**6.1.2 — Amortecimento de dano em níveis baixos**

- Piso de duração: `damage = min(damage, ceil(defender.maxHp * MAX_HIT_FRACTION))`
  onde `MAX_HIT_FRACTION` sai de ~0,45 no nível 5 e chega a 1,0 por volta do
  nível 25 (interpolação linear). Preserva a fórmula clássica no meio/fim de
  jogo e só protege o começo.
- Alternativa (avaliar por teste, não por gosto): elevar o termo constante de HP
  de `+10` para `+18` nos níveis 1–15. Menos cirúrgico; a primeira opção é a
  preferida.

**6.1.3 — Curva de progressão**

- Revisar `src/lib/engine/xp.ts`: XP de vitória selvagem, `xpToNextLevel` e o
  número de batalhas por nível nos níveis 5→15 (alvo: 3–4 vitórias por nível no
  começo, aumentando depois).
- Revisar o nível dos líderes de ginásio em `seed-gym.ts` contra a nova curva
  (hoje Brock manda Geodude lvl 12 contra um time que pode estar no 6).

**6.1.4 — Testes**

- Testes de propriedade em `src/lib/engine/damage.test.ts`: para toda dupla de
  iniciais no nível 5, `turnos_para_KO >= 3`.
- Teste de regressão de curva: matriz de matchups com semente fixa
  (injetar o RNG em vez de usar `Math.random` direto — hoje o motor sorteia
  internamente; extrair um parâmetro `rng` opcional torna o balanceamento
  testável e é pré-requisito desta sub-fase).
- Script `scripts/balance-report.mts` que imprime a tabela acima, para comparar
  antes/depois em cada ajuste.

**Critério de aceite:** tabela de matchups dentro das faixas de turnos alvo,
zero OHKO no nível 5, CI verde, nenhuma regressão nos testes de integração.

### O que foi entregue

| Item | Onde |
|---|---|
| Learnset por nível + 22 golpes novos de poder 30–70 | `src/lib/pokedex.ts` (`learnset`, `movesAtLevel`, `moveSlots`) |
| Teto de dano por golpe em níveis baixos | `src/lib/engine/damage.ts` (`maxHitFraction`, `capDamage`) |
| RNG injetável (sem espionar `Math.random`) | `src/lib/engine/damage.ts` (`Rng`) |
| Golpes aprendidos ao subir de nível, persistidos | `src/lib/engine/combatant.ts`, `src/lib/battle-service.ts` |
| Curva de XP e níveis de ginásio revisados | `src/lib/engine/xp.ts`, `src/lib/gym-teams.ts` |
| Relatório de balanceamento | `npm run balance:report` |
| Backfill de produção (movesets + ginásios) | `npm run db:rebalance` |
| 19 testes de balanceamento | `src/lib/engine/balance.test.ts` |

### Resultado medido (`npm run balance:report`)

Nível 5, golpe mais forte disponível, 2000 execuções com semente fixa:

| Atacante → alvo | Golpe | Dano médio | HP | OHKO | Turnos |
|---|---|---|---|---|---|
| Charmander → Bulbasaur | Brasa (40) | 6,0 | 20 | **0%** | 4,0 |
| Bulbasaur → Squirtle | Chicote de Cipó (45) | 6,0 | 20 | **0%** | 4,0 |
| Squirtle → Charmander | Bolha (40) | 6,0 | 19 | **0%** | 4,0 |
| Bulbasaur → Charmander | Investida (40) | 4,4 | 19 | 0% | 4,8 |
| Squirtle → Bulbasaur | Investida (40) | 4,4 | 20 | 0% | 4,9 |
| Charmander → Squirtle | Arranhão (40) | 4,1 | 20 | 0% | 5,1 |

Antes: 100% de OHKO com vantagem de tipo (0,7–0,8 turno). Depois: **nenhum
OHKO**, 4 turnos com vantagem e ~5 sem ela. A vantagem de tipo encurta a luta
em ~20% em vez de decidi-la sozinha.

Meio de jogo intocado: no nível 30 o teto já não vale (Charmander → Bulbasaur
causa 56,7 de dano em 73 de HP) e a fórmula clássica volta inteira.

Curva de XP (era `nível³ × 0,8`, agora `nível^2,5 × 2,5`):

| Nível | 5 | 10 | 15 | 20 | 25 |
|---|---|---|---|---|---|
| Batalhas para subir (antes) | 2,7 | 4,8 | 6,9 | 9,1 | 11,2 |
| Batalhas para subir (agora) | 3,0 | 3,9 | 4,6 | 5,2 | 5,8 |

### Decisão de design registrada: o inicial de Fogo perde para o Brock

O relatório mostra que Bulbasaur e Squirtle vencem os dois Pokémon do Brock com
folga no nível 10, e que **Charmander perde os dois confrontos 1 contra 1** —
Pedra causa dano dobrado em Fogo e Geodude/Onix têm ataque e defesa altos.

Isso **não** foi "corrigido": é a consequência correta do sistema de tipos, e o
jogo dá as ferramentas para contornar (time de até 3, Squirtle e Bulbasaur
aparecem na grama do mapa 1, loja com poções). O que foi corrigido é a barreira
artificial: Brock caiu de 12/14 para **10/12** e Misty de 18/21 para **16/19**,
porque com a curva antiga era preciso moer ~25 batalhas selvagens antes de ter
direito a tentar. Se o mantenedor preferir que o inicial de Fogo vença sozinho,
o caminho honesto é mexer no conteúdo (outro líder inicial, ou um golpe de Aço
mais cedo), não em esconder o número.

### O que **não** foi feito nesta sub-fase

- Pokémon já existentes em produção **não mudam sozinhos**: é preciso rodar
  `npm run db:rebalance` (tem `--dry-run`) depois do deploy. Sem isso, contas
  antigas continuam com os golpes de fim de jogo gravados no banco.
- Golpes de status continuam sem efeito (`"Mas nada aconteceu..."`) — é a 6.4.
- A IA do oponente continua escolhendo golpe ao acaso entre os que causam dano.

## 6.2 — Editor de Mundos: camadas de mapa e golpes fracos

Plano completo e decisões: `docs/FASE-6.2-PLANO.md`. Dividida em três PRs.

### 6.2-A — Camadas de mapa no servidor — ✅ **implementada em 2026-08-31**

O problema: "posso andar aqui?" e "aqui aparece bicho?" eram respondidas só
pelo **tipo** do tile, com as respostas fixas no código. Consequências práticas:
água era `walkable: false` **e** `hasEncounter: true` (encontro aquático
impossível), e só o matinho gerava encontro, no mapa inteiro.

Duas camadas novas por mapa, gravadas em `game_maps` (migration `0005`,
aditiva, tudo com `DEFAULT` — mapa existente continua idêntico):

| Coluna | Tipo | Significado |
|---|---|---|
| `encounter_grid` | `jsonb` `boolean[][]` | o "tile invisível": marca a célula como área de caça sem mudar o desenho |
| `collision_grid` | `jsonb` `(null \| "blocked" \| "walkable")[][]` | override de passagem por célula; `null` = padrão do tipo de tile |
| `encounter_rate` | `integer` 0–100 (default 22) | chance de encontro por passo, por mapa |

Regras, todas em `src/lib/map-rules.ts` — módulo **puro** (sem banco, sem
React, sem `Math.random` implícito) usado pelo servidor e pelo cliente, para
não existirem duas implementações da mesma regra:

- **grade vazia = modo legado**, bit a bit. É o que permite fazer o deploy sem
  tocar em nenhum mapa de produção.
- `collisionGrid`: override manda, mas **nunca** fura a borda do mapa.
- `encounterGrid` preenchida vira a **única** fonte da verdade do encontro, e
  o filtro por `tileTypes` deixa de valer — decisão do mantenedor de ter **uma
  área de caça por mapa** em vez de várias zonas nomeadas.
- `validateMapLayers` recusa camada com dimensão diferente do mapa e área de
  caça pintada sem nenhuma espécie na lista (engano de edição, não escolha).

Onde a regra passou a ser aplicada: `startWildBattle` (autoridade do servidor),
as rotas `POST /api/maps` e `PUT /api/maps/[id]` (persistência + validação) e o
movimento do jogador em `src/app/page.tsx` — sem isto o admin pintaria a água
como andável e o cliente continuaria barrando o passo.

Testes: 30 unitários em `src/lib/map-rules.test.ts` (legado intacto, água
liberada, matinho bloqueado, sorteio ponderado com RNG injetado, validação) e 8
de integração em `tests/integration/encounters.integration.test.ts`, que provam
que a **rota** lê as colunas do banco.

**Pendente no deploy:** aplicar a migration `0005` em produção — runbook em
`docs/DEPLOY-6.2-A.md` (ordem obrigatória: migration **antes** do código).

### 6.2-B — Editor: pintar as camadas — ✅ **implementada em 2026-08-31**

Barra de modos no `WorldMapEditor`: **TERRENO · ENCONTROS · COLISÃO**. O
pincel muda de alvo conforme o modo; clique e arrasto funcionam nos três.

| Modo | Pincéis | Overlay na grade |
|---|---|---|
| TERRENO | paleta de tiles (como antes) | portais 🌀 |
| ENCONTROS | marcar · apagar | `~` verde onde aparece bicho, escuro onde não |
| COLISÃO | ✖ bloquear · ✓ liberar · · padrão do tile | ✖ vermelho, ✓ ciano, `·` no bloqueado por tipo |

O overlay é calculado por `map-rules` — as mesmas funções que o servidor usa
para decidir. Não é uma segunda leitura das camadas que pode divergir: o que
está pintado na tela é o que o motor vai fazer.

**Ligar a camada de encontro converte, não zera.** Como a camada ligada passa a
ser a única fonte da verdade, ligá-la vazia apagaria todo o matinho de uma vez.
Então o primeiro traço (ou o botão "usar o matinho atual") semeia a grade a
partir do comportamento vigente, e a pintura vira ajuste. Há "limpar tudo" para
quem quer começar do zero e "desligar camada" para voltar ao legado.

**Lista de espécies, agora editável de verdade:**

- peso por espécie **com a chance real em %** ao lado — peso 20 não diz nada
  sozinho: é 100% num mapa com uma espécie e 5% num mapa com vinte;
- nível mínimo e máximo por espécie, com a faixa invertida marcada em vermelho
  antes de o servidor recusar;
- **faixa de nível do mapa** + "aplicar a todas", que é o pedido "decidir o
  nível mínimo e máximo dos pokémon do mapa";
- **taxa de encontro por passo** (0–100%), que era um `0.22` fixo no cliente.

Mapa novo agora nasce **sem espécie nenhuma**. Antes o editor criava todo mapa
novo com Mewtwo, Rayquaza e Dragonite nível 25–50 fixos no código — o oposto da
dificuldade progressiva.

Funções puras extraídas para `src/lib/map-layers.ts` (21 testes): `loadLayer`
distingue camada desligada de camada vazia, `weightShare` calcula a chance,
`sanitizeLevelRange`/`applyLevelRange` cuidam da faixa. Mais 6 testes de
integração em `PUT /api/maps/:id`: persistência das três colunas, `[]` para
voltar ao legado, recusa de dimensão errada, de área pintada sem espécie, de
faixa invertida, de taxa fora de 0–100, e a exigência de papel admin.

**Correção pós-teste manual (mesmo dia).** O primeiro teste no navegador
mostrou encontro que tocava o som e não iniciava batalha. Não era o mapa: no
iframe cross-site o navegador nega o `localStorage` além do cookie, o token de
sessão sumia e toda request voltava 401 — inclusive o salvamento do editor, que
exibia o erro num aviso verde e parecia ter funcionado. O token passou a ter
cópia em memória, a captura dele em `/api/auth` ficou central no `api-client`, o
aviso do editor é colorido pelo conteúdo e o 401 no encontro tem mensagem
própria. 10 testes em `src/lib/api-client.test.ts` cobrem o armazenamento
bloqueado.

Ajuste de infraestrutura junto: em **desenvolvimento** o CSP passa a aceitar
`frame-ancestors https://*.e2b.app` e o `X-Frame-Options: DENY` é omitido, senão
o preview do sandbox fica em branco. Produção continua recusando qualquer
moldura.

### 6.2-C — Golpes fracos e volta da curva original — ✅ **implementada em 2026-09-06**

Decisões do mantenedor (registradas em `docs/FASE-6.2-PLANO.md`), aplicadas sem
reabrir: golpes fracos na faixa **15–35**, teto de dano **aposentado**, curva
`nível³ × 0,8` de volta, Brock **12/14**, Misty **18/21**, Lance 38/45 intacto,
fórmula de dano intocada.

**O que mudou no código:**

- `src/lib/pokedex.ts` — golpes fracos de iniciais e bichos dos primeiros
  mapas (aprendidos até o nível ~7) confinados à faixa 15–35:

  | Golpe | Antes | Depois | | Golpe | Antes | Depois |
  |---|---|---|---|---|---|---|
  | Arranhão | 40 | **20** | | Estilhaço de Gelo | 40 | **35** |
  | Investida | 40 | **25** | | Folha Navalha | 55 | **35** |
  | Brasa | 40 | **25** | | Garra de Metal | 50 | **35** |
  | Bolha | 40 | **25** | | Ataque Rápido | 45 | **35** |
  | Chicote de Cipó | 45 | **25** | | Lambida | 30 | 30 |
  | Choque | 40 | **25** | | Bofetada de Lama | 35 | 35 |
  | Rajada | 40 | **25** | | | | |

  Progressão do começo do jogo: neutra 20–25 → tipada 25 → upgrade 35 (nível
  7) → 50–65 (nível 12). Os tetos de 25/35 não são arbitrários: medidos contra
  o pior caso (Bolha com STAB ×2 e crítico contra o HP 19 do Charmander nível
  5 — a 30 já daria nocaute em um golpe).

- `src/lib/engine/damage.ts` — removidos `maxHitFraction`, `capDamage` e as
  constantes `DAMAGE_CAP_*`. O dano volta a ser 100% a fórmula clássica em
  todos os níveis. A proteção do início agora é conteúdo (golpes 15–35 + mapa
  1 com criaturas de nível 2–7 sem vantagem de elemento), não motor.
- `src/lib/engine/xp.ts` — `xpFloor` volta a `floor(nível³ × 0,8)`.
- `src/lib/gym-teams.ts` — Brock 12/14 e Misty 18/21 restaurados
  (`npm run db:rebalance` aplica em banco já semeado; o `content/world/` foi
  re-exportado junto, senão um `world:import` futuro reverteria os níveis).
- `scripts/balance-report.mts` — seção do teto substituída pela varredura
  "poder × dano neutro no nível 5"; adicionada a seção da Misty.
- Novo `src/lib/gym-teams.test.ts` trava os níveis dos três ginásios.

**Resultado medido (`npm run balance:report`, RNG semente fixa — antes → depois):**

- Duelos entre iniciais nível 5 (golpe mais forte): a vantagem de tipo voltou a
  diferenciar — Brasa contra Bulbasaur **6,0 → 10,5** (2,1 turnos), Bolha
  contra Charmander **6,0 → 10,9** (2,0 turnos); sem vantagem segue em 6,6–7,6
  turnos. **0% de OHKO em todos os casos, críticos incluídos** (é o que os
  testes travam — a faixa 15–35 foi escolhida exatamente para isso).
- Poder × dano neutro no nível 5, sem teto: 5→2,0 · 10→2,1 · 15→2,1 (achatado,
  como medido antes) · 20→2,7 · 25→3,1 · 35→3,6 · 40→4,1 · 55→4,9. Cada ponto
  de poder acima de 15 volta a aparecer no dano.
- Curva: batalhas para subir de nível 5→**2,7** · 10→**4,8** · 15→**6,9** ·
  20→**9,1** · 25→**11,2** (a 6.1 pedia 3,0/3,9/4,6/5,2/5,8) — de 5 a 15 são
  **47** batalhas contra alvos do próprio nível (eram 38).
- Brock 12/14: Bulbasaur e Squirtle nível 10–12 ganham as trocas; Charmander
  perde as duas (decisão de design registrada na 6.1, mantida). Misty 18/21
  exige time/nível — no nível 18 só o Bulbasaur vence a Staryu, e ninguém
  vence a Starmie sozinho: é a parede do segundo ginásio, de propósito.

**Depois desta fase:** o mantenedor roda `npm run db:rebalance` em produção
(ficou segurado para depois da 6.2-C de propósito — corrige golpes de Pokémon
já capturados e níveis de ginásio já semeados) e monta o mapa 1 à mão: níveis
2–7, espécies comuns, sem vantagem de elemento contra os iniciais; então
`npm run world:export` + PR do `content/world/`.

### 6.2-D — Mundo como código *(concluída — 2026-09-02)*

Entrou antes da 6.2-C a pedido do mantenedor: sem isso, o mapa 1 montado à mão
num ambiente teria que ser refeito no Editor em cada outro.

- `npm run world:export` — banco → `content/world/maps/<slug>.json` (com os
  ginásios do mapa dentro) + `content/world/shops/<shopId>.json`.
- `npm run world:import [-- --dry-run]` — arquivos → qualquer banco.
  Idempotente por chave natural (mapa = slug; ginásio = mapa + líder; item =
  loja + itemKey), transacional, nunca apaga, resolve `targetMapSlug` e
  `gymLeaderName` para os ids **do destino** num segundo passo.
- Validado com banco novo e ids deslocados de propósito: 0 referências
  quebradas, 2ª importação só "iguais", reexport idêntico byte a byte.

Detalhes, garantias e limites em `docs/MUNDO-COMO-CODIGO.md`.

## 6.3 — Evolução (servidor) — ✅ **implementada em 2026-09-06**

### O que foi entregue

- **Regras no catálogo** (`src/lib/pokedex.ts`, campo `evolvesTo`): dirigido por
  dados como o learnset — `{ speciesId, trigger: "level" | "item" | "special",
  level?, itemId? }[]`. Só o gatilho `"level"` existe hoje; o teste de sanidade
  **proíbe** citar `item`/`special` antes de existirem.
- **Espécies intermediárias dos iniciais** (eram o buraco da Pokédex):
  +Ivysaur(2), Venusaur(3), Charmeleon(5), Wartortle(8) — 21 → **25 espécies**,
  bases canônicas, learnset herdado da linha (evoluir não esquece golpes).
- **Motor** (`src/lib/engine/evolution.ts`): `evolutionAtLevel` segue a cadeia
  enquanto o nível satisfaz o gatilho (salto 15→37 atravessa Charmander →
  Charmeleon → Charizard numa batalha só), com guarda contra ciclos;
  `applyEvolution` transforma o combatente no lugar.
- **Gatilho no level up do servidor** (`battle-service.ts`): avaliado dentro do
  fluxo de vitória que já aplicava XP — **não existe endpoint de evoluir**
  chamável pelo cliente.
- Ao evoluir: status recalculados pela nova espécie e variante reais,
  **percentual de HP preservado** (evoluir ferido não cura), **apelido
  mantido** (displayName só troca quando não é apelido), **tipos trocam ainda
  na mesma batalha** (a desvantagem nova já vale no turno seguinte), golpes
  rederivados do learnset da forma nova, e `★ … está evoluindo!… evoluiu para
  …!` no log.
- **Persistência**: `pokedexId` + `name` passam a ser gravados no
  `UPDATE user_pokemon` da vitória (sem evolução os valores são no-op).
- **Catch-up de graça**: o gatilho é `nível ≥ limiar`, não "acabou de cruzar" —
  Pokémon de produção que já passaram do nível 16 antes da 6.3 existir
  evolucionam no próximo level up, direto para o estágio certo do nível atual.
  Sem script de backfill.

### Linhas evolutivas (decisões de conteúdo)

| Linha | Gatilho | Observação |
|---|---|---|
| Bulbasaur 16 → Ivysaur 32 → Venusaur | nível | cânon |
| Charmander 16 → Charmeleon 36 → Charizard | nível | cânon |
| Squirtle 16 → Wartortle 36 → Blastoise | nível | cânon |
| Dragonair 55 → Dragonite | nível | cânon |
| Staryu 30 → Starmie | nível | **provisório** — cânon é Pedra d'Água; pedras entram com itens de evolução (6.4/6.5) |
| Eevee 30 → Umbreon | nível | **provisório** — cânon é felicidade/noite; sem sistema de felicidade ainda |

Pikachu, Geodude, Onix, Gengar, Lapras etc. não evoluem **nesta fase** porque
os alvos (Raichu, Graveler, Steelix, linha do Haunter…) não estão na Pokédex —
isso é conteúdo da 6.4, que completa as linhas em lotes.

### Validação

- Unitários (`src/lib/engine/evolution.test.ts`, 16 testes): integridade dos
  dados (alvo existe, gatilho com nível válido, sem ciclo, gatilho só sobe na
  cadeia), estágios por nível, salto duplo, HP percentual, apelido, variante,
  tipos trocando na hora, agnóstico a time/PC.
- Integração (`tests/integration/evolution.integration.test.ts`, 3 testes):
  vitória real cruzando 16 → log "evoluiu para Charmeleon" + `pokedexId=5`
  persistido; vitória fora do gatilho não evolui; catch-up do Pokémon acima
  do limiar.
- Item de evolução (pedra): **não implementado de propósito** — exige itens
  próprios na loja e consumo transacional; fica para junto da 6.4/6.5.

### Plano original (para referência)

- Novo campo/tabela de evolução, dirigido por dados:
  `evolvesTo: { speciesId: number; trigger: "level" | "item" | "special";
  level?: number; itemId?: number }[]`. ✅
- Gatilho avaliado **no servidor**, dentro do fluxo de level up já existente em
  `battle-service.ts` (onde `applyXp` roda), nunca por chamada do cliente. ✅
- Ao evoluir: recalcular stats com a nova espécie preservando percentual de HP,
  manter apelido, registrar no log da batalha e persistir `pokedexId` novo. ✅
- Aprendizado de golpes na evolução usa o learnset da 6.1. ✅
- Antiabuso: o endpoint de evolução (se existir para item) valida posse do item,
  consome em transação e é idempotente. ⬜ (sem endpoint; item fica para depois)
- Testes: Charmander lvl 16 → Charmeleon → lvl 36 Charizard; stats recalculados;
  Pokémon no time e no PC evoluem igual; falha silenciosa impossível. ✅

### 6.3-A — Catálogo Kanto completo (2026-09-06, a pedido do mantenedor)

> Decisão do mantenedor: encher o catálogo de espécies e evoluções **antes** do
> merge e antes da 6.4, como base para a estética própria do futuro — "que não
> fique nada de fora". Não é a 6.4: nenhuma tabela de encontro/loja/mapa mudou.

**Escopo: Pokédex 25 → 156 espécies** — as 151 de Kanto completas + Steelix
(208, fecha a linha do Onix) + as 5 não-Kanto que já existiam (Umbreon,
Gardevoir, Rayquaza, Lucario — mantidas).

- **Verificação da fonte de sprites** (PokeAPI/sprites, CDN GitHub, padrão Gen V
  animado front/back/shiny): cobertura confirmada por listagem da árvore Git do
  repositório — todos os ids 1–151 e 208 têm as três variações. Detalhe que
  quase enganou: a API de contents pagina em 1000 entradas e "escondeu" 4
  arquivos (96–99); a árvore Git mostra os 1005. Animações existem só até o id
  649 — **Gen 6+ exigirá outra fonte** (registrado para o futuro).
- **Novo módulo `src/lib/pokedex-gen1.ts`**: 131 espécies em dados compactos
  (construtor gera as 3 URLs de sprite do id). Sem ciclo de módulos: recebe
  `ALL_MOVES` de `pokedex.ts` e só importa tipos de lá.
- **+11 golpes** em `ALL_MOVES` (41 → 52): Poison (Ferrão/Lodo/Bomba de Lodo),
  Bug (Corte Fúria/Insetada/Tesoura X), Fairy (Vento de Fada/Luta Fofa/Força
  Lunar) — tipos que não tinham NENHUM golpe — e Surf/Trovoada para variedade.
- **Tipagem/status canônicos modernos** (Clefairy/Jigglypuff/Mr. Mime são Fairy;
  Magnemite é Electric/Steel) — a tabela 18×18 já cobria tudo desde a Fase 2.
- **Evoluções**: linhas de nível canônicas onde existem; pedra/troca viram
  gatilho de nível **provisório** (mesma decisão da 6.3), marcados no código.
  Vaporeon/Jolteon/Flareon existem como espécie mas **não estão ligadas** à
  Eevee — escolher entre três destinos exige mecânica de pedras/escolha futura.
- Pikachu→Raichu, Geodude→Graveler→Golem e Onix→Steelix ligados; Gastly/Haunter
  agora chegam ao Gengar; Magikarp→Gyarados e Dratini→Dragonair entraram.
- **Learnsets** seguem a filosofia 6.2-C (fraco 20–40 no nível 1; médio 50–65 no
  12–20; forte 80+ do 28 em diante) — os testes de balanceamento existentes
  passam para as 156 espécies automaticamente.
- **NADA de gameplay mudou**: tabelas de encontro, ginásios e lojas intactos
  (isso é conteúdo da 6.4). As espécies novas só aparecem no jogo quando
  entrarem nas tabelas dos mapas.

**Validação**: `src/lib/pokedex-gen1.test.ts` (13 testes: roster exato 1–151+5,
sprites no padrão do CDN, tipos conhecidos, golpes reais, linhas canônicas e
provisórias, lendários sem evolução, eeveelutions sem gatilho). Unitários
15 arquivos/215; integração 6/73; `balance:report` limpo para todas as espécies.

### 6.3-B — Golpes com identidade, da era GBA (2026-09-06, a pedido do mantenedor)

> Pedido do mantenedor: pesquisar os movimentos de cada Pokémon nos jogos de
> geração antiga (**principalmente os de GBA** — Ruby/Sapphire/Emerald/
> FireRed/LeafGreen — mas não só eles), listar golpes para o jogo deixar de
> ter "ataques genéricos", implementar com balanceamento consistente mesmo
> vindo de fontes diferentes e **atribuir técnicas a todos os 156 Pokémon,
> conforme tipo e raça**.

**Pesquisa.** Fontes: learnsets de nível/TM/tutor da Gen 3 em
`pokemondb.net/pokedex/<espécie>/moves/3` e `bulbapedia.bulbagarden.net`
(página de golpes assinatura), mais Gen 1/2 para golpes antigos. Dados da era
GBA quando divergem dos modernos (Premonição 80/90, Fúria 90, Dança das
Pétalas 70, Terremoto 100). Assinaturas por linha confirmadas na pesquisa:
Cabeçada Ossuda (Squirtle), Hiperpresa (Rattata), Agulha Dupla (Beedrill),
Dança das Pétalas (Oddish), Dia de Pagamento (Meowth), Arremesso Vital
(Machop), Martelo Pinça (Krabby), Clava de Osso/Ossomerangue (Cubone),
Chute de Salto Alto + Chute Rolante (Hitmonlee), Soco Sônico + Gancho do Céu
(Hitmonchan), Cachoeira (Goldeen), Poder Antigo (fósseis + Tangela),
Velocidade Extrema (Arcanine), Chupavidas (Zubat), Soco Dinâmico (Machamp).

**Catálogo: 52 → 133 golpes (+81).** Cobertura por tipo após a fase:
Normal 14 · Lutador 12 · Grama 9 · Fogo 8 · Água 8 · Elétrico 8 · Gelo 8 ·
Voador 8 · Terrestre 7 · Inseto 7 · Sombrio 6 · Pedra 6 · Aço 6 · Veneno 6 ·
Fada 6 · Dragão 5 · Psíquico 5 · Fantasma 4. (Antes: tipos inteiros com 2–3
golpes e quase tudo concentrado em 80+ de poder.)

**Rúbrio de conversão** (fontes diferentes → uma casa só; documentado também
no código, bloco 6.3-B de `pokedex.ts`):

- Valores da era GBA quando existem; senão, valores modernos.
- Multigolpes → golpe único com a soma e ~10–15% de desconto (Agulha Dupla 45,
  Ossomerangue 85).
- Efeito secundário não modelado pelo motor (recuo, dreno, carga, troca) →
  desconto de ~5 de poder ou precisão; golpes de status ficam de fora (o motor
  os trataria como "nada aconteceu").
- "Nunca erra" vira precisão 100 (o motor não modela redução de precisão);
  a descrição preserva a identidade.
- Teto da casa: poder ≤ 115, precisão ≥ 50. Hiper Raio 115/85 e
  Superaquecimento 115/90 são os tetos; Jato d'Água (110/80) segue no topo da
  água. Os três socos elementais do Hitmonchan entraram com 75.

**Learnsets: 1102 entradas nas 156 espécies** (antes ~4,7 golpes/espécie em
média, agora ~7), cada linha reescrita por tipo e raça: Pikachu termina em
Soco Trovejante/Carga Selvagem; Gyarados desenha Tornado→Presa de Gelo→
Mastigar→Cachoeira→Salto→Hiper Raio; Alakazam ganha Premonição; o
Hitmonchan carrega os três socos elementais; Vulpix/Ninetales mantêm a curva
de fogo com Presa de Fogo; Nidoran♂ bica (Bicada), Nidoran♀ morde. As
restrições estruturais viraram teste: golpes até o nível 7 ≤ 50 de poder
(mapa 1 continua 15–35 pelo teste 6.2-C), STAB de cada tipo até o nível 40,
formas finais com golpe ≥ 70 do tipo primário nos 4 últimos slots, nenhum
golpe órfão, ≥ 4 golpes de dano por tipo.

**O que NÃO mudou**: motor de batalha, fórmula de dano, tabelas de
encontro/ginásio/loja, evoluções, XP. Pokémon já capturados em produção
continuam com seus golpes salvos; `refreshMovesForLevel` os atualiza ao subir
de nível, como já acontecia.

**Validação**: `npm run check` verde (unitários 15 arquivos/**222** — +5
guardas novos em `pokedex-gen1.test.ts`); integração **6/73**; balance-report
com **todas as ✓/✗ de ginásio idênticas ao baseline 6.3-A** (diff executado
via `git worktree` do commit anterior — números moveram para o lado canônico:
Charmander sofre mais com Brock porque Garra de Metal voltou ao nível canônico
13; Bulbasaur de fato vence a Misty) e "✓ todas as espécies ok".

## 6.4 — Pokédex 21 → 50+

> **Estado após a 6.3-A/6.3-B/6.4-A:** Kanto inteira (156 espécies) já está no
> catálogo com golpes canônicos e **aparece no mundo** (20 mapas temáticos).
> O que resta desta fase é **Johto e além** (espécies novas) e as pedras de
> evolução na loja.

### 6.4-A — Mundo até o mapa 20: regiões temáticas e as 156 espécies distribuídas (2026-09-06, a pedido do mantenedor)

> Pedido: gerar mapas até o 20 seguindo o conceito dos primeiros, com temas
> (regiões) que justifiquem os tipos encontrados, e distribuir os encontros
> — dos já existentes e dos implementados na 6.3 — de forma balanceada e
> separada: evoluídos/raros/nível alto nos mapas avançados, o oposto nos
> iniciais. Nada pode quebrar.

**Estrutura nova:**

- `src/lib/default-world.ts` (novo, puro): os 20 mapas como dados — grades
  temáticas 16×16, tabelas de encontro, cadeia de portais 3↔20, NPCs.
- `src/lib/seed-maps.ts`: reescrito sobre o builder — semeia **20 mapas** num
  banco vazio (portais resolvidos por slug).
- `scripts/world-seed.mts` (`npm run world:seed`): aplica o mundo padrão num
  banco que **já tem** mapas, idempotente por slug — preserva as camadas
  pintadas no Editor (`encounterGrid`/`collisionGrid`), nunca apaga.
- `content/world/maps/` versiona os 20 mapas (MUNDO-COMO-CODIGO); round-trip
  verificado: `world:seed` → `world:export` → `world:import --dry-run` dá
  **20 iguais, 0 atualizados**.

**As regiões e a escada de nível** (faixa sobe +4 por mapa, com sobreposição;
dentro da faixa o peso decide a altura: comum na base, raro/lendário no topo):

| # | Mapa | Tema | Faixa | Destaques |
|---|---|---|---|---|
| 1 | Vale Pallet | prado inicial | 3–10 | iniciais + Pikachu + Eevee (**fixo 6.2-C**) |
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

**Regras de distribuição (todas viraram teste):**

- Cada uma das **156 espécies aparece em exatamente um mapa** (a soma das
  tabelas fecha em 156, sem duplicata); pesos somam **100** por mapa.
- **Evolução nunca regride**: para toda linha, o alvo vive em mapa ≥ ao da
  forma anterior (Caterpie M2 → Metapod M2 → Butterfree M17; Geodude M3 →
  Graveler M8 → Golem M16; Gastly M6 → Haunter M11 → Gengar M19).
- **Lendários só do mapa 10 em diante, peso ≤ 20** (Articuno 2%, Moltres 4%,
  Mewtwo 10%, Rayquaza 16%, Zapdos 12%, Mew 8%).
- Ases de ginásio não viram commons antes do próprio ginásio (Dragonite só
  no mapa 20; Dragonair/Dratini bem depois do Lance).
- Mapas 2 e 3 trocaram de elenco (eram da época das 25 espécies: Gengar e
  Rayquaza commons no mapa 2–3). Ginásios, lojas e portais originais
  permanecem; o mapa 3 ganhou a saída norte que inicia a cadeia até o 20.
- Centro Pokémon apenas nos mapas 4, 8, 13, 16 e 20 — trecho longo sem curar
  é dificuldade de propósito (diretriz do mantenedor).
- Mapa 1 **intocado** (contrato 6.2-C pinado por teste também no conteúdo).

**Validação**: guarda nova `src/lib/world-expansion.test.ts` (9 testes sobre
`content/world/`); unitários **16 arquivos/231**; integração **6/73**;
`balance:report` "✓ todas as espécies ok"; smoke da API real (`GET /api/maps`
→ 20 mapas) e do pipeline de encontro (mapas 4/12/20: sorteio 2.000× por mapa
confere pesos e faixas — Chansey ~2%, Mew ~8%). Round-trip mundo idempotente.

**Nota para produção**: mapas vivem no banco — depois do merge/deploy o
mantenedor roda `DATABASE_URL=<produção> npm run world:seed` (ou
`world:import`) uma vez. Num banco novo, o seed da aplicação já cria os 20.

- Acrescentar espécies em lotes de ~10, cada lote com as linhas evolutivas
  completas. (Kanto inteira já entrou na 6.3-A — o que resta desta fase é
  **Johto e além** e, principalmente, colocar as 156 espécies para aparecer:
  novas tabelas de encontro por mapa usando o catálogo que agora existe.)
- Cada espécie precisa de: tipos, 6 bases, `catchRate`, learnset, sprites CDN e
  descrição em pt-BR.
- ~~Ampliar `ALL_MOVES` com golpes fracos/médios e cobrir tipos hoje ausentes~~
  — concluído na 6.3-B (133 golpes, todos os 18 tipos com ≥ 4 golpes de dano).
- Validação: teste que garante que todo `move` citado num learnset existe em
  `ALL_MOVES`, que todo alvo de evolução existe na Pokédex e que os sprites
  seguem o padrão de URL.

## 6.5 — Sistema de status

- Estados: `poison`, `burn`, `paralysis`, `sleep`, `freeze` (escolher subconjunto
  inicial: veneno, queimadura, paralisia).
- Persistência: coluna `status` + `statusTurns` em `user_pokemon` (migration
  aditiva, `DEFAULT null`), e campo equivalente no `SideState` da batalha.
- Efeitos no motor: dano ao fim do turno (veneno/queimadura), queimadura reduz
  ataque físico, paralisia reduz velocidade e tem chance de perder o turno.
- Golpes de status ganham efeito real (hoje `computeDamage` devolve
  "Mas nada aconteceu...").
- Reintroduzir **Antídoto** e afins na loja, agora que há o que curar; centro
  de cura/`/api/pokemon/heal` limpa status.
- Testes: cada status aplica, expira, cura e é persistido entre batalhas.

## 6.6 — Arena PvP ranqueada

- `pvp_battles.mode` já aceita `"ranked"` e `users.elo` já existe — ambos
  dormentes.
- Implementar: fila/desafio ranqueado, cálculo de ELO no servidor ao concluir a
  batalha (K-factor fixo no começo), imunidade do amistoso (não altera ELO),
  proteção contra farm (mesmo par repetido com retorno decrescente, forfeit
  conta como derrota).
- Ranking global paginado + posição do jogador. Recompensas só depois de o
  ranking rodar estável.

## 6.7 — NPCs editáveis no Editor de Mundos

- Tipo de tile/entidade NPC com diálogo, posição e opcional batalha de treinador.
- Admin-only, como o resto do editor; validação de payload no servidor
  (`src/lib/validation.ts`) com limites de tamanho de diálogo.

## 6.8 — Premium *(bloqueado de propósito)*

Não implementar. Antes exige: IP própria, termos de uso, política de
privacidade, provedor de pagamento e antifraude.

---

## Ordem recomendada e por quê

```
6.1 balanceamento ✅  →  6.2 editor/mapas (A ✅, B ✅, C ✅, D ✅)  →  6.3 evolução ✅ (+ catálogo 6.3-A ✅ e golpes 6.3-B ✅)  →  6.4 pokédex (mundo até 20 ✅ 6.4-A)
  →  6.5 status  →  6.6 ranked  →  6.7 NPCs
```

6.1 vem primeiro porque é o defeito que o jogador sente no primeiro minuto, e
porque o **learnset** que ela cria é dependência direta da 6.3 (o que se aprende
ao evoluir) e da 6.4 (cada espécie nova já nasce com curva). A 6.2 entrou na
frente da evolução a pedido do mantenedor: sem editor de camadas não há como
montar o mapa 1 fácil, que é o que valida o balanceamento da 6.1. Status (6.5)
depois da Pokédex para não migrar dados duas vezes. Ranked (6.6) por último entre as
mecânicas porque só faz sentido sobre um combate que já esteja balanceado.

## Riscos

| Risco | Mitigação |
|---|---|
| Rebalancear quebra Pokémon já capturados em produção | Migration aditiva + script de backfill de movesets; nada é apagado |
| Balanceamento vira achismo | `scripts/balance-report.mts` + testes com RNG injetado; toda mudança acompanha o antes/depois |
| Pokédex maior aumenta o bundle/payload | Catálogo continua server-side; cliente recebe só o necessário por batalha |
| Novas colunas + deploy Vercel fora de ordem | Colunas com `DEFAULT`, código tolerante a `null` antes do backfill |
| Escopo de IP | Toda estrutura nova é dirigida por dados, para o rebranding ser troca de conteúdo, não de código |
