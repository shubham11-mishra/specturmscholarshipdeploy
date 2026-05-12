
-- A2: Add new wheel dimensions
ALTER TABLE public.wheel_scores
  ADD COLUMN IF NOT EXISTS arts_creative_self smallint,
  ADD COLUMN IF NOT EXISTS arts_creative_verified smallint,
  ADD COLUMN IF NOT EXISTS service_community_self smallint,
  ADD COLUMN IF NOT EXISTS service_community_verified smallint,
  ADD COLUMN IF NOT EXISTS interview_self smallint,
  ADD COLUMN IF NOT EXISTS interview_verified smallint;

-- Backfill: copy existing arts_self into arts_creative_self for existing rows
UPDATE public.wheel_scores
  SET arts_creative_self = COALESCE(arts_creative_self, arts_self)
  WHERE arts_creative_self IS NULL AND arts_self IS NOT NULL;

-- B5: Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scholarship_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scholarship_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own applications"
  ON public.applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own applications"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own applications"
  ON public.applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own applications"
  ON public.applications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER applications_touch_updated
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- B5: Indexes
CREATE INDEX IF NOT EXISTS idx_scholarships_state ON public.scholarships(state);
CREATE INDEX IF NOT EXISTS idx_navigator_shortlist_user ON public.navigator_shortlist(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON public.applications(user_id);
