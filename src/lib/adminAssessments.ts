import { supabase } from "@/integrations/supabase/client";

export type QuestionStatus = "draft" | "published";

export interface AdminQuestion {
  id: string;
  section_id: string;
  passage_id: string | null;
  question_number: number;
  level: number;
  question_text: string;
  passage_text: string | null;
  question_image_url: string | null;
  options: { key: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
  status: QuestionStatus;
  updated_at?: string;
}

export interface AdminSection {
  id: string;
  subject: string;
  year_band: string;
  section_name: string;
  section_order: number;
}

export interface AdminPassage {
  id: string;
  title: string;
  passage_text: string;
  subject: string | null;
  year_band: string | null;
}

export interface QuestionFilters {
  subject?: string;
  year_band?: string;
  level?: number;
  status?: QuestionStatus | "all";
  search?: string;
}

export async function listSections(): Promise<AdminSection[]> {
  const { data } = await supabase
    .from("assessment_sections")
    .select("*")
    .order("subject")
    .order("year_band")
    .order("section_order");
  return (data ?? []) as AdminSection[];
}

export async function listPassages(): Promise<AdminPassage[]> {
  const { data } = await supabase
    .from("assessment_passages")
    .select("*")
    .order("title");
  return (data ?? []) as AdminPassage[];
}

export async function listQuestions(filters: QuestionFilters = {}): Promise<AdminQuestion[]> {
  // Pull all (admin can see drafts via RLS); filter client-side on small dataset.
  let q = supabase.from("assessment_questions").select("*, assessment_sections!inner(subject, year_band)")
    .order("question_number");
  if (filters.subject) q = q.eq("assessment_sections.subject", filters.subject);
  if (filters.year_band) q = q.eq("assessment_sections.year_band", filters.year_band);
  if (filters.level) q = q.eq("level", filters.level);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.search && filters.search.trim()) q = q.ilike("question_text", `%${filters.search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
  })) as AdminQuestion[];
}

export async function upsertQuestion(input: Partial<AdminQuestion> & { section_id: string }) {
  const payload = {
    section_id: input.section_id,
    passage_id: input.passage_id ?? null,
    question_number: input.question_number ?? 1,
    level: input.level ?? 1,
    question_text: input.question_text ?? "",
    passage_text: input.passage_text ?? null,
    question_image_url: input.question_image_url ?? null,
    options: input.options ?? [],
    correct_answer: input.correct_answer ?? "a",
    explanation: input.explanation ?? null,
    status: input.status ?? "draft",
  };
  if (input.id) {
    const { data, error } = await supabase.from("assessment_questions").update(payload).eq("id", input.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("assessment_questions").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
  if (error) throw error;
}

export async function setQuestionStatus(id: string, status: QuestionStatus) {
  const { error } = await supabase.from("assessment_questions").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function upsertPassage(p: Partial<AdminPassage>) {
  if (p.id) {
    const { data, error } = await supabase.from("assessment_passages").update({
      title: p.title, passage_text: p.passage_text, subject: p.subject ?? null, year_band: p.year_band ?? null,
    }).eq("id", p.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("assessment_passages").insert({
    title: p.title ?? "Untitled", passage_text: p.passage_text ?? "", subject: p.subject ?? null, year_band: p.year_band ?? null,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deletePassage(id: string) {
  const { error } = await supabase.from("assessment_passages").delete().eq("id", id);
  if (error) throw error;
}

export async function ensureSection(subject: string, year_band: string, section_name: string): Promise<AdminSection> {
  const { data: existing } = await supabase.from("assessment_sections")
    .select("*").eq("subject", subject).eq("year_band", year_band).eq("section_name", section_name).maybeSingle();
  if (existing) return existing as AdminSection;
  const { data, error } = await supabase.from("assessment_sections").insert({
    subject, year_band, section_name, section_order: 1,
  }).select().single();
  if (error) throw error;
  return data as AdminSection;
}

/** Fuzzy duplicate check (Levenshtein-ish via lowercase tokens). */
export function findDuplicates(text: string, all: AdminQuestion[], excludeId?: string): AdminQuestion[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const a = norm(text);
  if (a.length < 8) return [];
  return all.filter((q) => {
    if (q.id === excludeId) return false;
    const b = norm(q.question_text);
    if (!b) return false;
    if (b === a) return true;
    // simple containment / token-overlap heuristic
    const aTokens = new Set(a.split(/\s+/));
    const bTokens = b.split(/\s+/);
    const overlap = bTokens.filter((t) => aTokens.has(t)).length;
    return overlap / Math.max(aTokens.size, bTokens.length) > 0.75;
  });
}

export interface ImportRow {
  subject: string;
  year_band: string;
  section_name: string;
  level: number | string;
  question_number?: number | string;
  question_text: string;
  passage_title?: string;
  passage_text?: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  explanation?: string;
  status?: string;
}

export function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row as unknown as ImportRow;
  });
}

export function parseJSON(text: string): ImportRow[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of question rows");
  return data as ImportRow[];
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export async function importQuestions(rows: ImportRow[], opts: { status: QuestionStatus; skipDuplicates: boolean }): Promise<ImportResult> {
  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };
  const existing = opts.skipDuplicates ? await listQuestions() : [];

  // Cache passages by title to dedupe
  const passageCache = new Map<string, string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      if (!r.subject || !r.year_band || !r.question_text || !r.correct_answer) {
        throw new Error("missing required fields (subject, year_band, question_text, correct_answer)");
      }
      const section = await ensureSection(r.subject.trim(), r.year_band.trim(), (r.section_name ?? "General").trim() || "General");

      let passage_id: string | null = null;
      if (r.passage_title && r.passage_text) {
        const key = `${r.subject}|${r.year_band}|${r.passage_title}`;
        if (passageCache.has(key)) {
          passage_id = passageCache.get(key)!;
        } else {
          const { data: existingP } = await supabase.from("assessment_passages")
            .select("id").eq("title", r.passage_title).maybeSingle();
          if (existingP) passage_id = existingP.id;
          else {
            const inserted = await upsertPassage({
              title: r.passage_title, passage_text: r.passage_text,
              subject: r.subject, year_band: r.year_band,
            });
            passage_id = (inserted as AdminPassage).id;
          }
          passageCache.set(key, passage_id!);
        }
      }

      if (opts.skipDuplicates && findDuplicates(r.question_text, existing).length > 0) {
        result.skipped++;
        continue;
      }

      const options = [
        { key: "a", text: r.option_a ?? "" },
        { key: "b", text: r.option_b ?? "" },
        ...(r.option_c ? [{ key: "c", text: r.option_c }] : []),
        ...(r.option_d ? [{ key: "d", text: r.option_d }] : []),
      ];

      await upsertQuestion({
        section_id: section.id,
        passage_id,
        question_number: Number(r.question_number) || result.inserted + 1,
        level: Number(r.level) || 1,
        question_text: r.question_text,
        options,
        correct_answer: (r.correct_answer || "a").toLowerCase().trim(),
        explanation: r.explanation || null,
        status: (r.status as QuestionStatus) || opts.status,
      });
      result.inserted++;
    } catch (e: any) {
      result.errors.push({ row: i + 2, message: e.message ?? String(e) });
    }
  }
  return result;
}
