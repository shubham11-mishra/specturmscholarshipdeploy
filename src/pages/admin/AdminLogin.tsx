import { Navigate } from "react-router-dom";

// The legacy localStorage admin bypass has been removed. Admins now sign in
// through the normal Auth page and are redirected based on their real role.
export default function AdminLogin() {
  return <Navigate to="/sign-in" replace />;
}
