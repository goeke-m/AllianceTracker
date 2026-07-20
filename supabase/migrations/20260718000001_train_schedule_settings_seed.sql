INSERT INTO "public"."train_schedule_settings" (key, mode)
VALUES ('week_mode', 'push')
ON CONFLICT (key) DO NOTHING;
