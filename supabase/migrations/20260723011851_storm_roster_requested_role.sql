ALTER TABLE "public"."storm_roster" DROP CONSTRAINT "storm_roster_role_check";

ALTER TABLE "public"."storm_roster" ADD CONSTRAINT "storm_roster_role_check" CHECK (("role" = ANY (ARRAY['participant'::"text", 'substitute'::"text", 'requested'::"text"])));
