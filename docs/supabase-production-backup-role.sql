-- Catchbound production backup role — execute uma vez no projeto Supabase de produção.
-- Objetivo: criar um papel somente-leitura para o GitHub Actions fazer pg_dump
-- dos schemas public e drizzle sem usar postgres nem o runtime DML do jogo.
-- A última consulta revela a senha uma vez. Nunca envie em chat/log público.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    RAISE EXCEPTION 'O papel catchbound_backup já existe; operação recusada';
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
  EXECUTE format(
    'CREATE ROLE catchbound_backup LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
    generated_password
  );
END $$;

GRANT CONNECT ON DATABASE postgres TO catchbound_backup;
GRANT USAGE ON SCHEMA public TO catchbound_backup;
GRANT USAGE ON SCHEMA drizzle TO catchbound_backup;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO catchbound_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA drizzle TO catchbound_backup;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catchbound_backup;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA drizzle TO catchbound_backup;

-- Futuras tabelas/sequences continuam legíveis pelo papel de backup, mas dados
-- em tabelas públicas com RLS só serão lidos se houver policy explícita.
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

-- RLS: o papel de backup precisa ler todas as tabelas do jogo para o dump.
-- Ele continua sem INSERT/UPDATE/DELETE, sem DDL e sem BYPASSRLS.
CREATE POLICY catchbound_backup_select ON public.users
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.sessions
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.user_pokemon
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.game_maps
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.shop_items
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.gym_leaders
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.user_badges
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.pvp_battles
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.battles
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.rate_limits
  FOR SELECT TO catchbound_backup USING (true);
CREATE POLICY catchbound_backup_select ON public.chat_messages
  FOR SELECT TO catchbound_backup USING (true);

COMMIT;

-- O SQL Editor do Supabase pode exibir apenas o ÚLTIMO result set. Por isso a
-- senha e todas as validações saem em uma única tabela final.
-- Copie apenas `catchbound_backup_password` para o gerenciador de senhas e para
-- o GitHub Secret PRODUCTION_DB_PASSWORD. Nunca envie em chat.
-- Resultado esperado: all flags false, 11 policies/grants, escrita/DDL false.
SELECT
  (SELECT password FROM catchbound_backup_secret) AS catchbound_backup_password,
  (SELECT rolname FROM pg_roles WHERE rolname = 'catchbound_backup') AS rolname,
  (SELECT rolsuper FROM pg_roles WHERE rolname = 'catchbound_backup') AS rolsuper,
  (SELECT rolcreatedb FROM pg_roles WHERE rolname = 'catchbound_backup') AS rolcreatedb,
  (SELECT rolcreaterole FROM pg_roles WHERE rolname = 'catchbound_backup') AS rolcreaterole,
  (SELECT rolreplication FROM pg_roles WHERE rolname = 'catchbound_backup') AS rolreplication,
  (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'catchbound_backup') AS rolbypassrls,
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
