
-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Passages (reusable across questions)
CREATE TABLE IF NOT EXISTS public.assessment_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  passage_text text NOT NULL,
  subject text,
  year_band text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_passages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "passages public read" ON public.assessment_passages;
CREATE POLICY "passages public read" ON public.assessment_passages
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admins manage passages" ON public.assessment_passages;
CREATE POLICY "admins manage passages" ON public.assessment_passages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS passages_touch_updated_at ON public.assessment_passages;
CREATE TRIGGER passages_touch_updated_at
  BEFORE UPDATE ON public.assessment_passages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Extend questions: status + passage link + updated_at
ALTER TABLE public.assessment_questions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS passage_id uuid REFERENCES public.assessment_passages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessment_questions_status_check'
  ) THEN
    ALTER TABLE public.assessment_questions
      ADD CONSTRAINT assessment_questions_status_check
      CHECK (status IN ('draft', 'published'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS questions_touch_updated_at ON public.assessment_questions;
CREATE TRIGGER questions_touch_updated_at
  BEFORE UPDATE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Replace the public-read policy so drafts are hidden from students
DROP POLICY IF EXISTS "questions public read" ON public.assessment_questions;
CREATE POLICY "published questions public read" ON public.assessment_questions
  FOR SELECT TO public USING (status = 'published');

DROP POLICY IF EXISTS "admins read all questions" ON public.assessment_questions;
CREATE POLICY "admins read all questions" ON public.assessment_questions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage questions" ON public.assessment_questions;
CREATE POLICY "admins manage questions" ON public.assessment_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Sections: allow admins to manage
DROP POLICY IF EXISTS "admins manage sections" ON public.assessment_sections;
CREATE POLICY "admins manage sections" ON public.assessment_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Helpful index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_questions_text_trgm
  ON public.assessment_questions USING gin (question_text gin_trgm_ops);
