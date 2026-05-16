-- =============================================
-- Planification des cron jobs Supabase
-- =============================================
-- Ce script n'est PAS execute automatiquement par `supabase db push`.
-- Il doit etre lance manuellement dans Supabase Dashboard -> SQL Editor
-- apres avoir provisionne CRON_SECRET dans Edge Function Secrets.
--
-- Pre-requis :
--   1. Extensions actives : pg_cron + pg_net
--      (Dashboard -> Database -> Extensions)
--   2. Variable d'env CRON_SECRET provisionnee dans
--      Dashboard -> Project Settings -> Edge Functions
--   3. Remplacer LE_CRON_SECRET (les 2 occurrences ci-dessous) par la
--      valeur reelle avant execution. Cette valeur doit etre IDENTIQUE
--      a celle provisionnee a l'etape 2.
--
-- Pour verifier ensuite :
--   SELECT jobname, schedule, active FROM cron.job;
-- =============================================

-- Idempotence : on supprime toute precedente version avant de reposer.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-documents') THEN
    PERFORM cron.unschedule('cleanup-old-documents');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-payment-reminders') THEN
    PERFORM cron.unschedule('send-payment-reminders');
  END IF;
END $$;

-- ---------------------------------------------
-- Job 1 : cleanup-old-documents
-- ---------------------------------------------
-- Purge les documents/buckets storage de plus de 90 jours (audit trails,
-- pieces jointes obsoletes). Tourne tous les dimanches a 3h UTC, periode
-- de faible activite.
SELECT cron.schedule(
  'cleanup-old-documents',
  '0 3 * * 0',
  $$
SELECT extensions.http_post(
    url := 'https://dazdotcdpudxpycodbbe.supabase.co/functions/v1/cleanup-old-documents',
    headers := jsonb_build_object(
      'x-cron-secret', 'LE_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ---------------------------------------------
-- Job 2 : send-payment-reminders
-- ---------------------------------------------
-- Envoie les relances pour les factures en retard et non relancees depuis
-- au moins 7 jours. Tourne du lundi au vendredi a 9h UTC (ouverture des
-- bureaux des PME ciblees).
SELECT cron.schedule(
  'send-payment-reminders',
  '0 9 * * 1-5',
  $$
SELECT extensions.http_post(
    url := 'https://dazdotcdpudxpycodbbe.supabase.co/functions/v1/send-payment-reminders',
    headers := jsonb_build_object(
      'x-cron-secret', 'LE_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ---------------------------------------------
-- Verification post-execution :
--   SELECT jobname, schedule, active, command
--     FROM cron.job
--     WHERE jobname IN ('cleanup-old-documents', 'send-payment-reminders');
--
-- Historique d'execution (logs de pg_cron) :
--   SELECT jobname, status, return_message, start_time
--     FROM cron.job_run_details
--     ORDER BY start_time DESC
--     LIMIT 20;
-- ---------------------------------------------
