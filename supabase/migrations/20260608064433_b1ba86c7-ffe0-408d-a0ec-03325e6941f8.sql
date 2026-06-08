
-- 1) Extend scholarships with optional structured fields used by the Hub
ALTER TABLE public.scholarships
  ADD COLUMN IF NOT EXISTS required_documents text[],
  ADD COLUMN IF NOT EXISTS essay_prompts jsonb;

-- 2) Essays table
CREATE TABLE IF NOT EXISTS public.application_essays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  word_limit integer,
  draft text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS application_essays_app_idx
  ON public.application_essays(application_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_essays TO authenticated;
GRANT ALL ON public.application_essays TO service_role;

ALTER TABLE public.application_essays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own essays" ON public.application_essays;
CREATE POLICY "users read own essays" ON public.application_essays
FOR SELECT TO authenticated
USING (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "users insert own essays" ON public.application_essays;
CREATE POLICY "users insert own essays" ON public.application_essays
FOR INSERT TO authenticated
WITH CHECK (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "users update own essays" ON public.application_essays;
CREATE POLICY "users update own essays" ON public.application_essays
FOR UPDATE TO authenticated
USING (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "users delete own essays" ON public.application_essays;
CREATE POLICY "users delete own essays" ON public.application_essays
FOR DELETE TO authenticated
USING (application_id IN (SELECT id FROM public.applications WHERE user_id = auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS application_essays_touch ON public.application_essays;
CREATE TRIGGER application_essays_touch
  BEFORE UPDATE ON public.application_essays
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Replace the on-application-insert seed function so it pulls per-scholarship
--    required documents and essay prompts (falls back to defaults).
CREATE OR REPLACE FUNCTION public.create_checklist_for_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  req text[];
  doc text;
  prompts jsonb;
  prompt_row jsonb;
BEGIN
  SELECT required_documents, essay_prompts
    INTO req, prompts
  FROM public.scholarships
  WHERE id = NEW.scholarship_id;

  IF req IS NULL OR array_length(req, 1) IS NULL THEN
    -- Fallback default checklist
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
  ELSE
    FOREACH doc IN ARRAY req LOOP
      INSERT INTO public.application_checklist_items (application_id, item_key, item_label)
      VALUES (
        NEW.id,
        lower(regexp_replace(doc, '[^a-zA-Z0-9]+', '_', 'g')),
        doc
      )
      ON CONFLICT (application_id, item_key) DO NOTHING;
    END LOOP;
  END IF;

  -- Seed essays from prompts if provided. Accepts:
  --   ["Prompt A", "Prompt B"]
  --   [{"prompt": "...", "word_limit": 500}, ...]
  IF prompts IS NOT NULL AND jsonb_typeof(prompts) = 'array' THEN
    FOR prompt_row IN SELECT * FROM jsonb_array_elements(prompts) LOOP
      INSERT INTO public.application_essays (application_id, prompt, word_limit)
      VALUES (
        NEW.id,
        CASE
          WHEN jsonb_typeof(prompt_row) = 'string' THEN trim(both '"' from prompt_row::text)
          ELSE COALESCE(prompt_row->>'prompt', prompt_row->>'question', '')
        END,
        CASE
          WHEN jsonb_typeof(prompt_row) = 'object' THEN NULLIF(prompt_row->>'word_limit','')::int
          ELSE NULL
        END
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists on applications
DROP TRIGGER IF EXISTS applications_create_checklist ON public.applications;
CREATE TRIGGER applications_create_checklist
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.create_checklist_for_application();
