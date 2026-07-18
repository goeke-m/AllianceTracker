


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."alliance_tech_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "position" integer NOT NULL,
    "tech_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alliance_tech_queue_category_check" CHECK (("category" = ANY (ARRAY['development'::"text", 'war'::"text"])))
);


ALTER TABLE "public"."alliance_tech_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."alliance_tech_status" (
    "key" "text" NOT NULL,
    "tech_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alliance_tech_status_category_check" CHECK (("category" = ANY (ARRAY['development'::"text", 'war'::"text"]))),
    CONSTRAINT "alliance_tech_status_key_check" CHECK (("key" = ANY (ARRAY['current'::"text", 'next'::"text"])))
);


ALTER TABLE "public"."alliance_tech_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."damage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "damage" bigint NOT NULL,
    "event_date" timestamp with time zone NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."damage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."demerits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "note" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."demerits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "context" "text" NOT NULL,
    "message" "text" NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."error_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friends_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "server" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."friends_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kill_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "server" "text" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kill_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "Rank" "text" NOT NULL,
    "THP" bigint,
    "S1_Power" bigint,
    "S1_Type" "text",
    "S2_Power" bigint,
    "S2_Type" "text",
    "Strike_Team" boolean DEFAULT false,
    "Timezone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "game_uid" "text"
);


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members_duplicate" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "Rank" "text" NOT NULL,
    "THP" bigint,
    "S1_Power" bigint,
    "S1_Type" "text",
    "S2_Power" bigint,
    "S2_Type" "text",
    "Strike_Team" boolean DEFAULT false,
    "Availability" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."members_duplicate" OWNER TO "postgres";


COMMENT ON TABLE "public"."members_duplicate" IS 'This is a duplicate of members';



CREATE TABLE IF NOT EXISTS "public"."ooto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ooto" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."train_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "Date" timestamp with time zone NOT NULL,
    "Conductor" "uuid",
    "VIP" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."train_schedule" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."train_schedule_settings" (
    "key" "text" NOT NULL,
    "mode" "text" DEFAULT 'push'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "train_schedule_settings_key_check" CHECK (("key" = 'week_mode'::"text")),
    CONSTRAINT "train_schedule_settings_mode_check" CHECK (("mode" = ANY (ARRAY['push'::"text", 'save'::"text"])))
);


ALTER TABLE "public"."train_schedule_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vs_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "week_ending" "date" NOT NULL,
    "points" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vs_points_points_check" CHECK (("points" >= 0))
);


ALTER TABLE "public"."vs_points" OWNER TO "postgres";


ALTER TABLE ONLY "public"."alliance_tech_queue"
    ADD CONSTRAINT "alliance_tech_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alliance_tech_status"
    ADD CONSTRAINT "alliance_tech_status_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."damage_logs"
    ADD CONSTRAINT "damage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."demerits"
    ADD CONSTRAINT "demerits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."friends_list"
    ADD CONSTRAINT "friends_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kill_list"
    ADD CONSTRAINT "kill_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members_duplicate"
    ADD CONSTRAINT "members_duplicate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_game_uid_key" UNIQUE ("game_uid");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ooto"
    ADD CONSTRAINT "ooto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."train_schedule"
    ADD CONSTRAINT "train_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."train_schedule_settings"
    ADD CONSTRAINT "train_schedule_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."vs_points"
    ADD CONSTRAINT "vs_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."damage_logs"
    ADD CONSTRAINT "damage_logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."demerits"
    ADD CONSTRAINT "demerits_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."error_logs"
    ADD CONSTRAINT "error_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ooto"
    ADD CONSTRAINT "ooto_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."train_schedule"
    ADD CONSTRAINT "train_schedule_Conductor_fkey" FOREIGN KEY ("Conductor") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."train_schedule"
    ADD CONSTRAINT "train_schedule_VIP_fkey" FOREIGN KEY ("VIP") REFERENCES "public"."members"("id");



ALTER TABLE ONLY "public"."vs_points"
    ADD CONSTRAINT "vs_points_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete demerits" ON "public"."demerits" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Admins can delete vs_points" ON "public"."vs_points" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Admins can insert demerits" ON "public"."demerits" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Admins can insert vs_points" ON "public"."vs_points" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Admins can read demerits" ON "public"."demerits" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Admins can read error_logs" ON "public"."error_logs" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Admins can read vs_points" ON "public"."vs_points" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "Authenticated users can delete alliance_tech_queue" ON "public"."alliance_tech_queue" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete alliance_tech_status" ON "public"."alliance_tech_status" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete damage_logs" ON "public"."damage_logs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete members" ON "public"."members" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete ooto" ON "public"."ooto" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can delete train_schedule" ON "public"."train_schedule" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert alliance_tech_queue" ON "public"."alliance_tech_queue" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert alliance_tech_status" ON "public"."alliance_tech_status" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert damage_logs" ON "public"."damage_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert error_logs" ON "public"."error_logs" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Authenticated users can insert members" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert ooto" ON "public"."ooto" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can insert train_schedule" ON "public"."train_schedule" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read alliance_tech_queue" ON "public"."alliance_tech_queue" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read alliance_tech_status" ON "public"."alliance_tech_status" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read damage_logs" ON "public"."damage_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read members" ON "public"."members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read ooto" ON "public"."ooto" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read train_schedule" ON "public"."train_schedule" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can read train_schedule_settings" ON "public"."train_schedule_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update alliance_tech_queue" ON "public"."alliance_tech_queue" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update alliance_tech_status" ON "public"."alliance_tech_status" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update damage_logs" ON "public"."damage_logs" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update members" ON "public"."members" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update ooto" ON "public"."ooto" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update train_schedule" ON "public"."train_schedule" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update train_schedule_settings" ON "public"."train_schedule_settings" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."alliance_tech_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alliance_tech_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."damage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."demerits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friends_list" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "friends_list_delete" ON "public"."friends_list" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "friends_list_insert" ON "public"."friends_list" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "friends_list_select" ON "public"."friends_list" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "friends_list_update" ON "public"."friends_list" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



