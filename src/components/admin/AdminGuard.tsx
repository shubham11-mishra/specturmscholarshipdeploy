import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ADMIN_LS_KEY } from "@/pages/admin/AdminLogin";

export const AdminGuard = ({ children }: { children: ReactNode }) => {
  const isAdminLoggedIn = typeof window !== "undefined" && localStorage.getItem(ADMIN_LS_KEY) === "true";
  if (!isAdminLoggedIn) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
};

export default AdminGuard;
