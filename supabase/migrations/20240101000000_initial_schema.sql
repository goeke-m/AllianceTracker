-- ============================================================
-- OPNz Tracker - Initial Schema
-- ============================================================

-- Members table
CREATE TABLE public.members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  rank        INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Damage logs table
CREATE TABLE public.damage_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  damage      BIGINT NOT NULL CHECK (damage >= 0),
  event_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- WAD View: Weighted Average Damage + ring assignment
-- WAD = (latest * 0.6) + (2nd * 0.25) + (3rd * 0.15)
-- ============================================================
CREATE OR REPLACE VIEW public.marshall_positions AS
WITH ranked_logs AS (
  SELECT
    member_id,
    damage,
    ROW_NUMBER() OVER (
      PARTITION BY member_id ORDER BY event_date DESC, created_at DESC
    ) AS rn
  FROM public.damage_logs
),
wad_scores AS (
  SELECT
    m.id,
    m.name,
    m.rank,
    (m.rank >= 4) AS is_leadership,
    COALESCE(
      SUM(
        CASE rl.rn
          WHEN 1 THEN rl.damage * 0.60
          WHEN 2 THEN rl.damage * 0.25
          WHEN 3 THEN rl.damage * 0.15
          ELSE 0
        END
      ), 0
    ) AS wad
  FROM public.members m
  LEFT JOIN ranked_logs rl ON rl.member_id = m.id AND rl.rn <= 3
  GROUP BY m.id, m.name, m.rank
),
leadership AS (
  SELECT
    id, name, rank, is_leadership, wad,
    ROW_NUMBER() OVER (ORDER BY wad DESC) AS group_rank
  FROM wad_scores WHERE is_leadership = TRUE
),
standard AS (
  SELECT
    id, name, rank, is_leadership, wad,
    ROW_NUMBER() OVER (ORDER BY wad DESC) AS group_rank
  FROM wad_scores WHERE is_leadership = FALSE
),
assigned AS (
  -- Ring 1: top 8 R4/R5 by WAD
  SELECT id, name, rank, is_leadership, wad,
         1 AS ring_level, group_rank AS position_index
  FROM leadership WHERE group_rank <= 8

  UNION ALL

  -- Ring 2 strategic core: R4/R5 ranks 9-11 (closest to Marshall)
  SELECT id, name, rank, is_leadership, wad,
         2 AS ring_level, (group_rank - 8) AS position_index
  FROM leadership WHERE group_rank BETWEEN 9 AND 11

  UNION ALL

  -- Ring 2 outer: top standard (R1-R3) members fill remaining Ring 2 slots
  -- Strategic slots used = min(leadership count above 8, 3)
  SELECT id, name, rank, is_leadership, wad,
         2 AS ring_level,
         (LEAST((SELECT COUNT(*) FROM leadership WHERE group_rank BETWEEN 9 AND 11), 3) + group_rank) AS position_index
  FROM standard WHERE group_rank <= (
    16 - LEAST((SELECT COUNT(*) FROM leadership WHERE group_rank BETWEEN 9 AND 11), 3)
  )

  UNION ALL

  -- Ring 3+: remaining standard members by WAD
  SELECT id, name, rank, is_leadership, wad,
         3 AS ring_level,
         (group_rank - (16 - LEAST((SELECT COUNT(*) FROM leadership WHERE group_rank BETWEEN 9 AND 11), 3))) AS position_index
  FROM standard WHERE group_rank > (
    16 - LEAST((SELECT COUNT(*) FROM leadership WHERE group_rank BETWEEN 9 AND 11), 3)
  )
)
SELECT * FROM assigned ORDER BY ring_level, position_index;

-- Indexes
CREATE INDEX idx_damage_logs_member_id ON public.damage_logs(member_id);
CREATE INDEX idx_damage_logs_event_date ON public.damage_logs(event_date DESC);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- user_profiles: users see own row; admins see all
CREATE POLICY "Users read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- members: all authenticated can read; only admins write
CREATE POLICY "Authenticated users read members"
  ON public.members FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins insert members"
  ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update members"
  ON public.members FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins delete members"
  ON public.members FOR DELETE TO authenticated
  USING (public.is_admin());

-- damage_logs: all authenticated can read; only admins write
CREATE POLICY "Authenticated users read damage_logs"
  ON public.damage_logs FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins insert damage_logs"
  ON public.damage_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update damage_logs"
  ON public.damage_logs FOR UPDATE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins delete damage_logs"
  ON public.damage_logs FOR DELETE TO authenticated
  USING (public.is_admin());
