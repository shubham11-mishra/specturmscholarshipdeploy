// Phase 1.6.1 matching engine — eligibility filter + 6-factor weighted score.
// Reads the `scholarships` table (text-typed columns) and a Student profile
// hydrated from React state during onboarding (or from `profiles` later).

import type { WheelScores } from "@/lib/navigator";

export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export interface Student {
  state: string | null;
  gender: Gender | null;
  applyingYearLevel: number | null; // numeric e.g. 7
  preferredSectors: string[];       // ["independent","catholic",...] or ["open_to_all"]
  willingToBoard: "day_only" | "boarding_only" | "either" | null;
  isIndigenous: boolean;
  isRural: boolean;
  financialNeedIndicator: "prefer_not_to_say" | "none" | "some" | "significant" | null;
  hasSiblingEnrolled: boolean;
  dreamSchools: string;             // free text
  scholarshipCategoriesInterested: string[];
  wheelScores: WheelScores;
}

export interface ScholarshipRow {
  id: string;
  school_name: string;
  program_name: string | null;
  category: string | null;
  sub_type: string | null;
  state: string | null;
  sector: string | null;
  gender_eligibility: string | null;
  year_levels: string | null;
  application_close_date: string | null;
  days_left: string | null;
  is_active: string | null;
}

const norm = (s: string | null | undefined) => (s || "").toLowerCase().trim();

const NATIONAL_KEYWORDS = ["national", "australia", "anywhere"];
function isNationalScholarship(s: ScholarshipRow): boolean {
  const blob = `${norm(s.state)} ${norm(s.sub_type)} ${norm(s.category)}`;
  if (!s.state) return true;
  return NATIONAL_KEYWORDS.some((k) => blob.includes(k));
}

function parseYearLevels(text: string | null): number[] {
  if (!text) return [];
  const out = new Set<number>();
  const t = text.toLowerCase();

  // Expand explicit ranges: "7-12", "7 – 12", "year 7 to year 12", "7 to 12"
  const rangeRe = /(?:year\s*)?(\d+)\s*(?:[-–]|to)\s*(?:year\s*)?(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(t)) !== null) {
    const lo = parseInt(m[1], 10);
    const hi = parseInt(m[2], 10);
    for (let y = Math.max(lo, 3); y <= Math.min(hi, 12); y++) out.add(y);
  }

  // Also pick up standalone year numbers ("Year 7", "7, 8, 9", etc.)
  const singleRe = /\b(\d+)\b/g;
  while ((m = singleRe.exec(t)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 3 && n <= 12) out.add(n);
  }

  return Array.from(out);
}

function parseDaysLeft(s: ScholarshipRow): number | null {
  const m = (s.days_left || "").match(/-?\d+/);
  if (m) return parseInt(m[0], 10);
  if (s.application_close_date) {
    const d = new Date(s.application_close_date);
    if (!Number.isNaN(d.getTime())) {
      return Math.round((d.getTime() - Date.now()) / 86400000);
    }
  }
  return null;
}

function genderMatches(s: ScholarshipRow, g: Gender | null): boolean {
  const sg = norm(s.gender_eligibility);
  if (!sg || sg === "any" || sg === "co-ed" || sg === "all" || sg === "co_ed") return true;
  if (!g || g === "prefer_not_to_say") return true;
  if (sg.includes("girl") || sg.includes("female") || sg === "f") return g === "female";
  if (sg.includes("boy") || sg.includes("male") || sg === "m") return g === "male";
  return true;
}

export function isEligible(student: Student, s: ScholarshipRow): boolean {
  // 7. Junk program filter — reject truly empty names only
  const pname = (s.program_name || "").trim();
  if (!pname) return false;

  // 6. Active check — is_active is the authoritative source; days_left may be stale
  const active = norm(s.is_active);
  if (active === "false" || active === "no" || active === "0") return false;

  // 1. Year level
  const yls = parseYearLevels(s.year_levels);
  if (yls.length > 0 && student.applyingYearLevel) {
    if (!yls.includes(student.applyingYearLevel)) return false;
  }

  // 2. State
  if (s.state && student.state) {
    if (norm(s.state) !== norm(student.state) && !isNationalScholarship(s)) return false;
  }

  // 3. Gender
  if (!genderMatches(s, student.gender)) return false;

  // 4. School sector
  const sec = norm(s.sector);
  if (sec && student.preferredSectors.length > 0 && !student.preferredSectors.includes("open_to_all")) {
    if (!student.preferredSectors.includes(sec)) return false;
  }

  // 5. Boarding
  if (norm(s.category) === "boarding" && student.willingToBoard === "day_only") return false;

  return true;
}

