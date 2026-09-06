-- ============================================================================
-- Catchbound — PRODUÇÃO — pós-migration 0007 (itens de evolução 6.4-B)
-- Adiciona ao `users` as 14 colunas de inventário de evolução (pedras e
-- cascos) e substitui a check não-negativa para cobri-las.
--
-- POR QUE: a 6.4-B é a primeira entrega de pedras de evolução na loja e no
-- `/api/pokemon/manage`. A migration 0007 altera a tabela existente `users`
-- (NÃO cria tabela), então NÃO precisa de policy nova — mas segue o
-- protocolo do projeto: produção aplica migrations MANUALMENTE no SQL Editor
-- do Supabase (vercel.json não roda migration no build).
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- Rode em staging antes, se existir.
-- ============================================================================
BEGIN;

-- 0) Pré-condição: as colunas exatas que a migration 0007 deve entregar.
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing FROM (
    VALUES ('fire_stone'), ('water_stone'), ('thunder_stone'), ('leaf_stone'),
           ('moon_stone'), ('sun_stone'), ('shiny_stone'), ('metal_coat'),
           ('kings_rock'), ('dragon_scale'), ('upgrade'), ('dusk_stone'),
           ('dawn_stone'), ('oval_stone')
  ) AS want(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = want.col
  );
  IF missing > 0 THEN
    RAISE EXCEPTION 'Faltam % coluna(s) de evolução em users: aplique drizzle/0007_flowery_next_avengers.sql primeiro', missing;
  END IF;
END $$;

-- 1) DDL idêntico ao da migration (idempotente). As colunas já vêm NOT NULL
--    com DEFAULT 0 — este trecho só protege quem já rodou por fora.
DO $$
BEGIN
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fire_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS water_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS thunder_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS leaf_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS moon_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sun_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS shiny_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metal_coat integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kings_rock integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dragon_scale integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS upgrade integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dusk_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dawn_stone integer NOT NULL DEFAULT 0;
  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS oval_stone integer NOT NULL DEFAULT 0;
END $$;

-- 2) Substitui a check não-negativa (a migration derruba e recria com as 22
--    colunas; reproduzimos aqui para bancos que nunca rodaram a migration).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_inventory_nonnegative;

ALTER TABLE public.users ADD CONSTRAINT users_inventory_nonnegative CHECK (
  pokeballs >= 0 AND greatballs >= 0 AND ultraballs >= 0 AND masterballs >= 0
  AND potions >= 0 AND super_potions >= 0 AND max_potions >= 0 AND revives >= 0
  AND fire_stone >= 0 AND water_stone >= 0 AND thunder_stone >= 0
  AND leaf_stone >= 0 AND moon_stone >= 0 AND sun_stone >= 0
  AND shiny_stone >= 0 AND metal_coat >= 0 AND kings_rock >= 0
  AND dragon_scale >= 0 AND upgrade >= 0 AND dusk_stone >= 0
  AND dawn_stone >= 0 AND oval_stone >= 0
);

-- 3) Grants: tabela `users` já é acessível ao runtime; garante que nada foi
--    revogado para a coluna nova (grants são por tabela, então cobrem tudo).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO catchbound_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.users TO catchbound_backup;
  END IF;
END $$;

-- 4) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0007_flowery_next_avengers.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '99713701a9305d377a7fc0f6c479cd26c761521462d837f86288992ac84bd445', 1788723714766
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '99713701a9305d377a7fc0f6c479cd26c761521462d837f86288992ac84bd445'
);

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Esperado: evolution_columns = 14 · check_exists = 1 · runtime_grants = 4 ·
--           migrations = 8
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('fire_stone','water_stone','thunder_stone','leaf_stone',
                          'moon_stone','sun_stone','shiny_stone','metal_coat',
                          'kings_rock','dragon_scale','upgrade','dusk_stone',
                          'dawn_stone','oval_stone')) AS evolution_columns,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND conname = 'users_inventory_nonnegative'
      AND contype = 'c') AS check_exists,
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'users'
      AND grantee = 'catchbound_runtime'
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) AS runtime_grants,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations;
