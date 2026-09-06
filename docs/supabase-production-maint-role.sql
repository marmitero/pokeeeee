-- ─────────────────────────────────────────────────────────────────────────────
-- Papel `catchbound_maint` — manutenção do MUNDO a partir do GitHub Actions
-- (workflow `world-activation.yml`): roda `world:seed`, `db:rebalance`,
-- `world:export` e `world:import --dry-run` sem exigir máquina local.
--
-- Execute UMA VEZ no SQL Editor do Supabase — no projeto de PRODUÇÃO e, se
-- quiser ensaiar antes, também no de STAGING (o script é o mesmo nos dois).
--
-- Princípio do privilégio mínimo (mesma filosofia do catchbound_runtime e do
-- catchbound_backup): só DML nas 4 tabelas que os scripts de mundo tocam.
-- Sem DDL, sem superuser, sem BYPASSRLS, sem CREATE no schema.
--
-- Idempotente: se o papel já existe, apenas ROTACIONA a senha e reaplica
-- grants/policies. Rode de novo sempre que a senha for perdida/exposta.
--
-- Depois de executar, cadastre no GitHub (Settings → Secrets and variables →
-- Actions → Repository secrets), SEM o sufixo do project ref no usuário:
--   PRODUCTION_MAINT_DB_USER     = catchbound_maint.<PROJECT_REF>
--   PRODUCTION_MAINT_DB_PASSWORD = (o valor revelado na última célula abaixo)
--   STAGING_MAINT_DB_USER        = catchbound_maint.<PROJECT_REF_DO_STAGING>
--   STAGING_MAINT_DB_PASSWORD    = ...
-- A senha NUNCA vai para chat, issue ou log.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Cria o papel se não existir (flags nunca mudam depois — mesma regra do
--    papel de backup: em Supabase o papel administrativo não é superuser real).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_maint') THEN
    CREATE ROLE catchbound_maint
      LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

-- 2. Senha nova a cada execução (criação ou rotação), gerada no próprio
--    Postgres para nunca trafegar por chat.
CREATE TEMP TABLE catchbound_maint_secret (
  password text NOT NULL
) ON COMMIT PRESERVE ROWS;

INSERT INTO catchbound_maint_secret(password)
VALUES (
  replace(gen_random_uuid()::text, '-', '') ||
  replace(gen_random_uuid()::text, '-', '')
);

DO $$
DECLARE
  generated_password text;
BEGIN
  SELECT password INTO generated_password FROM catchbound_maint_secret;
  EXECUTE format('ALTER ROLE catchbound_maint LOGIN PASSWORD %L', generated_password);
END $$;

-- 3. Grants mínimos: exatamente as tabelas que os scripts de mundo escrevem/lêem.
GRANT CONNECT ON DATABASE postgres TO catchbound_maint;
GRANT USAGE ON SCHEMA public TO catchbound_maint;

GRANT SELECT, INSERT, UPDATE ON public.game_maps     TO catchbound_maint;  -- world:seed/export/import
GRANT SELECT, INSERT, UPDATE ON public.gym_leaders   TO catchbound_maint;  -- db:rebalance (níveis), export/import
GRANT SELECT, INSERT, UPDATE ON public.user_pokemon  TO catchbound_maint;  -- db:rebalance (movesets)
GRANT SELECT, INSERT, UPDATE ON public.shop_items    TO catchbound_maint;  -- export/import (dry-run executa+rollback)

-- game_maps.id é serial: INSERT precisa de USAGE na sequence.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO catchbound_maint;

-- 4. RLS está ligado em todas as tabelas; sem policy própria o papel não
--    enxerga nada. Policies explícitas, só nas 4 tabelas acima.
DROP POLICY IF EXISTS catchbound_maint_all ON public.game_maps;
CREATE POLICY catchbound_maint_all ON public.game_maps
  FOR ALL TO catchbound_maint USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS catchbound_maint_all ON public.gym_leaders;
CREATE POLICY catchbound_maint_all ON public.gym_leaders
  FOR ALL TO catchbound_maint USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS catchbound_maint_all ON public.user_pokemon;
CREATE POLICY catchbound_maint_all ON public.user_pokemon
  FOR ALL TO catchbound_maint USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS catchbound_maint_all ON public.shop_items;
CREATE POLICY catchbound_maint_all ON public.shop_items
  FOR ALL TO catchbound_maint USING (true) WITH CHECK (true);

-- 5. Limites conservadores para uma operação administrativa.
ALTER ROLE catchbound_maint SET statement_timeout = '60s';
ALTER ROLE catchbound_maint SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE catchbound_maint SET search_path = 'public';

COMMIT;

-- 6. Resultado único (o SQL Editor exibe só a última tabela). Copie a senha
--    AGORA para o gerenciador de senhas e para o secret do GitHub.
--    No Session Pooler o usuário é: catchbound_maint.<PROJECT_REF>  (porta 5432; nunca 6543)
SELECT
  (SELECT password FROM catchbound_maint_secret)                AS senha_unica,
  (SELECT count(*) FROM pg_policies
    WHERE policyname = 'catchbound_maint_all')                    AS policies_rls,   -- esperado: 4
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE grantee = 'catchbound_maint'
      AND table_schema = 'public')                                AS grants_tabelas, -- esperado: 12 (4 tabelas × SELECT/INSERT/UPDATE)
  rolsuper                                                        AS pode_ser_superuser, -- esperado: false
  rolbypassrls                                                    AS pode_pular_rls      -- esperado: false
FROM pg_roles
WHERE rolname = 'catchbound_maint';
