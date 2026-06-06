import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Role = "admin" | "parent" | "student";

/**
 * Resolve the active role for the current user.
 * Priority: admin (user_roles) > parent (parent_links as parent_id) > student (default).
 * `viewMode` reflects the manually chosen portal (profiles.view_mode) so we don't
 * force admins/parents into one view if they prefer browsing as a student.
 */
export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role>("student");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [viewMode, setViewMode] = useState<Role>("student");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole("student"); setIsAdmin(false); setIsParent(false); setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [rolesRes, parentRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("parent_links").select("id", { head: true, count: "exact" }).eq("parent_id", user.id).eq("status", "accepted"),
        supabase.from("profiles").select("view_mode").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const admin = !!(rolesRes.data ?? []).find((r: any) => r.role === "admin");
      const parent = (parentRes.count ?? 0) > 0;
      const vm = (profileRes.data?.view_mode as Role) ?? "student";
      setIsAdmin(admin);
      setIsParent(parent);
      setViewMode(vm);
      // Resolved "true" role used for default redirects
      setRole(admin ? "admin" : parent ? "parent" : "student");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { role, isAdmin, isParent, viewMode, loading };
}
