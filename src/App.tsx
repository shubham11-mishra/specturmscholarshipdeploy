import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ShortlistProvider } from "@/hooks/useShortlist";
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

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="/shortlist" element={<Shortlist />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/dashboard" element={<Profile />} />
              <Route path="/navigator" element={<Navigator />} />
              <Route path="/wheel" element={<Navigator />} />
              <Route path="/scholarships" element={<Scholarships />} />
              <Route path="/scholarships/:id" element={<ScholarshipDetail />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/wins" element={<Wins />} />
              <Route path="/readiness" element={<Readiness />} />
              <Route path="/copilot" element={<Copilot />} />
              <Route path="/achievements" element={<Achievements />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ShortlistProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
