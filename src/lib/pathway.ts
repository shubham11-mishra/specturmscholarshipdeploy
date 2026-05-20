// Pathway detection + theme tokens for Scholarship Searcher
import type { WheelScores } from "@/lib/navigator";

export type PathwayKey = "academic" | "stem" | "arts" | "sports" | "leadership" | "test_readiness";

export const PATHWAY_THEME: Record<PathwayKey, {
  key: PathwayKey;
  label: string;
  emoji: string;
  color: string;        // hsl(var(...))
  bgLight: string;
  textOn: string;
}> = {
  academic:       { key: "academic",       label: "Academic",       emoji: "🎓", color: "hsl(var(--spec-blue))",  bgLight: "hsl(var(--spec-blue-light))",  textOn: "white" },
  stem:           { key: "stem",           label: "STEM",           emoji: "🔬", color: "hsl(var(--spec-green))", bgLight: "hsl(var(--spec-green-light))", textOn: "white" },
  arts:           { key: "arts",           label: "Arts",           emoji: "🎨", color: "hsl(var(--gold))",       bgLight: "hsl(var(--gold-light))",       textOn: "white" },
  sports:         { key: "sports",         label: "Sports",         emoji: "🏆", color: "hsl(var(--spec-red))",   bgLight: "hsl(var(--spec-red-light))",   textOn: "white" },
  leadership:     { key: "leadership",     label: "Leadership",     emoji: "⭐", color: "hsl(var(--ink))",        bgLight: "hsl(var(--muted))",            textOn: "white" },
  test_readiness: { key: "test_readiness", label: "Test Readiness", emoji: "📝", color: "hsl(var(--slate))",      bgLight: "hsl(var(--muted))",            textOn: "white" },
};

// Map wheel dimension key -> pathway key
const DIM_TO_PATHWAY: Record<string, PathwayKey> = {
  academic: "academic",
  stem: "stem",
  arts_creative: "arts",
  sports_fitness: "sports",
  leadership: "leadership",
  test_readiness: "test_readiness",
};

const PRIMARY_DIMS = ["academic", "stem", "arts_creative", "sports_fitness"] as const;

export function dimensionToPathway(dim: string): PathwayKey {
  return DIM_TO_PATHWAY[dim] ?? "leadership";
}

export function detectPathways(wheel: WheelScores): { primary: PathwayKey; secondary: PathwayKey | null } {
  const ranked = PRIMARY_DIMS
    .map((d) => ({ dim: d, score: wheel[d] ?? 5 }))
    .sort((a, b) => b.score - a.score);
  const primary = dimensionToPathway(ranked[0].dim);
  const secondary = ranked[1].score >= ranked[0].score - 2 && ranked[1].score >= 6
    ? dimensionToPathway(ranked[1].dim)
    : null;
  return { primary, secondary };
}

// Returns 1.0 / 0.7 / 0.5 / 0 multiplier for a candidate pathway vs the student's pathway profile.
export function pathwayRelevance(
  candidate: PathwayKey,
  primary: PathwayKey,
  secondary: PathwayKey | null
): number {
  if (candidate === "leadership" || candidate === "test_readiness") return 0.5;
  if (candidate === primary) return 1.0;
  if (secondary && candidate === secondary) return 0.7;
  return 0; // cross-pathway → filtered out
}
