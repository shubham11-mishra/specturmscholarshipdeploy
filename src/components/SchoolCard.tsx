import { ExternalLink, MapPin, Calendar, DollarSign, GraduationCap, Beaker, Music, Trophy, Users, Star, Heart, CalendarCheck, Globe, Sparkles, Palette, HandCoins, Drama, Languages, Brain, Clock, AlertTriangle } from "lucide-react";
import { SchoolScholarship, computeDaysLeft, formatCloseDate } from "@/data/csvScholarships";
import { useShortlist } from "@/hooks/useShortlist";

interface SchoolCardProps {
  school: SchoolScholarship;
  index: number;
  onOpenDetail?: (s: SchoolScholarship) => void;
}

/* ─────────────────────────── Brand tokens ─────────────────────────── */
const NAVY = "#1B2A4A";
const RAINBOW = "linear-gradient(90deg, #003DA5 0%, #2ECC71 33%, #D4A843 66%, #E74C3C 100%)";

/* Category → coloured icon block (matches Spectrum rainbow).
   Order matters: more specific patterns first. */
const categoryStyle = (raw: string) => {
  const c = (raw || "").toLowerCase();
  if (/music|choir|orchestra|band|instrument/.test(c))   return { bg: "linear-gradient(135deg,#7B2D8E,#B45BD0)", Icon: Music };
  if (/drama|theatre|performing/.test(c))                return { bg: "linear-gradient(135deg,#9333EA,#C084FC)", Icon: Drama };
  if (/art|design|creative|visual/.test(c))              return { bg: "linear-gradient(135deg,#EC4899,#F472B6)", Icon: Palette };
  if (/cultural|language|indigenous|multicultural/.test(c)) return { bg: "linear-gradient(135deg,#F97316,#FB923C)", Icon: Languages };
  if (/stem|science|math|technology|engineer/.test(c))   return { bg: "linear-gradient(135deg,#2ECC71,#5FDB99)", Icon: Beaker };
  if (/sport|fitness|athletic/.test(c))                  return { bg: "linear-gradient(135deg,#E74C3C,#F08775)", Icon: Trophy };
  if (/leader|community|service/.test(c))                return { bg: "linear-gradient(135deg,#D4A843,#E8C572)", Icon: Users };
  if (/financial|need|equity|bursary|means/.test(c))     return { bg: "linear-gradient(135deg,#0EA5E9,#38BDF8)", Icon: HandCoins };
  if (/gifted|all.?round/.test(c))                       return { bg: "linear-gradient(135deg,#A16207,#EAB308)", Icon: Brain };
  if (/academic|merit|select/.test(c))                   return { bg: "linear-gradient(135deg,#003DA5,#3A6FD0)", Icon: GraduationCap };
  return { bg: "linear-gradient(135deg,#1B2A4A,#3D507A)", Icon: Sparkles };
};

/* Category badge colour */
const categoryBadge = (raw: string) => {
  const c = (raw || "").toLowerCase();
  if (/music|drama|theatre|performing/.test(c)) return "bg-fuchsia-50 text-fuchsia-700";
  if (/art|design|creative|visual/.test(c)) return "bg-pink-50 text-pink-700";
  if (/cultural|language|indigenous/.test(c)) return "bg-orange-50 text-orange-700";
  if (/stem|science|math|technology/.test(c)) return "bg-emerald-50 text-emerald-700";
  if (/sport|fitness/.test(c)) return "bg-rose-50 text-rose-700";
  if (/leader|community/.test(c)) return "bg-amber-50 text-amber-700";
  if (/financial|need|equity|bursary/.test(c)) return "bg-sky-50 text-sky-700";
  if (/gifted|all.?round/.test(c)) return "bg-yellow-50 text-yellow-800";
  if (/academic|merit|select/.test(c)) return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
};

/* Deadline bar: red ≤7d (urgent), orange ≤30d (closing soon),
   green = open (>30d), slate = unknown */
const deadlineBar = (days: number | null, hasDate: boolean) => {
  if (!hasDate)
    return { bg: "bg-slate-100", text: "text-slate-600", border: "#94a3b8", icon: Globe, label: "Closing date: Check school website" };
  if (days != null && days >= 0 && days <= 7)
    return { bg: "bg-rose-50", text: "text-rose-700", border: "#E74C3C", icon: AlertTriangle, label: `Urgent · ${days} day${days === 1 ? "" : "s"} left` };
  if (days != null && days >= 0 && days <= 30)
    return { bg: "bg-amber-50", text: "text-amber-700", border: "#D4A843", icon: Clock, label: `Closing soon · ${days} days left` };
  return { bg: "bg-emerald-50", text: "text-emerald-700", border: "#2ECC71", icon: CalendarCheck, label: "Applications open" };
};


