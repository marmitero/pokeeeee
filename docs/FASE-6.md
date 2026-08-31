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

### 6.2-C — Golpes fracos e volta da curva original *(a fazer)*

- Golpes na faixa útil **15–35** de poder para iniciais e bichos dos primeiros
  mapas (medição: poder 5–15 é achatado pelo `+2` da fórmula de dano).
- **Aposentar o teto de dano** da 6.1, que satura e apaga a diferença entre
  golpes, assim que o mapa 1 estiver montado.
- Curva de XP volta ao original **`nível³ × 0,8`** e ginásios sobem para Brock
  12/14 e Misty 18/21 — o jogo deve continuar difícil de evoluir.
- Depois disso o mantenedor monta o mapa 1 à mão: níveis 2–7, espécies comuns,
  sem vantagem de elemento contra os iniciais.

## 6.3 — Evolução (servidor)

- Novo campo/tabela de evolução, dirigido por dados:
  `evolvesTo: { speciesId: number; trigger: "level" | "item" | "special";
  level?: number; itemId?: number }[]`.
- Gatilho avaliado **no servidor**, dentro do fluxo de level up já existente em
  `battle-service.ts` (onde `applyXp` roda), nunca por chamada do cliente.
- Ao evoluir: recalcular stats com a nova espécie preservando percentual de HP,
  manter apelido, registrar no log da batalha e persistir `pokedexId` novo.
- Aprendizado de golpes na evolução usa o learnset da 6.1.
- Antiabuso: o endpoint de evolução (se existir para item) valida posse do item,
  consome em transação e é idempotente.
- Testes: Charmander lvl 16 → Charmeleon → lvl 36 Charizard; stats recalculados;
  Pokémon no time e no PC evoluem igual; falha silenciosa impossível.

## 6.4 — Pokédex 21 → 50+

- Acrescentar espécies em lotes de ~10, cada lote com as linhas evolutivas
  completas (evita o buraco atual: Charmander sem Charmeleon).
- Cada espécie precisa de: tipos, 6 bases, `catchRate`, learnset, sprites CDN e
  descrição em pt-BR.
- Ampliar `ALL_MOVES` com golpes fracos/médios e cobrir tipos hoje ausentes.
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
6.1 balanceamento ✅  →  6.2 editor/mapas (A ✅, B ✅, C)  →  6.3 evolução  →  6.4 pokédex
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
