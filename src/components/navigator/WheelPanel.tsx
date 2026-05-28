import { useEffect, useMemo, useState } from "react";
import { Save, CheckCircle2, Loader2 } from "lucide-react";
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
import { saveWheelScoresForUser } from "@/lib/wheelScores";
import { wheelAverageToScore, bandForScore, ELEMENT_JOURNEY, BAND_CUTOFFS } from "@/lib/readiness";

const WheelPanel = () => {
  const { user } = useAuth();
  const [scores, setScores] = useState<WheelScores>(DEFAULT_WHEEL_SCORES);
  const [verified, setVerified] = useState<Partial<WheelScores>>({});
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setHydrating(true);
      const [{ data: wheel }, { data: progress }] = await Promise.all([
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
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
          test_readiness: w.test_readiness_self ?? 5,
        });
        setVerified({
          academic: w.academic_verified ?? undefined,
          stem: w.stem_verified ?? undefined,
          arts_creative: w.arts_creative_verified ?? w.arts_verified ?? undefined,
          sports_fitness: w.sports_verified ?? undefined,
          leadership: w.leadership_verified ?? undefined,
          test_readiness: w.test_readiness_verified ?? undefined,
        });
        setCompletedAt(wheel.completed_at);
      }
      if (progress) setPoints(progress.total_points ?? 0);
      setHydrating(false);
    })();
  }, [user]);

  const average = useMemo(
    () => Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / WHEEL_DIMENSIONS.length) * 10) / 10,
    [scores],
  );
  const readinessScore = useMemo(() => wheelAverageToScore(Object.values(scores)), [scores]);
  const readinessBand = bandForScore(readinessScore);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const savedAt = new Date().toISOString();
    const { error } = await saveWheelScoresForUser(user.id, scores, savedAt);
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
      description: isFirstTime ? "Completed Spectrum Wheel self-assessment" : "Updated Spectrum Wheel scores",
    });
    const newTotal = points + earned;
    const newBandKey = bandForPoints(newTotal).key;
    await supabase.from("student_progress").update({ total_points: newTotal, current_band: newBandKey }).eq("user_id", user.id);
    setPoints(newTotal);
    setCompletedAt(savedAt);
    toast.success(`Wheel saved · +${earned} Spectrum Points`);
    setSaving(false);
  };

  if (hydrating) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <section className="text-center mb-8">
        <h2 className="font-display font-extrabold text-foreground text-[26px] md:text-[32px] leading-tight">
          Your Spectrum Wheel
        </h2>
        <p className="max-w-[640px] mx-auto text-muted-foreground mt-2 text-[14px]">
          Rate yourself across 6 dimensions. Your Wheel powers personalised matches and your readiness journey.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <div className="rounded-2xl px-4 py-2.5 text-sm font-bold text-white shadow-md" style={{ background: readinessBand.color }}>
          {readinessScore} / 100 — {readinessBand.label} {readinessBand.emoji}
        </div>
        <div className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-card border border-border">⚡ {points} Spectrum Points</div>
        <div className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-card border border-border">🎯 Wheel avg: {average}/10</div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-1">Your Wheel</h3>
          <p className="text-xs text-muted-foreground mb-4">Solid = self-rated · Dashed = verified</p>
          <SpectrumWheel selfScores={scores} verifiedScores={verified} />
          {completedAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              Last saved {new Date(completedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-sm">
          <h3 className="font-display font-bold text-lg mb-4">Self-assessment</h3>
          <div className="space-y-5">
            {WHEEL_DIMENSIONS.map((d) => (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="text-base">{d.emoji}</span> {d.label}
                  </label>
                  <span className="text-sm font-bold tabular-nums px-2 py-0.5 rounded-md" style={{ background: `${d.color}22`, color: d.color }}>
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
            className="mt-6 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {completedAt ? "Update Wheel" : "Complete Earth Assessment"}
          </button>
        </div>
      </div>

      <section className="mt-10">
        <h3 className="font-display font-bold text-xl text-center mb-5">Your 5-Element Journey</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ELEMENT_JOURNEY.map((el) => {
            const isCurrent = el.key === readinessBand.key;
            const band = BAND_CUTOFFS[el.key as keyof typeof BAND_CUTOFFS];
            return (
              <div
                key={el.key}
                className="relative rounded-2xl p-4 border text-center shadow-sm overflow-hidden"
                style={
                  isCurrent
                    ? { background: band.color, color: "white", borderColor: band.color }
                    : { background: "hsl(var(--card))", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
                }
              >
                {isCurrent && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.1em]" style={{ background: "rgba(0,0,0,0.25)", color: "white" }}>
                    You are here
                  </div>
                )}
                <div className={`text-xs font-bold tracking-[0.12em] uppercase ${isCurrent ? "text-white/90" : "text-primary"}`}>
                  {band.emoji} {el.label}
                </div>
                <div className={`font-display font-bold mt-0.5 ${isCurrent ? "text-white" : "text-foreground"}`}>{el.action}</div>
                <div className={`text-[11px] mt-1 ${isCurrent ? "text-white/85" : "text-muted-foreground"}`}>{el.desc}</div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default WheelPanel;
