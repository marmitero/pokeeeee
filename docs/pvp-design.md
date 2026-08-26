# Fase 4 — PvP assíncrono com polling: desenho detalhado

> **Status: proposta. Nada implementado.**
> Este documento existe para decidir o desenho antes de escrever código.

---

## 1. A ideia em uma frase

Os dois jogadores escolhem sua ação **às cegas**; quando ambos travaram a
escolha, o servidor resolve a troca de uma vez e os dois descobrem o resultado
na próxima consulta.

É o mesmo modelo do Pokémon Showdown e do próprio Deluge. Não há "vez" no
sentido de um jogador esperar o outro digitar — os dois agem ao mesmo tempo, e
a **ordem de resolução** é decidida pela velocidade.

---

## 2. Por que polling e não WebSocket

| | Polling | WebSocket/SSE |
|---|---|---|
| Infra | Nenhuma — só o Postgres que já existe | Precisa de servidor com estado em memória ou serviço externo (Pusher/Ably) |
| Funciona em serverless | Sim | Não (conexão longa) |
| Complexidade | Baixa | Alta (reconexão, heartbeat, escala horizontal) |
| Latência percebida | 2–3 s | < 100 ms |
| Testável com o que temos hoje | **Sim** | Não |

Para um jogo por turnos onde cada jogador pensa 5–30 s antes de agir, **2–3 s
de latência é imperceptível**. WebSocket só se justificaria com batalha em
tempo real, animação sincronizada ou muitos jogadores simultâneos.

---

## 3. Máquina de estados

```
WAITING ──(alguém entra)──► ACTIVE ──(alguém vence/desiste)──► FINISHED
   │                          │  ▲
   │                          │  │
   │                   ambos travaram a ação
   │                          ▼  │
   └──(timeout)──► ABANDONED  RESOLVENDO ──► próximo turno
```

| Estado | Significado |
|---|---|
| `WAITING` | Sala criada, esperando o segundo jogador |
| `ACTIVE` | Em batalha; cada lado pode ou não ter travado a ação do turno |
| `FINISHED` | Alguém venceu |
| `ABANDONED` | Um dos lados desistiu ou expirou |

---

## 4. Modelo de dados

A tabela `pvp_battles` **já existe** e já tem quase tudo: `room_code` (único),
`player1_id`, `player2_id`, `status`, `current_turn_player_id`, `battle_state`
(jsonb), `winner_id`.

O que muda é o **conteúdo** do `battle_state`:

```jsonc
{
  "turn": 4,
  "phase": "ACTION" | "SWITCH",        // SWITCH = alguém precisa trocar
  "sides": {
    "p1": {
      "userId": 1,
      "userPokemonId": 42,             // ← referência, NUNCA stats do cliente
      "snapshot": { /* SideState: nome, tipos, level, hp, stats, golpes */ },
      "committed": { "kind": "attack", "moveIndex": 2 } | null,
      "committedAt": "2026-08-26T22:10:03Z",
      "needsSwitch": false
    },
    "p2": { /* idem */ }
  },
  "log": ["...", "..."],
  "version": 17                        // ←lock otimista / cache do cliente
}
```

Dois campos são o coração do desenho:

- **`committed`** — a ação travada, **invisível para o oponente**.
- **`version`** — incrementa a cada mudança; o cliente usa para saber se precisa
  redesenhar e o servidor usa para detectar conflito.

---

## 5. O ciclo de um turno, passo a passo

```
 Turno N começa
      │
      ├─ P1 escolhe "Lança-Chamas"  →  POST submit_turn  →  gravado em sides.p1.committed
      │                                                     (P2 não vê o quê, só que travou)
      │
      ├─ P2 escolhe "Trocar p/ Onix" →  POST submit_turn  →  gravado em sides.p2.committed
      │
      ├─ Servidor detecta "os dois travaram"
      │
      ▼
   RESOLUÇÃO (transação única, atômica)
      1. ordem: maior speed primeiro; empate → aleatório
      2. aplica a 1ª ação (dano, tipo, STAB, crítico — motor da Fase 2)
      3. se o alvo desmaiou, a 2ª ação NÃO acontece
      4. aplica a 2ª ação
      5. se alguém desmaiou → phase = "SWITCH" para aquele lado
      6. grava log, incrementa turn, zera os committed, version++
      │
      ▼
   Ambos veem o resultado no próximo poll
```

