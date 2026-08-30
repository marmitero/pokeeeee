-- Migration 0004 — permite expiração operacional de salas PvP.
BEGIN;

ALTER TABLE public.pvp_battles
  DROP CONSTRAINT pvp_battles_status_check;

ALTER TABLE public.pvp_battles
  ADD CONSTRAINT pvp_battles_status_check
  CHECK (status IN ('WAITING', 'ACTIVE', 'FINISHED', 'ABANDONED'));

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES (
  '680bc51e0a8953f62e531a572d01c344a1f150df5ab8f1222780c9f3c080e009',
  1788017993127
);

COMMIT;

SELECT
  (SELECT count(*) FROM drizzle.__drizzle_migrations) AS migrations,
  pg_get_constraintdef(oid) AS pvp_status_constraint
FROM pg_constraint
WHERE conname = 'pvp_battles_status_check'
GROUP BY oid;
