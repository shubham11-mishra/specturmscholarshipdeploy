import { Search, Sparkles, ArrowRight, ShieldCheck, RefreshCcw, CircleDot, Lock } from "lucide-react";
import CompassMark from "./CompassMark";

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onStartMatching?: () => void;
}

const QUICK_FILTERS = ["Academic", "STEM", "Music", "Leadership", "Boarding"];

const TRUST_PILLS = [
  { Icon: ShieldCheck, text: "Verified School Data" },
  { Icon: RefreshCcw, text: "Updated Weekly" },
  { Icon: CircleDot, text: "Free to Use" },
  { Icon: Lock, text: "Privacy Protected" },
];

const HeroSection = ({ searchQuery, onSearchChange, onSearch, onStartMatching }: HeroSectionProps) => (
  <section className="relative overflow-hidden px-4 md:px-8 pt-24 md:pt-28 pb-20 md:pb-28">
    {/* Background layers */}
    <div className="absolute inset-0 hero-radial pointer-events-none" />
    <div className="absolute inset-0 hero-dot-grid pointer-events-none" />
    {/* Floating compass watermark */}
    <div
      className="absolute right-[6%] top-[12%] opacity-[0.06] pointer-events-none hidden md:block"
      style={{ animation: "float 7s ease-in-out infinite" }}
    >
      <CompassMark size={320} id="hero-bg" />
    </div>

    <div className="relative z-10 mx-auto max-w-[820px] text-center" style={{ animation: "fadeUp .8s cubic-bezier(.22,1,.36,1) both" }}>
      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-7 border border-primary/30 bg-primary/10">
        <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-accent">
          <span
            className="absolute inset-0 rounded-full bg-accent"
            style={{ animation: "pulseRing 1.8s ease-out infinite" }}
          />
        </span>
        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary">
          2,400+ Scholarships Across Australia
        </span>
      </div>

      {/* Headline */}
      <h1 className="font-display font-extrabold text-foreground leading-[1.05] mb-6 text-[44px] sm:text-[56px] md:text-[72px] lg:text-[80px]">
        Find Every <span className="gradient-text italic">Scholarship</span>
        <br />
        That Fits.
      </h1>

      <p className="mx-auto max-w-[560px] text-[15px] md:text-[17px] font-light text-foreground/60 leading-[1.7] mb-10 tracking-wide">
        Spectrum helps Australian families discover, compare, and track school scholarships — across every state, sector, and category.
      </p>

      {/* Search bar */}
      <div className="relative max-w-[600px] mx-auto mb-6 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search by school, category, state…"
          aria-label="Search scholarships"
          className="w-full rounded-2xl bg-card/95 backdrop-blur-md border-[1.5px] border-foreground/10 pl-14 pr-[140px] py-4 text-[15px] text-foreground outline-none transition-all focus:border-primary/70 focus:shadow-[0_0_0_4px_hsl(289_53%_37%_/_0.12)]"
        />
        <button
          onClick={onSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 gradient-brand text-primary-foreground rounded-xl px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] cursor-pointer border-none transition-transform hover:scale-[1.02]"
        >
          Search
        </button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-11">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { onSearchChange(f); onSearch(); }}
            className="rounded-full border border-primary/20 bg-card/85 px-4 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-foreground/65 cursor-pointer transition-all hover:bg-primary/10 hover:text-primary hover:border-primary/40"
          >
            {f}
          </button>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button
          onClick={() => (onStartMatching ? onStartMatching() : onSearch())}
          className="gradient-brand text-primary-foreground rounded-xl px-8 py-3.5 text-[13px] font-bold uppercase tracking-[0.1em] cursor-pointer border-none shadow-brand inline-flex items-center gap-2 transition-all hover:-translate-y-0.5"
        >
          <Sparkles className="w-3.5 h-3.5" /> Start Matching
        </button>
        <a
          href="#results-grid"
          className="rounded-xl bg-card border-[1.5px] border-primary/30 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-primary cursor-pointer no-underline inline-flex items-center gap-2 transition-all hover:bg-primary/8 hover:border-primary/50"
        >
          Browse Scholarships <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Trust pills */}
      <div className="flex flex-wrap justify-center gap-2.5">
        {TRUST_PILLS.map(({ Icon, text }) => (
          <div
            key={text}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-card/85 backdrop-blur px-3.5 py-1.5"
          >
            <Icon className="w-3 h-3 text-accent" />
            <span className="text-[11px] tracking-[0.06em] text-foreground/70">{text}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection;
