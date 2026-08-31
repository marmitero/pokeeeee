# Deploy da Fase 6.2-A — migration `0005`

## O que é

`drizzle/0005_mysterious_bloodstrike.sql`, registrada em
`drizzle/meta/_journal.json` (idx 5). Quatro comandos, todos **aditivos**:

```sql
ALTER TABLE "game_maps" ADD COLUMN "encounter_grid" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "game_maps" ADD COLUMN "collision_grid" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "game_maps" ADD COLUMN "encounter_rate" integer DEFAULT 22 NOT NULL;
ALTER TABLE "game_maps" ADD CONSTRAINT "game_maps_encounter_rate_check"
  CHECK ("game_maps"."encounter_rate" BETWEEN 0 AND 100);
```

Não apaga nada, não altera nada existente e não reescreve a tabela (Postgres 11+
resolve `ADD COLUMN ... DEFAULT` por metadado). `game_maps` tem 3 linhas.

## Quando aplicar — **antes** do deploy do código, e pode ser já

A ordem não é indiferente:

| Ordem | Resultado |
|---|---|
| migration primeiro, código depois | ✅ nada quebra em nenhum dos dois momentos |
| código primeiro, migration depois | ❌ toda leitura de mapa falha com `column "encounter_grid" does not exist` — jogo fora do ar até a migration rodar |

O código em produção hoje **não conhece** as colunas novas, então acrescentá-las
agora é invisível para o jogador: as três colunas nascem com o default, grade
vazia significa "modo legado", e o jogo se comporta exatamente como antes.

Por isso a recomendação é **aplicar agora**, com o PR ainda aberto. Isso tira o
risco da janela em que a Vercel já publicou o código novo e o banco ainda não
tem as colunas. Se preferir esperar, o requisito absoluto é: rodar a migration
**antes** de fazer o merge em `main` (que dispara o deploy).

Reverter o app depois disso é seguro: o código antigo simplesmente ignora as
colunas.

## Como aplicar

### Caminho A — `npm run db:migrate` (recomendado)

Na sua máquina, no ambiente administrativo (o sandbox do agente não alcança o
Supabase; egress bloqueado):

```bash
git fetch origin && git checkout arena/01a05735-pokeeeee
npm install
DIRECT_DATABASE_URL="postgresql://postgres:SENHA@db.PROJECT_REF.supabase.co:5432/postgres" \
  npm run db:migrate
```

Esperado: `[✓] migrations applied successfully!`

Regras que continuam valendo: conexão **direta** (5432) ou Session Pooler 5432
com usuário no formato `postgres.PROJECT_REF`; **nunca** o Transaction Pooler
6543. A URL não entra em Git, log nem chat.

O Drizzle aplica só o que falta e registra sozinho no journal — se `0005` já
tiver sido aplicada, o comando não faz nada.

### Caminho B — SQL Editor do Supabase (se não tiver como rodar Node)

Cole o bloco abaixo. Ele executa a migration **e** registra no journal do
Drizzle; sem esse registro o `db:migrate` tentaria aplicar de novo e falharia.

```sql
BEGIN;

ALTER TABLE "game_maps" ADD COLUMN "encounter_grid" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "game_maps" ADD COLUMN "collision_grid" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "game_maps" ADD COLUMN "encounter_rate" integer DEFAULT 22 NOT NULL;
ALTER TABLE "game_maps" ADD CONSTRAINT "game_maps_encounter_rate_check"
  CHECK ("game_maps"."encounter_rate" BETWEEN 0 AND 100);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('f28f6d0e9acec4322cad7dfd454bdc08e889aa80bd0bfc3ccd96ee060cd82e3d', 1788175424088);

COMMIT;
```

O `hash` é o SHA-256 do arquivo `.sql` (mesma convenção das entradas 0000–0003
em `docs/supabase-staging-bootstrap.sql`); `created_at` é o `when` do journal.

Se houver **staging**, rode lá primeiro e confira o `/api/health`.

## Conferir depois

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'game_maps'
  AND column_name IN ('encounter_grid','collision_grid','encounter_rate');
-- 3 linhas

SELECT count(*) AS migrations FROM drizzle.__drizzle_migrations;
-- 6

SELECT id, name, encounter_rate,
       jsonb_array_length(encounter_grid) AS enc_rows,
       jsonb_array_length(collision_grid) AS col_rows
FROM game_maps ORDER BY id;
-- encounter_rate = 22 e as duas grades com 0 linhas = modo legado, como esperado
```

E, depois do deploy do código: `/api/health` em 200 e um encontro no matinho do
mapa 1 continuar funcionando como sempre.

## Ainda pendente, separado disto

`npm run db:rebalance` (backfill dos movesets da Fase 6.1) nunca rodou em
produção. Vale esperar a **6.2-C**, que mexe de novo em golpes, curva de XP e
ginásios — assim o backfill roda uma vez só, já com os números finais.
