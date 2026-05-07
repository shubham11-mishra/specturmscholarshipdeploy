ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS view_mode text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_label text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, state, postcode, suburb, year_level, view_mode, streak_days, streak_label)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'state', 'NSW'),
    COALESCE(NEW.raw_user_meta_data->>'postcode', '0000'),
    NULLIF(NEW.raw_user_meta_data->>'suburb', ''),
    NULLIF(NEW.raw_user_meta_data->>'year_level', ''),
    'student',
    1,
    'Fire Band'
  );
  RETURN NEW;
END;
$$;