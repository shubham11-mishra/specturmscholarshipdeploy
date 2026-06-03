import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  YEAR_BANDS, listAvailableBands, listQuestionsForBand,
  inferYearBand, nearbyBands, SUBJECT_THEME, type Subject
} from "@/lib/assessment";

export default function AssessmentYearBand() {
  const { subject } = useParams<{ subject: Subject }>();
  const nav = useNavigate();
  const { yearLevel } = useAuth();
  const subj = (subject as Subject) ?? "english";
  const theme = SUBJECT_THEME[subj];

  const recommended = useMemo(() => inferYearBand(yearLevel), [yearLevel]);
  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>(recommended);
  const [preview, setPreview] = useState<{ sections: any[]; totalQ: number }>({ sections: [], totalQ: 0 });

  useEffect(() => { listAvailableBands(subj).then(setAvailable); }, [subj]);
  useEffect(() => {
    if (!available.includes(selected) && available.length > 0) {
      setSelected(available.includes(recommended) ? recommended : available[0]);
    }
  }, [available, recommended, selected]);
  useEffect(() => {
    if (!selected) return;
    listQuestionsForBand(subj, selected).then(({ sections, questions }) => {
      const counts = sections.map(s => ({ ...s, count: questions.filter(q => q.section_id === s.id).length }));
      setPreview({ sections: counts, totalQ: questions.length });
    });
  }, [subj, selected]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <button onClick={() => nav("/assessments")} className="text-sm text-muted-foreground hover:text-foreground">← All assessments</button>
        <h1 className="text-3xl font-display font-bold mt-2" style={{ color: theme.color }}>
          {theme.icon} {theme.label} Assessment
        </h1>
        <p className="text-muted-foreground">Choose the year band that matches your current level.</p>
      </div>

      <div>
        <div className="text-sm font-semibold mb-2">Year band</div>
        <div className="flex flex-wrap gap-2">
          {YEAR_BANDS.map(b => {
            const isAvail = available.includes(b);
            const isSel = selected === b;
            const isRec = b === recommended;
            return (
              <button key={b}
                disabled={!isAvail}
                onClick={() => setSelected(b)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed border-2"
                style={isSel
                  ? { background: theme.color, color: "#fff", borderColor: theme.color }
                  : { background: "transparent", borderColor: `${theme.color}33`, color: "hsl(var(--foreground))" }}>
                {b}{isRec && <span className="ml-1.5 text-[10px] opacity-80">★</span>}
              </button>
            );
          })}
        </div>
        {recommended && available.includes(recommended) && (
          <Badge className="mt-3" style={{ background: `${theme.color}15`, color: theme.color }}>
            ★ Recommended for you ({recommended})
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-display font-bold text-lg">What's in this assessment</h3>
          {preview.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections available for this band yet.</p>
          ) : (
            <ul className="space-y-2">
              {preview.sections.map(s => (
                <li key={s.id} className="flex justify-between border-b pb-2">
                  <span>{s.section_name}</span>
                  <span className="text-muted-foreground text-sm">{s.count} question{s.count===1?"":"s"}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-sm text-muted-foreground">Total: {preview.totalQ} questions · approx {Math.max(5, preview.totalQ * 1)} min</div>
        </CardContent>
      </Card>

      <button
        onClick={() => nav(`/assessments/${subj}/${encodeURIComponent(selected)}/take`)}
        disabled={preview.totalQ === 0}
        className="btn-frosted disabled:opacity-50"
        style={{ background: theme.color }}>
        Start assessment →
      </button>
    </div>
  );
}
