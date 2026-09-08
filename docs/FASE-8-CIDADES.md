# Fase 8.1+8.2 — Cidades (Etapa C, entrega A)

> Roadmap completo em `AI_State.md` §2 (Etapa C). A Arena Boss (8.3) é a
> entrega B, em PR separado (exige migration).

## O que são as cidades

A cada 5 mapas (5→40), uma cidade com **loja + ginásio + cura**:

| Mapa | Cidade | Loja | Ginásio (time) | Insígnia |
|---|---|---|---|---|
| 5 | Litoral de Vermilion | 4 — Loja do Litoral | 4 — Coralina (Spheal 24, Clamperl 27) | 🐚 Concha |
| 10 | Ilhas Glaciais | 5 — Loja Glacial | 5 — Glacio (Seel 33, Snorunt 37) | ❄️ Floco |
| 15 | Fossa Abissal | 6 — Loja Abissal | 6 — Nerissa (Axew 43, Dratini 45, Alomomola 47) | 🌊 Profundeza |
| 20 | Santuário Celeste | 7 — Loja do Santuário | 7 — Ventus (Vibrava 54, Druddigon 56, Crobat 58) | ⛩️ Templo |
| 25 | Forja Abandonada | 8 — Loja da Forja | 8 — Ferrao (Mightyena 64, Lairon 66, Liepard 68) | ⚙️ Bigorna |
| 30 | Recife da Tempestade | 9 — Loja do Recife | 9 — Tormenta (Primeape 75, Golduck 77, Toxicroak 79) | ⚓ Âncora |
| 35 | Farol do Fim | 10 — Loja do Farol | 10 — Nocturna (Nidoqueen 86, Mismagius 88, Jellicent 90) | 🏮 Lampião |
| 40 | Coroa do Mundo | 11 — Loja da Coroa | 11 — Magnus (Salamence 95, Garchomp 97, Hydreigon 100) | 👑 Coroa |

Times tirados da tabela de encontros da própria cidade, no topo da banda.
Pré-requisito em escada (`requiredBadges` 0→10); recompensas 1.500→30.000.
Mapas 1–3 (Brock/Misty/Lance + lojas 1–3) intactos — total **11 ginásios**.

## Lojas: tiers e pedras absurdas

- Consumíveis por tier: Masterball só nas lojas 9–11, Hiper Poção da 7 em
  diante, resto progressivo (`SHOP_CONSUMABLES` em `seed-shop.ts`).
- As **21 pedras em todas as 11 lojas** a 100k–200k (clássicas 100k →
  Disco Dúbio/Manto do Ceifador 200k). Evoluções de espécies capturadas
  cedo não podem ficar presas atrás do mapa 20 — por isso pedra não tem
  tier de loja, tem tier de preço.
- **Preço propaga por sync idempotente no seed** (UPDATE onde difere),
  sem migration: produção recebe no primeiro request de loja.
- **Venda**: consumíveis recomprados pelo `sellPrice` (aba VENDER); pedras
  **sem recompra** — senão drop/boss viram fonte infinita de dinheiro.

## Drops

Selvagem nv 40+ tem **0,2%** de derrubar uma pedra uniforme entre as 21
(`src/lib/engine/drops.ts`, `rand` injetável para teste). Log `✨` + campo
`rewards.stone` para a UI futura (hoje o log basta).

## NPCs e cura

`CITY_NPCS` em `default-world.ts`: loja (6,7), ginásio (9,7), curandeira
(6,8) — no mapa 40, loja (5,7) e cura (9,8) por causa do Centro em (6,7).
Tipo `healer` já existia na validação e na UI (✚ + `handleHealParty`); só
faltava existir no mundo. Tile Centro garantido nas 8 cidades.

## Gerador

Os 22 ases novos são entrada do distribuidor → artefato regenerado
(`--write`, 37 mapas remexidos, mapa 1 intacto). Nidoking saiu do 35 para
o 38 na primeira regeneração e foi trocado por Mismagius (da tabela nova
do 35); segunda regeneração convergiu com 22/22 nas próprias cidades.

## Produção (após o merge)

Sem SQL. Rodar **World activation** (`production`/`apply=true`) para o
jsonb dos mapas (NPCs/centros/tabelas). Lojas/ginásios/preços entram via
seed no primeiro request.