/* Match score (uses extraction_confidence_score 0-100 as a placeholder
   until win_probability column is wired through Supabase types) */
const matchTier = (n: number) => {
  if (n >= 80) return { label: "Excellent Match", color: "text-emerald-700", dot: "bg-emerald-500" };
  if (n >= 60) return { label: "Strong Match",    color: "text-blue-700",    dot: "bg-blue-500" };
  if (n >= 40) return { label: "Possible Match",  color: "text-amber-700",   dot: "bg-amber-500" };
  return        { label: "Low Match",       color: "text-slate-600",   dot: "bg-slate-400" };
};

const Stat = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="bg-slate-50 rounded-lg px-2.5 py-2 min-w-0">
    <div className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-slate-500 mb-0.5">
      <Icon className="w-2.5 h-2.5" /> {label}
    </div>
    <div className="text-[12px] font-bold text-slate-900 truncate">{value || "—"}</div>
  </div>
);

const SchoolCard = ({ school, index, onOpenDetail }: SchoolCardProps) => {
  const cardId = `${school.acara_id}-${school.row}`;
  const { toggle, isShortlisted } = useShortlist();
  const liked = isShortlisted(cardId);

  const days = (() => {
    const d = computeDaysLeft(school.application_close_date);
    return d != null && d >= 0 ? d : null;
  })();
  const hasDate = !!formatCloseDate(school.application_close_date);
  const dl = deadlineBar(days, hasDate);

  const cat = categoryStyle(school.category);
  const CatIcon = cat.Icon;

  const matchRaw = Number(school.extraction_confidence_score);
  const showMatch = Number.isFinite(matchRaw) && matchRaw > 0;
  const m = showMatch ? matchTier(Math.round(matchRaw)) : null;

  const link = school.scholarship_url || school.website_url;

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col animate-fade-up"
      style={{ animationDelay: `${index * 0.03}s` }}
      onClick={() => onOpenDetail?.(school)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetail?.(school); } }}
    >
      {/* Rainbow top bar */}
      <div className="h-1" style={{ background: RAINBOW }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
              style={{ background: cat.bg }}
            >
              <CatIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-slate-900 leading-tight truncate">{school.school_name}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{school.suburb}, {school.state}</span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggle(cardId); }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
              liked ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            }`}
            aria-label={liked ? "Remove from shortlist" : "Add to shortlist"}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-600" : ""}`} />
          </button>
        </div>

        {/* Sector + gender pills */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {school.sector && (
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{school.sector}</span>
          )}
          {school.gender && (
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">{school.gender}</span>
          )}
        </div>

        {/* Category badges */}
        {(school.category || school.sub_type || school.program_type) && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {[school.category, school.sub_type, school.program_type]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .slice(0, 3)
              .map((c) => (
                <span key={c} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${categoryBadge(c)}`}>{c}</span>
              ))}
          </div>
        )}

        {/* Description */}
        {school.overview && (
          <p className="text-[12px] text-slate-600 leading-snug line-clamp-2 mb-3">{school.overview}</p>
        )}

        {/* 4-stat grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <Stat icon={GraduationCap} label="Year Levels" value={school.year_levels} />
          <Stat icon={Calendar} label="Test Month" value={school.test_month} />
          <Stat icon={DollarSign} label="Value" value={school.value_type || school.value_aud} />
          <Stat icon={Sparkles} label="Provider" value={school.test_provider || "School-run"} />
        </div>

        {/* Match score */}
        {showMatch && m && (
          <div className={`flex items-center gap-1.5 text-[11px] font-bold mb-2 ${m.color}`}>
            <Star className="w-3 h-3 fill-current" />
            {Math.round(matchRaw)}% — {m.label}
          </div>
        )}

        {/* Deadline bar */}
        <div className={`flex items-center gap-2 ${dl.bg} ${dl.text} px-3 py-2 text-[11.5px] font-semibold mb-3 -mx-4 px-4 border-l-4`}
             style={{ borderLeftColor: dl.border }}>
          <dl.icon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{dl.label}{hasDate && days != null && days > 30 && `: Closes ${formatCloseDate(school.application_close_date)}`}</span>
        </div>


        {/* CTA row */}
        <div className="flex gap-2 mt-auto">
          <a
            href={link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); if (!link) e.preventDefault(); }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[12px] font-bold text-white hover:opacity-90 transition-all no-underline"
            style={{ backgroundColor: NAVY }}
          >
            View Opportunity ›
          </a>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-all"
              aria-label="Open external link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolCard;
