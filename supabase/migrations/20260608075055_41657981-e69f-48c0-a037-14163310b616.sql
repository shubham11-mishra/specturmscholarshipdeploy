CREATE OR REPLACE FUNCTION public.sync_application_from_shortlist_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.applications (user_id, scholarship_id, status)
  VALUES (NEW.user_id, NEW.school_id, 'not_started')
  ON CONFLICT (user_id, scholarship_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_application_from_shortlist_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.applications
  WHERE user_id = OLD.user_id
    AND scholarship_id = OLD.school_id;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS shortlisted_schools_create_application ON public.shortlisted_schools;
CREATE TRIGGER shortlisted_schools_create_application
AFTER INSERT ON public.shortlisted_schools
FOR EACH ROW EXECUTE FUNCTION public.sync_application_from_shortlist_insert();

DROP TRIGGER IF EXISTS shortlisted_schools_remove_application ON public.shortlisted_schools;
CREATE TRIGGER shortlisted_schools_remove_application
AFTER DELETE ON public.shortlisted_schools
FOR EACH ROW EXECUTE FUNCTION public.sync_application_from_shortlist_delete();