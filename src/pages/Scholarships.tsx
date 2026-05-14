import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Loader2, Search, ExternalLink, Lock, Sparkles, MapPin, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import {
  calculateMatch,
  type MatchResult,
  type ScholarshipRow,
  type StudentProfile,
} from "@/lib/matching";
import { DEFAULT_WHEEL_SCORES, type WheelScores } from "@/lib/navigator";

type Sort = "match" | "deadline" | "value" | "az";
type TierFilter = "all" | "best_fit" | "stretch" | "fast_win";

const PAGE_SIZE = 25;

const Scholarships = () => {
  const { user, loading: authLoading, location, yearLevel, interests } = useAuth();
  const { isShortlisted, toggle, count: shortlistCount } = useShortlist();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ScholarshipRow[]>([]);
  const [wheel, setWheel] = useState<WheelScores | null>(null);
  const [band, setBand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [tier, setTier] = useState<TierFilter>("all");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showLocked, setShowLocked] = useState(true);
  const [sort, setSort] = useState<Sort>("match");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setStateFilter(location.state || "");
  }, [user, location.state]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: scholarships }, { data: w }, { data: prog }] = await Promise.all([
        supabase
          .from("scholarships")
          .select(
            "id, school_name, state, category, year_levels, gender_eligibility, value_num, application_close_date, days_left, scholarship_url, scholarship_confidence",
          )
          .limit(2000),
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_progress").select("current_band").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setRows((scholarships as ScholarshipRow[]) || []);
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
      } else {
        setWheel(DEFAULT_WHEEL_SCORES);
      }
      setBand(prog?.current_band ?? "Earth");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const student: StudentProfile = useMemo(
    () => ({
      state: location.state,
      postcode: location.postcode,
      year_level: yearLevel,
      target_year: null,
      scholarship_categories: interests,
      wheel,
      band,
    }),
    [location, yearLevel, interests, wheel, band],
  );

  const matched = useMemo(() => {
    const out: Array<{ row: ScholarshipRow; match: MatchResult }> = [];
    rows.forEach((r) => {
      const m = calculateMatch(student, r);
      out.push({ row: r, match: m });
    });
    return out;
  }, [rows, student]);

  const stats = useMemo(() => {
    let bestFit = 0,
      stretch = 0,
      fastWin = 0;
    matched.forEach(({ match }) => {
      if (match.tier === "best_fit") bestFit += 1;
      else if (match.tier === "stretch") stretch += 1;
      else if (match.tier === "fast_win") fastWin += 1;
    });
    return { bestFit, stretch, fastWin };
  }, [matched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = matched.filter(({ row, match }) => {
      if (!showLocked && match.locked) return false;
      if (tier !== "all" && match.tier !== tier) return false;
      if (stateFilter && row.state && row.state.toUpperCase() !== stateFilter.toUpperCase()) return false;
      if (q) {
        const blob = `${row.school_name} ${row.category ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      if (sort === "match") return b.match.score - a.match.score;
      if (sort === "deadline") {
        const ad = a.match.daysLeft ?? 9999;
        const bd = b.match.daysLeft ?? 9999;
        return ad - bd;
      }
      if (sort === "value") {
        const av = parseFloat(a.row.value_num || "0") || 0;
        const bv = parseFloat(b.row.value_num || "0") || 0;
        return bv - av;
      }
      return a.row.school_name.localeCompare(b.row.school_name);
    });
    return out;
  }, [matched, tier, stateFilter, search, showLocked, sort]);

  useEffect(() => {
    setPage(1);
  }, [tier, stateFilter, search, showLocked, sort]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Finding your scholarships…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-primary mb-2">
              Find Scholarships
            </div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-foreground">
              Your personalised matches
            </h1>
            <p className="text-muted-foreground text-sm mt-1.5">
              Ranked by your Spectrum Wheel, location, and goals.
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <StatCard
              label="Best Fit"
              value={stats.bestFit}
              hint="Score 75+"
              color="hsl(var(--primary))"
              onClick={() => setTier("best_fit")}
              active={tier === "best_fit"}
            />
            <StatCard
              label="Stretch"
              value={stats.stretch}
              hint="Score 50–74"
              color="hsl(var(--accent))"
              onClick={() => setTier("stretch")}
              active={tier === "stretch"}
            />
            <StatCard
              label="Fast Win"
              value={stats.fastWin}
              hint="Closing in 30 days"
              color="hsl(15, 80%, 55%)"
              onClick={() => setTier("fast_win")}
              active={tier === "fast_win"}
            />
          </div>

          {/* Filter row */}
          <div className="sticky top-20 z-30 -mx-2 px-2 mb-5">
            <div className="rounded-2xl bg-card/95 backdrop-blur border border-border/60 p-3 shadow-sm flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {(["all", "best_fit", "stretch", "fast_win"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition border ${
                      tier === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t === "all" ? "All" : t === "best_fit" ? "Best Fit" : t === "stretch" ? "Stretch" : "Fast Win"}
                  </button>
                ))}
              </div>

              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="">All states</option>
                {["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
                <input
                  type="checkbox"
                  checked={showLocked}
                  onChange={(e) => setShowLocked(e.target.checked)}
                />
                Show locked
              </label>

              <div className="relative ml-auto flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search school or category"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground outline-none focus:border-primary/60"
                />
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
              >
                <option value="match">Sort: Match %</option>
                <option value="deadline">Sort: Deadline</option>
                <option value="value">Sort: Value</option>
                <option value="az">Sort: A–Z</option>
              </select>
            </div>
          </div>

          {/* Results */}
          <div className="text-xs text-muted-foreground mb-3">
            Showing {visible.length} of {filtered.length} · {shortlistCount} shortlisted
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No scholarships match your filters. Try widening them.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visible.map(({ row, match }) => (
                <ScholarshipMatchCard
                  key={row.id}
                  row={row}
                  match={match}
                  shortlisted={isShortlisted(row.id)}
                  onToggle={() => {
                    toggle(row.id);
                    toast.success(isShortlisted(row.id) ? "Removed from shortlist" : "Added to shortlist");
                  }}
                />
              ))}
            </div>
          )}

          {visible.length < filtered.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary"
              >
                Load more ({filtered.length - visible.length} remaining)
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  hint,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  hint: string;
  color: string;
  onClick: () => void;
  active: boolean;
}) => (
  <button
    onClick={onClick}
    className={`text-left rounded-2xl bg-card border p-4 transition shadow-sm hover:shadow-md ${
      active ? "border-primary" : "border-border/60"
    }`}
  >
    <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
      {label}
    </div>
    <div className="font-display font-extrabold text-3xl mt-1" style={{ color }}>
      {value}
    </div>
    <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
  </button>
);

const tierColor = (t: MatchResult["tier"]): string => {
  if (t === "best_fit") return "hsl(var(--primary))";
  if (t === "stretch") return "hsl(var(--accent))";
  if (t === "fast_win") return "hsl(15, 80%, 55%)";
  return "hsl(var(--muted-foreground))";
};
const tierLabel = (t: MatchResult["tier"]) =>
  t === "best_fit" ? "Best Fit" : t === "stretch" ? "Stretch" : t === "fast_win" ? "Fast Win" : "Long Shot";

const ScholarshipMatchCard = ({
  row,
  match,
  shortlisted,
  onToggle,
}: {
  row: ScholarshipRow;
  match: MatchResult;
  shortlisted: boolean;
  onToggle: () => void;
}) => {
  const color = tierColor(match.tier);
  return (
    <Link
      to={`/scholarships/${row.id}`}
      className="group rounded-2xl bg-card border border-border/60 p-4 hover:border-primary/40 hover:shadow-md transition flex flex-col"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground truncate">
            {row.category || "Scholarship"}
          </div>
          <div className="font-display font-bold text-foreground text-[15px] leading-tight mt-0.5 line-clamp-2">
            {row.school_name}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggle();
          }}
          aria-label="Shortlist"
          className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition ${
            shortlisted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${shortlisted ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{ background: `${color}1A`, color }}
        >
          {tierLabel(match.tier)}
        </span>
        {match.locked && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground inline-flex items-center gap-1">
            <Lock className="w-3 h-3" /> Locked
          </span>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mb-2">
        {row.state && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {row.state}
          </span>
        )}
        {match.daysLeft !== null && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {match.daysLeft >= 0 ? `${match.daysLeft}d left` : "Closed"}
          </span>
        )}
        {row.value_num && parseFloat(row.value_num) > 0 && (
          <span className="font-semibold text-foreground">${parseFloat(row.value_num).toLocaleString()}</span>
        )}
      </div>

      {match.locked ? (
        <div className="text-[11px] text-muted-foreground mt-auto">{match.unlockReason}</div>
      ) : (
        <div className="mt-auto">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Match</span>
            <span className="font-bold text-foreground tabular-nums">{match.score}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${match.score}%`, background: color }}
            />
          </div>
        </div>
      )}
    </Link>
  );
};

export default Scholarships;
