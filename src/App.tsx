import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ShortlistProvider } from "@/hooks/useShortlist";
import AppLayout from "@/components/layouts/AppLayout";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Shortlist from "./pages/Shortlist.tsx";
import Profile from "./pages/Profile.tsx";
import ProfileEdit from "./pages/ProfileEdit.tsx";
import Navigator from "./pages/Navigator.tsx";
import Scholarships from "./pages/Scholarships.tsx";
import ScholarshipDetail from "./pages/ScholarshipDetail.tsx";
import Readiness from "./pages/Readiness.tsx";
import Applications from "./pages/Applications.tsx";
import Wins from "./pages/Wins.tsx";
import Copilot from "./pages/Copilot.tsx";
import Achievements from "./pages/Achievements.tsx";
import Parent from "./pages/Parent.tsx";
import NotFound from "./pages/NotFound.tsx";
import AssessmentHub from "./pages/AssessmentHub.tsx";
import AssessmentYearBand from "./pages/AssessmentYearBand.tsx";
import AssessmentTake from "./pages/AssessmentTake.tsx";
import AssessmentResults from "./pages/AssessmentResults.tsx";

const queryClient = new QueryClient();

const App = ({ children, title }: { children: ReactNode; title: string }) => (
  <AppLayout pageTitle={title}>{children}</AppLayout>
);

const Root = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ShortlistProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/dashboard" element={<App title="Dashboard"><Profile /></App>} />
              <Route path="/profile" element={<App title="My Profile"><Profile /></App>} />
              <Route path="/profile/edit" element={<App title="Edit Profile"><ProfileEdit /></App>} />
              <Route path="/scholarships" element={<App title="Scholarships"><Scholarships /></App>} />
              <Route path="/scholarships/:id" element={<App title="Scholarship Detail"><ScholarshipDetail /></App>} />
              <Route path="/shortlist" element={<App title="My Shortlist"><Shortlist /></App>} />
              <Route path="/applications" element={<App title="Applications"><Applications /></App>} />
              <Route path="/wins" element={<App title="Wins"><Wins /></App>} />
              <Route path="/readiness" element={<App title="Readiness"><Readiness /></App>} />
              <Route path="/copilot" element={<App title="AI Copilot"><Copilot /></App>} />
              <Route path="/achievements" element={<App title="Achievements"><Achievements /></App>} />
              <Route path="/parent" element={<App title="Parent Dashboard"><Parent /></App>} />

              {/* Backwards compat: /wheel + /navigator → Readiness with My Wheel tab */}
              <Route path="/wheel" element={<Navigate to="/readiness?tab=my-wheel" replace />} />
              <Route path="/navigator" element={<Navigate to="/readiness?tab=my-wheel" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ShortlistProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default Root;
