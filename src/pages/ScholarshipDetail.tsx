import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Heart,
  Loader2,
  Lock,
  MapPin,
  Sparkles,
  Trophy,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import {
  calculateMatch,
  type ScholarshipRow,
  type StudentProfile,
} from "@/lib/matching";
import { DEFAULT_WHEEL_SCORES, type WheelScores } from "@/lib/navigator";

const CHECKLIST_DEFAULT = [
  "Read full eligibility criteria",
  "Note application open & close dates",
  "Prepare academic transcript",
  "Draft personal statement",
  "Request reference / recommendation",
  "Register for any required test",
];

const ScholarshipDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, location, yearLevel, interests } = useAuth();
  const { isShortlisted, toggle } = useShortlist();

  const [row, setRow] = useState<any | null>(null);
  const [wheel, setWheel] = useState<WheelScores | null>(null);
  const [band, setBand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState<string>("not_started");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Load checklist from localStorage
  useEffect(() => {
    if (!id) return;
    const raw = localStorage.getItem(`checklist:${id}`);
    if (raw) {
      try {
        setChecklist(JSON.parse(raw));
      } catch {}
    }
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: w }, { data: prog }, { data: app }] = await Promise.all([
        supabase.from("scholarships").select("*").eq("id", id).maybeSingle(),
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_progress").select("current_band").eq("user_id", user.id).maybeSingle(),
        supabase.from("applications").select("status").eq("user_id", user.id).eq("scholarship_id", id).maybeSingle(),
      ]);
      if (cancelled) return;
      setRow(s);
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
      if (app) setAppStatus(app.status);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

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

  const match = useMemo(() => (row ? calculateMatch(student, row as ScholarshipRow) : null), [row, student]);

  const toggleCheck = (item: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      localStorage.setItem(`checklist:${id}`, JSON.stringify(next));
      return next;
    });
  };

  const startApplication = async () => {
    if (!user) return;
    const newStatus = appStatus === "not_started" ? "in_progress" : appStatus;
    const { error } = await supabase
      .from("applications")
      .upsert(
        { user_id: user.id, scholarship_id: id, status: newStatus },
        { onConflict: "user_id,scholarship_id" } as any,
      );
    if (error) {
      // Fallback: insert if upsert constraint missing
      await supabase.from("applications").insert({ user_id: user.id, scholarship_id: id, status: newStatus });
    }
    setAppStatus(newStatus);
    toast.success("Application started — open the source page to apply.");
    if (row?.scholarship_url) window.open(row.scholarship_url, "_blank", "noopener");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">

        <div className="pt-2 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading opportunity…
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="min-h-screen bg-background">

        <div className="pt-2 text-center text-muted-foreground">
          Opportunity not found.{" "}
          <Link to="/scholarships" className="text-primary font-semibold underline">
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const saved = isShortlisted(row.id);
  const value = parseFloat(row.value_num || "0") || 0;

  return (
    <div className="min-h-screen bg-background">

      <main className="pt-2 pb-20 px-4 md:px-8">
        <div className="max-w-[1100px] mx-auto">
          <Link
            to="/scholarships"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> All opportunities
          </Link>

          {/* Hero */}
          <section
            className="relative overflow-hidden rounded-3xl p-7 md:p-9 mb-6 shadow-md"
            style={{ background: "var(--gradient-hero, linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))))" }}
          >
            <div className="relative z-10 text-primary-foreground">
              <div className="text-[11px] uppercase tracking-[0.14em] font-bold opacity-90 mb-2">
                {row.category || "Opportunity"} {row.state ? `· ${row.state}` : ""}
              </div>
              <h1 className="font-display font-extrabold text-2xl md:text-3xl leading-tight">
                {row.program_name || `${row.school_name} Opportunity`}
              </h1>
              <p className="text-white/85 mt-1.5 text-sm">{row.school_name}</p>

              <div className="grid sm:grid-cols-3 gap-4 mt-6 max-w-[640px]">
                <div>
                  <div className="text-[11px] uppercase tracking-wider opacity-80">Value</div>
                  <div className="font-display font-extrabold text-2xl">
                    {value > 0 ? `$${value.toLocaleString()}` : row.value_aud || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider opacity-80">Closes</div>
                  <div className="font-display font-extrabold text-2xl inline-flex items-center gap-1">
                    <CalendarClock className="w-5 h-5" />
                    {row.closing_label || row.application_close_date || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider opacity-80">Year levels</div>
                  <div className="font-display font-extrabold text-2xl">{row.year_levels || "All"}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-6">
                <button
                  onClick={startApplication}
                  className="bg-white text-primary font-bold rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2 hover:opacity-95"
                >
                  <Sparkles className="w-4 h-4" /> Start application
                </button>
                {row.scholarship_url && (
                  <a
                    href={row.scholarship_url}
                    target="_blank"
                    rel="noopener"
                    className="bg-white/20 text-white font-bold rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2 hover:bg-white/30"
                  >
                    Open source <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => {
                    toggle(row.id);
                    toast.success(saved ? "Removed from shortlist" : "Added to shortlist");
                  }}
                  className="bg-white/20 text-white font-bold rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2 hover:bg-white/30"
                >
                  <Heart className={`w-4 h-4 ${saved ? "fill-current" : ""}`} /> {saved ? "Saved" : "Shortlist"}
                </button>
              </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: details */}
            <div className="lg:col-span-2 space-y-6">
              {row.overview && (
                <Section title="Overview">
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{row.overview}</p>
                </Section>
              )}
              {row.description && row.description !== row.overview && (
                <Section title="Description">
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{row.description}</p>
                </Section>
              )}
              {row.eligibility_criteria && (
                <Section title="Eligibility">
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{row.eligibility_criteria}</p>
                </Section>
              )}

              <Section title="Application checklist">
                <ul className="space-y-2">
                  {CHECKLIST_DEFAULT.map((item) => {
                    const done = !!checklist[item];
                    return (
                      <li key={item}>
                        <button
                          onClick={() => toggleCheck(item)}
                          className="w-full flex items-center gap-2.5 text-left text-sm py-1.5 hover:text-primary"
                        >
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={done ? "line-through text-muted-foreground" : "text-foreground"}>{item}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            </div>

            {/* Right: match */}
            <div className="space-y-6">
              {match && (
                <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
                  <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-3">
                    Win probability
                  </div>
                  {match.locked ? (
                    <div className="rounded-xl bg-muted p-4 text-sm flex items-start gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{match.unlockReason}</span>
                    </div>
                  ) : (
                    <>
                      <div className="font-display font-extrabold text-5xl text-foreground">{match.score}%</div>
                      <div
                        className="text-xs font-bold uppercase tracking-wider mt-1"
                        style={{ color: match.tier === "best_fit" ? "hsl(var(--primary))" : "hsl(var(--accent))" }}
                      >
                        <Trophy className="w-3.5 h-3.5 inline mr-1" />
                        {match.tier === "best_fit" ? "Best Fit" : match.tier === "stretch" ? "Stretch" : match.tier === "fast_win" ? "Fast Win" : "Long Shot"}
                      </div>

                      {match.reasons.length > 0 && (
                        <div className="mt-4">
                          <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                            Why it fits
                          </div>
                          <ul className="space-y-1.5 text-sm">
                            {match.reasons.map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm text-sm space-y-2">
                <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-1">
                  Quick facts
                </div>
                <Fact label="School">{row.school_name}</Fact>
                <Fact label="Location">
                  {[row.suburb, row.state, row.postcode].filter(Boolean).join(", ") || "—"}
                </Fact>
                <Fact label="Sector">{row.sector || row.school_sector || "—"}</Fact>
                <Fact label="Gender">{row.gender_eligibility || row.gender || "Any"}</Fact>
                <Fact label="Test">{row.test_provider || "—"}</Fact>
                <Fact label="Status">{appStatus.replace("_", " ")}</Fact>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-sm">
    <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-muted-foreground mb-3">{title}</div>
    {children}
  </div>
);

const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3">
    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="text-sm text-foreground text-right capitalize">{children}</span>
  </div>
);

export default ScholarshipDetail;
