
-- ============ ENUMS ============
CREATE TYPE public.readiness_band AS ENUM ('earth','water','fire','air','aether');
CREATE TYPE public.readiness_dimension AS ENUM ('academic','leadership','service','co_curricular','interview','materials','verification');
CREATE TYPE public.achievement_level AS ENUM ('school','regional','state','national','international');
CREATE TYPE public.target_label AS ENUM ('best_fit','stretch','reach','safety');

-- ============ HELPER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.compute_band(score int)
RETURNS public.readiness_band
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN score IS NULL OR score <= 20 THEN 'earth'::public.readiness_band
    WHEN score <= 40 THEN 'water'
    WHEN score <= 60 THEN 'fire'
    WHEN score <= 80 THEN 'air'
    ELSE 'aether'
  END;
$$;

-- ============ STUDENT PROFILE ============
CREATE TABLE public.student_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  citizenship text,
  indigenous_status text,
  regional_classification text,
  sibling_enrolled boolean DEFAULT false,
  religious_affiliation text,
  boarding_preference text,
  fee_tolerance text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  current_step int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.student_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.student_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.student_profile FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own profile delete" ON public.student_profile FOR DELETE USING (auth.uid() = user_id);

-- ============ STUDENT ACADEMIC ============
CREATE TABLE public.student_academic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL,
  year_level text NOT NULL,
  subject text NOT NULL,
  grade_value text,
  grade_scale text,
  naplan_band text,
  scholarship_test text,
  scholarship_score text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_academic ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own academic all" ON public.student_academic FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ EXTRACURRICULARS ============
CREATE TABLE public.student_extracurriculars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  activity_name text NOT NULL,
  level public.achievement_level DEFAULT 'school',
  years_participated int DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_extracurriculars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own extra all" ON public.student_extracurriculars FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ TARGET SCHOOLS ============
CREATE TABLE public.student_target_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name text NOT NULL,
  school_id text,
  is_selective boolean DEFAULT false,
  boarding_preference text,
  label public.target_label DEFAULT 'best_fit',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_target_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own targets all" ON public.student_target_schools FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ DIMENSIONS (the 7 scores) ============
CREATE TABLE public.student_dimensions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension public.readiness_dimension NOT NULL,
  score int NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'low',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dimension)
);
ALTER TABLE public.student_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dim all" ON public.student_dimensions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ EVIDENCE ============
CREATE TABLE public.student_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  title text,
  file_url text,
  verified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own evi all" ON public.student_evidence FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ BADGES ============
CREATE TABLE public.student_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code text NOT NULL,
  tier public.readiness_band,
  evidence_link text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own badges all" ON public.student_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ STREAKS ============
CREATE TABLE public.student_streaks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_type text NOT NULL,
  current_count int NOT NULL DEFAULT 0,
  longest_count int NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  PRIMARY KEY (user_id, streak_type)
);
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own streaks all" ON public.student_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ POINTS LOG ============
CREATE TABLE public.student_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_code text NOT NULL,
  dimension public.readiness_dimension NOT NULL,
  points int NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_points_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own points all" ON public.student_points_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger: when points logged, update dimension score
CREATE OR REPLACE FUNCTION public.apply_points_to_dimension()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.student_dimensions (user_id, dimension, score, updated_at)
  VALUES (NEW.user_id, NEW.dimension, GREATEST(0, LEAST(100, NEW.points)), now())
  ON CONFLICT (user_id, dimension) DO UPDATE
    SET score = GREATEST(0, LEAST(100, public.student_dimensions.score + NEW.points)),
        updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_apply_points
AFTER INSERT ON public.student_points_log
FOR EACH ROW EXECUTE FUNCTION public.apply_points_to_dimension();

-- ============ COMPLETENESS HELPER ============
CREATE OR REPLACE FUNCTION public.profile_completeness(_user_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT CASE WHEN onboarding_completed THEN 100 ELSE current_step * 20 END
                   FROM public.student_profile WHERE user_id = _user_id), 0);
$$;

-- ============ AUTO First Steps badge on signup ============
CREATE OR REPLACE FUNCTION public.award_first_steps()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.student_badges (user_id, badge_code, tier)
  VALUES (NEW.id, 'first_steps', 'earth')
  ON CONFLICT DO NOTHING;
  -- seed dimension rows at zero
  INSERT INTO public.student_dimensions (user_id, dimension, score)
  SELECT NEW.id, d, 0 FROM unnest(enum_range(NULL::public.readiness_dimension)) d
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_award_first_steps
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.award_first_steps();
