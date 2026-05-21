import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Loader2, ShieldAlert } from "lucide-react";

export const AdminGuard = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsAdmin();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground max-w-md">
          This area is restricted to administrators. If you believe this is a mistake, contact support.
        </p>
        <a href="/dashboard" className="underline text-primary text-sm font-semibold">
          Return to dashboard
        </a>
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminGuard;
