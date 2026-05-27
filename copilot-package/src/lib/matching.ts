// Scholarship matching engine — adapted to the existing DB schema.
// `scholarships.year_levels` and `scholarships.value_num` are stored as text;
// we parse them on read.

import type { WheelScores, WheelDimensionKey } from "@/lib/navigator";

export interface StudentProfile {
  state: string | null;
  postcode: string | null;
  year_level: string | null;
  target_year: string | null;
  scholarship_categories: string[];
  wheel?: WheelScores | null;
  band?: string | null;
  gender?: string | null;
  is_indigenous?: boolean | null;
  is_rural?: boolean | null;
  financial_need?: string | null;
}

export interface ScholarshipRow {
  id: string;
  school_name: string;
  state: string | null;
  category: string | null;
  year_levels: string | null;
  gender_eligibility: string | null;
  school_type: string | null;
  value_num: string | null;
  application_close_date: string | null;
  days_left: string | null;
  scholarship_url: string | null;
  scholarship_confidence: string | null;
}

const ELITE_SCHOOL_KEYWORDS = [
  "scotch college",
  "geelong grammar",
  "melbourne grammar",
  "sydney grammar",
  "kings school",
  "cranbrook",
  "knox grammar",
  "shore school",
  "presbyterian ladies",
  "mlc school",
  "ascham",
  "kambala",
  "loreto",
];

const CATEGORY_TO_DIM: Record<string, WheelDimensionKey> = {
  academic: "academic",
  "academic merit": "academic",
  stem: "stem",
  music: "arts_creative",
  arts: "arts_creative",
  "arts & creative": "arts_creative",
  drama: "arts_creative",
  sport: "sports_fitness",
  sports: "sports_fitness",
  "sports & fitness": "sports_fitness",
  leadership: "leadership",
  "all-rounder": "leadership",
  service: "leadership",
  "community service": "leadership",
  cultural: "leadership",
  interview: "leadership",
  "test readiness": "test_readiness",
};

