
-- Allow authenticated users to read published assessment questions
DROP POLICY IF EXISTS "authenticated read published questions" ON public.assessment_questions;
CREATE POLICY "authenticated read published questions"
  ON public.assessment_questions FOR SELECT
  TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can read all student progress
DROP POLICY IF EXISTS "Admins read all student progress" ON public.student_progress;
CREATE POLICY "Admins read all student progress"
  ON public.student_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
