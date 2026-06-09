ALTER TABLE public.shortlisted_schools
  DROP CONSTRAINT IF EXISTS shortlisted_schools_user_school_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.shortlisted_schools'::regclass
      AND conname = 'shortlisted_schools_user_id_school_id_key'
  ) THEN
    ALTER TABLE public.shortlisted_schools
      ADD CONSTRAINT shortlisted_schools_user_id_school_id_key UNIQUE (user_id, school_id);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';