**Detalhe importante:** se o Pokémon do P1 desmaia com a primeira ação, a ação
que o P2 tinha travado é **descartada** — é o comportamento clássico e evita
"bater em fantasma".

### Sub-estado de troca (`phase = "SWITCH"`)

Quando um lado perde o Pokémon ativo, só ele age: escolhe um substituto. O outro
lado espera. Isso precisa ser um estado explícito, senão o adversário fica
travado sem entender por quê.

---

## 6. Superfície de API

| Método | Rota | Quem | O quê |
|---|---|---|---|
| POST | `/api/pvp` `{action:"create_room"}` | logado | cria sala `WAITING`, escolhe o Pokémon inicial **por id** |
| POST | `/api/pvp` `{action:"join_room", roomCode}` | logado | entra, sala vira `ACTIVE`, turno 1 |
| GET | `/api/pvp/state?room=CODE` | participante | estado público (poll) |
| POST | `/api/pvp` `{action:"submit_turn", roomCode, action}` | participante | trava a ação do turno |
| POST | `/api/pvp` `{action:"switch", roomCode, userPokemonId}` | participante | troca no sub-estado `SWITCH` |
| POST | `/api/pvp` `{action:"forfeit", roomCode}` | participante | desiste |
| GET | `/api/pvp/rooms` | logado | salas `WAITING` para entrar sem saber o código |

### O que o `GET /state` devolve (e o que **não** devolve)

```jsonc
{
  "roomCode": "DLG-4821",
  "status": "ACTIVE",
  "turn": 4,
  "phase": "ACTION",
  "youAre": "p1",
  "you":    { "name": "Charizard", "level": 32, "hp": 71, "maxHp": 94, "moves": [...] },
  "opponent": { "name": "Gengar",  "level": 30, "hp": 58, "maxHp": 82 },
  "opponentCommitted": true,        // ← SÓ o booleano
  "log": ["...", "..."],
  "version": 17
}
```

**Nunca** incluir `opponent.committed` com o conteúdo. Esse é o único lugar onde
vazar dado quebra o jogo: quem vê o golpe do adversário ganha sempre.

---

## 7. O problema difícil: concorrência

Os dois podem enviar `submit_turn` **no mesmo milissegundo**. Se ambos lerem
"1 de 2 travados" e ambos resolverem, a troca é resolvida **duas vezes** — dano
duplicado, turno pulado.

Três caminhos:

| Abordagem | Como | Avaliação |
|---|---|---|
| **A. Lock de linha** | `SELECT ... FOR UPDATE` dentro da transação | **Recomendada.** Correta, nativa do Postgres, o Drizzle já suporta (`for('update')`). A segunda request espera milissegundos. |
| B. Lock otimista | `UPDATE ... WHERE version = $esperado`; se 0 linhas, tenta de novo | Também correta, mas exige loop de retry e é mais fácil errar. |
| C. Flag de resolução | um `UPDATE` condicional que marca `resolving=true` | Funciona, mas introduz um estado intermediário que pode travar se o processo morrer no meio. |

**Voto: A.** É a mais difícil de implementar errado.

---

## 8. Timeout — sem precisar de cron

Não há job agendado no projeto, e adicionar um é custo operacional. Solução:
**avaliação preguiçosa**.

Em *qualquer* request que toque a sala (`submit_turn`, `switch`, `GET /state`):

```
se opponent.committed === null
   e agora - turnStartedAt > TURN_TIMEOUT (ex.: 60s)
   então: resolve o turno escolhendo um golpe ALEATÓRIO para o lado ausente
```

Vantagem: zero infraestrutura. Desvantagem: se **ninguém** abrir a página, a
sala fica pendurada para sempre. Isso é aceitável — basta um job de limpeza
diário marcando salas `ACTIVE` antigas como `ABANDONED` (ou nem isso: elas
simplesmente somem da listagem).

---

## 9. Anti-trapaça

Segue a mesma doutrina das Fases 1 e 2: **o cliente nunca é fonte de verdade**.

