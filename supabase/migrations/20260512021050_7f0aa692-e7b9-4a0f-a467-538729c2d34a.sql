
-- 1. gap_recommendations
CREATE TABLE public.gap_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension text NOT NULL CHECK (dimension IN ('academic','stem','arts_creative','sports_fitness','leadership','service_community','interview','test_readiness')),
  trigger_score_max int NOT NULL,
  title text NOT NULL,
  description text,
  effort_level text NOT NULL CHECK (effort_level IN ('low','medium','high')),
  priority text NOT NULL CHECK (priority IN ('low','medium','high')),
  estimated_unlocks int DEFAULT 0,
  category text CHECK (category IN ('external','spectrum_product')),
  spectrum_product_name text,
  spectrum_product_url text,
  external_resource_name text,
  external_resource_url text,
  icon_emoji text DEFAULT '💡',
  band_relevance text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  display_order int DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gap_recs_dimension ON public.gap_recommendations(dimension);
CREATE INDEX idx_gap_recs_active ON public.gap_recommendations(is_active);
ALTER TABLE public.gap_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gap recs public read" ON public.gap_recommendations FOR SELECT USING (true);

-- 2. gap_actions_completed
CREATE TABLE public.gap_actions_completed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_id uuid NOT NULL REFERENCES public.gap_recommendations(id) ON DELETE CASCADE,
  marked_done_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, recommendation_id)
);
ALTER TABLE public.gap_actions_completed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own gap actions" ON public.gap_actions_completed FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own gap actions" ON public.gap_actions_completed FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own gap actions" ON public.gap_actions_completed FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. application_checklist_items
CREATE TABLE public.application_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  UNIQUE(application_id, item_key)
);
CREATE INDEX idx_checklist_application ON public.application_checklist_items(application_id);
ALTER TABLE public.application_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own checklist" ON public.application_checklist_items FOR SELECT TO authenticated
  USING (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));
CREATE POLICY "users insert own checklist" ON public.application_checklist_items FOR INSERT TO authenticated
  WITH CHECK (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));
CREATE POLICY "users update own checklist" ON public.application_checklist_items FOR UPDATE TO authenticated
  USING (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));
CREATE POLICY "users delete own checklist" ON public.application_checklist_items FOR DELETE TO authenticated
  USING (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));

-- 4. trigger: auto-create 8 checklist items when an application is created
CREATE OR REPLACE FUNCTION public.create_checklist_for_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.application_checklist_items (application_id, item_key, item_label) VALUES
    (NEW.id, 'academic_transcript', 'Academic transcript (last 2 yrs)'),
    (NEW.id, 'school_report', 'School report'),
    (NEW.id, 'personal_statement', 'Personal statement (draft)'),
    (NEW.id, 'teacher_reference', 'Teacher reference letter'),
    (NEW.id, 'extracurricular_summary', 'Extracurricular summary'),
    (NEW.id, 'online_form', 'Online application form'),
    (NEW.id, 'interview_prep', 'Interview preparation'),
    (NEW.id, 'supporting_portfolio', 'Supporting portfolio')
  ON CONFLICT (application_id, item_key) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_created
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.create_checklist_for_application();

-- 5. applications: outcome columns
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS outcome text CHECK (outcome IN ('won','runner_up','not_selected','withdrew')),
  ADD COLUMN IF NOT EXISTS outcome_at timestamptz,
  ADD COLUMN IF NOT EXISTS testimonial text,
  ADD COLUMN IF NOT EXISTS testimonial_visible_to_spectrum boolean NOT NULL DEFAULT false;
