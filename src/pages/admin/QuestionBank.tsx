import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";
import AssessmentGroupList from "@/components/assessment/AssessmentGroupList";
import { groupLabel } from "@/lib/assessmentGroups";
import { normalizeSubject, normalizeYearBand } from "@/lib/assessment";

type Row = {
  id: string;
  question_text: string;
  status: string;
  level: number;
  question_number: number;
  section_id: string;
};
type Section = { id: string; subject: string; year_band: string; section_name: string };

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Row[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [band, setBand] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [qs, secs] = await Promise.all([
        supabase.from("assessment_questions").select("id,question_text,status,level,question_number,section_id").order("question_number"),
        supabase.from("assessment_sections").select("id,subject,year_band,section_name"),
      ]);
      setQuestions((qs.data ?? []) as Row[]);
      setSections((secs.data ?? []) as Section[]);
      setLoading(false);
    })();
  }, []);

  const sectionMap = useMemo(() => new Map(sections.map(s => [s.id, s])), [sections]);

  const filtered = questions.filter(row => {
    const s = sectionMap.get(row.section_id);
    if (!s) return false;
    if (subject && normalizeSubject(s.subject) !== subject) return false;
    if (band && normalizeYearBand(s.year_band) !== band) return false;
    if (status && row.status !== status) return false;
    if (q && !row.question_text.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const filterLabel = subject && band
    ? groupLabel(subject as any, band)
    : subject
      ? subject
      : band || "";

  return (
    <div className="space-y-6">
      {/* Grouped overview (single source of truth — shared with the student view) */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-display font-bold">Assessment groups</h2>
          <p className="text-sm text-muted-foreground">
            Grouped by subject and year band, sourced live from the database. Click a group to filter the question list below.
          </p>
        </div>
        <AssessmentGroupList
          includeEmpty
          showCounts
          onSelect={(g) => {
            setSubject(g.subject);
            setBand(g.year_band);
            setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          }}
        />
      </section>

      <div ref={listRef} className="space-y-4 pt-2">
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search question text…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              <option value="english">English</option>
              <option value="maths">Mathematics</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={band} onChange={e => setBand(e.target.value)}>
              <option value="">All year bands</option>
              {["Prep-2","2-4","4-6","6-8","8-10","Y11","Y12","Scholarship/SEALP","Selective"].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm flex-wrap">
            <span className="text-muted-foreground">Status:</span>
            {["", "published", "draft"].map(s => (
              <button key={s || "all"} onClick={() => setStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                {s || "All"}
              </button>
            ))}
            {filterLabel && (
              <Badge variant="outline" className="ml-2 gap-1">
                {filterLabel}
                <button onClick={() => { setSubject(""); setBand(""); }} className="ml-1 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {questions.length}</span>
          </div>
        </Card>

        <Card className="divide-y">
          {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-12" /></div>) : (
            filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No questions match your filters.</div>
            ) : filtered.slice(0, 200).map(row => {
              const s = sectionMap.get(row.section_id);
              return (
                <div key={row.id} className="p-4 flex items-start gap-3">
                  <div className="text-xs font-mono text-muted-foreground w-8 shrink-0 pt-0.5">#{row.question_number}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">{row.question_text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s && <Badge variant="outline" className="text-[10px]">{s.subject}</Badge>}
                      {s && <Badge variant="outline" className="text-[10px]">{s.year_band}</Badge>}
                      {s && <Badge variant="outline" className="text-[10px]">{s.section_name}</Badge>}
                      <Badge variant="outline" className="text-[10px]">L{row.level}</Badge>
                      <Badge className={`text-[10px] ${row.status === "published" ? "bg-emerald-600" : "bg-amber-600"}`}>{row.status}</Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {filtered.length > 200 && (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Showing first 200 results. Refine filters to narrow down.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
