
-- Attach trigger to auth.users so handle_new_user runs on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, email, state, postcode, view_mode, streak_days, streak_label)
SELECT u.id, u.email, 'NSW', '0000', 'student', 1, 'Fire Band'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill student_progress for existing users
INSERT INTO public.student_progress (user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.student_progress sp ON sp.user_id = u.id
WHERE sp.user_id IS NULL;
