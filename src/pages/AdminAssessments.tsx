import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AssessmentGroupList from "@/components/assessment/AssessmentGroupList";

export default function AdminAssessments() {
  const { isAdmin, loading } = useIsAdmin();
  const nav = useNavigate();

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Assessment Editor</h1>
        <p className="text-sm text-muted-foreground">
          Pick an assessment to manage its sections, questions and passages. Groups are sourced live from the database — both
          admins and students see the same structure.
        </p>
      </header>

      <AssessmentGroupList
        includeEmpty
        showCounts
        onSelect={(g) => nav(`/admin/assessments/${g.subject}/${encodeURIComponent(g.year_band)}`)}
      />
    </div>
  );
}
