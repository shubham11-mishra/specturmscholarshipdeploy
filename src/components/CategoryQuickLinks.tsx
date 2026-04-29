import { GraduationCap, Palette, Trophy, Globe, HandCoins, FlaskConical, School, ChevronRight } from "lucide-react";

const QUICK_LINKS: {
  label: string;
  Icon: typeof GraduationCap;
  iconBg: string;
  iconColor: string;
}[] = [
  { label: "Academic",        Icon: GraduationCap, iconBg: "bg-[#f3e8ff]", iconColor: "text-[#7B2D8E]" },
  { label: "Arts",            Icon: Palette,       iconBg: "bg-[#fce7f3]", iconColor: "text-[#be185d]" },
  { label: "Sports",          Icon: Trophy,        iconBg: "bg-[#dcfce7]", iconColor: "text-[#15803d]" },
  { label: "Cultural",        Icon: Globe,         iconBg: "bg-[#ffe4e6]", iconColor: "text-[#9f1239]" },
  { label: "Financial Need",  Icon: HandCoins,     iconBg: "bg-[#fef3c7]", iconColor: "text-[#b45309]" },
  { label: "STEM",            Icon: FlaskConical,  iconBg: "bg-[#e0f7fa]", iconColor: "text-[#0e7490]" },
  { label: "School-Specific", Icon: School,        iconBg: "bg-[#ede9fe]", iconColor: "text-[#4f46e5]" },
];

interface Props {
  active: string[];
  counts: Record<string, number>;
  onSelect: (label: string) => void;
}

const CategoryQuickLinks = ({ active, counts, onSelect }: Props) => (
  <section className="max-w-[1200px] mx-auto px-4 md:px-8 pt-4 pb-10 animate-fade-up" style={{ animationDelay: "0.05s" }}>
    <div className="flex items-end justify-between mb-7">
      <div>
        <div className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">Browse</div>
        <h2 className="font-display font-extrabold text-foreground text-[28px] md:text-[34px] leading-tight">
          Explore by Category
        </h2>
      </div>
      <span className="hidden md:block text-[11px] font-medium text-muted-foreground">Click a tile to filter</span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      {QUICK_LINKS.map(({ label, Icon, iconBg, iconColor }) => {
        const isActive = active.includes(label);
        return (
          <button
            key={label}
            onClick={() => onSelect(label)}
            className={`group flex items-center gap-4 rounded-2xl p-5 text-left bg-card border transition-all cursor-pointer ${
              isActive
                ? "border-primary/50 bg-primary/8 shadow-brand"
                : "border-primary/10 hover:border-primary/40 hover:-translate-y-[3px] hover:shadow-md"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-foreground tracking-[0.06em] uppercase mb-0.5 truncate">
                {label}
              </div>
              <div className="text-[12px] text-foreground/45 tracking-[0.04em]">
                {(counts[label] ?? 0).toLocaleString()} scholarships
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 shrink-0 transition-all ${
                isActive ? "text-primary" : "text-foreground/25 group-hover:text-primary group-hover:translate-x-0.5"
              }`}
            />
          </button>
        );
      })}
    </div>
  </section>
);

export default CategoryQuickLinks;
