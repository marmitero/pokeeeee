-- ============================================================================
-- Catchbound — PRODUÇÃO — REPARO pós-renumeração (Arena Boss, 8.3)
-- Contexto: após o merge da Etapa C (PR #15), o incidente de ids errados em
-- `game_maps` (1–3, 38–54, 75–94) foi corrigido com um script one-off de
-- renumeração. Esse script remapeou `game_maps`, `gym_leaders`, `battles`,
-- `users.current_map_id` e `chat_messages`, mas foi baseado no bootstrap
-- antigo que só tinha `battles.kind IN ('wild','gym')` — sem 'boss'.
-- Resultado: a Arena Boss aparece (GET /api/boss funciona, pois só lê
-- `boss_fights`), mas POST /api/battle {action:"start_boss"} falha com
-- "Erro na batalha" (500) por violação do CHECK `battles_kind_check`.
--
-- Este arquivo é idempotente e reaplica apenas o necessário da migration
-- 0010, sem recriar a tabela `boss_fights`. Pode ser colado e executado
-- quantas vezes for preciso no SQL Editor de PRODUÇÃO.
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Depois, conferir a última tabela de saída.
-- ============================================================================
BEGIN;

-- 1) Garante que `boss_fights` existe (caso o bootstrap antigo não tivesse).
CREATE TABLE IF NOT EXISTS public.boss_fights (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  arena_map_id integer NOT NULL,
  week_id text NOT NULL,
  day text NOT NULL,
  status text DEFAULT 'ACTIVE' NOT NULL,
  stone_claimed boolean DEFAULT false NOT NULL,
  legendary_granted boolean DEFAULT false NOT NULL,
  boss_pokedex_id integer NOT NULL,
  boss_level integer NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  CONSTRAINT boss_fights_arena_check CHECK (arena_map_id IN (20, 40)),
  CONSTRAINT boss_fights_status_check CHECK (status IN ('ACTIVE', 'WON', 'LOST')),
  CONSTRAINT boss_fights_level_check CHECK (boss_level BETWEEN 80 AND 100)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'boss_fights_user_id_users_id_fk'
      AND conrelid = 'public.boss_fights'::regclass
  ) THEN
    ALTER TABLE public.boss_fights
      ADD CONSTRAINT boss_fights_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS boss_fights_user_arena_week_idx
  ON public.boss_fights USING btree (user_id, arena_map_id, week_id);
CREATE INDEX IF NOT EXISTS boss_fights_user_arena_day_idx
  ON public.boss_fights USING btree (user_id, arena_map_id, day);

-- 2) O FIX principal: libera kind='boss' em battles.
--    Se a constraint foi recriada pelo script de renumeração com o valor
--    antigo ('wild','gym'), o INSERT do boss falha com check violation.
ALTER TABLE public.battles DROP CONSTRAINT IF EXISTS battles_kind_check;
ALTER TABLE public.battles ADD CONSTRAINT battles_kind_check
  CHECK (kind IN ('wild', 'gym', 'boss'));

-- 3) RLS e policies (idempotentes) — garante que o reparo não quebre SELECT.
ALTER TABLE public.boss_fights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.boss_fights FROM anon;
    REVOKE ALL ON SEQUENCE public.boss_fights_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.boss_fights FROM authenticated;
    REVOKE ALL ON SEQUENCE public.boss_fights_id_seq FROM authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.boss_fights TO catchbound_runtime;
    GRANT USAGE, SELECT ON SEQUENCE public.boss_fights_id_seq TO catchbound_runtime;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'boss_fights'
        AND policyname = 'catchbound_runtime_all'
    ) THEN
      CREATE POLICY catchbound_runtime_all ON public.boss_fights
        FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.boss_fights TO catchbound_backup;
    GRANT USAGE, SELECT ON SEQUENCE public.boss_fights_id_seq TO catchbound_backup;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'boss_fights'
        AND policyname = 'catchbound_backup_select'
    ) THEN
      CREATE POLICY catchbound_backup_select ON public.boss_fights
        FOR SELECT TO catchbound_backup USING (true);
    END IF;
  END IF;
END $$;

-- 4) Registra a migration no journal se ainda não estiver (para drizzle-kit).
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '2e7553e2fcfbb86861ded96deadad9d1d3f804e4d62a736d00fbaa972b35c09b', 1788820214973
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '2e7553e2fcfbb86861ded96deadad9d1d3f804e4d62a736d00fbaa972b35c09b'
);

COMMIT;

-- ── Conferência (o Editor mostra só o último result set) ────────────────────
-- Esperado: boss_table=1 · kind_check=1 (contém 'boss') · kind_def contém boss ·
--           rls_on=true · runtime_policy=1 · migrations=11 · game_maps 40
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_name='boss_fights') AS boss_table,
  (SELECT count(*) FROM pg_constraint
    WHERE conname='battles_kind_check'
      AND pg_get_constraintdef(oid) LIKE '%boss%') AS kind_check,
  (SELECT pg_get_constraintdef(oid) FROM pg_constraint
    WHERE conname='battles_kind_check') AS kind_def,
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='boss_fights') AS rls_on,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname='public' AND tablename='boss_fights'
      AND policyname='catchbound_runtime_all') AS runtime_policy,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations,
  (SELECT count(*) FROM public.game_maps) AS game_maps_count;
