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
import AdminAssessments from "./pages/AdminAssessments.tsx";
import AdminLayout from "@/components/layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder.tsx";
import QuestionBank from "./pages/admin/QuestionBank.tsx";
import PassageManager from "./pages/admin/PassageManager.tsx";
import UserManagement from "./pages/admin/UserManagement.tsx";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import ParentGuard from "./components/admin/ParentGuard.tsx";
import About from "./pages/legal/About.tsx";
import Faq from "./pages/legal/Faq.tsx";
import ContactPage from "./pages/legal/Contact.tsx";
import Refunds from "./pages/legal/Refunds.tsx";
import CookiesPage from "./pages/legal/Cookies.tsx";
import DisclaimerPage from "./pages/legal/Disclaimer.tsx";
import TermsPage from "./pages/legal/Terms.tsx";
import PrivacyPage from "./pages/legal/Privacy.tsx";

const queryClient = new QueryClient();

const App = ({ children, title }: { children: ReactNode; title: string }) => (
  <AppLayout pageTitle={title}>{children}</AppLayout>
);

const Admin = ({ children, title }: { children: ReactNode; title: string }) => (
  <AdminLayout pageTitle={title}>{children}</AdminLayout>
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
              <Route path="/sign-in" element={<Auth />} />
              <Route path="/sign-up" element={<Auth />} />
              <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public legal & info pages */}
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route path="/disclaimer" element={<DisclaimerPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              <Route path="/dashboard" element={<App title="Dashboard"><StudentDashboard /></App>} />
              <Route path="/profile" element={<App title="My Profile"><Profile /></App>} />
              <Route path="/profile/edit" element={<App title="Edit Profile"><ProfileEdit /></App>} />
              <Route path="/scholarships" element={<App title="Opportunities"><Scholarships /></App>} />
              <Route path="/scholarships/:id" element={<App title="Opportunity Detail"><ScholarshipDetail /></App>} />
              <Route path="/shortlist" element={<App title="My Shortlist"><Shortlist /></App>} />
              <Route path="/applications" element={<App title="Applications"><Applications /></App>} />
              <Route path="/wins" element={<App title="Wins"><Wins /></App>} />
              <Route path="/readiness" element={<App title="Readiness"><Readiness /></App>} />
              <Route path="/copilot" element={<App title="AI Copilot"><Copilot /></App>} />
              <Route path="/achievements" element={<App title="Achievements"><Achievements /></App>} />
              <Route path="/parent" element={<App title="Parent Dashboard"><ParentGuard><Parent /></ParentGuard></App>} />

              <Route path="/assessments" element={<App title="Assessments"><AssessmentHub /></App>} />
              <Route path="/assessments/:subject/select" element={<App title="Choose Year Band"><AssessmentYearBand /></App>} />
              <Route path="/assessments/:subject/:yearBand/take" element={<App title="Assessment"><AssessmentTake /></App>} />
              <Route path="/assessments/results/:id" element={<App title="Results"><AssessmentResults /></App>} />
              <Route path="/admin" element={<Admin title="Admin Dashboard"><AdminDashboard /></Admin>} />
              <Route path="/admin/assessments" element={<Admin title="Assessment Editor"><AdminAssessments /></Admin>} />
              <Route path="/admin/questions" element={<Admin title="Question Bank"><QuestionBank /></Admin>} />
              <Route path="/admin/passages" element={<Admin title="Passage Manager"><PassageManager /></Admin>} />
              <Route path="/admin/users" element={<Admin title="User Management"><UserManagement /></Admin>} />
              <Route path="/admin/gamification" element={<Admin title="Gamification Settings"><AdminPlaceholder title="Gamification Settings" description="Tune Readiness points, badge thresholds and streak rewards. Editable settings are coming next — current values are defined in code." /></Admin>} />


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
