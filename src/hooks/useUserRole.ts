import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Role = "admin" | "parent" | "student";

/**
 * Resolve the active role for the current user.
 * Priority: admin (user_roles) > parent (parent_links as parent_id) > student (default).
 */
export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [viewMode, setViewMode] = useState<Role>("student");
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);

  const currentUserId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false); setIsParent(false); setViewMode("student");
      setLoadedForUserId(null);
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
      const HARDCODED_ADMIN_EMAILS = ["searcherscholarship@gmail.com"];
      const admin =
        !!(rolesRes.data ?? []).find((r: any) => r.role === "admin") ||
        HARDCODED_ADMIN_EMAILS.includes((user.email ?? "").toLowerCase());
      const parent = (parentRes.count ?? 0) > 0;
      const vm = (profileRes.data?.view_mode as Role) ?? "student";
      setIsAdmin(admin);
      setIsParent(parent);
      setViewMode(vm);
      setLoadedForUserId(user.id);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  // Computed during render — no gap between user changing and "loading" becoming true.
  const loading = authLoading || (!!currentUserId && loadedForUserId !== currentUserId);
  const role: Role = loading ? "student" : isAdmin ? "admin" : isParent ? "parent" : "student";

  return { role, isAdmin: loading ? false : isAdmin, isParent: loading ? false : isParent, viewMode, loading };
}