ALTER TABLE "public"."kill_list" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kill_list_delete" ON "public"."kill_list" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "kill_list_insert" ON "public"."kill_list" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



CREATE POLICY "kill_list_select" ON "public"."kill_list" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "kill_list_update" ON "public"."kill_list" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));



ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members_duplicate" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ooto" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."train_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."train_schedule_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vs_points" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."alliance_tech_queue" TO "anon";
GRANT ALL ON TABLE "public"."alliance_tech_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."alliance_tech_queue" TO "service_role";



GRANT ALL ON TABLE "public"."alliance_tech_status" TO "anon";
GRANT ALL ON TABLE "public"."alliance_tech_status" TO "authenticated";
GRANT ALL ON TABLE "public"."alliance_tech_status" TO "service_role";



GRANT ALL ON TABLE "public"."damage_logs" TO "anon";
GRANT ALL ON TABLE "public"."damage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."damage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."demerits" TO "anon";
GRANT ALL ON TABLE "public"."demerits" TO "authenticated";
GRANT ALL ON TABLE "public"."demerits" TO "service_role";



GRANT ALL ON TABLE "public"."error_logs" TO "anon";
GRANT ALL ON TABLE "public"."error_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."error_logs" TO "service_role";



GRANT ALL ON TABLE "public"."friends_list" TO "anon";
GRANT ALL ON TABLE "public"."friends_list" TO "authenticated";
GRANT ALL ON TABLE "public"."friends_list" TO "service_role";



GRANT ALL ON TABLE "public"."kill_list" TO "anon";
GRANT ALL ON TABLE "public"."kill_list" TO "authenticated";
GRANT ALL ON TABLE "public"."kill_list" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."members_duplicate" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."members_duplicate" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."members_duplicate" TO "service_role";



GRANT ALL ON TABLE "public"."ooto" TO "anon";
GRANT ALL ON TABLE "public"."ooto" TO "authenticated";
GRANT ALL ON TABLE "public"."ooto" TO "service_role";



GRANT ALL ON TABLE "public"."train_schedule" TO "anon";
GRANT ALL ON TABLE "public"."train_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."train_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."train_schedule_settings" TO "anon";
GRANT ALL ON TABLE "public"."train_schedule_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."train_schedule_settings" TO "service_role";



GRANT ALL ON TABLE "public"."vs_points" TO "anon";
GRANT ALL ON TABLE "public"."vs_points" TO "authenticated";
GRANT ALL ON TABLE "public"."vs_points" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


-- Storm events tables (Desert Storm + Canyon Storm)
-- These tables were not yet applied to remote when the base dump was taken.
-- Added here from scripts/storm-migration.sql so db reset produces the full schema.

CREATE TABLE IF NOT EXISTS "public"."storm_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "week_start" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "storm_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['ds'::"text", 'canyon'::"text"]))),
    CONSTRAINT "storm_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "storm_events_event_type_week_start_key" UNIQUE ("event_type", "week_start")
);

ALTER TABLE "public"."storm_events" OWNER TO "postgres";

ALTER TABLE "public"."storm_events" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "public"."storm_roster" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "team" "text" NOT NULL,
    "role" "text" NOT NULL,
    "attendance" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "storm_roster_attendance_check" CHECK (("attendance" = ANY (ARRAY['present'::"text", 'no_show'::"text", 'subbed_in'::"text"]))),
    CONSTRAINT "storm_roster_role_check" CHECK (("role" = ANY (ARRAY['participant'::"text", 'substitute'::"text"]))),
    CONSTRAINT "storm_roster_team_check" CHECK (("team" = ANY (ARRAY['A'::"text", 'B'::"text"]))),
    CONSTRAINT "storm_roster_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "storm_roster_event_id_member_id_key" UNIQUE ("event_id", "member_id"),
    CONSTRAINT "storm_roster_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."storm_events"("id") ON DELETE CASCADE,
    CONSTRAINT "storm_roster_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."storm_roster" OWNER TO "postgres";

ALTER TABLE "public"."storm_roster" ENABLE ROW LEVEL SECURITY;

-- RLS policies for storm_events
CREATE POLICY "Authenticated users can read storm_events" ON "public"."storm_events" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Admins can insert storm_events" ON "public"."storm_events" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "Admins can update storm_events" ON "public"."storm_events" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "Admins can delete storm_events" ON "public"."storm_events" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

-- RLS policies for storm_roster
CREATE POLICY "Authenticated users can read storm_roster" ON "public"."storm_roster" FOR SELECT TO "authenticated" USING (true);

CREATE POLICY "Admins can insert storm_roster" ON "public"."storm_roster" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "Admins can update storm_roster" ON "public"."storm_roster" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "Admins can delete storm_roster" ON "public"."storm_roster" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

GRANT ALL ON TABLE "public"."storm_events" TO "anon";
GRANT ALL ON TABLE "public"."storm_events" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_events" TO "service_role";

GRANT ALL ON TABLE "public"."storm_roster" TO "anon";
GRANT ALL ON TABLE "public"."storm_roster" TO "authenticated";
GRANT ALL ON TABLE "public"."storm_roster" TO "service_role";







