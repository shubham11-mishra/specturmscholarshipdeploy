import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ElementJourney from "@/components/ElementJourney";
import WheelPanel from "@/components/navigator/WheelPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WHEEL_DIMENSIONS, DEFAULT_WHEEL_SCORES, type WheelScores, type WheelDimensionKey } from "@/lib/navigator";
import { wheelAverageToScore, bandForScore } from "@/lib/readiness";
import { getDiagnosticNote, scoreColor, interleave70_30, BAND_GUIDANCE } from "@/lib/diagnostics";

type GapRec = {
  id: string;
  dimension: WheelDimensionKey;
  trigger_score_max: number;
  title: string;
  description: string | null;
  effort_level: "low" | "medium" | "high";
  priority: "low" | "medium" | "high";
  estimated_unlocks: number | null;
  category: "external" | "spectrum_product" | null;
  spectrum_product_name: string | null;
  spectrum_product_url: string | null;
  external_resource_name: string | null;
  external_resource_url: string | null;
  icon_emoji: string | null;
  band_relevance: string[] | null;
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;
const EFFORT_ORDER = { low: 0, medium: 1, high: 2 } as const;

const Readiness = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wheel, setWheel] = useState<WheelScores>(DEFAULT_WHEEL_SCORES);
  const [recs, setRecs] = useState<GapRec[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: w }, { data: r }, { data: d }] = await Promise.all([
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("gap_recommendations").select("*").eq("is_active", true),
        supabase.from("gap_actions_completed").select("recommendation_id").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      if (w) {
        const x = w as unknown as Record<string, number | null>;
        setWheel({
          academic: x.academic_self ?? 5,
          stem: x.stem_self ?? 5,
          arts_creative: x.arts_creative_self ?? x.arts_self ?? 5,
          sports_fitness: x.sports_self ?? 5,
          leadership: x.leadership_self ?? 5,
          test_readiness: x.test_readiness_self ?? 5,
        });
      }
      setRecs((r as GapRec[]) ?? []);
      setDone(new Set((d ?? []).map((row: any) => row.recommendation_id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Per-dimension 0-100 scores
  const dimScores = useMemo(() => {
    const out: Record<WheelDimensionKey, number> = {} as any;
    for (const d of WHEEL_DIMENSIONS) out[d.key] = (wheel[d.key] ?? 5) * 10;
    return out;
  }, [wheel]);

  const overall = useMemo(() => wheelAverageToScore(WHEEL_DIMENSIONS.map((d) => wheel[d.key] ?? 5)), [wheel]);
  const band = bandForScore(overall);

  const gapList = useMemo(() => {
    const matches = recs.filter((r) => {
      if (!showCompleted && done.has(r.id)) return false;
      const score10 = wheel[r.dimension] ?? 5;
      if (score10 > r.trigger_score_max) return false;
      if (r.band_relevance && r.band_relevance.length && !r.band_relevance.includes(band.key)) return false;
      return true;
    });
    matches.sort((a, b) => {
      const p = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (p) return p;
      const u = (b.estimated_unlocks ?? 0) - (a.estimated_unlocks ?? 0);
      if (u) return u;
      return EFFORT_ORDER[a.effort_level] - EFFORT_ORDER[b.effort_level];
    });
    return interleave70_30(matches).slice(0, 8);
  }, [recs, wheel, band.key, done, showCompleted]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const markDone = async (rec: GapRec) => {
    if (!user) return;
    const { error } = await supabase
      .from("gap_actions_completed")
      .insert({ user_id: user.id, recommendation_id: rec.id });
    if (error && !error.message.includes("duplicate")) {
      toast.error("Couldn't save — try again");
      return;
    }
    setDone((prev) => new Set(prev).add(rec.id));
    toast.success(`Nice — that was a ${rec.effort_level}-effort win. Update your Wheel to reflect this.`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading readiness…
      </div>
    );
  }

  const guidance = BAND_GUIDANCE[band.key];
  const verifiedCount = 0;
  const confidence = verifiedCount >= 6 ? "High" : verifiedCount >= 3 ? "Medium" : "Self-rated";

  const tab = searchParams.get("tab") === "gap" ? "gap" : "my-wheel";

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setSearchParams(v === "my-wheel" ? {} : { tab: v }, { replace: true })}
      className="space-y-6"
    >
      <TabsList className="bg-card border border-border h-auto p-1">
        <TabsTrigger value="my-wheel" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">🎯 My Wheel</TabsTrigger>
        <TabsTrigger value="gap" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">💡 Gap Analysis</TabsTrigger>
      </TabsList>


      <TabsContent value="my-wheel" className="mt-0">
        <WheelPanel />
      </TabsContent>

      <TabsContent value="gap" className="mt-0">
        <section className="rounded-3xl bg-card border border-border/60 p-5 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display font-bold text-xl">Gap Analysis</h2>
              <p className="text-sm text-muted-foreground">Actions ranked by impact — how to unlock more scholarships.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCompleted((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
                {showCompleted ? "Hide completed" : "Show completed"}
              </button>
              <Link to="/copilot" className="text-sm text-primary font-bold hover:underline">Ask Copilot about gaps →</Link>
            </div>
          </div>

          {gapList.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />
              You've cleared the high-impact gaps for your current band — keep going!
            </div>
          ) : (
            <ul className="space-y-3">
              {gapList.map((rec) => (
                <GapCard key={rec.id} rec={rec} expanded={expanded.has(rec.id)} onToggle={() => toggleExpand(rec.id)} onMarkDone={() => markDone(rec)} completed={done.has(rec.id)} />
              ))}
            </ul>
          )}
        </section>
      </TabsContent>
    </Tabs>
  );
};

const RingGauge = ({ value, label, emoji }: { value: number; label: string; emoji: string }) => {
  const c = scoreColor(value);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-[68px] h-[68px]">
        <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
          <circle cx="35" cy="35" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
          <circle
            cx="35" cy="35" r={r}
            stroke={c} strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-sm">
          {value}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5 leading-tight">{emoji} {label}</div>
    </div>
  );
};

const PRIORITY_BORDER = {
  high: "hsl(var(--spec-red))",
  medium: "hsl(var(--spec-orange))",
  low: "hsl(var(--accent))",
} as const;

const GapCard = ({
  rec, expanded, onToggle, onMarkDone, completed,
}: {
  rec: GapRec;
  expanded: boolean;
  onToggle: () => void;
  onMarkDone: () => void;
  completed: boolean;
}) => {
  const isSpectrum = rec.category === "spectrum_product";
  return (
    <li
      className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition hover:shadow-md"
      style={{ borderLeft: `4px solid ${PRIORITY_BORDER[rec.priority]}` }}
    >
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-4 text-left">
        <div className="text-2xl">{rec.icon_emoji ?? "💡"}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground">{rec.title}</div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(rec.estimated_unlocks ?? 0) > 0 && (
              <Pill bg="hsl(var(--spec-green-light))" fg="hsl(var(--spec-green))">
                +{rec.estimated_unlocks} scholarships
              </Pill>
            )}
            <Pill bg="hsl(var(--muted))" fg="hsl(var(--muted-foreground))">
              Effort: {rec.effort_level}
            </Pill>
            <Pill
              bg={`color-mix(in hsl, ${PRIORITY_BORDER[rec.priority]} 14%, white)`}
              fg={PRIORITY_BORDER[rec.priority]}
            >
              ● {rec.priority} priority
            </Pill>
            {completed && (
              <Pill bg="hsl(var(--accent))" fg="white">✓ done</Pill>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-[60px]">
          {rec.description && <p className="text-sm text-foreground/85 leading-relaxed">{rec.description}</p>}

          {isSpectrum ? (
            <div
              className="mt-3 rounded-xl p-3 border"
              style={{ background: "hsl(var(--gold-light))", borderColor: "hsl(var(--gold))" }}
            >
              <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Spectrum Tuition recommends
              </div>
              <div className="font-bold text-foreground mt-0.5">{rec.spectrum_product_name}</div>
              {rec.spectrum_product_url && (
                <a
                  href={rec.spectrum_product_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 mt-2 bg-primary text-primary-foreground font-bold rounded-lg px-3 py-1.5 text-xs hover:opacity-95"
                >
                  Learn more <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            rec.external_resource_name && (
              <div className="mt-3 text-sm">
                <span className="text-muted-foreground">Suggested resource: </span>
                <span className="font-semibold text-foreground">{rec.external_resource_name}</span>
                {rec.external_resource_url && (
                  <a
                    href={rec.external_resource_url}
                    target="_blank"
                    rel="noopener"
                    className="ml-2 inline-flex items-center gap-1 text-primary font-bold hover:underline"
                  >
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )
          )}

          {!completed && (
            <button
              onClick={onMarkDone}
              className="mt-3 inline-flex items-center gap-1.5 bg-foreground text-background font-bold rounded-lg px-3 py-1.5 text-xs hover:opacity-90"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark as done
            </button>
          )}
        </div>
      )}
    </li>
  );
};

const Pill = ({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) => (
  <span
    className="inline-flex items-center text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
    style={{ background: bg, color: fg }}
  >
    {children}
  </span>
);

export default Readiness;
