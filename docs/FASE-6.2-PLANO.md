# Fase 6.2 — Editor de mundos: áreas de caça, colisão e dificuldade

> **Status: plano revisado com as decisões do mantenedor (2026-08-31).**
> **Nada foi aplicado ainda** — aguardando o "pode ir" para o 6.2-A.
>
> Decisões tomadas:
> 1. Dificuldade: **voltar à curva original** `nível³ × 0,8` e aos ginásios
>    12/14 e 18/21.
> 2. Golpes fracos: **faixa útil 15–35**, sem mexer na fórmula.
> 3. Teto de dano da 6.1: **aposentar** quando o mapa 1 estiver pronto (6.2-C).
> 4. Zonas de caça: **uma por mapa** — a camada marca onde pode aparecer
>    monstro; a lista de espécies e a faixa de nível são do mapa.

Origem: o mantenedor apontou que o problema do início do jogo não é a
dificuldade em si — o jogo **deve** ser um pouco difícil de evoluir. O problema
é que o primeiro mapa não tem criaturas apropriadas para um inicial, e que o
conteúdo do mundo não é editável no nível certo.

---

## 0. O que eu medi antes de propor

### 0.1 O teto de dano da 6.1 está escondendo o poder do golpe

Charmander nível 5, golpe de Fogo contra Bulbasaur (STAB × 2,0):

| Poder do golpe | 5 | 10 | 15 | 20 | 30 | 40 |
|---|---|---|---|---|---|---|
| Dano **com** o teto atual | 6,0 | 6,0 | 6,0 | 6,0 | 6,0 | 6,0 |
| Dano **sem** o teto | 3,7 | 7,4 | 8,4 | 9,4 | 11,5 | 13,6 |

O teto de 30% do HP que introduzi na 6.1 satura em **qualquer** poder acima de
~8. Ou seja: se o conteúdo do primeiro mapa for arrumado (criaturas fracas, sem
vantagem de tipo), o teto deixa de proteger e passa só a **apagar a diferença
entre um golpe fraco e um forte**. Ele foi um remédio para a falta de learnset;
com learnset + conteúdo adequado, ele vira ruído.

**Proposta:** aposentar o teto (ou reduzi-lo a uma trava anti-OHKO só nos níveis
1–8) na mesma entrega em que o primeiro mapa ganhar criaturas adequadas.

### 0.2 Poder 5–20 não funciona como o esperado nesta fórmula

A fórmula tem um termo constante `+2` antes dos multiplicadores. No nível 5 os
status são ~10–12, então esse `+2` **domina** e achata os golpes fracos:

| Poder | Dano neutro (lvl 5) | Turnos para nocautear |
|---|---|---|
| 5 | 2,0 | 9,9 |
| 10 | 2,1 | 9,7 |
| 15 | 2,1 | 9,5 |
| 20 | 2,8 | 7,3 |
| 30 | 3,1 | 6,4 |
| 40 | 4,1 | 4,9 |

Poder 5, 10 e 15 causam **o mesmo dano** (~2). Criar dez golpes nessa faixa
produziria dez golpes indistinguíveis e batalhas de 10 turnos contra alvos
neutros. A faixa que realmente diferencia no nível 5 é **15–40**.

Duas saídas honestas, e eu preciso da sua escolha:

- **(A) Faixa útil:** golpes iniciais de poder **15–35**, mantendo a fórmula.
  Simples, sem risco no meio/fim de jogo. "Poder 20" passa a ser o golpe fraco.
- **(B) Mudar a fórmula no início:** reduzir o termo `+2` para `+1` (ou torná-lo
  proporcional ao nível) para que 5–20 volte a ter granularidade. Mais fiel ao
  seu pedido literal, mas mexe no motor inteiro e exige remedir o meio de jogo.

Recomendo **(A)**, com nomes/flavor de golpe fraco (Investida, Brasa, Bolha,
Chicote de Cipó etc. já estão nessa faixa).

### 0.3 Como o encontro funciona hoje (limitação real)

- `src/lib/tiles.ts` define `walkable` e `hasEncounter` **por tipo de tile**,
  fixo no código. Água é `walkable: false` + `hasEncounter: true` — ou seja,
  hoje é **impossível** ter encontro aquático: o jogador não pisa lá.
- O servidor (`battle-service.ts`) tem uma lista fixa
  `ENCOUNTER_TILES = ["tall_grass", "water"]`.
