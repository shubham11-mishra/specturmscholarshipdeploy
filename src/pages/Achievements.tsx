import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Flame, Award, Trophy, Sparkles } from "lucide-react";

type Progress = {
  total_points: number; current_band: string; streak_days?: number;
  element_points_earth: number; element_points_water: number; element_points_fire: number; element_points_air: number; element_points_aether: number;
  badges?: string[];
};
type Badge = { id: string; badge_key: string; label: string; icon_emoji: string; description: string | null; earned_at: string };

const BANDS = [
  { key: "Earth", emoji: "🟫", min: 0, color: "bg-amber-100 text-amber-900 border-amber-300" },
  { key: "Water", emoji: "🟦", min: 100, color: "bg-blue-100 text-blue-900 border-blue-300" },
  { key: "Fire", emoji: "🟧", min: 300, color: "bg-orange-100 text-orange-900 border-orange-300" },
  { key: "Air", emoji: "⬜", min: 600, color: "bg-slate-100 text-slate-900 border-slate-300" },
  { key: "Aether", emoji: "🟪", min: 1000, color: "bg-purple-100 text-purple-900 border-purple-300" },
];

const ELEMENTS = [
  { key: "earth", label: "Earth", emoji: "🟫" },
  { key: "water", label: "Water", emoji: "🟦" },
  { key: "fire", label: "Fire", emoji: "🟧" },
  { key: "air", label: "Air", emoji: "⬜" },
  { key: "aether", label: "Aether", emoji: "🟪" },
] as const;

const Achievements = () => {
  const { user, loading, fullName } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [pr, bd] = await Promise.all([
        supabase.from("student_progress").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_badges").select("*").eq("user_id", user.id).order("earned_at", { ascending: false }),
      ]);
      setProgress(pr.data as Progress | null);
      setBadges((bd.data ?? []) as Badge[]);
    })();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;

  const total = progress?.total_points ?? 0;
  const currentBandIdx = Math.max(0, BANDS.findIndex((b) => b.key === (progress?.current_band ?? "Earth")));
  const nextBand = BANDS[currentBandIdx + 1];
  const pct = nextBand ? Math.min(100, ((total - BANDS[currentBandIdx].min) / (nextBand.min - BANDS[currentBandIdx].min)) * 100) : 100;

  return (
    <div className="min-h-screen bg-background">

      <main className="max-w-5xl mx-auto pt-2 pb-16 px-4">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Achievements</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-1">{fullName?.split(" ")[0] ?? "Your"}'s journey</h1>
          <p className="text-muted-foreground mt-1">Earn points, unlock bands, collect badges.</p>
        </header>

        <section className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider"><Sparkles className="w-4 h-4" /> Points</div>
            <div className="text-4xl font-extrabold mt-2">{total.toLocaleString()}</div>
            {nextBand && <div className="text-xs text-muted-foreground mt-1">{nextBand.min - total} pts to {nextBand.key}</div>}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider"><Flame className="w-4 h-4 text-orange-500" /> Streak</div>
            <div className="text-4xl font-extrabold mt-2">{progress?.streak_days ?? 0}<span className="text-base font-semibold text-muted-foreground"> days</span></div>
            <div className="text-xs text-muted-foreground mt-1">Keep showing up daily.</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider"><Award className="w-4 h-4" /> Badges</div>
            <div className="text-4xl font-extrabold mt-2">{badges.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Earned across all activities.</div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Band progression</h2>
          <div className="flex items-center gap-2 mb-3">
            {BANDS.map((b, i) => (
              <div key={b.key} className={`flex-1 rounded-lg border px-2 py-3 text-center ${i === currentBandIdx ? b.color + " ring-2 ring-primary" : "bg-secondary text-muted-foreground border-border opacity-70"}`}>
                <div className="text-2xl">{b.emoji}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide">{b.key}</div>
              </div>
            ))}
          </div>
          {nextBand && (
            <>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-2">{Math.round(pct)}% to {nextBand.key}</div>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Elemental points</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ELEMENTS.map((e) => {
              const pts = (progress as unknown as Record<string, number>)?.[`element_points_${e.key}`] ?? 0;
              return (
                <div key={e.key} className="rounded-xl border border-border bg-secondary p-4 text-center">
                  <div className="text-3xl">{e.emoji}</div>
                  <div className="text-xs font-bold uppercase tracking-wide mt-1">{e.label}</div>
                  <div className="text-xl font-extrabold mt-0.5">{pts}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Badges</h2>
          {badges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No badges yet. Complete actions on <a href="/readiness" className="text-primary font-semibold">Readiness</a> to earn your first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((b) => (
                <div key={b.id} className="rounded-xl border border-border bg-secondary p-4 text-center">
                  <div className="text-4xl">{b.icon_emoji}</div>
                  <div className="font-bold text-sm mt-2">{b.label}</div>
                  {b.description && <div className="text-xs text-muted-foreground mt-1">{b.description}</div>}
                  <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">{new Date(b.earned_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Achievements;
