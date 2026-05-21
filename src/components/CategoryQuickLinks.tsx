import { GraduationCap, Palette, Trophy, Globe, HandCoins, FlaskConical, School, Sparkles, ChevronRight } from "lucide-react";

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
  { label: "Gifted Program",  Icon: Sparkles,      iconBg: "bg-[#fef9c3]", iconColor: "text-[#a16207]" },
];

interface Props {
  active: string[];
  counts: Record<string, number>;
  onSelect: (label: string) => void;
}

const CategoryQuickLinks = ({ active, counts, onSelect }: Props) => (
  <section className="max-w-[1200px] mx-auto px-4 md:px-8 pt-4 pb-10 animate-fade-up" style={{ animationDelay: "0.05s" }}>
    <div className="flex flex-col items-center text-center mb-7">
      <h2 className="font-display font-extrabold text-foreground text-[28px] md:text-[40px] leading-tight">
        Find The Right Path
      </h2>
      <div className="rainbow-underline" />
      <p className="max-w-[640px] text-[14px] md:text-[15px] text-muted-foreground mt-4">
        We cover all Australian schools, helping families discover the best academic, creative, sporting, and community opportunities.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 justify-items-center">
      {QUICK_LINKS.map(({ label, Icon, iconBg, iconColor }) => {
        const isActive = active.includes(label);
        return (
          <button
            key={label}
            onClick={() => onSelect(label)}
            className={`group flex items-center gap-4 rounded-2xl p-5 text-left bg-card border transition-all cursor-pointer w-full ${
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
                {(counts[label] ?? 0).toLocaleString()} opportunities
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