const INTEREST_DIM_MAP: Record<string, keyof WheelScores | null> = {
  academic: "academic",
  "academic merit": "academic",
  stem: "stem",
  music: "arts_creative",
  "performing arts": "arts_creative",
  "visual arts": "arts_creative",
  arts: "arts_creative",
  drama: "arts_creative",
  sport: "sports_fitness",
  sports: "sports_fitness",
  leadership: "leadership",
  service: "leadership",
  "community service": "leadership",
  cultural: "leadership",
  "all-rounder": null,
  "financial need": null,
};

function calcInterest(student: Student, s: ScholarshipRow): number {
  const cat = norm(s.category);
  const dim = INTEREST_DIM_MAP[cat];
  if (dim === undefined) {
    const avg =
      Object.values(student.wheelScores).reduce((a, b) => a + b, 0) /
      Object.values(student.wheelScores).length;
    return avg * 10;
  }
  if (dim === null) {
    const avg =
      Object.values(student.wheelScores).reduce((a, b) => a + b, 0) /
      Object.values(student.wheelScores).length;
    return avg * 10;
  }
  return (student.wheelScores[dim] ?? 5) * 10;
}

function calcSchool(student: Student, s: ScholarshipRow): number {
  let score = 50;
  if (
    student.dreamSchools &&
    norm(student.dreamSchools).split(/[,\n]+/).some((d) => d && norm(s.school_name).includes(d.trim()))
  ) {
    score += 40;
  }
  if (student.hasSiblingEnrolled && norm(s.sub_type).includes("sibling")) score += 30;
  if (s.category && student.scholarshipCategoriesInterested.some((c) => norm(c) === norm(s.category))) {
    score += 20;
  }
  return Math.min(100, score);
}

function calcAcademic(student: Student): number {
  const ac = student.wheelScores.academic ?? 5;
  const tr = student.wheelScores.test_readiness ?? 5;
  return ((ac + tr) / 2) * 10;
}

function calcGeo(student: Student, s: ScholarshipRow): number {
  if (s.state && student.state && norm(s.state) === norm(student.state)) return 100;
  if (isNationalScholarship(s)) return 70;
  return 30;
}

function calcTimeline(s: ScholarshipRow): number {
  const d = parseDaysLeft(s);
  if (d === null) return 50;
  if (d < 14) return 30;
  if (d < 30) return 80;
  if (d < 90) return 100;
  if (d < 180) return 90;
  return 70;
}

function calcSpecial(student: Student, s: ScholarshipRow): number {
  let score = 0;
  const sub = norm(s.sub_type);
  const cat = norm(s.category);
  if (student.isIndigenous && (sub.includes("indigenous") || sub.includes("first nations"))) score = 100;
  if (student.isRural && (sub.includes("rural") || sub.includes("regional") || cat.includes("rural"))) {
    score = Math.max(score, 90);
  }
  if (student.financialNeedIndicator === "significant" && cat.includes("financial")) score = Math.max(score, 100);
  if (student.financialNeedIndicator === "some" && cat.includes("financial")) score = Math.max(score, 60);
  return score;
}

export function calculateMatchScore(student: Student, s: ScholarshipRow): number {
  const score =
    calcInterest(student, s) * 0.30 +
    calcSchool(student, s) * 0.24 +
    calcAcademic(student) * 0.18 +
    calcGeo(student, s) * 0.12 +
    calcTimeline(s) * 0.10 +
    calcSpecial(student, s) * 0.06;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export interface MatchBand {
  label: string;
  color: string; // tailwind bg color or hsl
}

export function getMatchBand(score: number): MatchBand {
  if (score >= 85) return { label: "Excellent Match", color: "hsl(var(--spec-green))" };
  if (score >= 70) return { label: "Strong Match", color: "hsl(var(--spec-green))" };
  if (score >= 55) return { label: "Good Match", color: "hsl(var(--spec-orange))" };
  if (score >= 40) return { label: "Stretch", color: "hsl(var(--spec-orange))" };
  return { label: "Long Shot", color: "hsl(var(--spec-red))" };
}

export interface ScoredScholarship extends ScholarshipRow {
  matchScore: number;
}

export function dedupeBySchool(matches: ScoredScholarship[], limit = 5): ScoredScholarship[] {
  const seen = new Set<string>();
  const out: ScoredScholarship[] = [];
  for (const m of [...matches].sort((a, b) => b.matchScore - a.matchScore)) {
    const key = norm(m.school_name);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
    if (out.length >= limit) break;
  }
  return out;
}

export function rankEligible(student: Student, rows: ScholarshipRow[]): ScoredScholarship[] {
  return rows
    .filter((r) => isEligible(student, r))
    .map((r) => ({ ...r, matchScore: calculateMatchScore(student, r) }));
}
