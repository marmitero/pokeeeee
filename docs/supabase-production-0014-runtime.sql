-- ============================================================================
-- Catchbound — PRODUÇÃO — migration 0014 (convites PvP diretos persistentes)
--
-- Cria pvp_challenges, que mantém convite, aceite, recusa, expiração,
-- cancelamento e cooldown no servidor. O aceite grava a pvp_battles criada na
-- mesma transação da aplicação e os dois clientes a descobrem por polling.
--
-- EXECUÇÃO: colar o arquivo inteiro no SQL Editor do Supabase, em produção,
-- antes de publicar o código desta etapa. Idempotente: pode ser executado
-- novamente sem duplicar tabela, constraints, índices, policies ou journal.
-- Rode em staging antes, se disponível. Não use o Data API para esta operação.
-- ============================================================================
BEGIN;

-- 0) Pré-condições: os FKs e o aceite dependem do núcleo PvP já existente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Tabela public.users não existe: aplique as migrations anteriores primeiro';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pvp_battles'
  ) THEN
    RAISE EXCEPTION 'Tabela public.pvp_battles não existe: aplique o núcleo da Arena PvP primeiro';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_pokemon'
  ) THEN
    RAISE EXCEPTION 'Tabela public.user_pokemon não existe: aplique as migrations de Pokémon primeiro';
  END IF;
END $$;

-- 1) DDL equivalente a drizzle/0014_clever_kid_colt.sql.
CREATE TABLE IF NOT EXISTS public.pvp_challenges (
  id             serial PRIMARY KEY NOT NULL,
  challenger_id  integer NOT NULL,
  target_id      integer NOT NULL,
  status         text DEFAULT 'PENDING' NOT NULL,
  battle_id      integer,
  created_at     timestamp DEFAULT now(),
  updated_at     timestamp DEFAULT now(),
  expires_at     timestamp NOT NULL,
  cooldown_until timestamp
);

-- 2) FKs (cada uma é conferida pelo nome e pela tabela, portanto é segura em
--    reexecução e não depende de mensagens de erro do PostgreSQL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pvp_challenges_challenger_id_users_id_fk'
      AND conrelid = 'public.pvp_challenges'::regclass
  ) THEN
    ALTER TABLE public.pvp_challenges
      ADD CONSTRAINT pvp_challenges_challenger_id_users_id_fk
      FOREIGN KEY (challenger_id) REFERENCES public.users(id) ON DELETE restrict;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pvp_challenges_target_id_users_id_fk'
      AND conrelid = 'public.pvp_challenges'::regclass
  ) THEN
    ALTER TABLE public.pvp_challenges
      ADD CONSTRAINT pvp_challenges_target_id_users_id_fk
      FOREIGN KEY (target_id) REFERENCES public.users(id) ON DELETE restrict;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pvp_challenges_battle_id_pvp_battles_id_fk'
      AND conrelid = 'public.pvp_challenges'::regclass
  ) THEN
    ALTER TABLE public.pvp_challenges
      ADD CONSTRAINT pvp_challenges_battle_id_pvp_battles_id_fk
      FOREIGN KEY (battle_id) REFERENCES public.pvp_battles(id) ON DELETE set null;
  END IF;
END $$;

-- 3) Checks e índices. DROP + ADD nos checks também corrige uma instalação
--    parcial sem criar nomes duplicados.
ALTER TABLE public.pvp_challenges DROP CONSTRAINT IF EXISTS pvp_challenges_status_check;
ALTER TABLE public.pvp_challenges ADD CONSTRAINT pvp_challenges_status_check
  CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED'));
ALTER TABLE public.pvp_challenges DROP CONSTRAINT IF EXISTS pvp_challenges_players_distinct;
ALTER TABLE public.pvp_challenges ADD CONSTRAINT pvp_challenges_players_distinct
  CHECK (challenger_id <> target_id);

CREATE INDEX IF NOT EXISTS pvp_challenges_target_status_idx
  ON public.pvp_challenges USING btree (target_id, status);
CREATE INDEX IF NOT EXISTS pvp_challenges_challenger_status_idx
  ON public.pvp_challenges USING btree (challenger_id, status);
