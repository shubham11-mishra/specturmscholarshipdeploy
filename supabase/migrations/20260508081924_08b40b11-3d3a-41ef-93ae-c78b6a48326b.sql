
-- Add fields to profiles to hold all signup wizard data
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_type text,
  ADD COLUMN IF NOT EXISTS grades jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS extracurriculars text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS financial_need text,
  ADD COLUMN IF NOT EXISTS target_year text,
  ADD COLUMN IF NOT EXISTS target_schools text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS scholarship_categories text[] DEFAULT '{}'::text[];

-- Drop unused student_* tables
DROP TABLE IF EXISTS public.student_academic CASCADE;
DROP TABLE IF EXISTS public.student_badges CASCADE;
DROP TABLE IF EXISTS public.student_dimensions CASCADE;
DROP TABLE IF EXISTS public.student_evidence CASCADE;
DROP TABLE IF EXISTS public.student_extracurriculars CASCADE;
DROP TABLE IF EXISTS public.student_points_log CASCADE;
DROP TABLE IF EXISTS public.student_profile CASCADE;
DROP TABLE IF EXISTS public.student_streaks CASCADE;
DROP TABLE IF EXISTS public.student_target_schools CASCADE;

-- Drop triggers/functions tied to those tables
DROP FUNCTION IF EXISTS public.apply_points_to_dimension() CASCADE;
DROP FUNCTION IF EXISTS public.profile_completeness(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.award_first_steps() CASCADE;
DROP FUNCTION IF EXISTS public.compute_band(integer) CASCADE;

-- Update handle_new_user to populate new profile fields from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, full_name, state, postcode, suburb, year_level,
    school_type, grades, extracurriculars, financial_need,
    target_year, target_schools, scholarship_categories,
    view_mode, streak_days, streak_label
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'state', 'NSW'),
    COALESCE(NEW.raw_user_meta_data->>'postcode', '0000'),
    NULLIF(NEW.raw_user_meta_data->>'suburb', ''),
    NULLIF(NEW.raw_user_meta_data->>'year_level', ''),
    NULLIF(NEW.raw_user_meta_data->>'school_type', ''),
    COALESCE((NEW.raw_user_meta_data->'grades')::jsonb, '{}'::jsonb),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'extracurriculars')), '{}'::text[]),
    NULLIF(NEW.raw_user_meta_data->>'financial_need', ''),
    NULLIF(NEW.raw_user_meta_data->>'target_year', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'target_schools')), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'scholarship_categories')), '{}'::text[]),
    'student', 1, 'Fire Band'
  );
  RETURN NEW;
END;
$$;
