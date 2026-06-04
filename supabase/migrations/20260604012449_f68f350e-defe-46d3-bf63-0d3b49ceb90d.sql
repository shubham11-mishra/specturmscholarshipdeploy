
-- Staging table for scholarship/school data refreshes that require admin approval
CREATE TABLE IF NOT EXISTS public.scholarship_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  school_name text NOT NULL,
  program_name text,
  state text,
  suburb text,
  postcode text,
  scholarship_url text,
  website_url text,
  description text,
  year_levels text,
  value_aud text,
  category text,
  link_broken boolean NOT NULL DEFAULT false,
  link_status_code integer,
  link_note text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  approved_scholarship_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scholarship_imports_status_idx ON public.scholarship_imports(status);
CREATE INDEX IF NOT EXISTS scholarship_imports_school_idx ON public.scholarship_imports(school_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scholarship_imports TO authenticated;
GRANT ALL ON public.scholarship_imports TO service_role;

ALTER TABLE public.scholarship_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage imports"
  ON public.scholarship_imports
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER scholarship_imports_touch
  BEFORE UPDATE ON public.scholarship_imports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Grant insert on scholarships to admins so approve action can publish to live table
GRANT INSERT, UPDATE ON public.scholarships TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='scholarships' AND policyname='admins write scholarships') THEN
    CREATE POLICY "admins write scholarships"
      ON public.scholarships
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Seed admin role for picha.in96@gmail.com if that user exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'picha.in96@gmail.com'
ON CONFLICT DO NOTHING;
