ALTER TABLE public.applications
  ALTER COLUMN scholarship_id TYPE text USING scholarship_id::text;