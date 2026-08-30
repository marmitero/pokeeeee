-- Cria o papel de runtime com senha aleatória gerada dentro do PostgreSQL.
-- Execute UMA VEZ depois do bootstrap. A última consulta revela a senha uma vez.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    RAISE EXCEPTION 'O papel catchbound_runtime já existe; operação recusada';
  END IF;
END $$;

CREATE TEMP TABLE catchbound_runtime_secret (
  password text NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO catchbound_runtime_secret(password)
VALUES (
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
);

DO $$
DECLARE
  generated_password text;
BEGIN
  SELECT password INTO generated_password FROM catchbound_runtime_secret;
  EXECUTE format(
    'CREATE ROLE catchbound_runtime LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
    generated_password
  );
END $$;

GRANT CONNECT ON DATABASE postgres TO catchbound_runtime;
GRANT USAGE ON SCHEMA public TO catchbound_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO catchbound_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catchbound_runtime;

-- Futuras tabelas/sequences ainda recebem grants, mas continuarão precisando
-- de RLS/policy explícita em migration antes de o runtime acessá-las.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO catchbound_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO catchbound_runtime;

ALTER ROLE catchbound_runtime SET statement_timeout = '15s';
ALTER ROLE catchbound_runtime SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE catchbound_runtime SET search_path = 'public';

CREATE POLICY catchbound_runtime_all ON public.users
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.sessions
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.user_pokemon
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.game_maps
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.shop_items
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.gym_leaders
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.user_badges
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.pvp_battles
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.battles
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.rate_limits
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
CREATE POLICY catchbound_runtime_all ON public.chat_messages
  FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);

-- Defesa adicional: papéis públicos não criam objetos nem acessam dados.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
  END IF;
END $$;

COMMIT;

-- Copie apenas o valor desta célula para o gerenciador de senhas e para a
-- variável DATABASE_PASSWORD da Vercel de produção. Nunca envie em chat.
SELECT password AS catchbound_runtime_password
FROM catchbound_runtime_secret;
