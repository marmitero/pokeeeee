-- Catchbound production backup role — rotação/recuperação de senha.
-- Use quando o papel catchbound_backup já existe, mas a senha foi perdida ou
-- você quer reforçar grants/policies antes de cadastrar os GitHub Secrets.
-- A última consulta revela a senha uma vez. Nunca envie em chat/log público.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    RAISE EXCEPTION 'O papel catchbound_backup não existe; execute primeiro docs/supabase-production-backup-role.sql';
  END IF;
END $$;

CREATE TEMP TABLE catchbound_backup_secret (
  password text NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO catchbound_backup_secret(password)
VALUES (
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
);

DO $$
DECLARE
  generated_password text;
BEGIN
  SELECT password INTO generated_password FROM catchbound_backup_secret;

  -- No Supabase, o usuário administrativo do projeto não é superuser real.
  -- Portanto ele não pode executar ALTER ROLE tocando em atributos como
  -- SUPERUSER/REPLICATION/BYPASSRLS, mesmo para definir o valor falso.
  -- A criação original já define esses atributos. Na rotação, alteramos só a
  -- senha e validamos as flags no SELECT final.
  EXECUTE format(
    'ALTER ROLE catchbound_backup PASSWORD %L',
    generated_password
  );
END $$;

-- Reaplica privilégios idempotentes. Isso não concede escrita nem DDL.
GRANT CONNECT ON DATABASE postgres TO catchbound_backup;
GRANT USAGE ON SCHEMA public TO catchbound_backup;
GRANT USAGE ON SCHEMA drizzle TO catchbound_backup;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO catchbound_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA drizzle TO catchbound_backup;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catchbound_backup;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA drizzle TO catchbound_backup;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT ON TABLES TO catchbound_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA drizzle
  GRANT SELECT ON TABLES TO catchbound_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO catchbound_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA drizzle
  GRANT USAGE, SELECT ON SEQUENCES TO catchbound_backup;

ALTER ROLE catchbound_backup SET statement_timeout = '15min';
ALTER ROLE catchbound_backup SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE catchbound_backup SET search_path = public, drizzle;

-- Cria policies de leitura que faltarem. CREATE POLICY não tem IF NOT EXISTS.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'users',
    'sessions',
    'user_pokemon',
    'game_maps',
    'shop_items',
    'gym_leaders',
    'user_badges',
    'pvp_battles',
    'battles',
    'rate_limits',
    'chat_messages'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
        AND policyname = 'catchbound_backup_select'
    ) THEN
      EXECUTE format(
        'CREATE POLICY catchbound_backup_select ON public.%I FOR SELECT TO catchbound_backup USING (true)',
        target_table
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Copie apenas este valor para o gerenciador de senhas e para o GitHub Secret
-- PRODUCTION_DB_PASSWORD. Nunca envie em chat.
SELECT password AS new_catchbound_backup_password
FROM catchbound_backup_secret;

-- Resultado esperado: all flags false; policies/grants presentes; escrita/DDL false.
SELECT
  rolname,
  rolsuper,
  rolcreatedb,
  rolcreaterole,
  rolreplication,
  rolbypassrls
FROM pg_roles
WHERE rolname = 'catchbound_backup';

SELECT
  (SELECT count(*)
   FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname = 'catchbound_backup_select') AS public_rls_select_policies,
  (SELECT count(DISTINCT table_name)
   FROM information_schema.table_privileges
   WHERE grantee = 'catchbound_backup'
     AND table_schema = 'public'
     AND privilege_type = 'SELECT') AS public_select_grants,
  (SELECT count(DISTINCT table_name)
   FROM information_schema.table_privileges
   WHERE grantee = 'catchbound_backup'
     AND table_schema = 'drizzle'
     AND privilege_type = 'SELECT') AS drizzle_select_grants,
  (SELECT count(*)
   FROM information_schema.table_privileges
   WHERE grantee = 'catchbound_backup'
     AND table_schema IN ('public', 'drizzle')
     AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')) AS write_grants,
  has_schema_privilege('catchbound_backup', 'public', 'CREATE') AS can_create_in_public;
