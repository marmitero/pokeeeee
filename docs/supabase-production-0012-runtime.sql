-- ============================================================================
-- Catchbound — PRODUÇÃO — migration 0012 (Arena PvP ranqueada, 8.5)
-- Cria a tabela `pvp_seasons`: o retrato de cada temporada semanal encerrada
-- da Arena ranqueada — uma linha por jogador do top 10 (por ELO, entre quem
-- tem ≥ 10 partidas ranqueadas), com ELO final, colocação e recompensa
-- entregue na hora (Pk$ + Cura Total + Restaurador Total).
--
-- POR QUE: a 8.5 traz ELO (K 32/24, piso 100, só em `mode = "ranked"`), fila
-- de pareamento por ELO (`join_ranked`), ranking global (top 50 + posição) e
-- temporada semanal com fechamento PREGUIÇOSO (sem cron): na 1ª chamada da
-- semana nova, a semana anterior é fotografada nesta tabela e o top 10 recebe
-- as recompensas. É tabela NOVA → segue o protocolo do incidente 2026-09-06:
-- produção tem RLS em TODAS as tabelas e o papel `catchbound_runtime` só opera
-- onde há policy própria. Sem isto, o fechamento falharia com 42501.
--
-- ORDEM: colar e executar este arquivo ANTES de mergear/deployar a 8.5.
-- O código antigo ignora a tabela (nada a lê); o novo precisa dela para o
-- ranking e para a recompensa semanal. Aplicar antes é seguro.
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- Rode em staging antes, se existir.
-- ============================================================================
BEGIN;

-- 0) Pré-condição: a 0011 (status de batalha) precisa estar aplicada — a 8.5
--    herda o motor de troca com status e usa `users.elo` (existe desde a
--    Fase 4) e as colunas `full_heals`/`full_restores` da 8.4 nas recompensas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'elo'
  ) THEN
    RAISE EXCEPTION 'Coluna users.elo não existe: aplique a migration da Fase 4 primeiro';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_heals'
  ) THEN
    RAISE EXCEPTION 'Coluna users.full_heals não existe: aplique docs/supabase-production-0011-runtime.sql primeiro';
  END IF;
END $$;

-- 1) DDL idêntico ao da migration drizzle/0012_pvp_ranked_seasons.sql, em
--    forma idempotente (CREATE TABLE IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS public.pvp_seasons (
  id             serial PRIMARY KEY NOT NULL,
  week_id        text NOT NULL,
  user_id        integer NOT NULL,
  elo_final      integer NOT NULL,
  rank           integer NOT NULL,
  reward_claimed boolean DEFAULT false NOT NULL,
  created_at     timestamp DEFAULT now()
);

-- 2) FK user_id → users.id (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pvp_seasons_user_id_users_id_fk'
      AND conrelid = 'public.pvp_seasons'::regclass
  ) THEN
    ALTER TABLE public.pvp_seasons
      ADD CONSTRAINT pvp_seasons_user_id_users_id_fk
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE cascade;
  END IF;
END $$;

-- 3) Índices e unicidade (idempotentes).
CREATE UNIQUE INDEX IF NOT EXISTS pvp_seasons_week_user_unique
  ON public.pvp_seasons USING btree (week_id, user_id);
CREATE INDEX IF NOT EXISTS pvp_seasons_week_rank_idx
  ON public.pvp_seasons USING btree (week_id, rank);

-- 4) Checks (drop + add, idempotente).
ALTER TABLE public.pvp_seasons DROP CONSTRAINT IF EXISTS pvp_seasons_rank_check;
ALTER TABLE public.pvp_seasons ADD CONSTRAINT pvp_seasons_rank_check
  CHECK (rank >= 1);
ALTER TABLE public.pvp_seasons DROP CONSTRAINT IF EXISTS pvp_seasons_elo_check;
ALTER TABLE public.pvp_seasons ADD CONSTRAINT pvp_seasons_elo_check
  CHECK (elo_final >= 0);

-- 5) Mesma postura das demais tabelas: RLS ligado (Data API pública fechada).
ALTER TABLE public.pvp_seasons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.pvp_seasons FROM anon;
    REVOKE ALL ON SEQUENCE public.pvp_seasons_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.pvp_seasons FROM authenticated;
    REVOKE ALL ON SEQUENCE public.pvp_seasons_id_seq FROM authenticated;
  END IF;
END $$;

-- 6) Runtime: DML + sequence + policy (igual às outras tabelas).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvp_seasons TO catchbound_runtime;
    GRANT USAGE, SELECT ON SEQUENCE public.pvp_seasons_id_seq TO catchbound_runtime;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'pvp_seasons'
        AND policyname = 'catchbound_runtime_all'
    ) THEN
      CREATE POLICY catchbound_runtime_all ON public.pvp_seasons
        FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
    END IF;
  ELSE
    RAISE EXCEPTION 'Papel catchbound_runtime não existe neste banco (é o banco de produção?)';
  END IF;
END $$;

-- 7) Backup: somente leitura (o dump precisa ver a tabela).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.pvp_seasons TO catchbound_backup;
    GRANT USAGE, SELECT ON SEQUENCE public.pvp_seasons_id_seq TO catchbound_backup;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'pvp_seasons'
        AND policyname = 'catchbound_backup_select'
    ) THEN
      CREATE POLICY catchbound_backup_select ON public.pvp_seasons
        FOR SELECT TO catchbound_backup USING (true);
    END IF;
  END IF;
END $$;

-- 8) As recompensas debitam `users.money/full_heals/full_restores` — garante
--    os grants em `users` (grants são por tabela, já cobrem; defesa).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO catchbound_runtime;
  END IF;
END $$;

-- 9) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0012_pvp_ranked_seasons.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '23966907c8990e92430df3c664d3095e4af788751d557d567749b9f77101d776', 1788886197168
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '23966907c8990e92430df3c664d3095e4af788751d557d567749b9f77101d776'
);

COMMIT;

-- ── Conferência (única tabela de saída; o SQL Editor mostra só o último set) ──
-- Esperado: rls_on = true · runtime_privs = 4 · runtime_policy = 1 ·
--           backup_policy = 1 · indexes = 2 · checks = 2 · migrations = 13
SELECT
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'pvp_seasons') AS rls_on,
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'pvp_seasons'
      AND grantee = 'catchbound_runtime'
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) AS runtime_privs,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'pvp_seasons' AND policyname = 'catchbound_runtime_all') AS runtime_policy,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'pvp_seasons' AND policyname = 'catchbound_backup_select') AS backup_policy,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'pvp_seasons'
      AND indexname IN ('pvp_seasons_week_user_unique','pvp_seasons_week_rank_idx')) AS indexes,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.pvp_seasons'::regclass AND contype = 'c'
      AND conname IN ('pvp_seasons_rank_check','pvp_seasons_elo_check')) AS checks,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations;

-- Depois do deploy: em catchbound.vercel.app, abrir ARENA PVP → aba RANQUEADA,
-- clicar "BUSCAR RIVAL RANQUEADO" com duas contas — o pareamento acontece
-- sozinho (ELO próximo). A aba RANKING lista o top 50 (aparece quem tiver 10+
-- partidas ranqueadas). No fim da semana, a 1ª abertura da semana nova fecha
-- a anterior e paga o top 10 (Pk$ + Cura Total + Restaurador Total).