- A tabela de encontros é **do mapa inteiro** (`encounterTable`), com um campo
  `tileTypes` por espécie. Não existe "campo de caça": todo matinho do mapa
  sorteia da mesma lista.
- O editor só deixa **adicionar/remover espécie** com peso 20 e nível 10–25
  fixos no código — nem nível nem peso são editáveis pela interface.

Tudo o que você pediu bate exatamente nesses quatro limites.

---

## 1. O que vai ser construído

### 1.1 Modelo de dados (migration `0005`, aditiva)

Com **uma zona por mapa**, a lista de espécies não precisa de estrutura nova: a
coluna `encounter_table` que já existe guarda `pokedexId`, `name`, `weight`,
`minLevel` e `maxLevel` por espécie. Ela só nunca foi editável pela interface.
Então o schema ganha apenas as duas camadas novas e a taxa de encontro:

```ts
// camada de encontro: o "tile invisível". true = aqui pode aparecer monstro.
encounterGrid: boolean[][]      // mesmas dimensões do tileGrid; [] = legado

// camada de colisão: override por célula
collisionGrid: (null | "blocked" | "walkable")[][]   // [] = legado

// chance de encontro por passo, hoje um 0.22 fixo no cliente
encounterRate: number           // 0–100, default 22
```

Migration: `ALTER TABLE game_maps ADD COLUMN encounter_grid jsonb NOT NULL
DEFAULT '[]'`, idem `collision_grid`, e `encounter_rate integer NOT NULL DEFAULT
22`. Nada é removido nem alterado.

Três decisões embutidas, e o motivo de cada uma:

1. **Camada separada, não tipo de tile novo.** É literalmente o "tile invisível
   por cima de outro tile": a grade de encontro é independente do desenho. Você
   pode marcar areia, pedra ou água como área de caça sem mudar a aparência.
2. **Colisão com três estados.** `null` = padrão do tipo de tile (o que vale
   hoje); `"blocked"` = intransponível mesmo sendo grama; `"walkable"` =
   atravessável mesmo sendo água ou árvore. Resolve a água sem inventar um tipo
   "água rasa".
3. **Compatibilidade:** grade vazia = comportamento atual, bit a bit
   (`hasEncounter` do tipo de tile + `tileTypes` da tabela). Nenhum mapa em
   produção muda no deploy.

**Nível mínimo e máximo do mapa:** a faixa continua por espécie (é o que a
coluna guarda), mas o editor ganha um controle de **faixa do mapa** que aplica
`minLevel`/`maxLevel` a todas as espécies de uma vez — que é o pedido "decidir
qual o nível mínimo e máximo dos pokémon que aparecerão no mapa" — e ainda
permite ajustar uma espécie específica se você quiser um raro mais forte.

### 1.2 Servidor continua decidindo (não regride a Fase 2)

`startWildBattle` passa a: ler a célula `(playerX, playerY)` do `zoneGrid`
gravado no banco → se houver zona, sortear espécie pelo peso **daquela zona** e
nível dentro de `[minLevel, maxLevel]` **daquela zona**. Sem zona, cai no
comportamento atual. O cliente nunca informa espécie, nível nem zona.

A colisão também é verificada no servidor: hoje um cliente adulterado pode pedir
encontro em qualquer coordenada; passará a valer a mesma regra do
`collisionGrid` + tile.

### 1.3 Editor de mundos — três modos de pintura

Barra de modos no topo do editor: **TERRENO · ENCONTROS · COLISÃO**.

**Modo ENCONTROS**
- Pincel liga/desliga a célula como área de caça; arrastar pinta em série.
- Overlay translúcido verde com `~` nas células marcadas. **Não aparece no
  jogo** — é o tile invisível.
- Atalhos: "marcar todo o matinho", "limpar tudo" (para não pintar 200 células
  na mão ao converter um mapa existente).
- No mesmo painel, a **lista de espécies do mapa**, agora editável de verdade:
  - busca por nome/número na Pokédex;
  - **peso** por espécie, com a chance real em % calculada ao lado (hoje é 20
    fixo e você não vê a chance);
  - **nível mín/máx** por espécie;
  - controle de **faixa de nível do mapa** que aplica a todas de uma vez;
  - **taxa de encontro do mapa** (%), hoje fixa em 22% dentro do código.

**Modo COLISÃO**
- Três pincéis: `padrão do tile` · `bloquear` · `liberar`.
- Overlay: ✖ vermelho em bloqueado, ✓ ciano em liberado, nada em padrão.
- Contador de células alteradas.

