import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { listInProgressAttempts, SUBJECT_THEME, type Subject } from "@/lib/assessment";
import { BookOpen, Calculator, Play } from "lucide-react";

export default function AssessmentHub() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [resumes, setResumes] = useState<any[]>([]);

  useEffect(() => {
    if (user) listInProgressAttempts(user.id).then(setResumes);
  }, [user]);

  const cards: { subject: Subject; icon: any; title: string; sub: string }[] = [
    { subject: "english", icon: BookOpen, title: "English Assessment", sub: "Reading, grammar, vocabulary" },
    { subject: "maths",   icon: Calculator, title: "Maths Assessment",   sub: "Problem solving, numerical reasoning" },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold rainbow-text">Academic Readiness</h1>
        <p className="text-muted-foreground mt-1">Verify your Academic score with a short assessment.</p>
        <div className="rainbow-bar mt-4 rounded-full max-w-[160px]" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {cards.map(({ subject, icon: Icon, title, sub }) => {
          const t = SUBJECT_THEME[subject];
          return (
            <Card key={subject} className="card-shine relative overflow-hidden border-2 hover:shadow-lg transition-all cursor-pointer"
              style={{ borderColor: `${t.color}22` }}
              onClick={() => nav(`/assessments/${subject}/select`)}>
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: t.color }} />
              <CardContent className="p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${t.color}15` }}>
                  <Icon className="w-7 h-7" style={{ color: t.color }} />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">{title}</h2>
                  <p className="text-muted-foreground">{sub}</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Badge style={{ background: `${t.color}15`, color: t.color }}>+30 XP</Badge>
                  <Badge variant="outline">Verified Academic badge</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {resumes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-display font-bold">Resume in progress</h2>
          {resumes.map(r => {
            const t = SUBJECT_THEME[r.subject as Subject];
            return (
              <Card key={r.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold">{t.label} · {r.year_band}</div>
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
