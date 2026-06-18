CREATE POLICY "admins read all attempts"
ON public.assessment_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));