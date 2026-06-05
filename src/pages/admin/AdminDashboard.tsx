import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, GraduationCap, UserCheck, ClipboardList, ClipboardCheck, PlayCircle,
  CalendarCheck, TrendingUp, Home,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { ORDERED_BANDS } from "@/lib/assessmentGroups";
import { inferYearBand } from "@/lib/assessment";

type ProfileRow = { id: string; created_at: string | null; year_level: string | null; view_mode: string | null };
type AttemptRow = { id: string; status: string | null; started_at: string | null; completed_at: string | null; updated_at: string | null };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// Map a profile.year_level string into one of the canonical 9 bands. Falls back to inferYearBand.
function bandForYearLevel(yl: string | null): string | null {
  if (!yl) return null;
  const low = yl.toLowerCase().trim();
  if (low.includes("scholarship") || low.includes("sealp")) return "Scholarship/SEALP";
  if (low.includes("selective")) return "Selective";
  return inferYearBand(yl);
}

const AdminDashboard = () => {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [familyCount, setFamilyCount] = useState(0);
  const [hasAppointments, setHasAppointments] = useState<boolean | null>(null);
  const [appointmentCount, setAppointmentCount] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const [profilesRes, attemptsRes, familyRes] = await Promise.all([
        supabase.from("profiles").select("id,created_at,year_level,view_mode").limit(5000),
        supabase.from("assessment_attempts").select("id,status,started_at,completed_at,updated_at").limit(5000),
        supabase.from("parent_links").select("id", { head: true, count: "exact" }).eq("status", "accepted"),
      ]);
      // Optional appointments table — may not exist; ignore errors silently
      const apptRes = await supabase.from("appointments" as any).select("id", { head: true, count: "exact" });
      if (cancel) return;
      setProfiles((profilesRes.data ?? []) as ProfileRow[]);
      setAttempts((attemptsRes.data ?? []) as AttemptRow[]);
      setFamilyCount(familyRes.count ?? 0);
      if (apptRes.error) {
        setHasAppointments(false);
        setAppointmentCount(0);
      } else {
        setHasAppointments(true);
        setAppointmentCount(apptRes.count ?? 0);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  const inYear = (iso: string | null | undefined) =>
    !!iso && new Date(iso).getFullYear() === year;

  const stats = useMemo(() => {
    const students = profiles.filter(p => (p.view_mode ?? "student") === "student");
    const registeredThisYear = students.filter(p => inYear(p.created_at)).length;

    const completed = attempts.filter(a => a.status === "completed").length;
    const ongoing   = attempts.filter(a => a.status === "in_progress").length;
    const started   = attempts.length;

    return {
      families: familyCount,
      totalStudents: students.length,
      registeredThisYear,
      completed,
      ongoing,
      started,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, attempts, familyCount, year]);

  // Monthly signups for selected year
  const monthlySignups = useMemo(() => {
    const buckets = MONTHS.map((m, i) => ({ month: m, idx: i, students: 0 }));
    profiles.forEach(p => {
      if (!p.created_at || (p.view_mode ?? "student") !== "student") return;
      const d = new Date(p.created_at);
      if (d.getFullYear() !== year) return;
      buckets[d.getMonth()].students += 1;
    });
    return buckets;
  }, [profiles, year]);

  // Registered students by canonical year band (filtered to selected year)
  const byBand = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(ORDERED_BANDS.map(b => [b, 0]));
    profiles.forEach(p => {
      if ((p.view_mode ?? "student") !== "student") return;
      if (!inYear(p.created_at)) return;
      const band = bandForYearLevel(p.year_level);
      if (band && counts[band] !== undefined) counts[band] += 1;
    });
    return ORDERED_BANDS.map(b => ({ band: b, students: counts[b] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, year]);

  // Monthly assessment status breakdown (selected year)
  const monthlyAssessments = useMemo(() => {
    const buckets = MONTHS.map(m => ({ month: m, started: 0, ongoing: 0, completed: 0 }));
    attempts.forEach(a => {
      const startIso = a.started_at;
      if (startIso) {
        const d = new Date(startIso);
        if (d.getFullYear() === year) buckets[d.getMonth()].started += 1;
      }
      if (a.status === "in_progress") {
        const ref = a.updated_at || a.started_at;
        if (ref) {
          const d = new Date(ref);
          if (d.getFullYear() === year) buckets[d.getMonth()].ongoing += 1;
        }
      }
      if (a.status === "completed" && a.completed_at) {
        const d = new Date(a.completed_at);
        if (d.getFullYear() === year) buckets[d.getMonth()].completed += 1;
      }
    });
    return buckets;
  }, [attempts, year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-muted-foreground text-sm">Live platform statistics from the database.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Year</span>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28 h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
          <>
            <Kpi icon={Home}           tone="primary" label="Total families"               value={stats.families} />
            <Kpi icon={Users}          tone="gold"    label="Total student users"          value={stats.totalStudents} />
            <Kpi icon={UserCheck}      tone="green"   label={`Registered students (${year})`} value={stats.registeredThisYear} />
            <Kpi icon={PlayCircle}     tone="blue"    label="Assessments started"          value={stats.started} />
            <Kpi icon={ClipboardList}  tone="gold"    label="Ongoing assessments"          value={stats.ongoing} />
            <Kpi icon={ClipboardCheck} tone="green"   label="Completed assessments"        value={stats.completed} />
            <Kpi
              icon={CalendarCheck}
              tone="primary"
              label="Booked appointments"
              value={hasAppointments ? appointmentCount : "—"}
              sub={hasAppointments ? undefined : "No data available"}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Monthly student sign-ups · {year}</h3>
          </div>
          {loading ? <Skeleton className="h-64" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlySignups} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="students" name="New students" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#signupFill)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">By year level · {year}</h3>
          </div>
          {loading ? <Skeleton className="h-64" /> : byBand.every(b => b.students === 0) ? (
            <div className="text-xs text-muted-foreground text-center py-16">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byBand} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="band" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="students" fill="hsl(var(--gold))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5 lg:col-span-3 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Assessment status by month · {year}</h3>
          </div>
          {loading ? <Skeleton className="h-64" /> : monthlyAssessments.every(m => !m.started && !m.ongoing && !m.completed) ? (
            <div className="text-xs text-muted-foreground text-center py-16">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyAssessments} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="started"   stroke="hsl(var(--primary))"   strokeWidth={2} dot={false} name="Started" />
                <Line type="monotone" dataKey="ongoing"   stroke="hsl(var(--gold))"      strokeWidth={2} dot={false} name="Ongoing" />
                <Line type="monotone" dataKey="completed" stroke="hsl(var(--spec-green))" strokeWidth={2} dot={false} name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

    </div>
  );
};

const TONES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  gold:    "bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))]",
  green:   "bg-[hsl(var(--spec-green))]/15 text-[hsl(var(--spec-green))]",
  blue:    "bg-[hsl(var(--spec-blue-light))]/15 text-[hsl(var(--spec-blue-light))]",
};

function Kpi({ icon: Icon, label, value, sub, tone = "primary" }: { icon: any; label: string; value: any; sub?: string; tone?: keyof typeof TONES | string }) {
  const toneClass = TONES[tone as string] ?? TONES.primary;
  return (
    <Card className="p-4 rounded-2xl">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

export default AdminDashboard;
