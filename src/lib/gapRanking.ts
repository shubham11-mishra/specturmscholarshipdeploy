import type { PathwayKey } from "@/lib/pathway";
import { pathwayRelevance, dimensionToPathway } from "@/lib/pathway";
import type { WheelScores } from "@/lib/navigator";

export type GapRec = {
  id: string;
  dimension: string;
  pathway: PathwayKey | null;
  trigger_score_max: number;
  title: string;
  description: string | null;
  why_template: string | null;
  effort_level: "low" | "medium" | "high";
  priority: "low" | "medium" | "high";
  estimated_unlocks: number | null;
  xp_reward: number | null;
  badge_name: string | null;
  verifies_evidence: boolean | null;
  category: "external" | "spectrum_product" | null;
  spectrum_product_name: string | null;
  spectrum_product_url: string | null;
  external_resource_name: string | null;
  external_resource_url: string | null;
  icon_emoji: string | null;
};

const EFFORT_COST = { low: 1, medium: 2, high: 3 } as const;

export type RankedRec = GapRec & {
  pathwayKey: PathwayKey;
  score: number;
};

export function rankTopActions(
  recs: GapRec[],
  wheel: WheelScores,
  verifiedDims: Set<string>,
  primary: PathwayKey,
  secondary: PathwayKey | null,
  completed: Set<string>,
  limit = 3
): RankedRec[] {
  const scored: RankedRec[] = [];
  for (const r of recs) {
    if (completed.has(r.id)) continue;
    const pk: PathwayKey = (r.pathway as PathwayKey) ?? dimensionToPathway(r.dimension);
    const rel = pathwayRelevance(pk, primary, secondary);
    if (rel === 0) continue;
    const score10 = wheel[r.dimension as keyof WheelScores] ?? 5;
    if (score10 > r.trigger_score_max) continue;
    const evidenceBoost = r.verifies_evidence && !verifiedDims.has(r.dimension) ? 1.5 : 1.0;
    const unlocks = r.estimated_unlocks ?? 1;
    const effort = EFFORT_COST[r.effort_level] ?? 2;
    const score = (unlocks * rel * evidenceBoost) / effort;
    scored.push({ ...r, pathwayKey: pk, score });
  }
  scored.sort((a, b) => b.score - a.score);

  // Try to keep variety: card 1 primary, card 2 secondary-or-supporting, card 3 different bucket
  const out: RankedRec[] = [];
  const usedPathways = new Set<PathwayKey>();
  for (const r of scored) {
    if (out.length >= limit) break;
    if (out.length > 0 && usedPathways.has(r.pathwayKey) && scored.some((x) => !out.includes(x) && !usedPathways.has(x.pathwayKey))) {
      continue;
    }
    out.push(r);
    usedPathways.add(r.pathwayKey);
  }
  // Fallback fill if we filtered too aggressively
  for (const r of scored) {
    if (out.length >= limit) break;
    if (!out.includes(r)) out.push(r);
  }
  return out;
}

export function renderWhy(template: string | null, pathway: PathwayKey, pathwayLabel: string): string {
  if (!template) return "";
  return template.replaceAll("{pathway}", pathwayLabel);
}
