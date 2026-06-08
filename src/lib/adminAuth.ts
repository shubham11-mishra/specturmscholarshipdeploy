// Legacy admin bypass has been removed. Admin access is now driven entirely by
// Supabase auth + the `user_roles` table (see useUserRole / AdminGuard).
// These stubs remain only to avoid breaking older imports; they are no-ops.

export const ADMIN_EMAIL = "";
export const ADMIN_PASSWORD = "";

export function isAdminLoggedIn(): boolean {
  return false;
}

export function setAdminLoggedIn(_v: boolean) {
  // no-op
}

export function adminSignOut() {
  // no-op — real sign-out goes through supabase.auth.signOut()
}
