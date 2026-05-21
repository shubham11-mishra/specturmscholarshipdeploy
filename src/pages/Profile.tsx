import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import {
  Sparkles,
  Compass,
  GraduationCap,
  MapPin,
  Heart,
  Pencil,
  ArrowRight,
  Flame,
  Trophy,
  Target,
  CalendarClock,
  Loader2,
} from "lucide-react";
import {
  WHEEL_DIMENSIONS,
  DEFAULT_WHEEL_SCORES,
  bandForPoints,
  type WheelScores,
} from "@/lib/navigator";
import { wheelAverageToScore } from "@/lib/readiness";
import { isEligible, type Student, type ScholarshipRow } from "@/lib/matchingEngine";
import ElementJourney from "@/components/ElementJourney";

const Profile = () => {
  const { user, loading, fullName, location, yearLevel, interests } = useAuth();
  const { count: shortlistCount } = useShortlist();
  const navigate = useNavigate();

  const [scores, setScores] = useState<WheelScores>(DEFAULT_WHEEL_SCORES);
  const [hasWheel, setHasWheel] = useState(false);
  const [points, setPoints] = useState(0);
  const [bandKey, setBandKey] = useState("Earth");
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setHydrating(true);
      const [{ data: wheel }, { data: progress }, { data: profileRow }, { data: scholarRows }] = await Promise.all([
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_progress").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("scholarships")
          .select("id, school_name, program_name, category, sub_type, state, sector, gender_eligibility, year_levels, application_close_date, days_left, is_active")
          .limit(5000),
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
        setHasWheel(true);
      }
      if (progress) {
        setPoints(progress.total_points ?? 0);
        setBandKey(progress.current_band ?? "Earth");
      }
      // Compute eligible count via the new matching engine using profile data
      try {
        const w: WheelScores = wheel
          ? {
              academic: (wheel as any).academic_self ?? 5,
              stem: (wheel as any).stem_self ?? 5,
              arts_creative: (wheel as any).arts_creative_self ?? (wheel as any).arts_self ?? 5,
              sports_fitness: (wheel as any).sports_self ?? 5,
              leadership: (wheel as any).leadership_self ?? 5,
              test_readiness: (wheel as any).test_readiness_self ?? 5,
            }
          : DEFAULT_WHEEL_SCORES;
        const p = (profileRow ?? {}) as any;
        const studentForEngine: Student = {
          state: p.state ?? location.state ?? null,
          gender: (p.gender ?? null) as Student["gender"],
          applyingYearLevel: p.applying_year_level ?? null,
          preferredSectors: p.preferred_sectors ?? [],
          willingToBoard: (p.willing_to_board ?? null) as Student["willingToBoard"],
          isIndigenous: !!p.is_indigenous,
          isRural: !!p.is_rural,
          financialNeedIndicator: (p.financial_need ?? null) as Student["financialNeedIndicator"],
          hasSiblingEnrolled: !!p.has_sibling_enrolled,
          dreamSchools: p.dream_schools ?? "",
          scholarshipCategoriesInterested: p.scholarship_categories ?? [],
          wheelScores: w,
        };
        const eligible = (scholarRows ?? []).filter((r) => isEligible(studentForEngine, r as ScholarshipRow));
        setEligibleCount(eligible.length);
      } catch {
        setEligibleCount(scholarRows?.length ?? 0);
      }
      setHydrating(false);
    })();
  }, [user, location.state]);

  const wheelAvg = useMemo(
    () =>
      Math.round(
        (Object.values(scores).reduce((a, b) => a + b, 0) / WHEEL_DIMENSIONS.length) * 10,
      ) / 10,
    [scores],
  );

  const strongDimensions = useMemo(
    () => WHEEL_DIMENSIONS.filter((d) => scores[d.key] >= 7).length,
    [scores],
  );
  const growDimensions = useMemo(
    () => WHEEL_DIMENSIONS.filter((d) => scores[d.key] <= 4).length,
    [scores],
  );

  if (loading || hydrating) {
    return (
      <div className="min-h-screen bg-background">

        <div className="pt-2 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your dashboard…
        </div>
      </div>
    );
  }

  const displayName =
    (fullName && fullName.trim()) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Student";
  const firstName = displayName.split(" ")[0];
  const band = bandForPoints(points);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen bg-background">

      <main className="pt-2 pb-20 px-4 md:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Hero greeting */}
          <section
            className="relative overflow-hidden rounded-3xl p-8 md:p-10 mb-8 shadow-md"
            style={{ background: "var(--gradient-hero, linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))))" }}
          >
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative z-10 text-primary-foreground">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-bold tracking-[0.14em] uppercase mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Your Spectrum Dashboard
              </div>
              <h1 className="font-display font-extrabold text-[28px] md:text-[40px] leading-tight">
                {greeting}, {firstName} <span className="inline-block">👋</span>
              </h1>
              <p className="text-white/85 mt-2 text-[14px] md:text-[15px] max-w-[640px]">
                {yearLevel ? `${yearLevel} · ` : ""}
                {location.suburb ? `${location.suburb}, ` : ""}
                {location.state || "Australia"}
              </p>

              <div className="grid grid-cols-3 gap-4 md:gap-8 mt-7 max-w-[640px]">
                <Stat value={eligibleCount ?? 0} label="Eligible scholarships" />
                <Stat value={shortlistCount} label="Shortlisted" />
                <Stat value={hasWheel ? `${wheelAvg}/10` : "—"} label="Wheel average" />
              </div>
            </div>
          </section>

          {/* Five-Element Journey */}
          <div className="mb-8">
            <ElementJourney score={wheelAverageToScore(Object.values(scores))} />
          </div>

          {/* Quick actions */}
          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            <ActionCard
              to="https://scholarshipsearcher.com.au/#results-grid"
              icon={<Target className="w-4 h-4" />}
              title="Browse scholarships"
              hint="Find your next opportunity"
            />
            <ActionCard
              to="/navigator"
              icon={<Compass className="w-4 h-4" />}
              title="Open Navigator"
              hint="Update your Spectrum Wheel"
            />
            <ActionCard
              to="/profile/edit"
              icon={<Pencil className="w-4 h-4" />}
              title="Edit profile"
              hint="Year level, location, interests"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">


            {/* Profile snapshot */}
            <div className="rounded-3xl bg-card border border-border/60 p-6 shadow-sm lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
                    Profile snapshot
                  </div>
                  <div className="font-display font-bold text-foreground text-xl mt-0.5">
                    {displayName}
                  </div>
                </div>
                <Link
                  to="/profile/edit"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <SnapshotItem
                  icon={<GraduationCap className="w-4 h-4" />}
                  label="Year level"
                  value={yearLevel || "Not set"}
                />
                <SnapshotItem
                  icon={<MapPin className="w-4 h-4" />}
                  label="Location"
                  value={
                    [location.suburb, location.state, location.postcode]
                      .filter(Boolean)
                      .join(" · ") || "Not set"
                  }
                />
                <SnapshotItem
                  icon={<Heart className="w-4 h-4" />}
                  label="Interests"
                  value={interests.length > 0 ? interests.join(", ") : "None yet"}
                />
                <SnapshotItem
                  icon={<CalendarClock className="w-4 h-4" />}
                  label="Member since"
                  value={
                    user?.created_at
                      ? new Date(user.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })
                      : "—"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const Stat = ({ value, label }: { value: number | string; label: string }) => (
  <div>
    <div className="font-display font-extrabold text-3xl md:text-4xl text-white">{value}</div>
    <div className="text-xs md:text-[13px] text-white/80 mt-1">{label}</div>
  </div>
);

const ActionCard = ({
  to,
  icon,
  title,
  hint,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) => (
  <Link
    to={to}
    className="group rounded-2xl bg-card border border-border/60 p-4 flex items-center gap-3 hover:border-primary/40 hover:shadow-md transition"
  >
    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-display font-bold text-foreground text-sm">{title}</div>
      <div className="text-xs text-muted-foreground truncate">{hint}</div>
    </div>
    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
  </Link>
);

const SnapshotItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl bg-secondary/60 border border-border/60 p-4">
    <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-1.5">
      {icon} {label}
    </div>
    <div className="text-sm font-semibold text-foreground line-clamp-2">{value}</div>
  </div>
);

export default Profile;
