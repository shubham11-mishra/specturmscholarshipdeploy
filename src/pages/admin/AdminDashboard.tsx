import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { FileQuestion, BookOpen, Users, Trophy, Wrench, CheckCircle2, ClipboardList, ClipboardCheck, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Kpis = {
  publishedQuestions: number;
  draftQuestions: number;
  passages: number;
  attempts: number;
  completedAttempts: number;
  avgScore: number | null;
  students: number;
  newUsers30d: number;
};

type ProfileRow = { created_at: string | null; state: string | null; year_level: string | null };

const tiles = [
  { label: "Pending Approvals", path: "/admin/pending-approvals", icon: ClipboardCheck, desc: "Review and approve fresh scholarship data." },
  { label: "Assessment Editor", path: "/admin/assessments", icon: Wrench, desc: "Create, edit, import and preview questions." },
  { label: "Question Bank", path: "/admin/questions", icon: FileQuestion, desc: "Searchable index of every question." },
  { label: "Passage Manager", path: "/admin/passages", icon: BookOpen, desc: "Reusable reading passages." },
  { label: "User Management", path: "/admin/users", icon: Users, desc: "Roles & platform access." },
  { label: "Gamification Settings", path: "/admin/gamification", icon: Trophy, desc: "Points, badges & rewards." },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--gold))", "hsl(var(--spec-green))", "hsl(var(--spec-red))", "hsl(var(--spec-blue-light))", "hsl(var(--accent))"];

const AdminDashboard = () => {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [signupSeries, setSignupSeries] = useState<{ date: string; users: number; cumulative: number }[]>([]);
  const [stateSeries, setStateSeries] = useState<{ name: string; value: number }[]>([]);
  const [yearSeries, setYearSeries] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [pubQ, draftQ, passages, attempts, completed, students, profilesRes] = await Promise.all([
        supabase.from("assessment_questions").select("id", { head: true, count: "exact" }).eq("status", "published"),
        supabase.from("assessment_questions").select("id", { head: true, count: "exact" }).eq("status", "draft"),
        supabase.from("assessment_passages").select("id", { head: true, count: "exact" }),
        supabase.from("assessment_attempts").select("id", { head: true, count: "exact" }),
        supabase.from("assessment_attempts").select("total_score", { count: "exact" }).eq("status", "completed").limit(500),
        supabase.from("profiles").select("id", { head: true, count: "exact" }),
        supabase.from("profiles").select("created_at,state,year_level").limit(1000),
      ]);

      const scores = (completed.data ?? []).map((r: any) => Number(r.total_score)).filter(n => !Number.isNaN(n));
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

      const rows: ProfileRow[] = (profilesRes.data ?? []) as any;

      // Signups per day (last 30 days)
      const days: { date: string; users: number; cumulative: number }[] = [];
      const today = new Date();
      const counts = new Map<string, number>();
      rows.forEach(r => {
        if (!r.created_at) return;
        const key = r.created_at.slice(0, 10);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
      // Cumulative total before 30-day window
      const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 29);
      let cumulative = rows.filter(r => r.created_at && new Date(r.created_at) < cutoff).length;
      let newUsers30d = 0;
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const n = counts.get(key) ?? 0;
        cumulative += n;
        newUsers30d += n;
        days.push({ date: key.slice(5), users: n, cumulative });
      }
      setSignupSeries(days);

      // By state
      const stateMap = new Map<string, number>();
      rows.forEach(r => {
        const s = r.state || "Unknown";
        stateMap.set(s, (stateMap.get(s) ?? 0) + 1);
      });
      setStateSeries(Array.from(stateMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

      // By year level
      const yMap = new Map<string, number>();
      rows.forEach(r => {
        const y = r.year_level ? `Year ${r.year_level}` : "Unspecified";
        yMap.set(y, (yMap.get(y) ?? 0) + 1);
      });
      setYearSeries(Array.from(yMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));

      setKpis({
        publishedQuestions: pubQ.count ?? 0,
        draftQuestions: draftQ.count ?? 0,
        passages: passages.count ?? 0,
        attempts: attempts.count ?? 0,
        completedAttempts: completed.count ?? 0,
        avgScore: avg,
        students: students.count ?? 0,
        newUsers30d,
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
            <Kpi icon={Users} label="Total users" value={kpis!.students} sub={`+${kpis!.newUsers30d} in last 30 days`} />
            <Kpi icon={FileQuestion} label="Published questions" value={kpis!.publishedQuestions} sub={`${kpis!.draftQuestions} draft`} />
            <Kpi icon={ClipboardList} label="Attempts" value={kpis!.attempts} sub={`${kpis!.completedAttempts} completed`} />
            <Kpi icon={CheckCircle2} label="Avg score" value={kpis!.avgScore !== null ? `${kpis!.avgScore}%` : "—"} sub={`${kpis!.passages} passages`} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">User growth (last 30 days)</h3>
          </div>
          {loading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={signupSeries} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#cumFill)" name="Total users" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-4">Daily signups</h3>
          {loading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={signupSeries} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="users" fill="hsl(var(--gold))" radius={[4, 4, 0, 0]} name="New users" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-4">Users by state</h3>
          {loading ? <Skeleton className="h-64" /> : stateSeries.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-10">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stateSeries} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => e.name}>
                  {stateSeries.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-sm mb-4">Users by year level</h3>
          {loading ? <Skeleton className="h-64" /> : yearSeries.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-10">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={yearSeries} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
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
