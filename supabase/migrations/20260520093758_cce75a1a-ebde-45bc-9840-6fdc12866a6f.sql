ALTER TABLE public.gap_recommendations
  ADD COLUMN IF NOT EXISTS pathway text,
  ADD COLUMN IF NOT EXISTS xp_reward integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS why_template text,
  ADD COLUMN IF NOT EXISTS badge_name text,
  ADD COLUMN IF NOT EXISTS verifies_evidence boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_gap_recs_pathway ON public.gap_recommendations(pathway) WHERE is_active = true;