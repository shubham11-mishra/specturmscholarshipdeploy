import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import OnboardingTour from "@/components/OnboardingTour";


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
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-secondary/40 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopHeader title={pageTitle} />
        <SpectrumGradientBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-6 md:p-8">{children}</div>
        </main>
        <OnboardingTour />
      </div>
    </div>
  );
};

export default AppLayout;
