# Fase 8.4 — Status de batalha (Etapa C, entrega C)

> Veneno, veneno grave, queimadura, paralisia, sono e congelamento no motor
> autoritativo (selvagem, ginásio, boss e PvP), persistentes como no GBA, com
> 9 golpes de Status, 27 efeitos secundários, 7 itens de cura na loja e uso de
> item **dentro** da batalha.

## 1. Pesquisa (o que os jogos fazem) e o que foi adotado

Fontes: Bulbapedia (*Status condition*, *Catch rate*, páginas dos golpes),
Smogon/PokémonDB (tabelas por geração), StrategyWiki/Psypokes (preços Gen III).

| Status | Gen III (GBA) | Adotado | Observação |
|---|---|---|---|
| **Veneno** (PSN) | −1/8 HP máx./turno; Poison e Steel imunes | igual | mínimo 1 HP |
| **Veneno grave** (TOX) | −1/16, −2/16, −3/16… (teto 15/16); contador zera ao trocar | igual | contador **não** persiste no banco: zera ao entrar em campo |
| **Queimadura** (BRN) | −1/8 HP máx./turno + Ataque físico ×0,5; Fire imune | igual | multiplicador entra na fórmula de `damage.ts` |
| **Paralisia** (PAR) | Speed ×0,25; 25% de não agir; (Electric só imune na Gen VI+) | Speed ×0,25; 25%; **Electric imune** | concessão moderna: intuitivo para o jogador |
| **Sono** (SLP) | 2–5 turnos (Gen III–IV) | **1–3 turnos** (Gen V+) | concessão: batalhas aqui duram 2–7 turnos; 2–5 seria KO garantido |
| **Congelamento** (FRZ) | não age; 20%/turno de descongelar; golpe de Fogo descongela; Ice imune | igual | |
| Ordem do dano residual | depois de os dois agirem, mais rápido primeiro (Gen III+) | igual | |
| Bônus de captura | sono/gelo ×2; par/psn/brn ×1,5 (Gen III–IV) | igual | `captureChance(..., status)` |
| Persistência | status fica depois da batalha até Centro/item; desmaiar limpa | igual | `user_pokemon.status` |
| Um status por vez | sim | sim | "X já está paralisado!" |

Golpes (precisão da Gen III): Onda Trovão 100 (não afeta Terra), Pó Paralisante 75,
Fogo-Fátuo 75, Tóxico 85, Pó Venenoso 75, Pó do Sono 75, Esporo 100, Hipnose 60,
Canção 55. Efeitos secundários: Trovoada/Faísca/Descarga/Golpe Corporal/Lambida/
Sopro do Dragão 30% PAR; Choque/Raio/Soco Trovão 10% PAR; Brasa/Lança-Chamas/
Presa de Fogo/Soco de Fogo/Explosão de Fogo/Roda de Fogo 10% BRN; Raio de Gelo/
Soco de Gelo/Presa de Gelo/Nevasca/Neve em Pó 10% FRZ; Ferrão Venenoso/Lodo/
Bomba de Lodo/Golpe Venenoso 30% PSN; Ferrão Duplo 20% PSN; Presa Venenosa 30% TOX.

## 2. Motor (`src/lib/engine/`)

- **`status.ts`** (puro, sem banco): `STATUS_VALUES`, imunidades, nomes/etiquetas
  pt-BR (`STATUS_NAME` "paralisado", `STATUS_NOUN` "paralisia", `STATUS_TAG` PAR/ENV/
  TÓX/QUE/SON/GEL), `inflictStatus`, `beforeMove` (sono/gelo/paralisia total),
  `residualDamage`, `effectiveSpeed`, `thawIfHitByFire`, `captureStatusBonus`.
  Tudo com `rng` injetável.
- **`turn.ts`** (compartilhado PvE/PvP): `performStrike(attacker, defender, move)`
  = impedimento → `computeDamage` → HP → descongelar → efeito (secundário por
  chance, ou principal do golpe de Status; alvo imune por tabela de tipos recebe
  "Não afeta"; quem desmaiou não recebe status). `endOfTurn(sides)` = residual na
  ordem dada. `chooseOpponentMove` = IA usa golpe de Status **útil** (alvo sem
  status e sem imunidade) em 40% das vezes, senão golpe de dano.
- **`combatant.ts`**: `SideState.status/statusTurns`, `BattleMove.effect`,
  `toBattleMove()`; `sideFromUserPokemon` normaliza a coluna e zera TOX.
- **`damage.ts`**: queimadura ×0,5 no físico; golpe de Status com `effect` devolve
  `label: null` (o efeito narra), sem `effect` continua "Mas nada aconteceu...".
- **`capture.ts`**: 5º parâmetro `status` multiplica a chance.

## 3. Catálogo (`pokedex.ts` + regionais)

- `PokemonMove.effect?: { status, chance, typeChart? }`. 142 golpes (133 + 9).
- Learnsets: 107 espécies receberam golpes de Status em níveis da Gen III quando
  existem (Pikachu 10 Onda Trovão, Bulbasaur 13/15 Pó Venenoso/Pó do Sono, Paras 7/27
  Pó Paralisante/Esporo, Gastly 1 Hipnose, Vulpix 17 Fogo-Fátuo, Koffing 30 Tóxico…);
  formas finais com o golpe em nível alto (40–65) para ele caber nos "4 últimos".
  Regra **inalterada** de `movesAtLevel` (4 últimos aprendidos). As guardas de
  learnset (`pokedex-*.test.ts`, `balance.test.ts`) continuam verdes: golpes de
  Status têm poder 0, abaixo de todos os tetos.

## 4. Banco (migration `0011_battle_status` + companheiro)

