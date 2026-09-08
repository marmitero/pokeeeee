-- ============================================================================
-- Catchbound — PRODUÇÃO — migration 0010 (Arena Boss, 8.3)
-- Cria `boss_fights` (tentativas da Arena Boss: 2/dia/arena, vitória trava
-- a semana) e libera o kind 'boss' na tabela `battles`.
--
-- POR QUE: Etapa C, entrega B — NPC Arena Boss nos mapas 20 e 40, cada arena
-- com seu lendário semanal nv 80–100. O código novo insere em `boss_fights`
-- e cria batalhas kind='boss'; sem a tabela e sem o check novo, o boss
-- quebraria. O código antigo nunca escreve kind='boss', então aplicar antes
-- do merge é seguro.
--
-- ORDEM: colar e executar este arquivo ANTES de mergear/deployar a 8.3.
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- ============================================================================
BEGIN;

-- 1) DDL idêntico ao da migration drizzle/0010_boss_arena.sql, idempotente.
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

-- FK user_id → users.id (idempotente)
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

-- Índices (idempotentes)
CREATE INDEX IF NOT EXISTS boss_fights_user_arena_week_idx
  ON public.boss_fights USING btree (user_id, arena_map_id, week_id);
CREATE INDEX IF NOT EXISTS boss_fights_user_arena_day_idx
  ON public.boss_fights USING btree (user_id, arena_map_id, day);

-- Check de kind em battles: passa a aceitar 'boss'.
ALTER TABLE public.battles DROP CONSTRAINT IF EXISTS battles_kind_check;
ALTER TABLE public.battles ADD CONSTRAINT battles_kind_check
  CHECK (kind IN ('wild', 'gym', 'boss'));

-- 2) RLS ligado (Data API pública fechada), como nas demais tabelas.
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

-- 3) Runtime: DML + sequence + policy.
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
  ELSE
    RAISE EXCEPTION 'Papel catchbound_runtime não existe neste banco (é o banco de produção?)';
  END IF;
END $$;

-- 4) Backup: somente leitura.
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

-- 5) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0010_boss_arena.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '2e7553e2fcfbb86861ded96deadad9d1d3f804e4d62a736d00fbaa972b35c09b', 1788820214973
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '2e7553e2fcfbb86861ded96deadad9d1d3f804e4d62a736d00fbaa972b35c09b'
);

COMMIT;

-- ── Conferência (única tabela de saída; o SQL Editor mostra só o último set) ──
-- Esperado: boss_table = 1 · kind_check = 1 · indexes = 3 (2 da migration + PK) ·
--           rls_on = true · runtime_policy = 1 · migrations = 11
SELECT
  (SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'boss_fights') AS boss_table,
  (SELECT count(*) FROM pg_constraint
    WHERE conname = 'battles_kind_check'
      AND pg_get_constraintdef(oid) LIKE '%boss%') AS kind_check,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'boss_fights') AS indexes,
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'boss_fights') AS rls_on,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'boss_fights'
      AND policyname = 'catchbound_runtime_all') AS runtime_policy,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations;
