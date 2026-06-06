import { useNavigate } from "react-router-dom";
import AssessmentGroupList from "@/components/assessment/AssessmentGroupList";

export default function AdminAssessments() {
  const nav = useNavigate();

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
