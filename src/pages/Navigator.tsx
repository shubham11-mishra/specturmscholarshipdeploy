import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, Sparkles, Save, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import SpectrumWheel from "@/components/navigator/SpectrumWheel";
import {
  WHEEL_DIMENSIONS,
  DEFAULT_WHEEL_SCORES,
  bandForPoints,
  type WheelScores,
} from "@/lib/navigator";
import { wheelAverageToScore, bandForScore, ELEMENT_JOURNEY } from "@/lib/readiness";

const Navigator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [scores, setScores] = useState<WheelScores>(DEFAULT_WHEEL_SCORES);
  const [verified, setVerified] = useState<Partial<WheelScores>>({});
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [needsNewDims, setNeedsNewDims] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setHydrating(true);
      const [{ data: wheel }, { data: progress }] = await Promise.all([
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_progress").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (wheel) {
        const w = wheel as unknown as Record<string, number | null>;
        setScores({
          academic: w.academic_self ?? 5,
          stem: w.stem_self ?? 5,
          arts_creative: w.arts_creative_self ?? w.arts_self ?? 5,
          sports_fitness: w.sports_self ?? 5,
          leadership: w.leadership_self ?? 5,
          service_community: w.service_community_self ?? 5,
          interview: w.interview_self ?? 5,
          test_readiness: w.test_readiness_self ?? 5,
        });
        setVerified({
          academic: w.academic_verified ?? undefined,
          stem: w.stem_verified ?? undefined,
          arts_creative: w.arts_creative_verified ?? w.arts_verified ?? undefined,
          sports_fitness: w.sports_verified ?? undefined,
          leadership: w.leadership_verified ?? undefined,
          service_community: w.service_community_verified ?? undefined,
          interview: w.interview_verified ?? undefined,
          test_readiness: w.test_readiness_verified ?? undefined,
        });
        setCompletedAt(wheel.completed_at);
        setNeedsNewDims(
          w.completed_at != null &&
            (w.service_community_self == null || w.interview_self == null),
        );
      }
      if (progress) setPoints(progress.total_points ?? 0);
      setHydrating(false);
    })();
  }, [user]);

  const average = useMemo(
    () =>
      Math.round(
        (Object.values(scores).reduce((a, b) => a + b, 0) / WHEEL_DIMENSIONS.length) * 10,
      ) / 10,
    [scores],
  );

  const readinessScore = useMemo(
    () => wheelAverageToScore(Object.values(scores)),
    [scores],
  );
  const readinessBand = bandForScore(readinessScore);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      academic_self: scores.academic,
      stem_self: scores.stem,
      arts_self: scores.arts_creative, // legacy mirror
      arts_creative_self: scores.arts_creative,
      sports_self: scores.sports_fitness,
      leadership_self: scores.leadership,
      service_community_self: scores.service_community,
      interview_self: scores.interview,
      test_readiness_self: scores.test_readiness,
      completed_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("wheel_scores")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      toast.error("Couldn't save your Wheel. Please try again.");
      setSaving(false);
      return;
    }

    const isFirstTime = !completedAt;
    const earned = isFirstTime ? 50 : 10;

    await supabase.from("student_activities").insert({
      user_id: user.id,
      activity_type: isFirstTime ? "wheel_completed" : "wheel_updated",
      element_stage: "Earth",
      points_earned: earned,
      description: isFirstTime
        ? "Completed Spectrum Wheel self-assessment"
        : "Updated Spectrum Wheel scores",
    });

    const newTotal = points + earned;
    const newBandKey = bandForPoints(newTotal).key;
    await supabase
      .from("student_progress")
      .update({ total_points: newTotal, current_band: newBandKey })
      .eq("user_id", user.id);

    setPoints(newTotal);
    setCompletedAt(new Date().toISOString());
    setNeedsNewDims(false);
    toast.success(`Wheel saved · +${earned} Spectrum Points`);
    setSaving(false);
  };

  if (loading || hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/40">
      <header className="border-b border-border/50 backdrop-blur bg-background/80 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Back to Spectrum Navigator
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Compass className="w-4 h-4 text-primary" />
            My Wheel
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-[0.12em] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Earth · Assess
          </div>
          <h1 className="font-display font-extrabold text-foreground text-[32px] md:text-[44px] leading-tight">
            Your Spectrum Wheel
          </h1>
          <p className="max-w-[640px] mx-auto text-muted-foreground mt-3 text-[15px]">
            Rate yourself across 8 dimensions. Your Wheel powers personalised matches
            and your readiness journey through the 5 elements.
          </p>
        </section>

        {needsNewDims && (
          <div className="max-w-[820px] mx-auto mb-6 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <strong>We've added 2 new dimensions to your Wheel</strong> — please rate
            <em> Service & Community</em> and <em>Interview Readiness</em> when you have a moment.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <div
            className="rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-md"
            style={{ background: readinessBand.color }}
          >
            {readinessScore} / 100 — {readinessBand.label} {readinessBand.emoji}
          </div>
          <div className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-card border border-border">
            ⚡ {points} Spectrum Points
          </div>
          <div className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-card border border-border">
            🎯 Wheel avg: {average}/10
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="rounded-3xl bg-card border border-border/60 p-6 md:p-8 shadow-sm">
            <h2 className="font-display font-bold text-xl mb-1">Your Wheel</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Solid = self-rated · Dashed = verified (from mock exams etc.)
            </p>
            <SpectrumWheel selfScores={scores} verifiedScores={verified} />
            {completedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                Last saved {new Date(completedAt).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-card border border-border/60 p-6 md:p-8 shadow-sm">
            <h2 className="font-display font-bold text-xl mb-5">Self-assessment</h2>
            <div className="space-y-6">
              {WHEEL_DIMENSIONS.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="text-base">{d.emoji}</span> {d.label}
                    </label>
                    <span
                      className="text-sm font-bold tabular-nums px-2 py-0.5 rounded-md"
                      style={{ background: `${d.color}22`, color: d.color }}
                    >
                      {scores[d.key]}/10
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{d.prompt}</p>
                  <Slider
                    value={[scores[d.key]]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(v) => setScores((s) => ({ ...s, [d.key]: v[0] }))}
                  />
                  <p className="text-[11px] text-muted-foreground/80 mt-1.5">{d.scaleHint}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-7 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {completedAt ? "Update Wheel" : "Complete Earth Assessment"}
            </button>
            <p className="text-[11px] text-center text-muted-foreground mt-2">
              {completedAt ? "+10 points per update" : "+50 Spectrum Points on completion"}
            </p>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="font-display font-bold text-2xl text-center mb-6">Your 5-Element Journey</h2>
          <ElementJourneyStrip currentBandKey={readinessBand.key} />
        </section>
      </main>
    </div>
  );
};

export const ElementJourneyStrip = ({ currentBandKey }: { currentBandKey: string }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
    {ELEMENT_JOURNEY.map((el) => {
      const isCurrent = el.key === currentBandKey;
      const band = (require("@/lib/readiness").BAND_CUTOFFS as any)[el.key];
      return (
        <div
          key={el.key}
          className="relative rounded-2xl p-4 border text-center transition shadow-sm overflow-hidden"
          style={
            isCurrent
              ? { background: band.color, color: "white", borderColor: band.color }
              : { background: "hsl(var(--card))", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
          }
        >
          {isCurrent && (
            <div
              className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.1em]"
              style={{ background: "rgba(0,0,0,0.25)", color: "white" }}
            >
              You are here
            </div>
          )}
          <div className={`text-xs font-bold tracking-[0.12em] uppercase ${isCurrent ? "text-white/90" : "text-primary"}`}>
            {band.emoji} {el.label}
          </div>
          <div className={`font-display font-bold mt-0.5 ${isCurrent ? "text-white" : "text-foreground"}`}>
            {el.action}
          </div>
          <div className={`text-[11px] mt-1 ${isCurrent ? "text-white/85" : "text-muted-foreground"}`}>
            {el.desc}
          </div>
        </div>
      );
    })}
  </div>
);

export default Navigator;
