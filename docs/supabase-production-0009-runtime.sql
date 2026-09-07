-- ============================================================================
-- Catchbound — PRODUÇÃO — migration 0009 (chat local + whisper, 8.8)
-- Adiciona ao `chat_messages` colunas para chat no jogo:
--   map_id (local = mesmo mapa) e recipient_id (whisper = privado),
--   índices e check de canal.
--
-- POR QUE: Fase 8.8 — Chat dentro do jogo. Antes só existia no admin e na
-- arena PvP (canal arena-global). Agora o jogo tem 3 canais no mundo:
--   global (servidor todo), local (mesmo mapa), whisper (privado).
--   Nenhuma tabela nova, só colunas novas em chat_messages.
--
-- ORDEM: colar e executar este arquivo ANTES de mergear/deployar a 8.8.
-- O código novo lê/escreve map_id/recipient_id e o check novo inclui
-- 'local' e 'whisper'; sem as colunas, enviar local/whisper quebraria.
-- O código antigo ignora colunas extras, então aplicar antes é seguro.
--
-- COMO: colar inteiro no SQL Editor do Supabase (projeto de PRODUÇÃO) e
-- executar. Idempotente — pode rodar de novo sem efeito colateral.
-- ============================================================================
BEGIN;

-- 1) DDL idêntico ao da migration drizzle/0009_chat_local_whisper.sql,
--    em forma idempotente.
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS map_id integer;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS recipient_id integer;

-- FK recipient_id → users.id (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_messages_recipient_id_users_id_fk'
      AND conrelid = 'public.chat_messages'::regclass
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_recipient_id_users_id_fk
      FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE cascade;
  END IF;
END $$;

-- Índices novos (idempotentes)
CREATE INDEX IF NOT EXISTS chat_messages_map_id_idx ON public.chat_messages USING btree (map_id);
CREATE INDEX IF NOT EXISTS chat_messages_recipient_id_idx ON public.chat_messages USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS chat_messages_channel_map_idx ON public.chat_messages USING btree (channel, map_id);

-- Check de canal: precisa aceitar os 4 valores (global, local, whisper, arena-global)
-- Derruba se existir (nome pode variar) e recria.
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_channel_check;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_channel_check
  CHECK (channel IN ('global','local','whisper','arena-global'));

-- 2) Grants: chat_messages já é acessível ao runtime; garante que nada foi revogado.
--    Colunas novas herdam grants da tabela.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO catchbound_runtime;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catchbound_backup') THEN
    GRANT SELECT ON public.chat_messages TO catchbound_backup;
  END IF;
END $$;

-- 3) Registra a migration no journal do Drizzle (se ainda não estiver), para
--    que um futuro `npm run db:migrate` contra produção não tente reaplicar.
--    hash = sha256 de drizzle/0009_chat_local_whisper.sql; when = _journal.json.
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '7e0f69637b2b8e398c13b1e25dc7a83b11cd9de955be61bfaa949f4ef7ca7dee', 1788782655373
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations
  WHERE hash = '7e0f69637b2b8e398c13b1e25dc7a83b11cd9de955be61bfaa949f4ef7ca7dee'
);

COMMIT;

-- ── Conferência ─────────────────────────────────────────────────────────────
-- Esperado: chat_columns = 2 (map_id, recipient_id) · channel_check = 1 · indexes >=3 · migrations = 10
SELECT
  (SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_messages'
      AND column_name IN ('map_id','recipient_id')) AS chat_columns,
  (SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'public.chat_messages'::regclass AND conname = 'chat_messages_channel_check'
      AND contype = 'c') AS channel_check,
  (SELECT count(*) FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'chat_messages'
      AND indexname IN ('chat_messages_map_id_idx','chat_messages_recipient_id_idx','chat_messages_channel_map_idx')) AS indexes,
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations;

-- Depois do deploy: abrir o jogo em catchbound.vercel.app, logar, abrir o
-- chat (💬) no canto inferior direito — devem aparecer 3 abas: GLOBAL, LOCAL,
-- PRIVADO. Enviar mensagem em cada aba e conferir que local só aparece para
-- quem está no mesmo mapa e privado só para remetente/destinatário.
