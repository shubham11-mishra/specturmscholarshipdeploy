import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2, Loader2, Sparkles, Compass, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import WheelPanel from "@/components/navigator/WheelPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_WHEEL_SCORES, type WheelScores, WHEEL_DIMENSIONS } from "@/lib/navigator";
import { wheelAverageToScore, bandForScore, BAND_CUTOFFS, type BandKey } from "@/lib/readiness";
import { detectPathways, PATHWAY_THEME, type PathwayKey } from "@/lib/pathway";
import { rankTopActions, renderWhy, type GapRec, type RankedRec } from "@/lib/gapRanking";

const BAND_COPY: Record<BandKey, { label: string; emoji: string; desc: string }> = {
  earth:  { label: "EARTH",  emoji: "🌱", desc: "Starting your journey" },
  water:  { label: "WATER",  emoji: "💧", desc: "Building your profile" },
  fire:   { label: "FIRE",   emoji: "🔥", desc: "Becoming competitive" },
  air:    { label: "AIR",    emoji: "🌬️", desc: "Strong candidate" },
  aether: { label: "AETHER", emoji: "✨", desc: "Optimised and ready" },
};
const BAND_ORDER: BandKey[] = ["earth", "water", "fire", "air", "aether"];

const Readiness = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wheel, setWheel] = useState<WheelScores>(DEFAULT_WHEEL_SCORES);
  const [verifiedDims, setVerifiedDims] = useState<Set<string>>(new Set());
  const [recs, setRecs] = useState<GapRec[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/sign-in");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: w }, { data: r }, { data: d }] = await Promise.all([
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
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
        const verified = new Set<string>();
        if (x.academic_verified) verified.add("academic");
        if (x.stem_verified) verified.add("stem");
        if (x.arts_creative_verified ?? x.arts_verified) verified.add("arts_creative");
        if (x.sports_verified) verified.add("sports_fitness");
        if (x.leadership_verified) verified.add("leadership");
        if (x.test_readiness_verified) verified.add("test_readiness");
        setVerifiedDims(verified);
      }
      setRecs((r as unknown as GapRec[]) ?? []);
      setDone(new Set((d ?? []).map((row: { recommendation_id: string }) => row.recommendation_id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const overall = useMemo(
    () => wheelAverageToScore(WHEEL_DIMENSIONS.map((d) => wheel[d.key] ?? 5)),
    [wheel]
  );
  const band = bandForScore(overall);
  const { primary, secondary } = useMemo(() => detectPathways(wheel), [wheel]);

  const topActions = useMemo(
    () => rankTopActions(recs, wheel, verifiedDims, primary, secondary, showCompleted ? new Set() : done, 3),
    [recs, wheel, verifiedDims, primary, secondary, done, showCompleted]
  );

  // Progression: actions away from next band
  const bandIdx = BAND_ORDER.indexOf(band.key);
  const nextBandKey = BAND_ORDER[bandIdx + 1] ?? null;
  const nextBand = nextBandKey ? BAND_CUTOFFS[nextBandKey] : null;
  const progressPct = nextBand
    ? Math.max(2, Math.min(100, ((overall - band.min) / (band.max - band.min + 1)) * 100))
    : 100;
  // crude: ~2 actions per 5 points up to next band threshold
  const actionsAway = nextBand ? Math.max(1, Math.ceil((nextBand.min - overall) / 5)) : 0;

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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
    toast.success(`Nice — that was a ${rec.effort_level}-effort win.`);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading readiness…
      </div>
    );
  }

  const tab = searchParams.get("tab") === "gap" ? "gap" : "my-wheel";
  const primaryTheme = PATHWAY_THEME[primary];
  const secondaryTheme = secondary ? PATHWAY_THEME[secondary] : null;
  const bandCopy = BAND_COPY[band.key];

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
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display font-bold text-xl">Scholarship Searcher — Gap Analysis</h2>
              <p className="text-sm text-muted-foreground">Your top 3 actions, picked for your pathway.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCompleted((v) => !v)} className="text-xs text-muted-foreground hover:text-foreground">
                {showCompleted ? "Hide completed" : "Show completed"}
              </button>
              <Link to="/copilot" className="text-sm text-primary font-bold hover:underline">Ask Copilot about gaps →</Link>
            </div>
          </div>

          {/* Section 1 — Pathway badge */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold shadow-sm"
              style={{ background: primaryTheme.color, color: primaryTheme.textOn }}
            >
              <Compass className="w-4 h-4" /> {primaryTheme.label} pathway
            </span>
            {secondaryTheme && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: secondaryTheme.color, color: secondaryTheme.textOn, opacity: 0.9 }}
              >
                + {secondaryTheme.label}
              </span>
            )}
          </div>

          {/* Section 2 — Readiness band */}
          <div
            className="rounded-2xl border px-4 py-3 mb-4 flex items-center gap-3"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.4)" }}
          >
            <span className="text-2xl" aria-hidden>{bandCopy.emoji}</span>
            <div className="text-sm">
              <span className="font-display font-bold tracking-wide">{bandCopy.label}</span>
              <span className="text-muted-foreground"> — {bandCopy.desc}</span>
            </div>
            <span className="ml-auto text-xs text-muted-foreground">{overall}/100</span>
          </div>

          {/* Section 3 — Progression */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>
                {nextBand
                  ? <>You are <span className="font-bold text-foreground">{actionsAway} action{actionsAway === 1 ? "" : "s"}</span> away from <span className="font-bold text-foreground">{BAND_COPY[nextBandKey!].emoji} {BAND_COPY[nextBandKey!].label}</span></>
                  : <>You've reached the top band — keep verifying.</>}
              </span>
              <span>{overall} / {nextBand ? nextBand.min : 100} XP</span>
            </div>
            <div className="relative h-2.5 rounded-full overflow-hidden bg-muted">
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${progressPct}%`, background: "var(--gradient-rainbow)" }}
              />
            </div>
          </div>

          {/* Rainbow divider */}
          <div className="h-[3px] w-full rounded-full mb-5" style={{ background: "var(--gradient-rainbow)" }} />

          {/* Top 3 cards */}
          {topActions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />
              You've cleared the high-impact gaps for your pathway — keep going!
            </div>
          ) : (
            <ul className="space-y-3">
              {topActions.map((rec) => (
                <GapCard
                  key={rec.id}
                  rec={rec}
                  expanded={expanded.has(rec.id)}
                  onToggle={() => toggleExpand(rec.id)}
                  onMarkDone={() => markDone(rec)}
                  completed={done.has(rec.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </TabsContent>
    </Tabs>
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

const GapCard = ({
  rec, expanded, onToggle, onMarkDone, completed,
}: {
  rec: RankedRec;
  expanded: boolean;
  onToggle: () => void;
  onMarkDone: () => void;
  completed: boolean;
}) => {
  const theme = PATHWAY_THEME[rec.pathwayKey];
  const why = renderWhy(rec.why_template, rec.pathwayKey, theme.label);
  const isSpectrum = rec.category === "spectrum_product";
  const ctaUrl = isSpectrum ? rec.spectrum_product_url : rec.external_resource_url;

  return (
    <li
      className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition hover:shadow-md"
      style={{ borderLeft: `4px solid ${theme.color}` }}
    >
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-4 text-left">
        <div className="text-2xl mt-0.5" aria-hidden>{rec.icon_emoji ?? theme.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground text-[16px] leading-snug">{rec.title}</div>
          {why && (
            <div className="text-sm text-muted-foreground mt-1 leading-snug">{why}</div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(rec.estimated_unlocks ?? 0) > 0 && (
              <Pill bg="hsl(var(--spec-green-light))" fg="hsl(var(--spec-green))">
                +{rec.estimated_unlocks} scholarships
              </Pill>
            )}
            <Pill bg="hsl(var(--muted))" fg="hsl(var(--muted-foreground))">
              Effort: {rec.effort_level}
            </Pill>
            {(rec.xp_reward ?? 0) > 0 && (
              <Pill bg="hsl(var(--spec-blue-light))" fg="hsl(var(--spec-blue))">
                +{rec.xp_reward} XP
              </Pill>
            )}
            {rec.badge_name && (
              <Pill bg="hsl(var(--gold-light))" fg="hsl(var(--gold))">
                Earns: {rec.badge_name}
              </Pill>
            )}
            {completed && <Pill bg="hsl(var(--spec-green))" fg="white">✓ done</Pill>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />}
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 pl-[60px]"
          style={{ background: `linear-gradient(180deg, ${theme.color}0d, transparent)` }}
        >
          {rec.description && <p className="text-sm text-foreground/85 leading-relaxed">{rec.description}</p>}

          <div className="flex flex-wrap items-center gap-2 mt-3">
            {ctaUrl ? (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener"
                className="btn-frosted text-sm"
                style={{ background: theme.color, color: "white" }}
              >
                Start <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={onMarkDone}
                className="btn-frosted text-sm"
                style={{ background: theme.color, color: "white" }}
              >
                Start <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {isSpectrum && rec.spectrum_product_name && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {rec.spectrum_product_name}
              </span>
            )}

            {!completed && (
              <button
                onClick={onMarkDone}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as done
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

export default Readiness;