CREATE INDEX IF NOT EXISTS pvp_challenges_pair_created_idx
  ON public.pvp_challenges USING btree (challenger_id, target_id, created_at);

-- 4) Data API fechada. O servidor usa o papel dedicado abaixo.
ALTER TABLE public.pvp_challenges ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.pvp_challenges FROM anon;
    REVOKE ALL ON SEQUENCE public.pvp_challenges_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.pvp_challenges FROM authenticated;
    REVOKE ALL ON SEQUENCE public.pvp_challenges_id_seq FROM authenticated;
  END IF;
END $$;

-- 5) Runtime: o app precisa do DML da tabela, da sequence serial e de uma
--    policy própria; sem os três o Postgres responde 42501 sob RLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    RAISE EXCEPTION 'Papel catchbound_runtime não existe neste banco (é o banco de produção?)';
  END IF;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.pvp_challenges TO catchbound_runtime;
  GRANT USAGE, SELECT ON SEQUENCE public.pvp_challenges_id_seq TO catchbound_runtime;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pvp_challenges'
      AND policyname = 'catchbound_runtime_all'
  ) THEN
    CREATE POLICY catchbound_runtime_all ON public.pvp_challenges
      FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6) Backup é opcional no ambiente, mas quando existe deve conseguir ler a
--    tabela e a sequence como nas migrations anteriores.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.pvp_challenges TO catchbound_backup;
    GRANT USAGE, SELECT ON SEQUENCE public.pvp_challenges_id_seq TO catchbound_backup;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'pvp_challenges'
        AND policyname = 'catchbound_backup_select'
    ) THEN
      CREATE POLICY catchbound_backup_select ON public.pvp_challenges
        FOR SELECT TO catchbound_backup USING (true);
    END IF;
  END IF;
END $$;

-- 7) Registra a migration no journal do Drizzle. A criação defensiva permite
--    executar este arquivo em uma instalação que ainda não tenha criado o
--    schema auxiliar; os hashes anteriores continuam sendo responsabilidade
--    do bootstrap/migrations já aplicados.
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'dcd6afde5c5fae5b7f752ca733227031ab8fca4d7ba3d6173f7bd789fc7b0a9c', 1789034195049
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = 'dcd6afde5c5fae5b7f752ca733227031ab8fca4d7ba3d6173f7bd789fc7b0a9c'
);

COMMIT;

-- ── Conferência final (o SQL Editor deve retornar uma única linha) ───────────
-- Esperado em produção: rls_on=true, runtime_privs=4, runtime_policy=1,
-- indexes=3, checks=2, fks=3, migration_0014=1. backup_policy vale 1 quando
-- o papel catchbound_backup existir.
SELECT
  (SELECT c.relrowsecurity
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'pvp_challenges') AS rls_on,
  (SELECT count(*)
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'pvp_challenges'
      AND grantee = 'catchbound_runtime'
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) AS runtime_privs,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pvp_challenges'
      AND policyname = 'catchbound_runtime_all') AS runtime_policy,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pvp_challenges'
      AND policyname = 'catchbound_backup_select') AS backup_policy,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'pvp_challenges'
      AND indexname IN (
        'pvp_challenges_target_status_idx',
        'pvp_challenges_challenger_status_idx',
        'pvp_challenges_pair_created_idx')) AS indexes,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.pvp_challenges'::regclass
      AND conname IN (
        'pvp_challenges_status_check',
        'pvp_challenges_players_distinct')) AS checks,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.pvp_challenges'::regclass
      AND conname IN (
        'pvp_challenges_challenger_id_users_id_fk',
        'pvp_challenges_target_id_users_id_fk',
        'pvp_challenges_battle_id_pvp_battles_id_fk')) AS fks,
  (SELECT count(*) FROM drizzle.__drizzle_migrations
    WHERE hash = 'dcd6afde5c5fae5b7f752ca733227031ab8fca4d7ba3d6173f7bd789fc7b0a9c') AS migration_0014;

-- Após o deploy: duas contas no mesmo mapa devem conseguir desafiar, recusar
-- ou aceitar. No aceite, as duas telas devem abrir a mesma batalha friendly;
-- a chamada concorrente adicional deve receber o estado já resolvido, nunca
-- criar uma segunda batalha.
