// Diagnostic notes per dimension/score tier + helpers shared by Readiness page.
import type { WheelDimensionKey } from "./navigator";

const NOTES: Record<WheelDimensionKey, Record<"low" | "medium" | "high", string>> = {
  academic: {
    low: "Foundational gaps — focus on one subject at a time.",
    medium: "Solid foundation; one A-grade lift would significantly help.",
    high: "Strong academic profile — verified results would boost confidence.",
  },
  stem: {
    low: "Limited STEM evidence — consider an entry-level competition.",
    medium: "Some interest documented; competition results would strengthen this.",
    high: "Competitive STEM profile — keep entering events.",
  },
  arts_creative: {
    low: "No documented arts activities — even local participation helps.",
    medium: "Active in arts; AMEB grades or eisteddfod results would verify.",
    high: "Strong arts portfolio — perfect for arts-specific scholarships.",
  },
  sports_fitness: {
    low: "School-only sport noted — club-level participation needed.",
    medium: "Regular sports activity; representation evidence would strengthen.",
    high: "Competitive sports profile — keep your representation records current.",
  },
  leadership: {
    low: "No formal leadership or service activities documented yet.",
    medium: "Some involvement — aim for a formal role and 20+ service hours.",
    high: "Strong leadership & community evidence — keep documentation current.",
  },
  test_readiness: {
    low: "No test prep recorded yet.",
    medium: "Some preparation underway — sit a timed practice test.",
    high: "Well-prepared — maintain with weekly practice questions.",
  },
};

export function getDiagnosticNote(dimension: WheelDimensionKey, score100: number): string {
  const score10 = Math.round(score100 / 10);
  const tier = score10 <= 4 ? "low" : score10 <= 7 ? "medium" : "high";
  return NOTES[dimension]?.[tier] ?? "Keep building this dimension.";
}

// Score → colour for bars / gauges
export function scoreColor(score100: number): string {
  if (score100 >= 70) return "hsl(var(--spec-green))";
  if (score100 >= 50) return "hsl(var(--spec-orange))";
  return "hsl(var(--spec-red))";
}

// Interleave external and spectrum_product so upsells aren't clustered.
// Walks through sorted list and pulls alternately from each bucket where possible.
export function interleave70_30<T extends { category?: string | null }>(items: T[]): T[] {
  const ext: T[] = [];
  const spec: T[] = [];
  for (const it of items) (it.category === "spectrum_product" ? spec : ext).push(it);

  const out: T[] = [];
  let extIdx = 0;
  let specIdx = 0;
  // Roughly 70/30 — pull 2 external, 1 spectrum, repeat.
  while (extIdx < ext.length || specIdx < spec.length) {
    for (let i = 0; i < 2 && extIdx < ext.length; i++) out.push(ext[extIdx++]);
    if (specIdx < spec.length) out.push(spec[specIdx++]);
  }
  return out;
}

export const BAND_GUIDANCE: Record<
  string,
  { headline: string; body: string; spectrum_offering: string; cta_url: string }
> = {
  earth: {
    headline: "You're in Earth — let's build foundations.",
    body: "Focus on consistent academic improvement and discovering your strengths. Don't worry about scholarships yet — readiness comes first.",
    spectrum_offering: "Core tutoring in your weakest subject",
    cta_url: "https://spectrumtuition.com/tutoring",
  },
  water: {
    headline: "You're in Water — time to discover what's possible.",
    body: "Your foundations are strong. Now explore which scholarship categories suit you and start preparing for exams.",
    spectrum_offering: "Selective Entry Mock Exam + intro to extracurriculars",
    cta_url: "https://spectrumtuition.com/selective-entry-mock",
  },
  fire: {
    headline: "You're in Fire — independent practice and depth.",
    body: "You're scholarship-competitive. Sharpen your strongest dimensions and pick 5-10 best-fit targets.",
    spectrum_offering: "NAPLAN Intensive or Debate course",
    cta_url: "https://spectrumtuition.com/naplan-intensive",
  },
  air: {
    headline: "You're in Air — extension and connection.",
    body: "You're a strong candidate. Now invest in interview craft and high-impact extracurriculars.",
    spectrum_offering: "Leadership Bootcamp + Interview Coaching",
    cta_url: "https://spectrumtuition.com/leadership-bootcamp",
  },
  aether: {
    headline: "You're in Aether — polish for the win.",
    body: "Your readiness is mastery-level. Apply broadly and invest in application polish.",
    spectrum_offering: "Personal Statement Workshops + Mock Interviews",
    cta_url: "https://spectrumtuition.com/personal-statement",
  },
};