- `user_pokemon.status text NOT NULL DEFAULT 'NONE'` + `status_turns integer NOT NULL
  DEFAULT 0` + `user_pokemon_status_check` (valores válidos, contador ≥ 0).
- `users`: `antidotes, paralyze_heals, awakenings, burn_heals, ice_heals, full_heals,
  full_restores` (int NOT NULL DEFAULT 0) e `users_inventory_nonnegative` recriada
  com as 36 colunas.
- **`docs/supabase-production-0011-runtime.sql`**: idempotente (`ADD COLUMN IF NOT
  EXISTS`, DROP/ADD das checks), pré-condição das colunas 0007/0008, grants
  runtime/backup, registro no journal do Drizzle (hash `e28964bf…`, when
  `1788870700554`), conferência `2 · 7 · 1 · 1 · 8 · 12`. Validado **2×** em clone
  `TEMPLATE` do banco local revertido ao estado 0010; as duas checks provadas
  (status `'XXX'` e `antidotes = -1` rejeitados).

## 5. Itens de cura (`src/lib/status-items.ts`)

| Item | Coluna | `use_item` | Cura | Preço (Gen III) | Lojas |
|---|---|---|---|---|---|
| 🧫 Antídoto | `antidotes` | `antidote` | PSN, TOX | 100 | 1, 2, 4, 5, 6 |
| 💛 Anti-Paralisia | `paralyzeHeals` | `paralyzeHeal` | PAR | 200 | 1, 2, 4, 5, 6 |
| ⏰ Despertador | `awakenings` | `awakening` | SLP | 250 | 2, 4, 5, 6 |
| 🧯 Anti-Queimadura | `burnHeals` | `burnHeal` | BRN | 250 | 2, 4, 5, 6 |
| ❄️ Descongelante | `iceHeals` | `iceHeal` | FRZ | 250 | 5, 6 (a partir das Ilhas Glaciais) |
| ✨ Cura Total | `fullHeals` | `fullHeal` | qualquer | 600 | 3, 7–11 |
| 💖 Restaurador Total | `fullRestores` | `fullRestore` | qualquer + HP cheio | 3000 | 9–11 (junto das Masterballs) |

Categoria `potion` na loja (mesma aba das poções, recompra pela metade). Seed
automático por `ensureShopSeeded` (insert-if-ausente por `shopId:itemKey`);
`content/world/shops/*.json` reexportados (+319 linhas).

## 6. Rotas e regras

- **`POST /api/battle`** ganha `use_item { battleId, item }` (`BATTLE_ITEM_VALUES` =
  poções + curas; Reviver e pedras ficam fora). O item age **antes** do oponente e
  **consome o turno**; item sem efeito (HP cheio, status errado) → 400 **sem**
  débito e sem gastar turno; débito atômico (`WHERE col > 0`) antes do efeito.
- **`attack`**: turno reescrito em `runRound` — ordem pela velocidade **efetiva**,
  `performStrike` dos dois lados, desmaio entre ações, `endOfTurn` depois, desmaio
  por veneno/queimadura passa pelo mesmo `resolveFaint` (XP, ginásio, boss, drop).
- **`catch`**: bônus de status; contra-ataque do selvagem usa o mesmo motor
  (pode aplicar status, pode estar dormindo) + residual.
- **`persistTurn`/PvP `persistHp`**: gravam `status`/`status_turns`; desmaiar
  limpa; só o sono guarda turnos.
- **Centro Pokémon** (`/api/pokemon/heal`) e **`gm_heal`** limpam o status.
- **`/api/pokemon/manage use_item`**: curas de status fora de batalha; Restaurador
  Total também enche o HP; Pokémon desmaiado exige Reviver antes.
- **PvP** (`pvp-service.ts`): `resolveExchange` usa `performStrike`/`endOfTurn`,
  velocidade efetiva, `opponentPublic.status` exposto; salas antigas normalizadas.
- GM: `gm_give_item` aceita as 7 colunas novas (select do painel lista).

## 7. UI

- `components/battle/StatusTag.tsx`: etiqueta colorida ao lado do `LV.` nas caixas
  de HP de `BattleArenaModal`, `GymModal`, `BossModal`, `PvpArena` e no card do
  `PokemonBox`.
- `components/battle/BattleItemBar.tsx`: linha "ITENS (usar gasta o turno)" com só o
  que o jogador tem; destaca o que resolve o status atual; desabilita o inútil.
- Golpes de Status aparecem com ✨ e "STATUS" no lugar do poder; o som do golpe
  vem do `sfx` do catálogo (Onda Trovão = trovão, pós = cura).
- `PokemonBox`: botões de cura por item, destacando o que cura o status do
  selecionado.

## 8. Testes

- Unit: `engine/status.test.ts` (20) + `engine/turn.test.ts` (15) → **358** unit.
- Integração: `tests/integration/status.integration.test.ts` (5): Onda Trovão
  paralisa pela rota (ou "Não afeta" se o selvagem for Pikachu), status persiste e
  o Centro limpa, `use_item` fora de batalha (recusa/débito/Cura Total/Zod),
  `use_item` em batalha (consome turno, debita, recusa sem efeito, Reviver fora
  do enum), loja 1 vende Antídoto/Anti-Paralisia e recompra → **133** integração.

## 9. Fora de escopo (registrado para a 8.5+)

- Confusão/atração/flinch (status voláteis) — não são "status" no sentido GBA.
- Veneno drenando HP ao andar (Gen III) — evitado de propósito: castigo sem aviso
  num mundo de exploração livre.
- Frutas (Cheri/Chesto/Pecha/Rawst/Aspear/Lum) — não existe sistema de itens
  seguráveis.
- Habilidades (Guts, Synchronize, Natural Cure) — não existem habilidades.
