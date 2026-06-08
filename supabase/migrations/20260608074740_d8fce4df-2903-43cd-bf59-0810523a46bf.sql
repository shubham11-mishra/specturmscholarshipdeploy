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
  WHERE id = CASE
    WHEN NEW.scholarship_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN NEW.scholarship_id::uuid
    ELSE NULL
  END;

  IF req IS NULL OR array_length(req, 1) IS NULL THEN
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

DROP TRIGGER IF EXISTS on_application_created ON public.applications;