
-- ============ WHEEL SCORES ============
CREATE TABLE public.wheel_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  -- Self-rated (1-10)
  academic_self smallint CHECK (academic_self BETWEEN 1 AND 10),
  stem_self smallint CHECK (stem_self BETWEEN 1 AND 10),
  arts_self smallint CHECK (arts_self BETWEEN 1 AND 10),
  sports_self smallint CHECK (sports_self BETWEEN 1 AND 10),
  leadership_self smallint CHECK (leadership_self BETWEEN 1 AND 10),
  test_readiness_self smallint CHECK (test_readiness_self BETWEEN 1 AND 10),
  -- Verified (1-10) — populated by mock exams etc.
  academic_verified smallint CHECK (academic_verified BETWEEN 1 AND 10),
  stem_verified smallint CHECK (stem_verified BETWEEN 1 AND 10),
  arts_verified smallint CHECK (arts_verified BETWEEN 1 AND 10),
  sports_verified smallint CHECK (sports_verified BETWEEN 1 AND 10),
  leadership_verified smallint CHECK (leadership_verified BETWEEN 1 AND 10),
  test_readiness_verified smallint CHECK (test_readiness_verified BETWEEN 1 AND 10),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wheel_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own wheel" ON public.wheel_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wheel" ON public.wheel_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own wheel" ON public.wheel_scores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own wheel" ON public.wheel_scores FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ STUDENT PROGRESS ============
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  current_band text NOT NULL DEFAULT 'Earth',
  badges text[] NOT NULL DEFAULT '{}',
  element_points_earth integer NOT NULL DEFAULT 0,
  element_points_water integer NOT NULL DEFAULT 0,
  element_points_fire integer NOT NULL DEFAULT 0,
  element_points_air integer NOT NULL DEFAULT 0,
  element_points_aether integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own progress" ON public.student_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.student_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.student_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ STUDENT ACTIVITIES ============
CREATE TABLE public.student_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  element_stage text NOT NULL,
  points_earned integer NOT NULL DEFAULT 0,
  description text,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_student_activities_user ON public.student_activities(user_id, created_at DESC);
ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own activities" ON public.student_activities FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activities" ON public.student_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own activities" ON public.student_activities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ NAVIGATOR SHORTLIST (rich) ============
CREATE TABLE public.navigator_shortlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scholarship_id uuid NOT NULL,
  match_score numeric(5,2),
  match_band text,
  status text NOT NULL DEFAULT 'shortlisted',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, scholarship_id)
);
ALTER TABLE public.navigator_shortlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own nav shortlist" ON public.navigator_shortlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own nav shortlist" ON public.navigator_shortlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own nav shortlist" ON public.navigator_shortlist FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own nav shortlist" ON public.navigator_shortlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ updated_at triggers ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_wheel_scores_touch BEFORE UPDATE ON public.wheel_scores FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_student_progress_touch BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_navigator_shortlist_touch BEFORE UPDATE ON public.navigator_shortlist FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ Extend handle_new_user to seed student_progress ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, state, postcode, suburb, year_level,
    school_type, grades, extracurriculars, financial_need,
    target_year, target_schools, scholarship_categories,
    view_mode, streak_days, streak_label
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'state', 'NSW'),
    COALESCE(NEW.raw_user_meta_data->>'postcode', '0000'),
    NULLIF(NEW.raw_user_meta_data->>'suburb', ''),
    NULLIF(NEW.raw_user_meta_data->>'year_level', ''),
    NULLIF(NEW.raw_user_meta_data->>'school_type', ''),
    COALESCE((NEW.raw_user_meta_data->'grades')::jsonb, '{}'::jsonb),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'extracurriculars')), '{}'::text[]),
    NULLIF(NEW.raw_user_meta_data->>'financial_need', ''),
    NULLIF(NEW.raw_user_meta_data->>'target_year', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'target_schools')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'scholarship_categories')), '{}'::text[]),
    'student', 1, 'Fire Band'
  );

  INSERT INTO public.student_progress (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
