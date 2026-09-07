-- ============================================================================
-- Catchbound — PRODUÇÃO — migration 0008 (itens de evolução de Sinnoh, 6.4-D)
-- Adiciona ao `users` as 7 colunas de inventário dos itens de evolução de
-- Sinnoh (Protetor, Eletrizador, Magmatizador, Garra Afiada, Presa Afiada,
-- Disco Dúbio, Manto do Ceifador) e substitui a check não-negativa para
-- cobri-las.
--
-- POR QUE: a 6.4-D traz 106 espécies de Sinnoh e 7 itens de evolução novos.
-- Cada item é uma coluna inteira em `users` (mesmo desenho da 6.4-B). A
-- migration 0008 altera a tabela existente `users` (NÃO cria tabela), então
-- NÃO precisa de policy nova — mas segue o protocolo do projeto: produção
-- aplica migrations MANUALMENTE no SQL Editor do Supabase (vercel.json não
-- roda migration no build) e toda migration tem um SQL companheiro com
-- grants + registro no journal do Drizzle (regra do incidente 2026-09-06).
--
-- ORDEM: colar e executar este arquivo ANTES de mergear/deployar a 6.4-D.
-- O código novo lê/escreve as colunas novas (loja, /api/pokemon/manage,
-- Ferramentas GM); sem elas, comprar ou usar um item de Sinnoh quebraria.
-- O código antigo ignora colunas extras, então aplicar antes é seguro.
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- Rode em staging antes, se existir.
-- ============================================================================
BEGIN;

-- 1) DDL idêntico ao da migration drizzle/0008_sinnoh_evolution_items.sql,
--    em forma idempotente (ADD COLUMN IF NOT EXISTS). As colunas já vêm
--    NOT NULL DEFAULT 0, então usuários existentes ganham 0 de cada item.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS protector    integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS electirizer  integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS magmarizer   integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS razor_claw   integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS razor_fang   integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dubious_disc integer NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reaper_cloth integer NOT NULL DEFAULT 0;

-- 2) Pré-condição: as 14 colunas da 0007 precisam existir (a check abaixo as
--    cita). Se faltar alguma, aplique docs/supabase-production-0007-runtime.sql
--    primeiro.
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
    RAISE EXCEPTION 'Faltam % coluna(s) da 0007 em users: aplique docs/supabase-production-0007-runtime.sql primeiro', missing;
  END IF;
END $$;

-- 3) Substitui a check não-negativa (a migration derruba e recria com as 29
--    colunas de inventário: 8 básicas + 14 da 0007 + 7 desta).
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
);

-- 4) Grants: `users` e `shop_items` já são acessíveis ao runtime; garante que
--    nada foi revogado (grants são por tabela, então cobrem as colunas novas).
--    A loja seeda os 7 itens novos sozinha, no primeiro GET/POST de /api/shop
--    (`ensureShopSeeded`, insert-if-ausente) — por isso o runtime precisa de
--    INSERT em shop_items, que a política da 6.4-B já concedia.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO catchbound_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_items TO catchbound_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.users TO catchbound_backup;
    GRANT SELECT ON public.shop_items TO catchbound_backup;
  END IF;
END $$;

-- 5) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0008_sinnoh_evolution_items.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '5f30de135ec84fdf73322d503983ee3f784a8cc8aed3fab06ac50cdffeca7d65', 1788741054279
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '5f30de135ec84fdf73322d503983ee3f784a8cc8aed3fab06ac50cdffeca7d65'
);

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Esperado: sinnoh_columns = 7 · check_exists = 1 · runtime_grants = 4 ·
--           migrations = 9
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('protector','electirizer','magmarizer','razor_claw',
                          'razor_fang','dubious_disc','reaper_cloth')) AS sinnoh_columns,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND conname = 'users_inventory_nonnegative'
      AND contype = 'c') AS check_exists,
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'users'
      AND grantee = 'catchbound_runtime'
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) AS runtime_grants,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations;

-- Depois do deploy: abrir a loja 3 (Pico Celeste) em catchbound.vercel.app —
-- devem aparecer os 7 itens novos (Protetor, Eletrizador, Magmatizador, Garra
-- Afiada, Presa Afiada, Disco Dúbio, Manto do Ceifador). Se a loja não os
-- listar, `SELECT item_key FROM shop_items WHERE shop_id = 3;` mostra o que o
-- seed conseguiu inserir.
