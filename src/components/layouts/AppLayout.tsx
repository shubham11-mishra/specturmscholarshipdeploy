import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Menu } from "lucide-react";
import OnboardingTour from "@/components/OnboardingTour";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const SpectrumGradientBar = () => (
  <div
    className="h-[6px] flex-shrink-0"
    style={{
      background:
        "linear-gradient(90deg, hsl(199 99% 50%) 0%, hsl(180 80% 50%) 20%, hsl(76 70% 45%) 40%, hsl(43 96% 58%) 60%, hsl(28 100% 57%) 80%, hsl(351 100% 53%) 100%)",
    }}
  />
);

const AppLayout = ({ children, pageTitle }: { children: ReactNode; pageTitle: string }) => {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  // Role-aware redirect: admins landing on /dashboard get the admin panel.
  useEffect(() => {
    if (loading || roleLoading || !user) return;
    if (pathname === "/dashboard" && role === "admin") navigate("/admin", { replace: true });
  }, [loading, roleLoading, user, role, pathname, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-secondary/40 overflow-hidden">
      <Sidebar className="hidden md:flex" />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-r-0 [&>button]:text-white">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center bg-card border-b px-3 py-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md hover:bg-muted"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-2 font-semibold">{pageTitle}</span>
        </div>
        <TopHeader title={pageTitle} />
        <SpectrumGradientBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-4 md:p-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
        <OnboardingTour />
      </div>
    </div>
  );
};

export default AppLayout;
