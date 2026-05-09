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

const Navigator = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [scores, setScores] = useState<WheelScores>(DEFAULT_WHEEL_SCORES);
  const [verified, setVerified] = useState<Partial<WheelScores>>({});
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [band, setBand] = useState("Earth");
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  // Hydrate existing wheel + progress
  useEffect(() => {
    if (!user) return;
    (async () => {
      setHydrating(true);
      const [{ data: wheel }, { data: progress }] = await Promise.all([
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_progress").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (wheel) {
        setScores({
          academic: wheel.academic_self ?? 5,
          stem: wheel.stem_self ?? 5,
          arts: wheel.arts_self ?? 5,
          sports: wheel.sports_self ?? 5,
          leadership: wheel.leadership_self ?? 5,
          test_readiness: wheel.test_readiness_self ?? 5,
        });
        setVerified({
          academic: wheel.academic_verified ?? undefined,
          stem: wheel.stem_verified ?? undefined,
          arts: wheel.arts_verified ?? undefined,
          sports: wheel.sports_verified ?? undefined,
          leadership: wheel.leadership_verified ?? undefined,
          test_readiness: wheel.test_readiness_verified ?? undefined,
        });
        setCompletedAt(wheel.completed_at);
      }
      if (progress) {
        setPoints(progress.total_points);
        setBand(progress.current_band);
      }
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

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      academic_self: scores.academic,
      stem_self: scores.stem,
      arts_self: scores.arts,
      sports_self: scores.sports,
      leadership_self: scores.leadership,
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

    // Award Earth points (50 first time, 10 update)
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
    const newBand = bandForPoints(newTotal).key;
    await supabase
      .from("student_progress")
      .update({
        total_points: newTotal,
        current_band: newBand,
        element_points_earth: (isFirstTime ? 50 : 10) + (points > 0 ? 0 : 0),
      })
      .eq("user_id", user.id);

    setPoints(newTotal);
    setBand(newBand);
    setCompletedAt(new Date().toISOString());
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

  const currentBand = bandForPoints(points);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/40">
      {/* Top bar */}
      <header className="border-b border-border/50 backdrop-blur bg-background/80 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Back to Searcher
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Compass className="w-4 h-4 text-primary" />
            Scholarship Navigator
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Hero */}
        <section className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-[0.12em] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Earth · Assess
          </div>
          <h1 className="font-display font-extrabold text-foreground text-[32px] md:text-[44px] leading-tight">
            Your Spectrum Wheel
          </h1>
          <p className="max-w-[620px] mx-auto text-muted-foreground mt-3 text-[15px]">
            Rate yourself across 6 dimensions. Your Wheel powers personalised matches
            and your readiness journey through the 5 elements.
          </p>
        </section>

        {/* Band + points pill */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <div
            className="rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-md"
            style={{ background: currentBand.color }}
          >
            {currentBand.label}
          </div>
          <div className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-card border border-border">
            ⚡ {points} Spectrum Points
          </div>
          <div className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-card border border-border">
            🎯 Wheel avg: {average}/10
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Wheel */}
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

          {/* Sliders */}
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
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {completedAt ? "Update Wheel" : "Complete Earth Assessment"}
            </button>
            <p className="text-[11px] text-center text-muted-foreground mt-2">
              {completedAt ? "+10 points per update" : "+50 Spectrum Points on completion"}
            </p>
          </div>
        </div>

        {/* Element journey roadmap */}
        <section className="mt-12">
          <h2 className="font-display font-bold text-2xl text-center mb-6">Your 5-Element Journey</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: "Earth", label: "Assess", desc: "Spectrum Wheel" },
              { key: "Water", label: "Discover", desc: "Matched opportunities" },
              { key: "Fire", label: "Prepare", desc: "Exam packs & mocks" },
              { key: "Air", label: "Enrich", desc: "Extracurriculars" },
              { key: "Aether", label: "Apply", desc: "Applications & prep" },
            ].map((el) => {
              const isCurrent = el.key === band;
              return (
                <div
                  key={el.key}
                  className={`rounded-2xl p-4 border text-center transition ${
                    isCurrent
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border/50 bg-card"
                  }`}
                >
                  <div className="text-xs font-bold tracking-[0.12em] uppercase text-primary">
                    {el.key}
                  </div>
                  <div className="font-display font-bold text-foreground mt-0.5">{el.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{el.desc}</div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Navigator;
