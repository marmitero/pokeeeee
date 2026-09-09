-- ============================================================================
-- Catchbound — PRODUÇÃO — migration 0013 (presença multiplayer + amizade, 8.9)
-- Cria a tabela `friendships` (amizade entre treinadores, par canônico) e a
-- coluna `users.last_seen_at` (heartbeat de presença do polling de 2–3 s).
--
-- POR QUE: a 8.9 mostra os outros jogadores no mapa (mesmo mapa + heartbeat
-- recente) e deixa interagir (amigo/PM/desafio). `friendships` é tabela NOVA
-- → segue o protocolo do incidente 2026-09-06: produção tem RLS em TODAS as
-- tabelas e o papel `catchbound_runtime` só opera onde há policy própria.
-- Sem isto, o INSERT de amizade falharia com 42501. A coluna nova em `users`
-- não precisa de policy extra (grants/policies de `users` já existem) — só o
-- `ADD COLUMN IF NOT EXISTS`.
--
-- ORDEM: colar e executar este arquivo ANTES de mergear/deployar a 8.9.
-- O código antigo ignora a tabela e a coluna; o novo precisa delas. Seguro.
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- Rode em staging antes, se existir.
-- ============================================================================
BEGIN;

-- 0) Pré-condição: a tabela `users` precisa existir (todas as fases) — a 8.9
--    pendura a coluna de presença nela e as FKs da amizade apontam para ela.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Tabela users não existe: aplique as migrations anteriores primeiro';
  END IF;
END $$;

-- 1) DDL idêntico ao da migration drizzle/0013_presence_friends.sql, em forma
--    idempotente (CREATE TABLE IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS public.friendships (
  id          serial PRIMARY KEY NOT NULL,
  user_a_id   integer NOT NULL,
  user_b_id   integer NOT NULL,
  created_at  timestamp DEFAULT now()
);

-- 2) FKs → users.id (idempotentes).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friendships_user_a_id_users_id_fk'
      AND conrelid = 'public.friendships'::regclass
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_user_a_id_users_id_fk
      FOREIGN KEY (user_a_id) REFERENCES public.users(id) ON DELETE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friendships_user_b_id_users_id_fk'
      AND conrelid = 'public.friendships'::regclass
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_user_b_id_users_id_fk
      FOREIGN KEY (user_b_id) REFERENCES public.users(id) ON DELETE cascade;
  END IF;
END $$;

-- 3) Índices e unicidade do par (idempotentes).
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_unique
  ON public.friendships USING btree (user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS friendships_user_a_idx
  ON public.friendships USING btree (user_a_id);
CREATE INDEX IF NOT EXISTS friendships_user_b_idx
  ON public.friendships USING btree (user_b_id);

-- 4) Check: nunca amizade consigo mesmo (drop + add, idempotente).
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_distinct_check;
ALTER TABLE public.friendships ADD CONSTRAINT friendships_distinct_check
  CHECK (user_a_id <> user_b_id);

-- 5) Coluna de presença em `users` (idempotente). Default = epoch de propósito:
--    só fica "visível" no mapa quem de fato envia heartbeat.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp DEFAULT to_timestamp(0);

-- 6) Mesma postura das demais tabelas: RLS ligado (Data API pública fechada).
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.friendships FROM anon;
    REVOKE ALL ON SEQUENCE public.friendships_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.friendships FROM authenticated;
    REVOKE ALL ON SEQUENCE public.friendships_id_seq FROM authenticated;
  END IF;
END $$;

-- 7) Runtime: DML + sequence + policy (igual às outras tabelas).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO catchbound_runtime;
    GRANT USAGE, SELECT ON SEQUENCE public.friendships_id_seq TO catchbound_runtime;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'friendships'
        AND policyname = 'catchbound_runtime_all'
    ) THEN
      CREATE POLICY catchbound_runtime_all ON public.friendships
        FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
    END IF;
  ELSE
    RAISE EXCEPTION 'Papel catchbound_runtime não existe neste banco (é o banco de produção?)';
  END IF;
END $$;

-- 8) Backup: somente leitura (o dump precisa ver a tabela).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.friendships TO catchbound_backup;
    GRANT USAGE, SELECT ON SEQUENCE public.friendships_id_seq TO catchbound_backup;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'friendships'
        AND policyname = 'catchbound_backup_select'
    ) THEN
      CREATE POLICY catchbound_backup_select ON public.friendships
        FOR SELECT TO catchbound_backup USING (true);
    END IF;
  END IF;
END $$;

-- 9) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0013_presence_friends.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '5b728d561e526461b94d65e9d9fb6e3488a6385b043880a3d82ded694e2900b7', 1788980195288
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '5b728d561e526461b94d65e9d9fb6e3488a6385b043880a3d82ded694e2900b7'
);

COMMIT;

-- ── Conferência (única tabela de saída; o SQL Editor mostra só o último set) ──
-- Esperado: rls_on = true · runtime_privs = 4 · runtime_policy = 1 ·
--           backup_policy = 1 · indexes = 3 · checks = 1 · last_seen_col = 1 ·
--           migrations = 14
SELECT
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'friendships') AS rls_on,
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'friendships'
      AND grantee = 'catchbound_runtime'
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) AS runtime_privs,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'friendships' AND policyname = 'catchbound_runtime_all') AS runtime_policy,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'friendships' AND policyname = 'catchbound_backup_select') AS backup_policy,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'friendships'
      AND indexname IN ('friendships_pair_unique','friendships_user_a_idx','friendships_user_b_idx')) AS indexes,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.friendships'::regclass AND contype = 'c'
      AND conname IN ('friendships_distinct_check')) AS checks,
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'last_seen_at') AS last_seen_col,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations;

-- Depois do deploy: em catchbound.vercel.app, logar com duas contas no mesmo
-- mapa — os dois treinadores aparecem um para o outro (crachá com o avatar).
-- Clicar no outro jogador (ou no botão 👤 ao pisar na mesma célula) abre o
-- menu: ➕ amigo, 💬 PM (abre o sussurro) e ⚔️ desafiar (cria sala PvP e
-- sussurra o código).
