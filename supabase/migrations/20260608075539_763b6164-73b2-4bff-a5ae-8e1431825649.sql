REVOKE ALL ON FUNCTION public.create_checklist_for_application() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checklist_for_application() TO service_role;