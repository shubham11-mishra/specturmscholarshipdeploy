
-- Admin profile table (separate from student profiles)
CREATE TABLE public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_profiles TO service_role;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all admin profiles" ON public.admin_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage admin profiles" ON public.admin_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "self read own admin profile" ON public.admin_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "self update own admin profile" ON public.admin_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TRIGGER admin_profiles_touch_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Admin invitations table
CREATE TABLE public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | revoked
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_invitations_email_idx ON public.admin_invitations (lower(email));
CREATE INDEX admin_invitations_user_idx ON public.admin_invitations (invited_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invitations TO authenticated;
GRANT ALL ON public.admin_invitations TO service_role;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage invitations" ON public.admin_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "self read own invitation" ON public.admin_invitations
  FOR SELECT TO authenticated USING (auth.uid() = invited_user_id);

CREATE TRIGGER admin_invitations_touch_updated_at
  BEFORE UPDATE ON public.admin_invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Backfill admin_profiles for existing admins
INSERT INTO public.admin_profiles (id, email, full_name)
SELECT ur.user_id, u.email, COALESCE(p.full_name, u.raw_user_meta_data->>'full_name')
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'admin'
ON CONFLICT (id) DO NOTHING;

-- Backfill invitations as accepted for existing admins that were invited
INSERT INTO public.admin_invitations (email, invited_user_id, status, invited_at, accepted_at)
SELECT u.email, u.id, 'accepted', COALESCE(u.invited_at, u.created_at), COALESCE(u.email_confirmed_at, u.created_at)
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
