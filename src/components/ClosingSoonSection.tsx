import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import SchoolCard from "@/components/SchoolCard";
import { SchoolScholarship, fetchScholarshipsPage } from "@/data/csvScholarships";

interface Props {
  onViewAll: () => void;
}

const ClosingSoonSection = ({ onViewAll }: Props) => {
  const [items, setItems] = useState<SchoolScholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScholarshipsPage({ sortBy: "closing", page: 0, pageSize: 4 }).then((res) => {
      setItems(res.rows);
      setLoading(false);
    });
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 md:px-8 pt-2 pb-10 animate-fade-up" style={{ animationDelay: "0.05s" }}>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-2">Featured</div>
          <h2 className="font-display font-extrabold text-foreground text-[28px] md:text-[40px] leading-tight">
            Explore Scholarship
          </h2>
        </div>
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/30 text-primary text-[12px] font-bold uppercase tracking-[0.08em] bg-card hover:bg-primary/8 transition-all cursor-pointer"
        >
          View All <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[220px] rounded-2xl bg-card border border-primary/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((s, i) => (
            <SchoolCard key={`${s.acara_id}-${s.row}`} school={s} index={i} />
          ))}
        </div>
      )}
    </section>
  );
};

export default ClosingSoonSection;
