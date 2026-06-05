import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// If an auth redirect (invite / recovery) lands on any page, route to /reset-password
// while preserving the auth hash so the user can set their password.
(() => {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const isInviteOrRecovery =
    hash.includes("type=invite") ||
    hash.includes("type=recovery") ||
    search.includes("type=invite") ||
    search.includes("type=recovery");
  if (isInviteOrRecovery && window.location.pathname !== "/reset-password") {
    window.location.replace(`/reset-password${search}${hash}`);
    return;
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
