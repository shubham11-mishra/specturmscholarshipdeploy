import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { FileQuestion, BookOpen, Users, Trophy, Wrench, CheckCircle2, ClipboardList } from "lucide-react";

type Kpis = {
  publishedQuestions: number;
  draftQuestions: number;
  passages: number;
  attempts: number;
  completedAttempts: number;
  avgScore: number | null;
  students: number;
};

const tiles = [
  { label: "Assessment Editor", path: "/admin/assessments", icon: Wrench, desc: "Create, edit, import and preview questions." },
  { label: "Question Bank", path: "/admin/questions", icon: FileQuestion, desc: "Searchable index of every question." },
  { label: "Passage Manager", path: "/admin/passages", icon: BookOpen, desc: "Reusable reading passages." },
  { label: "User Management", path: "/admin/users", icon: Users, desc: "Roles & platform access." },
  { label: "Gamification Settings", path: "/admin/gamification", icon: Trophy, desc: "Points, badges & rewards." },
];

const AdminDashboard = () => {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pubQ, draftQ, passages, attempts, completed, students] = await Promise.all([
        supabase.from("assessment_questions").select("id", { head: true, count: "exact" }).eq("status", "published"),
        supabase.from("assessment_questions").select("id", { head: true, count: "exact" }).eq("status", "draft"),
        supabase.from("assessment_passages").select("id", { head: true, count: "exact" }),
        supabase.from("assessment_attempts").select("id", { head: true, count: "exact" }),
        supabase.from("assessment_attempts").select("total_score", { count: "exact" }).eq("status", "completed").limit(500),
        supabase.from("profiles").select("id", { head: true, count: "exact" }),
      ]);
      const scores = (completed.data ?? []).map((r: any) => Number(r.total_score)).filter(n => !Number.isNaN(n));
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      setKpis({
        publishedQuestions: pubQ.count ?? 0,
        draftQuestions: draftQ.count ?? 0,
        passages: passages.count ?? 0,
        attempts: attempts.count ?? 0,
        completedAttempts: completed.count ?? 0,
        avgScore: avg,
        students: students.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome, admin</h2>
        <p className="text-muted-foreground text-sm">Manage the Spectrum platform from one place.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
          <>
            <Kpi icon={FileQuestion} label="Published questions" value={kpis!.publishedQuestions} sub={`${kpis!.draftQuestions} draft`} />
            <Kpi icon={BookOpen} label="Passages" value={kpis!.passages} />
            <Kpi icon={ClipboardList} label="Attempts" value={kpis!.attempts} sub={`${kpis!.completedAttempts} completed`} />
            <Kpi icon={CheckCircle2} label="Avg score" value={kpis!.avgScore !== null ? `${kpis!.avgScore}%` : "—"} sub={`${kpis!.students} students`} />
          </>
        )}
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.path} to={t.path} className="no-underline">
            <Card className="p-5 h-full hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

function Kpi({ icon: Icon, label, value, sub }: { icon: any; label: string; value: any; sub?: string }) {
  return (
    <Card className="p-4">
      <Icon className="w-5 h-5 text-primary" />
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

export default AdminDashboard;
