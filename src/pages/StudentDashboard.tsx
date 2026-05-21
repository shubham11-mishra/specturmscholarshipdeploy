import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import InfoTip from "@/components/InfoTip";
import {
  Sparkles, Target, Heart, BookOpen, Trophy, ClipboardCheck,
  ArrowRight, TrendingUp, AlertCircle,
} from "lucide-react";

type ProgressRow = {
  total_points: number;
  current_band: string;
  element_points_earth: number;
  element_points_water: number;
  element_points_fire: number;
  element_points_air: number;
  element_points_aether: number;
};

const ELEMENTS = [
  { key: "earth", label: "Earth", color: "#8B6F47" },
  { key: "water", label: "Water", color: "#2EC4B6" },
  { key: "fire", label: "Fire", color: "#E85D3A" },
  { key: "air", label: "Air", color: "#A8C0FF" },
  { key: "aether", label: "Aether", color: "#7B2D8E" },
] as const;

const StudentDashboard = () => {
  const { user, fullName, yearLevel } = useAuth();
  const { count: shortlistCount, loading: shortlistLoading } = useShortlist();
  const nav = useNavigate();
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [applications, setApplications] = useState<{ status: string; outcome: string | null }[]>([]);
  const [recentAttempt, setRecentAttempt] = useState<any>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [progressRes, appsRes, attemptRes, profileRes] = await Promise.all([
          supabase.from("student_progress").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("applications").select("status,outcome").eq("user_id", user.id),
          supabase.from("assessment_attempts").select("id,subject,total_score,completed_at,status")
            .eq("student_id", user.id).order("updated_at", { ascending: false }).limit(1),
          supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        setProgress((progressRes.data as ProgressRow) ?? null);
        setApplications(appsRes.data ?? []);
        setRecentAttempt(attemptRes.data?.[0] ?? null);
        setOnboarded(profileRes.data?.onboarding_completed ?? false);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Could not load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const totalPoints = progress?.total_points ?? 0;
  const readinessPct = Math.min(100, Math.round((totalPoints / 100) * 100));
  const winsCount = applications.filter(a => a.outcome === "won").length;
  const inProgressApps = applications.filter(a => !a.outcome && a.status !== "not_started").length;

  // Smart next step
  const nextStep = (() => {
    if (onboarded === false) return { label: "Finish your profile", href: "/profile/edit", desc: "Spend 2 minutes so we can match scholarships." };
    if (!recentAttempt || recentAttempt.status !== "completed") return { label: "Take an assessment", href: "/assessments", desc: "Earn +15 Readiness Points and unlock matches." };
    if (shortlistCount === 0) return { label: "Browse scholarships", href: "/scholarships", desc: "Shortlist 3 to focus your applications." };
    if (inProgressApps === 0) return { label: "Start your first application", href: "/applications", desc: "Turn a shortlist pick into a real application." };
    return { label: "Open AI Copilot", href: "/copilot", desc: "Get personalised next actions." };
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-3" />
        <h2 className="font-bold">Couldn't load dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero / Next step */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground">Welcome back</div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">
              {fullName?.split(" ")[0] || "Hello"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {yearLevel ? `Year ${yearLevel}` : "Student"} · Band: {progress?.current_band ?? "Earth"}
            </p>

            <div className="mt-5 p-4 rounded-xl bg-card border">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-3.5 h-3.5" /> Next step
              </div>
              <div className="mt-1 font-semibold">{nextStep.label}</div>
              <p className="text-sm text-muted-foreground mt-1">{nextStep.desc}</p>
              <Button onClick={() => nav(nextStep.href)} className="mt-3" size="sm">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Readiness ring */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
                <circle cx="50" cy="50" r="44" stroke="hsl(var(--primary))" strokeWidth="10" fill="none"
                  strokeDasharray={`${(readinessPct/100) * 276.46} 276.46`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold">{readinessPct}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">of 100</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              Readiness <InfoTip content="Your 0–100 readiness score. Earn points by completing assessments, building your profile, and submitting applications." />
            </div>
          </div>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile icon={Target} label="Total points" value={totalPoints} href="/readiness" tone="primary" />
        <StatTile icon={Heart} label="Shortlist" value={shortlistLoading ? "…" : shortlistCount} href="/shortlist" tone="red" />
        <StatTile icon={ClipboardCheck} label="Applications" value={applications.length} href="/applications" tone="teal" />
        <StatTile icon={Trophy} label="Wins" value={winsCount} href="/wins" tone="gold" />
      </div>

      {/* Element bands */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Your 5-element journey</h2>
          <Link to="/readiness" className="text-xs font-semibold text-primary hover:underline">View detail →</Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {ELEMENTS.map(el => {
            const pts = (progress as any)?.[`element_points_${el.key}`] ?? 0;
            const pct = Math.min(100, (pts / 20) * 100);
            return (
              <div key={el.key} className="text-center">
                <div className="h-20 bg-muted rounded-lg relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0" style={{ height: `${pct}%`, background: el.color }} />
                </div>
                <div className="text-xs font-semibold mt-1.5">{el.label}</div>
                <div className="text-[10px] text-muted-foreground">{pts} pts</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickCard icon={BookOpen} title="Assessments" desc="Verify your academic readiness." href="/assessments" />
        <QuickCard icon={Sparkles} title="AI Copilot" desc="Personalised guidance & gap fixes." href="/copilot" badge="AI" />
        <QuickCard icon={TrendingUp} title="Readiness Score" desc="See what's driving your number." href="/readiness" />
      </div>
    </div>
  );
};

const toneClasses: Record<string, string> = {
  primary: "text-primary",
  red: "text-[hsl(var(--spec-red))]",
  teal: "text-[hsl(var(--spec-teal))]",
  gold: "text-[hsl(var(--gold))]",
};

function StatTile({ icon: Icon, label, value, href, tone }: { icon: any; label: string; value: any; href: string; tone: string }) {
  return (
    <Link to={href} className="no-underline">
      <Card className="p-4 hover:shadow-md transition-shadow h-full">
        <Icon className={`w-5 h-5 ${toneClasses[tone]}`} />
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </Card>
    </Link>
  );
}

function QuickCard({ icon: Icon, title, desc, href, badge }: { icon: any; title: string; desc: string; href: string; badge?: string }) {
  return (
    <Link to={href} className="no-underline">
      <Card className="p-5 h-full hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {badge && <Badge variant="secondary" className="text-[9px]">{badge}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default StudentDashboard;
