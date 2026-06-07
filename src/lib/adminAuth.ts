export const ADMIN_EMAIL = "searcherscholarship@gmail.com";
export const ADMIN_PASSWORD = "scholarshipsearcher$%12";
const KEY = "isAdminLoggedIn";

export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function setAdminLoggedIn(v: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (v) window.localStorage.setItem(KEY, "true");
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function adminSignOut() {
  setAdminLoggedIn(false);
}
