CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    state,
    postcode,
    suburb,
    year_level,
    school_type,
    grades,
    extracurriculars,
    financial_need,
    target_year,
    target_schools,
    scholarship_categories,
    view_mode,
    streak_days,
    streak_label,
    last_name,
    gender,
    parent_email,
    current_school_name,
    current_school_type,
    is_indigenous,
    is_rural,
    faith_background,
    preferred_sectors,
    willing_to_board,
    max_travel_km,
    has_sibling_enrolled,
    target_start_year,
    applying_year_level,
    dream_schools,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'state', ''), 'NSW'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'postcode', ''), '0000'),
    NULLIF(NEW.raw_user_meta_data->>'suburb', ''),
    NULLIF(NEW.raw_user_meta_data->>'year_level', ''),
    NULLIF(NEW.raw_user_meta_data->>'school_type', ''),
    COALESCE((NEW.raw_user_meta_data->'grades')::jsonb, '{}'::jsonb),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'extracurriculars', '[]'::jsonb))), '{}'::text[]),
    NULLIF(NEW.raw_user_meta_data->>'financial_need', ''),
    NULLIF(NEW.raw_user_meta_data->>'target_year', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'target_schools', '[]'::jsonb))), '{}'::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'scholarship_categories', '[]'::jsonb))), '{}'::text[]),
    'student',
    1,
    'Fire Band',
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'gender', ''),
    NULLIF(NEW.raw_user_meta_data->>'parent_email', ''),
    NULLIF(NEW.raw_user_meta_data->>'current_school_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'current_school_type', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'is_indigenous', '')::boolean, false),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'is_rural', '')::boolean, false),
    NULLIF(NEW.raw_user_meta_data->>'faith_background', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'preferred_sectors', '[]'::jsonb))), '{}'::text[]),
    NULLIF(NEW.raw_user_meta_data->>'willing_to_board', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'max_travel_km', '')::integer, 999),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'has_sibling_enrolled', '')::boolean, false),
    NULLIF(NEW.raw_user_meta_data->>'target_start_year', '')::integer,
    NULLIF(NEW.raw_user_meta_data->>'applying_year_level', '')::integer,
    NULLIF(NEW.raw_user_meta_data->>'dream_schools', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'onboarding_completed', '')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    last_name = EXCLUDED.last_name,
    gender = EXCLUDED.gender,
    state = EXCLUDED.state,
    postcode = EXCLUDED.postcode,
    suburb = EXCLUDED.suburb,
    year_level = EXCLUDED.year_level,
    school_type = EXCLUDED.school_type,
    extracurriculars = EXCLUDED.extracurriculars,
    financial_need = EXCLUDED.financial_need,
    scholarship_categories = EXCLUDED.scholarship_categories,
    target_year = EXCLUDED.target_year,
    parent_email = EXCLUDED.parent_email,
    current_school_name = EXCLUDED.current_school_name,
    current_school_type = EXCLUDED.current_school_type,
    is_indigenous = EXCLUDED.is_indigenous,
    is_rural = EXCLUDED.is_rural,
    faith_background = EXCLUDED.faith_background,
    preferred_sectors = EXCLUDED.preferred_sectors,
    willing_to_board = EXCLUDED.willing_to_board,
    max_travel_km = EXCLUDED.max_travel_km,
    has_sibling_enrolled = EXCLUDED.has_sibling_enrolled,
    target_start_year = EXCLUDED.target_start_year,
    applying_year_level = EXCLUDED.applying_year_level,
    dream_schools = EXCLUDED.dream_schools,
    onboarding_completed = EXCLUDED.onboarding_completed;

  INSERT INTO public.student_progress (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wheel_scores (
    user_id,
    academic_self,
    stem_self,
    arts_self,
    arts_creative_self,
    sports_self,
    leadership_self,
    test_readiness_self,
    service_community_self,
    interview_self,
    completed_at
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'academic', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'stem', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'arts_creative', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'arts_creative', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'sports_fitness', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'leadership', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'test_readiness', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'service_community', '')::smallint, 5),
    COALESCE(NULLIF(NEW.raw_user_meta_data->'wheel_scores'->>'interview', '')::smallint, 5),
    CASE WHEN NEW.raw_user_meta_data ? 'wheel_scores' THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    academic_self = EXCLUDED.academic_self,
    stem_self = EXCLUDED.stem_self,
    arts_self = EXCLUDED.arts_self,
    arts_creative_self = EXCLUDED.arts_creative_self,
    sports_self = EXCLUDED.sports_self,
    leadership_self = EXCLUDED.leadership_self,
    test_readiness_self = EXCLUDED.test_readiness_self,
    service_community_self = EXCLUDED.service_community_self,
    interview_self = EXCLUDED.interview_self,
    completed_at = COALESCE(EXCLUDED.completed_at, public.wheel_scores.completed_at);

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.wheel_scores (
  user_id,
  academic_self,
  stem_self,
  arts_self,
  arts_creative_self,
  sports_self,
  leadership_self,
  test_readiness_self,
  service_community_self,
  interview_self
)
SELECT
  p.id,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.wheel_scores ws
  WHERE ws.user_id = p.id
);