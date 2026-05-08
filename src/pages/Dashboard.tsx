import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SpectrumLayout from "@/components/SpectrumLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trophy, Flame, Target, ArrowRight } from "lucide-react";

const BAND_INFO: Record<string, { label: string; color: string; element: string; meaning: string }> = {
  earth: { label: "Earth", color: "from-amber-700 to-amber-900", element: "Foundations & Engagement", meaning: "Revising prerequisite skills" },
  water: { label: "Water", color: "from-blue-500 to-blue-700", element: "Modelled Flow", meaning: "Guided worked examples" },
  fire: { label: "Fire", color: "from-orange-500 to-red-600", element: "Core Activation", meaning: "Independent practice" },
  air: { label: "Air", color: "from-cyan-400 to-sky-600", element: "Extension & Connection", meaning: "Problem-solving, applying skills" },
  aether: { label: "Aether", color: "from-violet-500 to-purple-700", element: "Mastery & Independence", meaning: "Complete independence" },
};

const DIM_LABELS: Record<string, string> = {
  academic: "Academic Competitiveness",
  leadership: "Leadership Evidence",
  service: "Service & Community",
  co_curricular: "Co-curricular Depth",
  interview: "Interview Readiness",
  materials: "Application Materials",
  verification: "Profile Verification",
};

const computeBand = (score: number) => {
  if (score <= 20) return "earth";
  if (score <= 40) return "water";
  if (score <= 60) return "fire";
  if (score <= 80) return "air";
  return "aether";
};

const Dashboard = () => {
  const { user, loading, fullName } = useAuth();
  const navigate = useNavigate();
  const [dims, setDims] = useState<{ dimension: string; score: number }[]>([]);
  const [badges, setBadges] = useState<{ badge_code: string; tier: string }[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("student_dimensions").select("dimension, score").eq("user_id", user.id)
      .then(({ data }) => setDims(data || []));
    supabase.from("student_badges").select("badge_code, tier").eq("user_id", user.id)
      .then(({ data }) => setBadges((data as any) || []));
    supabase.from("student_profile").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        if (data && !data.onboarding_completed) navigate("/onboarding");
      });
  }, [user, navigate]);

  const overall = dims.length ? Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length) : 0;
  const band = computeBand(overall);
  const bandInfo = BAND_INFO[band];

  return (
    <SpectrumLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold">Welcome back, {fullName?.split(" ")[0] || "Scholar"}</h1>
          <p className="text-muted-foreground">Your scholarship readiness at a glance.</p>
        </div>

        {/* Band hero */}
        <Card className={`p-6 bg-gradient-to-br ${bandInfo.color} text-white`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80">Current Readiness Band</div>
              <div className="font-display text-5xl font-bold">{bandInfo.label}</div>
              <div className="text-sm opacity-90 mt-1">{bandInfo.element} — {bandInfo.meaning}</div>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold">{overall}</div>
              <div className="text-xs uppercase tracking-widest opacity-80">overall score / 100</div>
            </div>
          </div>
          <div className="mt-4 text-xs opacity-80">
            Confidence: <strong>medium</strong> — based on partial onboarding data. Complete more steps to improve accuracy.
          </div>
        </Card>

        {/* 7 Dimensions */}
        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> 7 Readiness Dimensions
          </h2>
          <div className="space-y-3">
            {Object.entries(DIM_LABELS).map(([key, label]) => {
              const d = dims.find((x) => x.dimension === key);
              const score = d?.score || 0;
              const dband = computeBand(score);
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">{score}/100 · <span className="capitalize text-foreground">{dband}</span></span>
                  </div>
                  <Progress value={score} />
                </div>
              );
            })}
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/gaps")}>
            View Gap Analysis <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5">
            <Trophy className="w-6 h-6 text-accent mb-2" />
            <div className="text-3xl font-bold">{badges.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Badges Earned</div>
            <div className="flex flex-wrap gap-1 mt-3">
              {badges.slice(0, 6).map((b) => (
                <Badge key={b.badge_code} variant="secondary" className="text-[10px]">
                  {b.badge_code.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <Flame className="w-6 h-6 text-orange-500 mb-2" />
            <div className="text-3xl font-bold">1</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Day Streak</div>
            <div className="text-xs text-muted-foreground mt-3">Log in tomorrow to extend your streak.</div>
          </Card>
          <Card className="p-5">
            <Sparkles className="w-6 h-6 text-primary mb-2" />
            <div className="text-3xl font-bold">{dims.reduce((s, d) => s + d.score, 0)}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Spectrum Points</div>
            <div className="text-xs text-muted-foreground mt-3">Earn points by logging activities & completing courses.</div>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 hover:border-primary cursor-pointer transition-colors" onClick={() => navigate("/matches")}>
            <h3 className="font-semibold mb-1">Browse Matches</h3>
            <p className="text-sm text-muted-foreground">Scholarships ranked by your profile fit.</p>
          </Card>
          <Card className="p-5 hover:border-primary cursor-pointer transition-colors" onClick={() => navigate("/copilot")}>
            <h3 className="font-semibold mb-1">Ask the Copilot</h3>
            <p className="text-sm text-muted-foreground">Personalised scholarship strategy advice.</p>
          </Card>
          <Card className="p-5 hover:border-primary cursor-pointer transition-colors" onClick={() => navigate("/hub")}>
            <h3 className="font-semibold mb-1">Application Hub</h3>
            <p className="text-sm text-muted-foreground">Track every application from start to outcome.</p>
          </Card>
        </div>
      </div>
    </SpectrumLayout>
  );
};

export default Dashboard;