| Vetor | Hoje | Como fica |
|---|---|---|
| Stats inventados | `create_room` aceita `player1Pokemon` **inteiro do cliente** — dá para mandar `hp: 99999` | Trocar por `userPokemonId`; o servidor lê o registro e monta o `SideState` com `sideFromUserPokemon()` |
| Ver o golpe alheio | — | `GET /state` expõe só `opponentCommitted: boolean` |
| Agir na sala dos outros | `join_room` não checa nada | Toda ação valida `player1Id`/`player2Id` contra a sessão |
| Resolver o turno 2× | — | Lock de linha (§7) |
| Enviar 500 ações por turno | — | `submit_turn` sobrescreve a própria ação; não acumula |
| **Conluio** (duas contas da mesma pessoa farmam entre si) | — | **Ver §10 — é a decisão mais importante** |

O primeiro item é um **bug real que já existe**: `validation.ts` tem
`battlePokemonSchema` aceitando `hp`, `maxHp`, `attack`... tudo do cliente.
Precisa ser corrigido mesmo que o PvP completo não saia.

---

## 10. Recompensas — DECIDIDO

### Decisão do mantenedor (2026-08-26)

> 1. Recompensa será apenas `wins`, `losses` e ranking. Futuramente haverá uma
>    **"Arena PvP"** com ranking global e recompensas por posição.
> 2. **Dano persiste** depois da batalha.
> 3. Adicionar **ELO**, considerando o item 1 como complemento.

### O que isso implica: dois modos de batalha

| | **Amistoso** (Fase 4) | **Arena ranqueada** (futuro) |
|---|---|---|
| Atualiza `wins` / `losses` | ✅ sim | ✅ sim |
| Atualiza `elo` | ❌ **não** | ✅ sim |
| Entra no ranking global | ❌ **não** | ✅ sim |
| Recompensa por posição | — | futuro |
| Dano persiste | ✅ sim | ✅ sim |

Consequência direta: **o conluio deixa de ser um problema na Fase 4**. Sem ELO e
sem ranking em jogo, duas contas da mesma pessoa lutando entre si não ganham
nada — só gastam HP. A mitigação complexa (verificação de IP, mínimo de turnos)
fica dispensada por ora e só precisará ser revisitada quando a Arena chegar.

### `users.elo` entra agora, mas nasce dormente

A coluna é adicionada na Fase 4 (default `1000`) para que a Arena futura seja
só lógica de atualização, sem migração. **Nenhum código da Fase 4 escreve nela**
— amistoso não mexe em ELO. É intencional e deve ter teste garantindo.

### O campo `mode` precisa existir desde já

Para a Arena não exigir retrabalho, a batalha nasce com:

```
mode: "friendly" | "ranked"
```

A Fase 4 só produz `"friendly"`. Quando a Arena chegar, acrescenta-se `"ranked"`
e a atualização de ELO, sem tocar em nada do que já estiver funcionando.

---

## 11. Ponto em aberto deixado pela decisão

### `wins` / `losses` são contadores mistos — e a Arena vai poluir

Hoje `users.wins` e `users.losses` já são incrementados por **PvE** (vitória
selvagem e ginásio, na Fase 2). A decisão diz que o amistoso também atualiza
esses contadores. Isso significa que, quando a Arena chegar, um leaderboard
baseado em `wins` misturaria:

- vitórias contra Pokémon selvagem,
- vitórias contra líder de ginásio,
- vitórias amistosas (farmáveis à vontade, sem consequência),
- vitórias ranqueadas.

**Três caminhos:**

| Opção | Como | Avaliação |
|---|---|---|
| A. Deixar misto | Leaderboard da Arena usa só `elo`, nunca `wins` | Mais simples. `wins` vira "estatística de carreira", sem valor competitivo. |
| **B. Contadores separados** | Adicionar `ranked_wins` / `ranked_losses`, usados só pela Arena | **Recomendada.** Uma coluna a mais agora evita um leaderboard sujo depois. |
| C. Amistoso não conta nada | Amistoso não toca `wins`/`losses` | Contraria a decisão 1. |

**Pergunta para o mantenedor:** adoto **B** (já crio `ranked_wins`/`ranked_losses`
dormentes junto com `elo`) ou **A** (deixo misto e a Arena usa só `elo`)?

> Sem resposta, implemento **A** — é a que menos muda o schema agora, e `elo`
> sozinho já sustenta um ranking limpo.

---

