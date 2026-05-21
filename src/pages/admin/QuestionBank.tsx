import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

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
  const subjects = Array.from(new Set(sections.map(s => s.subject)));
  const bands = Array.from(new Set(sections.map(s => s.year_band)));

  const filtered = questions.filter(row => {
    const s = sectionMap.get(row.section_id);
    if (subject && s?.subject !== subject) return false;
    if (band && s?.year_band !== band) return false;
    if (status && row.status !== status) return false;
    if (q && !row.question_text.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search question text…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={band} onChange={e => setBand(e.target.value)}>
            <option value="">All year bands</option>
            {bands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status:</span>
          {["", "published", "draft"].map(s => (
            <button key={s || "all"} onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {s || "All"}
            </button>
          ))}
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
  );
}
