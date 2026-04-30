import { ExternalLink, MapPin, ShieldCheck, GraduationCap, Calendar, DollarSign, Heart } from "lucide-react";
import { SchoolScholarship, getConfidenceBadge, computeDaysLeft } from "@/data/csvScholarships";
import { useShortlist } from "@/hooks/useShortlist";

interface SchoolCardProps {
  school: SchoolScholarship;
  index: number;
  onOpenDetail?: (s: SchoolScholarship) => void;
}

/** Map closing-soon urgency to color tokens (approx: green / amber / red). */
const urgencyForDays = (days: number | null) => {
  if (days == null) return { label: "Open", text: "text-emerald-700", bg: "bg-emerald-50", chipBg: "bg-emerald-600" };
  if (days <= 9)  return { label: `${days} days left`, text: "text-rose-700",   bg: "bg-rose-50",    chipBg: "bg-rose-600" };
  if (days <= 30) return { label: "Closing Soon",      text: "text-amber-700",  bg: "bg-amber-50",   chipBg: "bg-amber-600" };
  return            { label: "Open",                   text: "text-emerald-700", bg: "bg-emerald-50", chipBg: "bg-emerald-600" };
};

const SchoolCard = ({ school, index, onOpenDetail }: SchoolCardProps) => {
  const badge = getConfidenceBadge(school.scholarship_confidence);
  const hasLink = !!(school.scholarship_url || school.website_url);
  const cardId = `${school.acara_id}-${school.row}`;
  const { toggle, isShortlisted } = useShortlist();
  const liked = isShortlisted(cardId);
  // Compute days left dynamically from the close date — the stored `days_left`
  // column is a stale snapshot from when the row was scraped.
  const dl = computeDaysLeft(school.application_close_date);
  const days = dl != null && dl >= 0 ? dl : null;
  const urgency = urgencyForDays(days);
  const initial = (school.school_name || "?").charAt(0).toUpperCase();

  return (
    <div
      className="card-shine bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-brand relative animate-fade-up group flex flex-col border border-primary/10 hover:border-primary/30"
      style={{ animationDelay: `${index * 0.03}s` }}
      onClick={() => onOpenDetail?.(school)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetail?.(school); } }}
    >
      {/* Top gradient accent line */}
      <div className="h-1 gradient-brand" />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0 text-primary"
              style={{ background: "linear-gradient(135deg,#f3e8ff,#e6faf9)" }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-foreground leading-tight mb-0.5 truncate">
                {school.school_name}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-[10px] h-[10px] shrink-0" />
                <span className="truncate">{school.suburb}, {school.state} {school.postcode}</span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggle(cardId); }}
            className={`w-8 h-8 rounded-lg border-[1.5px] flex items-center justify-center shrink-0 cursor-pointer transition-all ${
              liked
                ? "border-rose-200 bg-rose-50 text-rose-600"
                : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
            title={liked ? "Remove from shortlist" : "Add to shortlist"}
            aria-label={liked ? "Remove from shortlist" : "Add to shortlist"}
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? "fill-rose-600" : ""}`} />
          </button>
        </div>

        {/* Program name */}
        {school.program_name && (
          <div className="flex items-center gap-1.5 mb-3">
            <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[12.5px] font-semibold text-foreground truncate">{school.program_name}</span>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {school.category && (
            <span className="text-[9.5px] font-bold tracking-[0.05em] px-2 py-1 rounded-md uppercase bg-primary/10 text-primary">
              {school.category}
            </span>
          )}
          <span className="text-[9.5px] font-bold tracking-[0.05em] px-2 py-1 rounded-md uppercase bg-secondary text-muted-foreground">
            {school.sector}
          </span>
          {school.gender && school.gender !== "Co-ed" && (
            <span className="text-[9.5px] font-bold tracking-[0.05em] px-2 py-1 rounded-md uppercase bg-secondary text-muted-foreground">
              {school.gender}
            </span>
          )}
          <span className={`text-[9.5px] font-bold tracking-[0.05em] px-2 py-1 rounded-md uppercase flex items-center gap-1 ${badge.color}`}>
            <ShieldCheck className="w-[10px] h-[10px]" />
            {badge.label}
          </span>
        </div>

        {/* Info row */}
        {(school.value_type || school.year_levels) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[11.5px] text-muted-foreground">
            {school.value_type && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-foreground font-semibold">{school.value_type}</span>
                {school.value_aud && <span className="text-[10.5px] opacity-70">({school.value_aud})</span>}
              </div>
            )}
            {school.year_levels && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span className="truncate max-w-[160px]">{school.year_levels}</span>
              </div>
            )}
          </div>
        )}

        {/* Deadline urgency band */}
        {(school.closing_label || days != null) && (
          <div className={`flex items-center justify-between rounded-xl px-3 py-2 mb-3 ${urgency.bg}`}>
            <div className="min-w-0">
              <div className={`text-[9px] font-bold uppercase tracking-[0.08em] ${urgency.text}`}>Deadline</div>
              <div className={`text-[12.5px] font-bold truncate ${urgency.text}`}>
                {school.closing_label || "TBA"}
              </div>
            </div>
            <span className={`text-[9.5px] font-bold uppercase tracking-[0.05em] text-white px-2.5 py-1 rounded-md whitespace-nowrap ${urgency.chipBg}`}>
              {urgency.label}
            </span>
          </div>
        )}

        {/* Overview */}
        {school.overview && (
          <div className="mb-4 flex-1">
            <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2">
              {school.overview}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-border/60 mt-auto">
          {school.scholarship_url && (
            <a
              href={school.scholarship_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 gradient-brand text-primary-foreground rounded-xl px-3.5 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.06em] cursor-pointer hover:opacity-95 transition-all border-none no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              View Scholarship <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {school.website_url && (
            <a
              href={school.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-1.5 bg-secondary text-muted-foreground border border-border rounded-xl px-3.5 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] cursor-pointer hover:border-primary/50 hover:text-primary transition-all no-underline ${
                !school.scholarship_url ? "flex-1" : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              School Site <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {!hasLink && (
            <div className="flex-1 text-center text-[11px] text-muted-foreground py-2">
              No links available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolCard;
