import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, ArrowRight, Compass, Pencil, GraduationCap,
  MapPin, Heart, CalendarClock, BookOpen,
} from "lucide-react";
import { wheelAverageToScore, bandForScore } from "@/lib/readiness";


type ProgressRow = {
  total_points: number | null;
  current_band: string | null;
};

type WheelRow = Record<string, number | null>;

const BANDS = [
  { key: "earth",  label: "Earth",  stage: "ASSESS",   range: "0–20",   min: 0,  max: 20,  emoji: "🌱", color: "#8B6914" },
  { key: "water",  label: "Water",  stage: "DISCOVER", range: "21–40",  min: 21, max: 40,  emoji: "💧", color: "#02B2FC" },
  { key: "fire",   label: "Fire",   stage: "PREPARE",  range: "41–60",  min: 41, max: 60,  emoji: "🔥", color: "#FF0F3B" },
  { key: "air",    label: "Air",    stage: "ENRICH",   range: "61–80",  min: 61, max: 80,  emoji: "💨", color: "#7ECFED" },
  { key: "aether", label: "Aether", stage: "APPLY",    range: "81–100", min: 81, max: 100, emoji: "✨", color: "#FAC82C" },
] as const;


const SELF_FIELDS = [
  "academic_self", "stem_self", "arts_creative_self",
  "sports_self", "leadership_self", "test_readiness_self",
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const StudentDashboard = () => {
  const { user, fullName, yearLevel, location: loc, interests } = useAuth();
  const { count: shortlistCount } = useShortlist();
  const nav = useNavigate();

  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [wheel, setWheel] = useState<WheelRow | null>(null);
  const [scholarshipCount, setScholarshipCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [progressRes, wheelRes, schoRes] = await Promise.all([
        supabase.from("student_progress").select("total_points,current_band").eq("user_id", user.id).maybeSingle(),
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("scholarships").select("*", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setProgress((progressRes.data as ProgressRow) ?? null);
      setWheel((wheelRes.data as unknown as WheelRow) ?? null);
      setScholarshipCount(schoRes.count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const readiness = Math.max(0, Math.min(100, progress?.total_points ?? 0));
  const currentBand = useMemo(
    () => BANDS.find(b => readiness >= b.min && readiness <= b.max) ?? BANDS[0],
    [readiness]
  );

  const wheelAvg = useMemo(() => {
    if (!wheel) return null;
    const vals = SELF_FIELDS
      .map(f => (typeof wheel[f] === "number" ? (wheel[f] as number) : null))
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [wheel]);

  const firstName = fullName?.split(" ")[0] || "there";
  const locText = [loc.suburb, loc.state].filter(Boolean).join(", ");

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient hero */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-white shadow-lg
        bg-[linear-gradient(110deg,#2547a8_0%,#3a5fb8_35%,#8a8a5e_70%,#c9a44c_100%)]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
          <Sparkles className="w-3 h-3" /> Your Spectrum Dashboard
        </div>
        <h1 className="mt-4 font-display text-3xl md:text-4xl font-bold">
          {greeting()}, {firstName} <span className="ml-1">👋</span>
        </h1>
        <p className="mt-2 text-sm text-white/80">
          {yearLevel ? `Year ${yearLevel}` : "Student"}{locText ? ` · ${locText}` : ""}
        </p>

        <div className="mt-7 grid grid-cols-3 gap-6 max-w-xl">
          <HeroStat value={scholarshipCount} label="Eligible opportunities" />
          <HeroStat value={shortlistCount} label="Shortlisted" />
          <HeroStat value={wheelAvg !== null ? `${wheelAvg.toFixed(1)}/10` : "—"} label="Wheel average" />
        </div>
      </div>

      {/* Five-element journey */}
      <Card className="p-6 rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
              Five-element journey
            </div>
            <h2 className="mt-1 font-display font-bold text-lg">
              Readiness score · <span className="text-[hsl(var(--spec-red,0_70%_55%))] text-[hsl(0,72%,55%)]">{readiness}/100</span>
            </h2>
          </div>
          <span className="inline-flex items-center rounded-full bg-[hsl(0,72%,55%)] text-white text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1">
            You are here
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {BANDS.map(b => {
            const active = b.key === currentBand.key;
            return (
              <div
                key={b.key}
                className={[
                  "rounded-2xl border text-center px-3 py-4 transition-all",
                  active
                    ? "bg-[hsl(0,72%,55%)] text-white border-transparent shadow-md"
                    : "bg-card hover:border-primary/40",
                ].join(" ")}
              >
                <div className="text-2xl">{b.emoji}</div>
                <div className="mt-1 font-semibold text-sm">{b.label}</div>
                <div className={["text-[10px] font-bold tracking-[0.14em] uppercase mt-0.5",
                  active ? "text-white/90" : "text-muted-foreground"].join(" ")}>{b.stage}</div>
                <div className={["text-[10px] mt-0.5", active ? "text-white/80" : "text-muted-foreground"].join(" ")}>{b.range}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard icon={Compass} title="Browse opportunities" desc="Find your next opportunity" onClick={() => { window.location.href = "https://scholarshipsearcher.com.au/#results-grid"; }} />
        <ActionCard icon={Sparkles} title="Open Navigator" desc="Update your Spectrum Wheel" onClick={() => nav("/navigator")} />
        <ActionCard icon={Pencil} title="Edit profile" desc="Year level, location, interests" onClick={() => nav("/profile/edit")} />
      </div>

      {/* Profile snapshot */}
      <Card className="p-6 rounded-3xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
              Profile snapshot
            </div>
            <h2 className="mt-1 font-display font-bold text-xl">{fullName || "Student"}</h2>
          </div>
          <Link to="/profile/edit" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SnapItem icon={GraduationCap} label="Year level" value={yearLevel ? `Year ${yearLevel}` : "Not set"} />
          <SnapItem
            icon={MapPin}
            label="Location"
            value={[loc.suburb, loc.state, loc.postcode].filter(Boolean).join(" · ") || "Not set"}
          />
          <SnapItem
            icon={Heart}
            label="Interests"
            value={interests.length ? interests.join(", ") : "None yet"}
          />
          <SnapItem
            icon={CalendarClock}
            label="Member since"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—"}
          />
        </div>
      </Card>
    </div>
  );
};

function HeroStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold leading-none">{value}</div>
      <div className="mt-2 text-xs text-white/80">{label}</div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, onClick }: { icon: any; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left group">
      <Card className="p-5 rounded-2xl hover:shadow-md transition-all hover:-translate-y-0.5 h-full">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground">{title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Card>
    </button>
  );
}

function SnapItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-secondary/40 p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] uppercase text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-foreground line-clamp-2">{value}</div>
    </div>
  );
}

export default StudentDashboard;
