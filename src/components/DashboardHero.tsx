import { useEffect, useState, type ReactNode } from "react";
import { Sparkles, TrendingUp, Heart, Clock, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  totalEligible: number;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export default function DashboardHero({ totalEligible, searchQuery, onSearchChange, onSearch }: Props) {
  const { user, fullName, interests } = useAuth();
  const { count: shortlistCount } = useShortlist();
  const [closingSoon, setClosingSoon] = useState<number>(0);

  useEffect(() => {
    // Closing in next 30 days — count rows with non-empty days_left numeric <= 30
    supabase
      .from("scholarships")
      .select("days_left", { count: "exact", head: false })
      .not("days_left", "is", null)
      .limit(2000)
      .then(({ data }) => {
        if (!data) return;
        const c = data.filter((r) => {
          const n = parseInt(String(r.days_left ?? ""), 10);
          return Number.isFinite(n) && n >= 0 && n <= 30;
        }).length;
        setClosingSoon(c);
      });
  }, []);

  const name = fullName?.split(" ")[0] || user?.email?.split("@")[0] || "Explorer";

  return (
    <div className="px-4 md:px-8 pt-6 md:pt-8 pb-6 space-y-5">
      {/* Greeting banner */}
      <div
        className="relative rounded-2xl px-6 md:px-8 py-7 md:py-8 overflow-hidden shadow-lg"
        style={{ background: "var(--gradient-banner)" }}
      >
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 80% 30%, rgba(236,72,153,0.5), transparent 60%)" }} />
        <div className="relative">
          <h1 className="font-display font-extrabold text-2xl md:text-[32px] text-white leading-tight">
            {greeting()}, {name} <span className="inline-block">👋</span>
          </h1>
          <p className="text-white/75 text-sm md:text-base mt-1.5">
            {user
              ? `${totalEligible.toLocaleString()} eligible scholarships${interests.length ? ` matched to ${interests.join(", ")}` : ""}`
              : "Discover scholarships from every Australian school in one place"}
          </p>

          <div className="mt-5 flex items-center gap-2 max-w-xl bg-white/95 rounded-xl px-3 py-2 shadow-md">
            <Search className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              placeholder="Search by school, suburb, postcode…"
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-1.5"
            />
            <button
              onClick={onSearch}
              className="bg-gradient-to-r from-primary to-accent text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg cursor-pointer border-none hover:opacity-95 transition-opacity"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Eligible scholarships"
          value={totalEligible.toLocaleString()}
          tint="from-primary/15 to-primary/5"
          iconBg="bg-primary/15 text-primary"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Closing in 30 days"
          value={closingSoon.toLocaleString()}
          tint="from-accent/15 to-accent/5"
          iconBg="bg-accent/15 text-accent"
        />
        <StatCard
          icon={<Heart className="w-5 h-5" />}
          label="Your shortlist"
          value={user ? shortlistCount.toLocaleString() : "—"}
          tint="from-pink-500/10 to-purple-500/5"
          iconBg="bg-pink-500/15 text-pink-500"
        />
      </div>

      {/* AI strip */}
      <div
        className="rounded-2xl px-5 md:px-6 py-4 flex items-center gap-4 border border-border"
        style={{ background: "var(--gradient-ai)" }}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-brand shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-sm md:text-base text-foreground">
            AI matched picks tailored to {user ? "you" : "your interests"}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground truncate">
            {user && interests.length
              ? `Showing the strongest ${interests.join(" + ").toLowerCase()} programs first.`
              : "Sign in and add interests to personalise your matches."}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, tint, iconBg,
}: { icon: ReactNode; label: string; value: string; tint: string; iconBg: string }) {
  return (
    <div className={`rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br ${tint}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className="font-display font-extrabold text-3xl text-foreground mt-1.5">{value}</div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}