## 11a. Bug encontrado ao consolidar as decisões

### `users.losses` nunca é incrementado — regressão da Fase 2

A decisão 1 diz que a recompensa será "`wins`, `losses` e ranking". Verificando
o código para implementar isso:

```
$ grep -rn "users.losses" src/          → nenhuma ocorrência em UPDATE
$ grep -rn "users.wins"   src/          → battle-service.ts:455 e :479
```

- `users.wins` **é** incrementado (vitória selvagem e ginásio).
- `users.losses` **não é incrementado em lugar nenhum.** A coluna existe
  (`schema.ts:99`) e a UI a lê (`page.tsx:43`), mas nenhum `UPDATE` a toca.

**Causa:** o incremento de `losses` vivia no `POST /api/gym
{action:"battle_result", won:false}`. Esse endpoint foi removido na Fase 2
(corretamente — era o farmável), mas os três caminhos `status: "LOST"` do
`battle-service.ts` (linhas 361, 368 e 591) **não assumiram o incremento**.

É uma regressão minha da Fase 2, e não foi pega pelos testes porque nenhum
teste assertava `losses` depois de uma derrota.

**Correção:** pequena e deve entrar junto com a Fase 4 (ou antes, isolada):
incrementar `losses` nos caminhos de derrota **e** adicionar teste cobrindo.

---

## 11b. Outras decisões (resolvidas)

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Dano de PvP persiste? | ✅ **Sim** (decisão do mantenedor) |
| 2 | XP de PvP? | ❌ Não |
| 3 | Dinheiro de PvP? | ❌ Não |
| 4 | ELO em amistoso? | ❌ Não — só na Arena futura |
| 5 | Timeout do turno | 60 s, golpe aleatório |
| 6 | Time no PvP | 6 completos, igual ao PvE |
| 7 | Mesma espécie dos dois lados? | Permitir (padrão do gênero) |
| 8 | Tabela | `pvp_battles` (já tem room, matchmaking e `winner_id`) |
| 9 | Motor da Fase 2 | Reaproveita `engine/*`; orquestração é nova |
| 10 | Concorrência | Lock de linha (`SELECT ... FOR UPDATE`) |

---

## 12. O que dá para reaproveitar da Fase 2

| Módulo | Reutilizável? |
|---|---|
| `engine/types.ts` (efetividade) | ✅ direto |
| `engine/damage.ts` (fórmula) | ✅ direto — já é puro e testado |
| `engine/combatant.ts` (`sideFromUserPokemon`) | ✅ direto |
| `lib/rate-limit.ts` | ✅ direto |
| `lib/session.ts` (`requireUser`) | ✅ direto |
| `battle-service.ts` (orquestração) | ❌ presume PvE; PvP precisa da sua |

Ou seja: **a parte difícil (dano, tipos, construção de combatente) já está
pronta e coberta por 37 testes.** A Fase 4 é essencialmente orquestração,
matchmaking e UI.

---

## 13. Escopo estimado

| Parte | Tamanho |
|---|---|
| Corrigir `create_room`/`join_room` para usar `userPokemonId` | pequeno |
| `submit_turn` + resolução com lock de linha | **médio — o núcleo** |
| Sub-estado `SWITCH` + forfeit + timeout preguiçoso | médio |
| `GET /state` + listagem de salas | pequeno |
| Coluna `users.elo` + atualização pós-batalha | pequeno |
| UI: tela de espera, indicador "oponente pensando", log compartilhado | médio |
| Testes (unit da resolução + integração de dois clientes) | médio |

Roughly comparável à Fase 3, menor que a Fase 2.

---

## 14. Critério de aceite sugerido

1. Dois navegadores, duas contas: um cria a sala, o outro entra pelo código.
2. Ambos escolhem golpes **sem ver a escolha um do outro**.
3. A troca é resolvida uma única vez mesmo com os dois enviando ao mesmo tempo
   (teste de concorrência).
4. `GET /state` **não** expõe a ação travada do oponente (teste asserting isso).
5. Pokémon desmaia → o lado afetado é obrigado a trocar antes do próximo turno.
6. Timeout de 60 s resolve com golpe aleatório.
7. Derrotar o mesmo oponente repetidamente **não** gera XP nem dinheiro.
8. `wins`/`losses` e ELO atualizados corretamente.
