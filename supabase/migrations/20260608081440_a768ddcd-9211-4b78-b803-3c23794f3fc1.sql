
CREATE OR REPLACE FUNCTION public.apply_admin_invitation_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.admin_invitations
    WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.admin_invitations
       SET status = 'accepted',
           accepted_at = now(),
           invited_user_id = NEW.id
     WHERE lower(email) = lower(NEW.email)
       AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_apply_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_apply_invitation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.apply_admin_invitation_on_signup();
