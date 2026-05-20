import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Flag, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getOrCreateAttempt, saveAttemptProgress, listQuestionsForBand,
  computeScores, completeAttempt, SUBJECT_THEME, type Subject, type Question, type Section
} from "@/lib/assessment";
import { toast } from "sonner";

export default function AssessmentTake() {
  const { subject, yearBand } = useParams<{ subject: Subject; yearBand: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const subj = (subject as Subject);
  const band = decodeURIComponent(yearBand ?? "");
  const theme = SUBJECT_THEME[subj] ?? SUBJECT_THEME.english;

  const [attempt, setAttempt] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { sections: secs, questions: qs } = await listQuestionsForBand(subj, band);
      setSections(secs); setQuestions(qs);
      const a = await getOrCreateAttempt(user.id, subj, band);
      setAttempt(a);
      setAnswers((a.answers ?? {}) as Record<string, string>);
      setFlags((a.flagged_questions ?? []) as string[]);
      setIdx(Math.max(0, (a.current_question ?? 1) - 1));
      setLoading(false);
    })();
  }, [user, subj, band]);

  const current = questions[idx];
  const sectionById = useMemo(() => new Map(sections.map(s => [s.id, s])), [sections]);
  const currentSection = current ? sectionById.get(current.section_id) : null;

  // Group questions by section for sidebar
  const grouped = useMemo(() => {
    const map = new Map<string, Question[]>();
    questions.forEach(q => {
      if (!map.has(q.section_id)) map.set(q.section_id, []);
      map.get(q.section_id)!.push(q);
    });
    return map;
  }, [questions]);

  const persist = (next: { answers?: any; flagged_questions?: any; current_question?: number }) => {
    if (!attempt) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveAttemptProgress(attempt.id, next);
    }, 400);
  };

  const choose = (key: string) => {
    if (!current) return;
    const next = { ...answers, [current.id]: key };
    setAnswers(next);
    persist({ answers: next, current_question: idx + 1 });
  };
  const toggleFlag = () => {
    if (!current) return;
    const next = flags.includes(current.id) ? flags.filter(x => x !== current.id) : [...flags, current.id];
    setFlags(next);
    persist({ flagged_questions: next });
  };
  const go = (i: number) => {
    if (i < 0 || i >= questions.length) return;
    setIdx(i);
    persist({ current_question: i + 1 });
  };

  const submit = async () => {
    if (!attempt || !user) return;
    setSubmitting(true);
    try {
      const scores = computeScores(questions, sections, answers);
      await completeAttempt(attempt.id, user.id, subj, scores);
      toast.success(`Assessment complete · ${scores.total_score}%`);
      nav(`/assessments/results/${attempt.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading assessment…</div>;
  if (questions.length === 0) return <div className="p-8 text-center"><p className="text-muted-foreground">No questions available for this band yet.</p><Button className="mt-4" onClick={() => nav("/assessments")}>Back</Button></div>;
  if (!current) return null;

  // Sticky passage check: passage shared with prev question in same section
  const prev = idx > 0 ? questions[idx - 1] : null;
  const sharedPassage = current.passage_text && prev && prev.section_id === current.section_id && prev.passage_text === current.passage_text;
  const showPassage = !!current.passage_text;

  const answered = (qid: string) => answers[qid] !== undefined;
  const flagged = (qid: string) => flags.includes(qid);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="md:w-[240px] shrink-0 space-y-4">
          <div className="rainbow-bar rounded-full" />
          <div>
            <div className="text-xs text-muted-foreground">{theme.label} · {band}</div>
            <div className="font-display font-bold text-sm mt-1">{currentSection?.section_name} — Level {current.level}</div>
          </div>
          {[...grouped.entries()].map(([secId, qs]) => {
            const sec = sectionById.get(secId);
            return (
              <div key={secId}>
                <div className="text-xs font-semibold mb-2 text-muted-foreground">{sec?.section_name}</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {qs.map(q => {
                    const globalIdx = questions.findIndex(x => x.id === q.id);
                    const isCur = globalIdx === idx;
                    const isAns = answered(q.id);
                    const isFlag = flagged(q.id);
                    return (
                      <button key={q.id} onClick={() => go(globalIdx)}
                        className="aspect-square rounded text-xs font-semibold transition-all border-2"
                        style={{
                          background: isCur ? theme.color : isAns ? "hsl(var(--spec-green-light))" : "hsl(var(--muted))",
                          color: isCur ? "#fff" : "hsl(var(--foreground))",
                          borderColor: isFlag ? "#D4A843" : "transparent",
                        }}>
                        {q.question_number}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {Object.keys(answers).length} of {questions.length}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 space-y-4">
          {showPassage && (
            <div className={`bg-muted/60 border rounded-lg p-4 ${sharedPassage ? "sticky top-4 z-10" : ""}`}>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Passage</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{current.passage_text}</p>
            </div>
          )}

          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge style={{ background: theme.color, color: "#fff" }}>Question {current.question_number}</Badge>
              <Badge variant="outline">Level {current.level}</Badge>
              {flagged(current.id) && <Badge className="bg-[#D4A843] text-white"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>}
            </div>
            <p className="text-lg font-medium leading-relaxed">{current.question_text}</p>
            {current.question_image_url && (
              <img src={current.question_image_url} alt="" className="max-w-full rounded-lg border" />
            )}
            <div className="space-y-2 pt-2">
              {current.options.map(opt => {
                const isSelected = answers[current.id] === opt.key;
                return (
                  <button key={opt.key} onClick={() => choose(opt.key)}
                    className="w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-sm flex items-start gap-3"
                    style={{
                      background: isSelected ? `${theme.color}10` : "transparent",
                      borderColor: isSelected ? theme.color : "hsl(var(--border))",
                    }}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: isSelected ? theme.color : "hsl(var(--muted))", color: isSelected ? "#fff" : "hsl(var(--foreground))" }}>
                      {opt.key.toUpperCase()}
                    </span>
                    <span className="pt-1">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-background/90 backdrop-blur p-3 -mx-4 md:-mx-0 border-t md:border md:rounded-lg">
            <Button variant="outline" onClick={() => go(idx - 1)} disabled={idx === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={toggleFlag}>
                <Flag className="w-4 h-4 mr-1" /> {flagged(current.id) ? "Unflag" : "Flag"}
              </Button>
              <button onClick={() => nav("/assessments")} className="text-xs text-muted-foreground hover:underline">Save & exit</button>
            </div>
            {idx === questions.length - 1 ? (
              <Button onClick={submit} disabled={submitting} className="btn-frosted" style={{ background: theme.color, color: "#fff" }}>
                {submitting ? "Submitting…" : "Complete →"}
              </Button>
            ) : (
              <Button onClick={() => go(idx + 1)} style={{ background: theme.color, color: "#fff" }}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