const yearToNum = (y: string | null | undefined): number | null => {
  const m = (y || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

const parseYearLevels = (text: string | null): number[] => {
  if (!text) return [];
  const out = new Set<number>();
  const t = text.toLowerCase();
  const rangeRe = /(?:year\s*)?(\d+)\s*(?:[-–]|to)\s*(?:year\s*)?(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(t)) !== null) {
    const lo = parseInt(m[1], 10);
    const hi = parseInt(m[2], 10);
    for (let y = Math.max(lo, 3); y <= Math.min(hi, 12); y++) out.add(y);
  }
  const singleRe = /\b(\d+)\b/g;
  while ((m = singleRe.exec(t)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 3 && n <= 12) out.add(n);
  }
  return Array.from(out);
};

export function getCategoryBoost(category: string | null, wheel?: WheelScores | null): number {
  if (!category || !wheel) return 0;
  const key = CATEGORY_TO_DIM[category.trim().toLowerCase()];
  if (!key) return 0;
  const score = wheel[key] ?? 5;
  // 1–10 → -10 .. +20
  return Math.round((score - 5) * 3);
}

export interface MatchResult {
  score: number; // 0-100
  tier: "best_fit" | "stretch" | "fast_win" | "long_shot";
  reasons: string[];
  locked: boolean;
  unlockReason?: string;
  daysLeft: number | null;
}

const isEliteSchool = (school: string) => {
  const s = school.toLowerCase();
  return ELITE_SCHOOL_KEYWORDS.some((k) => s.includes(k));
};

const computeDaysLeft = (s: ScholarshipRow): number | null => {
  const fromText = (s.days_left || "").match(/-?\d+/);
  if (fromText) return parseInt(fromText[0], 10);
  if (s.application_close_date) {
    const d = new Date(s.application_close_date);
    if (!Number.isNaN(d.getTime())) {
      return Math.round((d.getTime() - Date.now()) / 86400000);
    }
  }
  return null;
};

export function calculateMatch(student: StudentProfile, s: ScholarshipRow): MatchResult {
  const reasons: string[] = [];
  let score = 50;

  // State match
  if (!s.state) {
    score += 5;
    reasons.push("Open nationally");
  } else if (student.state && s.state.toUpperCase() === student.state.toUpperCase()) {
    score += 10;
    reasons.push(`In your state (${s.state})`);
  } else {
    score -= 15;
  }

  // Year level match
  const studentYear = yearToNum(student.year_level);
  const targetYear = yearToNum(student.target_year);
  const yls = parseYearLevels(s.year_levels);
  if (yls.length === 0) {
    score += 3;
  } else if (
    (studentYear && yls.includes(studentYear)) ||
    (targetYear && yls.includes(targetYear))
  ) {
    score += 10;
    reasons.push("Eligible for your year level");
  } else {
    score -= 20;
  }

  // Category interest
  if (s.category && student.scholarship_categories?.length) {
    const catLower = s.category.toLowerCase();
    const matchesInterest = student.scholarship_categories.some((c) =>
      catLower.includes(c.toLowerCase()) || c.toLowerCase().includes(catLower),
    );
    if (matchesInterest) {
      score += 8;
      reasons.push(`Matches your interest in ${s.category}`);
    }
  }

  // Wheel-driven category boost
  const wheelBoost = getCategoryBoost(s.category, student.wheel);
  if (wheelBoost !== 0) {
    score += wheelBoost;
    if (wheelBoost > 0) reasons.push(`Strength in ${s.category}`);
  }

  // Gender eligibility — check gender_eligibility field first, fall back to school_type
  if (student.gender) {
    const sg = student.gender.toLowerCase();
    const isMale   = sg.includes("male") || sg === "m" || sg === "boy";
    const isFemale = sg.includes("female") || sg === "f" || sg === "girl";
    const ge = (s.gender_eligibility || "").toLowerCase();
    const st = (s.school_type || "").toLowerCase();

    const isGirlsOnly = (ge.includes("female") && !ge.includes("male")) || st === "girls";
    const isBoysOnly  = (ge.includes("male") && !ge.includes("female")) || st === "boys";

    if (isGirlsOnly && isMale) {
      score -= 25;
    } else if (isBoysOnly && isFemale) {
      score -= 25;
    } else if (isGirlsOnly || isBoysOnly) {
      score += 5;
      reasons.push("Matches your gender eligibility");
    }
  }

  // Indigenous background
  if (student.is_indigenous && s.category) {
    const cat = s.category.toLowerCase();
    if (cat.includes("indigenous") || cat.includes("aboriginal") || cat.includes("first nations")) {
      score += 15;
      reasons.push("Eligible for indigenous scholarship");
    }
  }

  // Rural / regional background
  if (student.is_rural && s.category) {
    const cat = s.category.toLowerCase();
    if (cat.includes("rural") || cat.includes("regional") || cat.includes("country")) {
      score += 15;
      reasons.push("Eligible as a rural/regional student");
    }
  }

  // Financial need
  if (student.financial_need && s.category) {
    const fn = student.financial_need.toLowerCase();
    const cat = s.category.toLowerCase();
    const hasNeed = fn === "yes" || fn === "true" || fn === "high";
    if (hasNeed && (cat.includes("bursary") || cat.includes("financial") || cat.includes("means-tested") || cat.includes("need-based"))) {
      score += 12;
      reasons.push("Eligible based on financial need");
    }
  }

  // Confidence factor
  if (s.scholarship_confidence === "verified" || s.scholarship_confidence === "high") {
    score += 3;
  } else if (s.scholarship_confidence === "not_found") {
    score -= 5;
  }

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  const daysLeft = computeDaysLeft(s);

  // Locking rules
  const elite = isEliteSchool(s.school_name);
  let locked = false;
  let unlockReason: string | undefined;
  if (elite && (student.band === "Earth" || student.band === "Water")) {
    locked = true;
    unlockReason = "Reach Fire band to unlock elite-school scholarships";
  }

  // Tier classification
  let tier: MatchResult["tier"];
  if (daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && score >= 55) {
    tier = "fast_win";
  } else if (score >= 75) {
    tier = "best_fit";
  } else if (score >= 50) {
    tier = "stretch";
  } else {
    tier = "long_shot";
  }

  return { score, tier, reasons, locked, unlockReason, daysLeft };
}

export function classifyTier(m: MatchResult) {
  return m.tier;
}

export function isLockedForBand(school: string, band: string | null | undefined) {
  if (!isEliteSchool(school)) return false;
  return band === "Earth" || band === "Water";
}
