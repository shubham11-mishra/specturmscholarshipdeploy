import { useUserRole } from "@/hooks/useUserRole";

/** Backwards-compatible thin wrapper around useUserRole. */
export function useIsAdmin() {
  const { isAdmin, loading } = useUserRole();
  return { isAdmin, loading };
}
