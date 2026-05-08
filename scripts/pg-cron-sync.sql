-- Schedule the alliance member sync to run MWF at 10:00 UTC
-- (5 AM EST / 6 AM EDT — pg_cron does not adjust for DST)
--
-- Prerequisites:
--   1. pg_cron extension enabled (Supabase Dashboard → Database → Extensions → pg_cron)
--   2. pg_net extension enabled (same location)
--   3. Edge Function deployed: supabase functions deploy sync-alliance-members
--   4. Replace <PROJECT_REF> with your Supabase project reference
--      (found in: Project Settings → General → Reference ID)
--   5. Replace <SERVICE_ROLE_KEY> with your service role key
--      (found in: Project Settings → API → service_role key)
--
-- Run this in the Supabase SQL Editor.

SELECT cron.schedule(
  'sync-alliance-members',
  '0 10 * * 1,3,5',
  $$
  SELECT
    net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-alliance-members',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- To verify the job was created:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('sync-alliance-members');
