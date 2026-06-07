import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAdminLoggedIn } from "@/lib/adminAuth";

export const AdminGuard = ({ children }: { children: ReactNode }) => {
  if (!isAdminLoggedIn()) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
};

export default AdminGuard;
