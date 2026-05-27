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