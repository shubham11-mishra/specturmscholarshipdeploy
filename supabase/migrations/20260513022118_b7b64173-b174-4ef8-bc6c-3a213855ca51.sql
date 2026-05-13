
CREATE TABLE public.parent_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  used_by uuid,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "child manages own codes" ON public.parent_invite_codes FOR ALL TO authenticated
  USING (auth.uid() = child_id) WITH CHECK (auth.uid() = child_id);

CREATE TABLE public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, child_id)
);
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "either side reads links" ON public.parent_links FOR SELECT TO authenticated
  USING (auth.uid() = parent_id OR auth.uid() = child_id);
CREATE POLICY "either side deletes links" ON public.parent_links FOR DELETE TO authenticated
  USING (auth.uid() = parent_id OR auth.uid() = child_id);

CREATE OR REPLACE FUNCTION public.redeem_parent_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid := auth.uid();
  v_child uuid;
  v_link_id uuid;
BEGIN
  IF v_parent IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT child_id INTO v_child
    FROM public.parent_invite_codes
   WHERE code = _code
     AND used_at IS NULL
     AND expires_at > now()
   LIMIT 1;

  IF v_child IS NULL THEN RAISE EXCEPTION 'invalid_or_expired_code'; END IF;
  IF v_child = v_parent THEN RAISE EXCEPTION 'cannot_link_self'; END IF;

  INSERT INTO public.parent_links (parent_id, child_id, status)
  VALUES (v_parent, v_child, 'accepted')
  ON CONFLICT (parent_id, child_id) DO UPDATE SET status = 'accepted'
  RETURNING id INTO v_link_id;

  UPDATE public.parent_invite_codes
     SET used_by = v_parent, used_at = now()
   WHERE code = _code;

  RETURN v_link_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_parent_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_parent_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_linked_children_summary()
RETURNS TABLE (
  child_id uuid,
  full_name text,
  year_level text,
  current_band text,
  total_points integer,
  shortlisted_count bigint,
  applications_count bigint,
  wins_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.full_name,
    p.year_level,
    sp.current_band,
    sp.total_points,
    (SELECT count(*) FROM public.navigator_shortlist ns WHERE ns.user_id = p.id),
    (SELECT count(*) FROM public.applications a WHERE a.user_id = p.id),
    (SELECT count(*) FROM public.applications a WHERE a.user_id = p.id AND a.outcome = 'won')
  FROM public.parent_links pl
  JOIN public.profiles p ON p.id = pl.child_id
  LEFT JOIN public.student_progress sp ON sp.user_id = p.id
  WHERE pl.parent_id = auth.uid() AND pl.status = 'accepted';
$$;

REVOKE ALL ON FUNCTION public.get_linked_children_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_linked_children_summary() TO authenticated;
