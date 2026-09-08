-- ============================================================================
-- Catchbound — PRODUÇÃO — migration 0011 (Status de batalha, 8.4)
-- Adiciona a `user_pokemon` as colunas `status` / `status_turns` (veneno,
-- veneno grave, queimadura, paralisia, sono, congelamento — persistem depois
-- da batalha até Centro Pokémon ou item, como no GBA) e a `users` as 7 colunas
-- de inventário dos itens de cura (Antídoto, Anti-Paralisia, Despertador,
-- Anti-Queimadura, Descongelante, Cura Total, Restaurador Total), substituindo
-- a check não-negativa para cobri-las.
--
-- POR QUE: a 8.4 traz status de batalha ao motor (selvagem, ginásio, boss e
-- PvP). O código novo lê/escreve `user_pokemon.status`, debita os itens de
-- cura em `users` e a loja os semeia sozinha (`ensureShopSeeded`). Altera
-- tabelas existentes (NÃO cria tabela) → sem policy nova; segue o protocolo:
-- produção aplica migrations MANUALMENTE no SQL Editor (vercel.json não roda
-- migration no build) e toda migration tem SQL companheiro com grants +
-- registro no journal do Drizzle (regra do incidente 2026-09-06).
--
-- ORDEM: colar e executar este arquivo ANTES de mergear/deployar a 8.4.
-- O código antigo ignora colunas extras (defaults 'NONE'/0), então aplicar
-- antes é seguro. Sem elas, o código novo quebraria ao gravar o turno.
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- Rode em staging antes, se existir.
-- ============================================================================
BEGIN;

-- 1) DDL idêntico ao da migration drizzle/0011_battle_status.sql, em forma
--    idempotente (ADD COLUMN IF NOT EXISTS). Pokémon existentes nascem sem
--    status ('NONE', 0) e jogadores com 0 de cada item.
ALTER TABLE public.user_pokemon ADD COLUMN IF NOT EXISTS status       text    NOT NULL DEFAULT 'NONE';
ALTER TABLE public.user_pokemon ADD COLUMN IF NOT EXISTS status_turns integer NOT NULL DEFAULT 0;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS antidotes      integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS paralyze_heals integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS awakenings     integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS burn_heals     integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ice_heals      integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_heals     integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_restores  integer NOT NULL DEFAULT 0;

-- 2) Pré-condição: as 21 colunas de pedras (0007 + 0008) precisam existir —
--    a check abaixo as cita. Se faltar alguma, aplique os companheiros 0007 e
--    0008 primeiro.
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing FROM (
    VALUES ('fire_stone'), ('water_stone'), ('thunder_stone'), ('leaf_stone'),
           ('moon_stone'), ('sun_stone'), ('shiny_stone'), ('metal_coat'),
           ('kings_rock'), ('dragon_scale'), ('upgrade'), ('dusk_stone'),
           ('dawn_stone'), ('oval_stone'), ('protector'), ('electirizer'),
           ('magmarizer'), ('razor_claw'), ('razor_fang'), ('dubious_disc'),
           ('reaper_cloth')
  ) AS want(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = want.col
  );
  IF missing > 0 THEN
    RAISE EXCEPTION 'Faltam % coluna(s) da 0007/0008 em users: aplique docs/supabase-production-0007-runtime.sql e 0008 primeiro', missing;
  END IF;
END $$;

-- 3) Check do status (valores válidos + contador não-negativo).
ALTER TABLE public.user_pokemon DROP CONSTRAINT IF EXISTS user_pokemon_status_check;
ALTER TABLE public.user_pokemon ADD CONSTRAINT user_pokemon_status_check CHECK (
  status IN ('NONE', 'PSN', 'TOX', 'BRN', 'PAR', 'SLP', 'FRZ') AND status_turns >= 0
);

-- 4) Substitui a check não-negativa do inventário (36 colunas: 8 básicas +
--    14 da 0007 + 7 da 0008 + 7 desta).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_inventory_nonnegative;

ALTER TABLE public.users ADD CONSTRAINT users_inventory_nonnegative CHECK (
  pokeballs >= 0 AND greatballs >= 0 AND ultraballs >= 0 AND masterballs >= 0
  AND potions >= 0 AND super_potions >= 0 AND max_potions >= 0 AND revives >= 0
  AND fire_stone >= 0 AND water_stone >= 0 AND thunder_stone >= 0
  AND leaf_stone >= 0 AND moon_stone >= 0 AND sun_stone >= 0
  AND shiny_stone >= 0 AND metal_coat >= 0 AND kings_rock >= 0
  AND dragon_scale >= 0 AND upgrade >= 0 AND dusk_stone >= 0
  AND dawn_stone >= 0 AND oval_stone >= 0
  AND protector >= 0 AND electirizer >= 0 AND magmarizer >= 0
  AND razor_claw >= 0 AND razor_fang >= 0 AND dubious_disc >= 0
  AND reaper_cloth >= 0
  AND antidotes >= 0 AND paralyze_heals >= 0 AND awakenings >= 0
  AND burn_heals >= 0 AND ice_heals >= 0 AND full_heals >= 0
  AND full_restores >= 0
);

-- 5) Grants: `users`, `user_pokemon` e `shop_items` já são acessíveis ao
--    runtime; garante que nada foi revogado (grants são por tabela, então
--    cobrem as colunas novas). A loja seeda os itens de cura sozinha, no
--    primeiro GET/POST de /api/shop (`ensureShopSeeded`, insert-if-ausente).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO catchbound_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pokemon TO catchbound_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_items TO catchbound_runtime;
  ELSE
    RAISE EXCEPTION 'Papel catchbound_runtime não existe neste banco (é o banco de produção?)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.users TO catchbound_backup;
    GRANT SELECT ON public.user_pokemon TO catchbound_backup;
    GRANT SELECT ON public.shop_items TO catchbound_backup;
  END IF;
END $$;

-- 6) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0011_battle_status.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'e28964bfe86d866ef3d8181bf184210998bc13f045b93959b618005e7f8e9fbe', 1788870700554
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = 'e28964bfe86d866ef3d8181bf184210998bc13f045b93959b618005e7f8e9fbe'
);

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Esperado: status_columns = 2 · cure_columns = 7 · status_check = 1 ·
--           inventory_check = 1 · runtime_grants = 8 · migrations = 12
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_pokemon'
      AND column_name IN ('status', 'status_turns')) AS status_columns,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('antidotes', 'paralyze_heals', 'awakenings', 'burn_heals',
                          'ice_heals', 'full_heals', 'full_restores')) AS cure_columns,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.user_pokemon'::regclass AND conname = 'user_pokemon_status_check'
      AND contype = 'c') AS status_check,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND conname = 'users_inventory_nonnegative'
      AND contype = 'c') AS inventory_check,
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name IN ('users', 'user_pokemon')
      AND grantee = 'catchbound_runtime'
      AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) AS runtime_grants,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations;

-- Depois do deploy: abrir a loja 1 (Vale Pallet) em catchbound.vercel.app —
-- devem aparecer 🧫 Antídoto e 💛 Anti-Paralisia; a loja 5 (Ilhas Glaciais)
-- traz ❄️ Descongelante e a 7+ ✨ Cura Total. Numa batalha selvagem, um
-- Pikachu (Onda Trovão, nv 10+) deve paralisar o oponente e a caixa de HP
-- mostrar a etiqueta PAR. Se a loja não listar os itens novos,
-- `SELECT item_key FROM shop_items WHERE shop_id = 1;` mostra o que o seed
-- conseguiu inserir.
