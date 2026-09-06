-- ============================================================================
-- Catchbound — PRODUÇÃO — pós-migration 0006 (confirmação de e-mail)
-- Libera a tabela nova `email_verification_codes` para os papéis de runtime
-- e de backup, no mesmo padrão das outras 11 tabelas (RLS + policy explícita).
--
-- POR QUE: a migration 0006 cria a tabela, mas em produção todas as tabelas
-- têm RLS ligado e o papel `catchbound_runtime` só enxerga/escreve onde há
-- policy própria (ver supabase-production-runtime-role.sql). Sem isto o
-- cadastro falha ao gravar o código (42501 "new row violates row-level
-- security policy") e a rota responde 500 "Falha na autenticação.".
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- Rode em staging antes, se existir.
-- ============================================================================
BEGIN;

-- 0) Pré-condição: a migration 0006 precisa ter sido aplicada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'email_verification_codes'
  ) THEN
    RAISE EXCEPTION 'Tabela email_verification_codes não existe: aplique drizzle/0006_melodic_maginty.sql primeiro';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email_verified'
  ) THEN
    RAISE EXCEPTION 'Coluna users.email_verified não existe: aplique drizzle/0006_melodic_maginty.sql primeiro';
  END IF;
END $$;

-- 1) Mesma postura das demais tabelas: RLS ligado (Data API pública fechada).
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.email_verification_codes FROM anon;
    REVOKE ALL ON SEQUENCE public.email_verification_codes_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.email_verification_codes FROM authenticated;
    REVOKE ALL ON SEQUENCE public.email_verification_codes_id_seq FROM authenticated;
  END IF;
END $$;

-- 2) Runtime: DML + sequence + policy (igual às outras tabelas).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_verification_codes TO catchbound_runtime;
    GRANT USAGE, SELECT ON SEQUENCE public.email_verification_codes_id_seq TO catchbound_runtime;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'email_verification_codes'
        AND policyname = 'catchbound_runtime_all'
    ) THEN
      CREATE POLICY catchbound_runtime_all ON public.email_verification_codes
        FOR ALL TO catchbound_runtime USING (true) WITH CHECK (true);
    END IF;
  ELSE
    RAISE EXCEPTION 'Papel catchbound_runtime não existe neste banco (é o banco de produção?)';
  END IF;
END $$;

-- 3) Backup: somente leitura (o dump precisa ver a tabela).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.email_verification_codes TO catchbound_backup;
    GRANT USAGE, SELECT ON SEQUENCE public.email_verification_codes_id_seq TO catchbound_backup;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'email_verification_codes'
        AND policyname = 'catchbound_backup_select'
    ) THEN
      CREATE POLICY catchbound_backup_select ON public.email_verification_codes
        FOR SELECT TO catchbound_backup USING (true);
    END IF;
  END IF;
END $$;

-- 4) Garante que os grants em `users` cobrem a coluna nova (grants são por
--    tabela, então já cobrem — isto é só defesa caso alguém tenha revogado).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO catchbound_runtime;

-- 5) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0006_melodic_maginty.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '74ad838eb8c7d9622067b6e5aba9cd96f3121ebdc25c3fb89dfd6e9dca055782', 1788714017836
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '74ad838eb8c7d9622067b6e5aba9cd96f3121ebdc25c3fb89dfd6e9dca055782'
);

COMMIT;

-- ── Conferência (única tabela de saída; o SQL Editor mostra só o último set) ──
-- Esperado: rls_on = true · runtime_privs = 4 · runtime_policy = 1 ·
--           backup_policy = 1 (ou 0 se o papel de backup não existir) ·
--           migrations = 7 · unverified_users = contas presas (ver README abaixo)
SELECT
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'email_verification_codes') AS rls_on,
  (SELECT count(*) FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'email_verification_codes'
      AND grantee = 'catchbound_runtime'
      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) AS runtime_privs,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'email_verification_codes' AND policyname = 'catchbound_runtime_all') AS runtime_policy,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'
    AND tablename = 'email_verification_codes' AND policyname = 'catchbound_backup_select') AS backup_policy,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations,
  (SELECT count(*) FROM public.users WHERE email_verified = false) AS unverified_users;

-- Contas "presas" (criadas durante a falha, sem código gravado): NÃO precisam
-- ser apagadas. Após este script, o jogador pode (a) tentar CRIAR CONTA de
-- novo com o mesmo usuário/e-mail/senha — o servidor reconhece a conta
-- pendente e só reenvia o código — ou (b) ENTRAR → tela de confirmação →
-- REENVIAR. Se preferir limpar: 
--   DELETE FROM public.users WHERE email_verified = false AND created_at < now();