**Conversão assistida**
- Botão "usar o matinho atual como área de caça": preenche o `encounterGrid` a
  partir dos tiles que hoje têm encontro, para você ajustar em vez de repintar
  do zero.

### 1.4 Validação (servidor; o editor já é admin-only)

Limites explícitos em `src/lib/validation.ts`, porque isto é entrada de usuário
que vira comportamento de jogo:

- `encounterGrid` e `collisionGrid` com as **mesmas dimensões** do `tileGrid`
  (ou vazios, para o modo legado);
- `collisionGrid` só aceita `null | "blocked" | "walkable"`;
- `encounterRate` 0–100; peso 1–1000; `minLevel ≤ maxLevel`, ambos 1–100;
- máximo de 50 espécies por mapa (limite que já existe);
- `pokedexId` precisa existir na Pokédex;
- área de caça marcada sem nenhuma espécie na lista → rejeitado, com mensagem
  clara (senão o jogador anda numa área que nunca gera nada).

### 1.5 Testes

- Unitários: célula marcada gera encontro, célula não marcada não gera, sorteio
  por peso com RNG semeado, faixa de nível respeitada, precedência do override
  de colisão sobre o tipo de tile, fallback de mapa legado.
- Validação: cada limite acima rejeitado com 400.
- Integração: `start_wild` dentro da área devolve espécie da lista; fora da área
  e em célula bloqueada devolve erro; mapa legado continua igual.

## 2. Dificuldade — decidido: voltar ao original

| Batalhas para subir de nível | lvl 5 | lvl 10 | lvl 15 | lvl 20 | lvl 25 | lvl 40 |
|---|---|---|---|---|---|---|
| Curva da 6.1 (sai) | 3,0 | 3,9 | 4,6 | 5,2 | 5,8 | 7,3 |
| **Original `nível³ × 0,8` (entra)** | **2,7** | **4,8** | **6,9** | **9,1** | **11,2** | **17,7** |

Ginásios voltam aos valores originais: **Brock 12/14**, **Misty 16/19 → 18/21**.
Lance permanece 38/45.

Isso entra no **6.2-C**, depois do primeiro mapa estar pintado — com criaturas
de nível 2–7 sem vantagem de tipo, o treino até o nível 12 deixa de ser um muro
e passa a ser progressão.

## 3. Entrega em três PRs

| PR | Conteúdo | Depende de |
|---|---|---|
| **6.2-A** | Migration `0005`, tipos, validação, resolução de encontro/colisão no servidor, fallback legado, testes. Sem UI. | — |
| **6.2-B** | Editor: modos ENCONTROS e COLISÃO, edição de espécie/peso/nível/taxa, overlays, conversão assistida do matinho atual. | 6.2-A |
| **6.2-C** | Golpes fracos na faixa 15–35, aposentadoria do teto de dano, curva de XP original, ginásios 12/14 e 18/21. | 6.2-A, 6.2-B |

Cada PR sai com CI verde e `AI_State.md` atualizado. Depois do 6.2-B você
consegue montar o primeiro mapa à mão, que é o objetivo final.

**Ordem sugerida:** 6.2-A → 6.2-B (você pinta o mapa 1) → 6.2-C (ajuste fino de
dificuldade com o mapa já arrumado). Fazer o 6.2-C por último evita calibrar
números contra um conteúdo que está prestes a mudar.

---

## 4. Riscos e como cada um é tratado

| Risco | Tratamento |
|---|---|
| Mapas em produção quebrarem no deploy | Colunas com default; `zoneGrid` vazio = comportamento atual, bit a bit |
| Admin marcar área de caça sem espécie na lista | Validação rejeita com mensagem clara; editor avisa antes de salvar |
| Nível 100 no primeiro mapa | Limite 1–100 é técnico; a coerência (nível do mapa × ginásio) é aviso na interface, não bloqueio |
| Liberar colisão em cima de um portal/borda | Portais continuam tendo precedência; borda do mapa nunca é atravessável |
| Payload maior por mapa (3 camadas) | 32×32 × 3 camadas ≈ poucos KB em JSON; os limites de tamanho já existem no schema |
| Cliente adulterado pedindo encontro em qualquer célula | Servidor passa a validar colisão e área de caça, não só o tipo de tile |

---

## 5. O que **não** está neste plano

- NPCs editáveis (continua na 6.6).
- Evolução (era a 6.2 original; passa para depois do editor — o learnset da 6.1
  já deixou a dependência pronta).
- Qualquer alteração de monetização, IP ou identidade visual.
