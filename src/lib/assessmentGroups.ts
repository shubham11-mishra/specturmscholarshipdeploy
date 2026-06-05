import { supabase } from "@/integrations/supabase/client";
import { normalizeSubject, normalizeYearBand, type Subject } from "@/lib/assessment";

// Canonical, ordered list of year bands as displayed in both admin + student views.
export const ORDERED_BANDS = [
  "Prep-2", "2-4", "4-6", "6-8", "8-10", "Y11", "Y12", "Scholarship/SEALP", "Selective",
] as const;
export type YearBand = (typeof ORDERED_BANDS)[number];

export const SUBJECT_DISPLAY: Record<Subject, string> = {
  english: "English",
  maths: "Mathematics",
};

/** Build the user-facing label for a single subject+band card. */
export function groupLabel(subject: Subject, band: string): string {
  const subj = SUBJECT_DISPLAY[subject];
  switch (band) {
    case "Prep-2":   return `${subj} (prep-2)`;
    case "2-4":      return `${subj} (2-4)`;
    case "4-6":      return `${subj} (4-6)`;
    case "6-8":      return `${subj} (6-8)`;
    case "8-10":     return `${subj} (8-10)`;
    case "Y11":      return `${subj} 11`;
    case "Y12":      return `${subj} 12`;
    case "Scholarship/SEALP": return `Scholarship/SEALP ${subj}`;
    case "Selective":         return `Selective ${subj}`;
    default:         return `${subj} (${band})`;
  }
}

export interface AssessmentGroup {
  subject: Subject;
  year_band: YearBand;
  label: string;
  sectionCount: number;
  questionCount: number;
  publishedCount: number;
  hasPublished: boolean;
}

export interface AssessmentSubjectBlock {
  subject: Subject;
  title: string; // "English Questions" / "Mathematics Questions"
  groups: AssessmentGroup[];
}

export interface GetGroupsOptions {
  /** Only include bands that have at least one published question (student view). */
  publishedOnly?: boolean;
  /** Always show every band in the canonical order, even if the DB has 0 questions (admin view). */
  includeEmpty?: boolean;
}

/**
 * Returns assessment groups sourced from the live database (sections + questions),
 * grouped by subject and year_band, in the canonical order.
 *
 * Used by BOTH /admin assessments and the student assessment selector to guarantee
 * a single source of truth.
 */
export async function getAssessmentGroups(opts: GetGroupsOptions = {}): Promise<AssessmentSubjectBlock[]> {
  const { publishedOnly = false, includeEmpty = false } = opts;

  const [{ data: sections }, { data: questions }] = await Promise.all([
    supabase.from("assessment_sections").select("id, subject, year_band"),
    supabase.from("assessment_questions").select("id, section_id, status"),
  ]);

  // Aggregate per (subject, band)
  type Key = `${Subject}::${YearBand}`;
  const agg = new Map<Key, AssessmentGroup>();

  const seed = (subject: Subject, band: YearBand): AssessmentGroup => ({
    subject, year_band: band, label: groupLabel(subject, band),
    sectionCount: 0, questionCount: 0, publishedCount: 0, hasPublished: false,
  });

  const sectionLookup = new Map<string, { subject: Subject; band: YearBand }>();

  for (const s of sections ?? []) {
    const subject = normalizeSubject((s as any).subject);
    const band = normalizeYearBand((s as any).year_band) as YearBand;
    if (!ORDERED_BANDS.includes(band)) continue;
    const key: Key = `${subject}::${band}`;
    if (!agg.has(key)) agg.set(key, seed(subject, band));
    agg.get(key)!.sectionCount++;
    sectionLookup.set((s as any).id, { subject, band });
  }

  for (const q of questions ?? []) {
    const meta = sectionLookup.get((q as any).section_id);
    if (!meta) continue;
    const key: Key = `${meta.subject}::${meta.band}`;
    const g = agg.get(key)!;
    g.questionCount++;
    if ((q as any).status === "published") {
      g.publishedCount++;
      g.hasPublished = true;
    }
  }

  if (includeEmpty) {
    (["english", "maths"] as Subject[]).forEach(sub => {
      ORDERED_BANDS.forEach(b => {
        const key: Key = `${sub}::${b}`;
        if (!agg.has(key)) agg.set(key, seed(sub, b));
      });
    });
  }

  const filtered = Array.from(agg.values()).filter(g => publishedOnly ? g.hasPublished : true);

  const buildBlock = (subject: Subject): AssessmentSubjectBlock => {
    const groups = filtered
      .filter(g => g.subject === subject)
      .sort((a, b) => ORDERED_BANDS.indexOf(a.year_band) - ORDERED_BANDS.indexOf(b.year_band));
    return {
      subject,
      title: `${SUBJECT_DISPLAY[subject]} Questions`,
      groups,
    };
  };

  return [buildBlock("english"), buildBlock("maths")];
}
