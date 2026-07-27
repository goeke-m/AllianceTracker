ALTER TABLE "public"."train_schedule"
  ADD COLUMN "boarding_hour" smallint;

ALTER TABLE "public"."train_schedule"
  ADD CONSTRAINT "train_schedule_boarding_hour_check"
  CHECK ("boarding_hour" IS NULL OR ("boarding_hour" >= 0 AND "boarding_hour" <= 23));
