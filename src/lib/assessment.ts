import { supabase } from "@/integrations/supabase/client";

export type Subject = "english" | "maths";
export const YEAR_BANDS = ["Prep-2","2-4","4-6","6-8","8-10","Y11","Y12","Scholarship/SEALP","Selective"] as const;

export interface Section {
  id: string;
  subject: string;
  year_band: string;
  section_name: string;
  section_order: number;
}
export interface Question {
  id: string;
  section_id: string;
  question_number: number;
  level: number;
  question_text: string;
  passage_text: string | null;
  question_image_url: string | null;
  options: { key: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
}

export const SUBJECT_THEME = {
  english: { color: "#003DA5", label: "English", icon: "📖", hsl: "217 100% 32%" },
  maths:   { color: "#2ECC71", label: "Maths",   icon: "🧮", hsl: "145 63% 49%" },
} as const;

export async function listAvailableBands(subject: Subject): Promise<string[]> {
  const { data } = await supabase.from("assessment_sections").select("year_band").eq("subject", subject);
  return Array.from(new Set((data ?? []).map((r: any) => r.year_band)));
}
export async function listSections(subject: Subject, yearBand: string): Promise<Section[]> {
  const { data } = await supabase.from("assessment_sections").select("*")
    .eq("subject", subject).eq("year_band", yearBand).order("section_order");
  return (data ?? []) as Section[];
}
export async function listQuestionsForBand(subject: Subject, yearBand: string): Promise<{ sections: Section[]; questions: Question[] }> {
  const sections = await listSections(subject, yearBand);
  if (sections.length === 0) return { sections, questions: [] };
  const { data } = await supabase.from("assessment_questions").select("*")
    .in("section_id", sections.map(s => s.id)).order("question_number");
  return { sections, questions: (data ?? []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })) as Question[] };
}

export function inferYearBand(yearLevel: string | null | undefined): string {
  if (!yearLevel) return "6-8";
  const y = yearLevel.toLowerCase().replace(/[^0-9a-z]/g, "");
  const n = parseInt(y.replace(/\D/g, ""), 10);
  if (y.includes("prep") || (n >= 0 && n <= 2)) return "Prep-2";
  if (n >= 2 && n <= 4) return "2-4";
  if (n >= 4 && n <= 6) return "4-6";
  if (n >= 6 && n <= 8) return "6-8";
  if (n >= 8 && n <= 10) return "8-10";
  if (n === 11) return "Y11";
  if (n === 12) return "Y12";
  return "6-8";
}

export async function getOrCreateAttempt(userId: string, subject: Subject, yearBand: string) {
  const { data: existing } = await supabase.from("assessment_attempts")
    .select("*").eq("student_id", userId).eq("subject", subject).eq("year_band", yearBand)
    .eq("status", "in_progress").maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from("assessment_attempts").insert({
    student_id: userId, subject, year_band: yearBand, status: "in_progress",
    current_question: 1, answers: {}, flagged_questions: []
  }).select().single();
  if (error) throw error;
  return data;
}

export async function saveAttemptProgress(attemptId: string, updates: { current_question?: number; answers?: any; flagged_questions?: any }) {
  await supabase.from("assessment_attempts").update(updates).eq("id", attemptId);
}

export interface ScoreResult {
  total_score: number;
  section_scores: Record<string, { name: string; correct: number; total: number; pct: number }>;
  level_scores: Record<string, { correct: number; total: number; pct: number }>;
}

export function computeScores(questions: Question[], sections: Section[], answers: Record<string, string>): ScoreResult {
  const sectionById = new Map(sections.map(s => [s.id, s]));
  const sectionScores: ScoreResult["section_scores"] = {};
  const levelScores: ScoreResult["level_scores"] = {};
  let totalCorrect = 0;
  for (const q of questions) {
    const a = answers[q.id];
    const correct = a === q.correct_answer;
    if (correct) totalCorrect++;
    const sec = sectionById.get(q.section_id);
    if (sec) {
      const sk = sec.id;
      sectionScores[sk] ||= { name: sec.section_name, correct: 0, total: 0, pct: 0 };
      sectionScores[sk].total++;
      if (correct) sectionScores[sk].correct++;
    }
    const lk = `level_${q.level}`;
    levelScores[lk] ||= { correct: 0, total: 0, pct: 0 };
    levelScores[lk].total++;
    if (correct) levelScores[lk].correct++;
  }
  Object.values(sectionScores).forEach(s => s.pct = s.total ? Math.round(s.correct / s.total * 100) : 0);
  Object.values(levelScores).forEach(s => s.pct = s.total ? Math.round(s.correct / s.total * 100) : 0);
  const total = questions.length ? Math.round(totalCorrect / questions.length * 100) : 0;
  return { total_score: total, section_scores: sectionScores, level_scores: levelScores };
}

export async function completeAttempt(attemptId: string, userId: string, subject: Subject, scores: ScoreResult) {
  await supabase.from("assessment_attempts").update({
    status: "completed",
    total_score: scores.total_score,
    section_scores: scores.section_scores as any,
    level_scores: scores.level_scores as any,
    completed_at: new Date().toISOString(),
  }).eq("id", attemptId);

  // Update wheel_scores academic_verified = score/10
  if (subject === "english" || subject === "maths") {
    const verified = Math.round(scores.total_score / 10);
    const { data: existing } = await supabase.from("wheel_scores").select("id, academic_verified")
      .eq("user_id", userId).maybeSingle();
    if (existing) {
      // Take the max of english/maths verified
      const newVerified = Math.max(existing.academic_verified ?? 0, verified);
      await supabase.from("wheel_scores").update({ academic_verified: newVerified, completed_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("wheel_scores").insert({ user_id: userId, academic_verified: verified, completed_at: new Date().toISOString() });
    }
  }

  // +30 XP
  const { data: prog } = await supabase.from("student_progress").select("id, total_points").eq("user_id", userId).maybeSingle();
  if (prog) {
    await supabase.from("student_progress").update({ total_points: (prog.total_points ?? 0) + 30 }).eq("id", prog.id);
  }
}

export async function listInProgressAttempts(userId: string) {
  const { data } = await supabase.from("assessment_attempts").select("*")
    .eq("student_id", userId).eq("status", "in_progress").order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getAttempt(id: string) {
  const { data } = await supabase.from("assessment_attempts").select("*").eq("id", id).maybeSingle();
  return data;
}
