import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECT_THEME, listQuestionsForBand, type Subject, type Question, type Section } from "@/lib/assessment";
import { Trophy, CheckCircle2 } from "lucide-react";

function pctColor(pct: number) {
  if (pct >= 80) return "#2ECC71";
  if (pct >= 60) return "#D4A843";
  return "#E74C3C";
}

export default function AssessmentResults() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showConfetti, setShowConfetti] = useState(true);
  const [filter, setFilter] = useState<"all"|"correct"|"incorrect"|"flagged">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("assessment_attempts").select("*").eq("id", id).maybeSingle();
      if (!data) return;
      setAttempt(data);
      const { sections: secs, questions: qs } = await listQuestionsForBand(data.subject as Subject, data.year_band);
      setSections(secs); setQuestions(qs);
    })();
    const t = setTimeout(() => setShowConfetti(false), 2000);
    return () => clearTimeout(t);
  }, [id]);

  const theme = attempt ? SUBJECT_THEME[attempt.subject as Subject] : SUBJECT_THEME.english;
  const score: number = attempt?.total_score ?? 0;
  const sectionScores = (attempt?.section_scores ?? {}) as Record<string, { name: string; correct: number; total: number; pct: number }>;
  const levelScores = (attempt?.level_scores ?? {}) as Record<string, { correct: number; total: number; pct: number }>;
  const answers = (attempt?.answers ?? {}) as Record<string, string>;
  const flags = (attempt?.flagged_questions ?? []) as string[];

  const filtered = useMemo(() => questions.filter(q => {
    const a = answers[q.id];
    const correct = a === q.correct_answer;
    if (filter === "all") return true;
    if (filter === "correct") return correct;
    if (filter === "incorrect") return a !== undefined && !correct;
    if (filter === "flagged") return flags.includes(q.id);
    return true;
  }), [questions, answers, flags, filter]);

  if (!attempt) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;

  const aboveAvg = score >= 70;
  const verifiedScore = (score / 10).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 relative">
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <span key={i}
              className="absolute w-2 h-2 rounded"
              style={{
                left: `${Math.random()*100}%`,
                top: `-10px`,
                background: ["#003DA5","#2ECC71","#D4A843","#E74C3C"][i%4],
                animation: `confetti-fall ${1.5 + Math.random()}s ease-in forwards`,
                animationDelay: `${Math.random()*0.5}s`,
              }} />
          ))}
          <style>{`@keyframes confetti-fall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>
        </div>
      )}

      {/* Hero */}
      <Card className="card-shine">
        <CardContent className="p-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full text-4xl font-display font-bold"
            style={{ background: `conic-gradient(${theme.color} ${score*3.6}deg, hsl(var(--muted)) 0deg)`, color: theme.color }}>
            <div className="w-[112px] h-[112px] rounded-full bg-background flex items-center justify-center">
              {score}%
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold">{theme.label} Assessment Complete</h1>
          <p className="text-muted-foreground">{aboveAvg ? "Above average" : "Keep going"} for Year {attempt.year_band} {theme.label}</p>
          <div className="flex justify-center gap-2 flex-wrap pt-2">
            <Badge className="text-base px-3 py-1" style={{ background: theme.color, color: "#fff" }}>+30 XP</Badge>
            <Badge className="text-base px-3 py-1 bg-[#D4A843] text-white">
              <Trophy className="w-4 h-4 mr-1" /> Verified Academic
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Section breakdown */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-display font-bold text-xl">Section breakdown</h2>
          {Object.entries(sectionScores).map(([k, s]) => (
            <div key={k}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{s.name}</span>
                <span style={{ color: pctColor(s.pct) }} className="font-bold">{s.pct}% ({s.correct}/{s.total})</span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${s.pct}%`, background: pctColor(s.pct) }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Level cards */}
      <div>
        <h2 className="font-display font-bold text-xl mb-3">Levels</h2>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(lvl => {
            const ls = levelScores[`level_${lvl}`];
            return (
              <Card key={lvl}>
                <CardContent className="p-4 text-center">
                  <div className="text-xs text-muted-foreground">Level {lvl}</div>
                  <div className="text-2xl font-display font-bold" style={{ color: ls ? pctColor(ls.pct) : "hsl(var(--muted-foreground))" }}>
                    {ls ? `${ls.correct}/${ls.total}` : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">{ls ? `${ls.pct}%` : "no questions"}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Wheel update */}
      <Card className="border-2" style={{ borderColor: `${theme.color}33` }}>
        <CardContent className="p-6 flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8" style={{ color: theme.color }} />
          <div className="flex-1">
            <div className="font-display font-bold">Your Academic score is now verified: {verifiedScore}</div>
            <div className="text-sm text-muted-foreground">Confidence: <span className="font-bold text-foreground">HIGH</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed breakdown */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display font-bold text-xl">Detailed breakdown</h2>
            <div className="flex gap-1 flex-wrap">
              {(["all","correct","incorrect","flagged"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full border-2 capitalize transition-all ${filter===f ? "font-bold" : ""}`}
                  style={filter===f ? { background: theme.color, color: "#fff", borderColor: theme.color } : { borderColor: "hsl(var(--border))" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filtered.map(q => {
              const a = answers[q.id];
              const correct = a === q.correct_answer;
              const sec = sections.find(s => s.id === q.section_id);
              return (
                <div key={q.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <Badge variant="outline">Q{q.question_number}</Badge>
                    <Badge variant="outline">{sec?.section_name}</Badge>
                    <Badge variant="outline">Level {q.level}</Badge>
                    {flags.includes(q.id) && <Badge className="bg-[#D4A843] text-white">Flagged</Badge>}
                    {a ? (
                      correct ? <Badge style={{ background: "#2ECC71", color: "#fff" }}>Correct</Badge>
                              : <Badge style={{ background: "#E74C3C", color: "#fff" }}>Incorrect</Badge>
                    ) : <Badge variant="outline">Skipped</Badge>}
                  </div>
                  <p className="font-medium">{q.question_text}</p>
                  <div className="text-sm space-y-1">
                    {q.options.map(o => {
                      const isAns = o.key === a;
                      const isCor = o.key === q.correct_answer;
                      return (
                        <div key={o.key} className="px-3 py-2 rounded border"
                          style={{
                            background: isCor ? "rgba(46,204,113,0.12)" : isAns && !isCor ? "rgba(231,76,60,0.10)" : "transparent",
                            borderColor: isCor ? "#2ECC71" : isAns && !isCor ? "#E74C3C" : "hsl(var(--border))",
                          }}>
                          <strong>{o.key.toUpperCase()}.</strong> {o.text}
                          {isCor && <span className="ml-2 text-xs font-bold" style={{ color: "#2ECC71" }}>✓ Correct</span>}
                          {isAns && !isCor && <span className="ml-2 text-xs font-bold" style={{ color: "#E74C3C" }}>Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">💡 {q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild><Link to="/assessments">More assessments</Link></Button>
        <Button onClick={() => nav("/dashboard")} style={{ background: theme.color }}>Back to dashboard</Button>
      </div>
    </div>
  );
}
