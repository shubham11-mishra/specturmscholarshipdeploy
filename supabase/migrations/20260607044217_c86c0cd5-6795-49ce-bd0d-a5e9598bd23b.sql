
-- 1. Lock down assessment_questions: drop public-read of answer keys, restrict to admins + safe view
DROP POLICY IF EXISTS "published questions public read" ON public.assessment_questions;
REVOKE SELECT ON public.assessment_questions FROM anon;

-- Safe view that excludes the answer key
CREATE OR REPLACE VIEW public.assessment_questions_public AS
SELECT id, section_id, passage_id, question_number, level,
       question_text, passage_text, question_image_url, options, status, created_at, updated_at
FROM public.assessment_questions
WHERE status = 'published';

GRANT SELECT ON public.assessment_questions_public TO anon, authenticated;

-- 2. Allow linked parents to read their child's profile via RLS (was only via SECURITY DEFINER fn)
DROP POLICY IF EXISTS "Parents can read linked children profiles" ON public.profiles;
CREATE POLICY "Parents can read linked children profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_links pl
    WHERE pl.parent_id = auth.uid()
      AND pl.child_id  = public.profiles.id
      AND pl.status    = 'accepted'
  )
);
