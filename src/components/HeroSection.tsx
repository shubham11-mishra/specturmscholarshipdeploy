import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import heroStudents from "@/assets/hero-students.jpg";
import { supabase } from "@/integrations/supabase/client";

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onStartMatching?: () => void;
}

const STATES = ["All States", "ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

const HeroSection = ({ searchQuery, onSearchChange, onSearch }: HeroSectionProps) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("scholarships")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => {
        if (typeof count === "number") setCount(count);
      });
  }, []);

  const rounded = count ? Math.floor(count / 1000) * 1000 : null;
  const display = rounded ? `${rounded.toLocaleString()}+ Opportunities Listed` : "Opportunities Listed";

  return (
  <section className="relative w-full overflow-hidden">
    {/* Top thin rainbow bar sits inside Navbar shadow area */}
    <div className="rainbow-bar" />

    <div className="relative min-h-[640px] md:min-h-[720px] flex items-center justify-center px-4 py-20 md:py-28">
      {/* Background image + dark overlay */}
      <img
        src={heroStudents}
        alt="Australian high school students walking together in a school corridor"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 w-full max-w-[960px] text-center text-white" style={{ animation: "fadeUp .8s cubic-bezier(.22,1,.36,1) both" }}>
        {/* Pill */}
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 bg-black/40 backdrop-blur-sm border border-white/15">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-[12px] font-medium tracking-wide text-white/90">
            {display}
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-extrabold leading-[1.02] mb-6 text-[42px] sm:text-[60px] md:text-[78px] lg:text-[88px] tracking-tight">
          <span className="block text-white">EVERY SCHOOL.</span>
          <span className="block rainbow-text">EVERY OPPORTUNITY.</span>
        </h1>

        <p className="mx-auto max-w-[620px] text-[15px] md:text-[17px] text-white/85 leading-relaxed mb-10">
          Discover opportunities, selective entry programs, gifted programs,
          and accelerated learning pathways across Australia.
        </p>

        {/* Search bar */}
        <form
          onSubmit={(e) => { e.preventDefault(); onSearch(); }}
          className="bg-white rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row items-stretch gap-2 max-w-[820px] mx-auto"
        >
          <div className="relative flex-1 min-w-0 sm:min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-foreground/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by school name or keyword..."
              aria-label="Search opportunities"
              className="w-full bg-transparent border-0 pl-12 pr-3 py-3.5 text-[15px] text-foreground placeholder:text-foreground/40 outline-none"
            />
          </div>

          <select
            aria-label="Filter by state"
            className="px-4 py-3 rounded-xl bg-white border border-foreground/10 text-[14px] text-foreground/80 outline-none cursor-pointer hover:border-foreground/25 transition-colors sm:min-w-[150px]"
            onChange={(e) => {
              const v = e.target.value;
              if (v && v !== "All States") {
                onSearchChange(v);
                onSearch();
              }
            }}
          >
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>

          <button
            type="submit"
            className="rounded-xl px-7 py-3.5 text-[14px] font-semibold text-white cursor-pointer border-none transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)" }}
          >
            Search Now
          </button>
        </form>
      </div>
    </div>
  </section>
  );
};

export default HeroSection;
