import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { listInProgressAttempts, SUBJECT_THEME, type Subject } from "@/lib/assessment";
import { Play } from "lucide-react";
import AssessmentGroupList from "@/components/assessment/AssessmentGroupList";
import { groupLabel } from "@/lib/assessmentGroups";

export default function AssessmentHub() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [resumes, setResumes] = useState<any[]>([]);

  useEffect(() => {
    if (user) listInProgressAttempts(user.id).then(setResumes);
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold rainbow-text">Academic Readiness</h1>
        <p className="text-muted-foreground mt-1">Pick the assessment that matches your subject and year level.</p>
        <div className="rainbow-bar mt-4 rounded-full max-w-[160px]" />
      </div>

      <AssessmentGroupList
        publishedOnly
        onSelect={(g) => nav(`/assessments/${g.subject}/${encodeURIComponent(g.year_band)}/take`)}
      />

      {resumes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-display font-bold">Resume in progress</h2>
          {resumes.map(r => {
            const subj = r.subject as Subject;
            const t = SUBJECT_THEME[subj];
            return (
              <Card key={r.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{groupLabel(subj, r.year_band)}</div>
                    <div className="text-sm text-muted-foreground">
                      Question {r.current_question} · {Object.keys(r.answers ?? {}).length} answered
                    </div>
                  </div>
                  <Button onClick={() => nav(`/assessments/${r.subject}/${encodeURIComponent(r.year_band)}/take`)}
                    style={{ background: t.color }}>
                    <Play className="w-4 h-4 mr-1" /> Resume
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
