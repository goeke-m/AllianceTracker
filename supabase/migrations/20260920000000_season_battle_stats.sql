CREATE TABLE IF NOT EXISTS "public"."season_battle_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season" integer NOT NULL,
    "member_id" "uuid" NOT NULL,
    "participation" integer DEFAULT 0 NOT NULL,
    "kills" bigint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "season_battle_stats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "season_battle_stats_season_member_key" UNIQUE ("season", "member_id"),
    CONSTRAINT "season_battle_stats_participation_check" CHECK (("participation" >= 0)),
    CONSTRAINT "season_battle_stats_kills_check" CHECK (("kills" >= 0)),
    CONSTRAINT "season_battle_stats_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."season_battle_stats" OWNER TO "postgres";

ALTER TABLE "public"."season_battle_stats" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season_battle_stats_select" ON "public"."season_battle_stats" FOR SELECT TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "season_battle_stats_insert" ON "public"."season_battle_stats" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "season_battle_stats_update" ON "public"."season_battle_stats" FOR UPDATE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true)) WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

CREATE POLICY "season_battle_stats_delete" ON "public"."season_battle_stats" FOR DELETE TO "authenticated" USING ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'is_admin'::"text"))::boolean = true));

GRANT ALL ON TABLE "public"."season_battle_stats" TO "anon";
GRANT ALL ON TABLE "public"."season_battle_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."season_battle_stats" TO "service_role";
