import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2, Plus, Pencil, Trash2, Eye, ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown,
  CheckCircle2, AlertTriangle, FileText, ArrowLeft,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  getAssessmentSections, getAssessmentItems,
  ensureSection, updateSection, deleteSection, moveSection,
  listPassages, upsertPassage, deletePassage,
  upsertQuestion, deleteQuestion, setQuestionStatus, findDuplicates,
  type AdminSection, type AdminQuestion, type AdminPassage, type QuestionStatus,
} from "@/lib/adminAssessments";
import { normalizeSubject, normalizeYearBand, type Subject } from "@/lib/assessment";
import { groupLabel, SUBJECT_DISPLAY } from "@/lib/assessmentGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const emptyQuestion: Partial<AdminQuestion> = {
  question_text: "", level: 1, question_number: 1, status: "draft",
  options: [{ key: "a", text: "" }, { key: "b", text: "" }, { key: "c", text: "" }, { key: "d", text: "" }],
  correct_answer: "a", explanation: "", passage_id: null,
};

export default function AdminAssessmentDetail() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { subject: subParam, yearBand: bandParam } = useParams<{ subject: string; yearBand: string }>();
  const subject = normalizeSubject(subParam) as Subject;
  const yearBand = normalizeYearBand(bandParam);
  const nav = useNavigate();

  const [sections, setSections] = useState<AdminSection[]>([]);
  const [itemsBySection, setItemsBySection] = useState<Record<string, AdminQuestion[]>>({});
  const [passages, setPassages] = useState<AdminPassage[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Question editor
  const [editing, setEditing] = useState<Partial<AdminQuestion> | null>(null);
  const [editSection, setEditSection] = useState<string>("");
  const [preview, setPreview] = useState<AdminQuestion | null>(null);

  // Section editor
  const [sectionEdit, setSectionEdit] = useState<{ id?: string; name: string } | null>(null);

  // Passage editor
  const [passageEdit, setPassageEdit] = useState<Partial<AdminPassage> | null>(null);

  const reload = async () => {
    setLoading(true);
    const secs = await getAssessmentSections(subject, yearBand);
    setSections(secs);
    const itemsArr = await Promise.all(secs.map(s => getAssessmentItems(s.id).then(items => [s.id, items] as const)));
    setItemsBySection(Object.fromEntries(itemsArr));
    const allP = await listPassages();
    setPassages(allP.filter(p => {
      const ps = p.subject ? normalizeSubject(p.subject) : null;
      const pb = p.year_band ? normalizeYearBand(p.year_band) : null;
      return (!ps || ps === subject) && (!pb || pb === yearBand);
    }));
    // open all by default on first load
    setOpen(prev => Object.keys(prev).length ? prev : Object.fromEntries(secs.map(s => [s.id, true])));
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) reload(); /* eslint-disable-next-line */ }, [isAdmin, subject, yearBand]);

  const allQuestions = useMemo(() => Object.values(itemsBySection).flat(), [itemsBySection]);

  // Validation rollups
  const validation = useMemo(() => {
    return sections.map(s => {
      const items = itemsBySection[s.id] ?? [];
      const published = items.filter(q => q.status === "published").length;
      const drafts = items.length - published;
      // duplicate detection within this section
      const dupGroups = new Map<string, AdminQuestion[]>();
      for (const q of items) {
        const dups = findDuplicates(q.question_text, items, q.id);
        if (dups.length > 0) {
          const key = [q.id, ...dups.map(d => d.id)].sort().join("|");
          if (!dupGroups.has(key)) dupGroups.set(key, [q, ...dups]);
        }
      }
      // missing numbers (gaps in question_number)
      const nums = items.map(q => q.question_number).sort((a, b) => a - b);
      const missing: number[] = [];
      if (nums.length > 0) {
        for (let i = 1; i <= nums[nums.length - 1]; i++) if (!nums.includes(i)) missing.push(i);
      }
      return { section: s, total: items.length, published, drafts, duplicates: dupGroups.size, missing };
    });
  }, [sections, itemsBySection]);

  if (roleLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const openNewQuestion = (section_id: string) => {
    setEditSection(section_id);
    const existing = itemsBySection[section_id] ?? [];
    setEditing({ ...emptyQuestion, question_number: existing.length + 1 });
  };
  const openEditQuestion = (q: AdminQuestion) => {
    setEditSection(q.section_id);
    setEditing({ ...q, options: q.options?.length ? q.options : emptyQuestion.options });
  };

  const saveEditing = async () => {
    if (!editing) return;
    if (!editing.question_text?.trim()) { toast.error("Question text is required"); return; }
    try {
      await upsertQuestion({ ...editing, section_id: editSection });
      toast.success(editing.id ? "Question updated" : "Question created");
      setEditing(null);
      reload();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
  };

  const saveSection = async () => {
    if (!sectionEdit) return;
    const name = sectionEdit.name.trim();
    if (!name) { toast.error("Section name required"); return; }
    try {
      if (sectionEdit.id) await updateSection(sectionEdit.id, { section_name: name });
      else await ensureSection(subject, yearBand, name);
      toast.success("Section saved");
      setSectionEdit(null);
      reload();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin/assessments" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Assessment Editor
        </Link>
        <span>/</span>
        <span>{SUBJECT_DISPLAY[subject]}</span>
        <span>/</span>
        <span className="text-foreground font-semibold">{groupLabel(subject, yearBand)}</span>
      </div>

      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {groupLabel(subject, yearBand)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {sections.length} section{sections.length === 1 ? "" : "s"} · {allQuestions.length} question{allQuestions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button onClick={() => setSectionEdit({ name: "" })}><Plus className="w-4 h-4 mr-1" /> Add section</Button>
      </header>

      <Tabs defaultValue="sections">
        <TabsList>
          <TabsTrigger value="sections">Sections & questions</TabsTrigger>
          <TabsTrigger value="passages">Passages ({passages.length})</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        {/* ─────────── Sections ─────────── */}
        <TabsContent value="sections" className="space-y-3 mt-4">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : sections.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12 border border-dashed rounded-lg">
              No sections yet. Add one to start building this assessment.
            </div>
          ) : sections.map((s, idx) => {
            const items = itemsBySection[s.id] ?? [];
            const isOpen = open[s.id] ?? true;
            return (
              <Card key={s.id}>
                <div className="p-4 flex items-center gap-2">
                  <button onClick={() => setOpen({ ...open, [s.id]: !isOpen })} className="p-1 rounded hover:bg-muted">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.section_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {items.length} question{items.length === 1 ? "" : "s"} · order {s.section_order}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" disabled={idx === 0}
                    onClick={async () => { await moveSection(s.id, "up"); reload(); }} title="Move up">
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" disabled={idx === sections.length - 1}
                    onClick={async () => { await moveSection(s.id, "down"); reload(); }} title="Move down">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSectionEdit({ id: s.id, name: s.section_name })} title="Rename">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" title="Delete section"
                    onClick={async () => {
                      if (!confirm(`Delete section "${s.section_name}"?`)) return;
                      try { await deleteSection(s.id); toast.success("Deleted"); reload(); }
                      catch (e: any) { toast.error(e.message); }
                    }}>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </Button>
                  <Button size="sm" onClick={() => openNewQuestion(s.id)}>
                    <Plus className="w-4 h-4 mr-1" /> Question
                  </Button>
                </div>

                {isOpen && (
                  <div className="border-t divide-y">
                    {items.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">No questions in this section yet.</div>
                    ) : items.map(q => {
                      const dups = findDuplicates(q.question_text, items, q.id);
                      return (
                        <div key={q.id} className="p-3 flex items-start gap-3">
                          <div className="text-xs font-mono text-muted-foreground w-8 shrink-0 pt-0.5">#{q.question_number}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{q.question_text || <em className="text-muted-foreground">empty</em>}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <Badge variant="outline" className="text-[10px]">L{q.level}</Badge>
                              <Badge className={`text-[10px] ${q.status === "published" ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : "bg-amber-100 text-amber-900 hover:bg-amber-100"}`}>{q.status}</Badge>
                              {q.passage_id && <Badge variant="outline" className="text-[10px] gap-1"><FileText className="w-3 h-3" />Passage</Badge>}
                              {dups.length > 0 && <Badge className="text-[10px] bg-rose-100 text-rose-900 hover:bg-rose-100 gap-1"><AlertTriangle className="w-3 h-3" />{dups.length} dup</Badge>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setPreview(q)} title="Preview"><Eye className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => openEditQuestion(q)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost"
                              title={q.status === "published" ? "Unpublish" : "Publish"}
                              onClick={async () => {
                                await setQuestionStatus(q.id, q.status === "published" ? "draft" : "published");
                                toast.success(`Marked ${q.status === "published" ? "draft" : "published"}`);
                                reload();
                              }}>
                              <CheckCircle2 className={`w-4 h-4 ${q.status === "published" ? "text-emerald-600" : "text-muted-foreground"}`} />
                            </Button>
                            <Button size="icon" variant="ghost" title="Delete"
                              onClick={async () => {
                                if (!confirm("Delete this question?")) return;
                                await deleteQuestion(q.id); toast.success("Deleted"); reload();
                              }}>
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* ─────────── Passages ─────────── */}
        <TabsContent value="passages" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPassageEdit({ title: "", passage_text: "", subject, year_band: yearBand })}>
              <Plus className="w-4 h-4 mr-1" /> New passage
            </Button>
          </div>
          {passages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12 border border-dashed rounded-lg">
              No passages linked to this assessment yet.
            </div>
          ) : passages.map(p => {
            const linkedCount = allQuestions.filter(q => q.passage_id === p.id).length;
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      {p.subject && <Badge variant="outline">{p.subject}</Badge>}
                      {p.year_band && <Badge variant="outline">{p.year_band}</Badge>}
                      <Badge variant="outline">{linkedCount} linked</Badge>
                    </div>
                    <div className="font-semibold">{p.title}</div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.passage_text}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setPassageEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      if (linkedCount > 0) { toast.error("Unlink linked questions first"); return; }
                      if (!confirm("Delete this passage?")) return;
                      await deletePassage(p.id); toast.success("Deleted"); reload();
                    }}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ─────────── Validation ─────────── */}
        <TabsContent value="validation" className="space-y-3 mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Section</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-right p-3">Published</th>
                    <th className="text-right p-3">Draft</th>
                    <th className="text-right p-3">Duplicates</th>
                    <th className="text-left p-3">Missing #</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {validation.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No sections to validate.</td></tr>
                  )}
                  {validation.map(v => (
                    <tr key={v.section.id}>
                      <td className="p-3 font-medium">{v.section.section_name}</td>
                      <td className="p-3 text-right">{v.total}</td>
                      <td className="p-3 text-right text-emerald-700 font-semibold">{v.published}</td>
                      <td className="p-3 text-right text-amber-700 font-semibold">{v.drafts}</td>
                      <td className={`p-3 text-right font-semibold ${v.duplicates > 0 ? "text-rose-700" : "text-muted-foreground"}`}>{v.duplicates}</td>
                      <td className="p-3 text-xs text-muted-foreground">{v.missing.length > 0 ? v.missing.join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Students only see published questions. Duplicates are detected by a token-overlap heuristic within the same section.
          </p>
        </TabsContent>
      </Tabs>

      {/* Section editor */}
      <Dialog open={!!sectionEdit} onOpenChange={(o) => !o && setSectionEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{sectionEdit?.id ? "Rename section" : "New section"}</DialogTitle></DialogHeader>
          {sectionEdit && (
            <div className="space-y-2">
              <Label>Section name</Label>
              <Input autoFocus value={sectionEdit.name} onChange={e => setSectionEdit({ ...sectionEdit, name: e.target.value })}
                placeholder="e.g. Reading Comprehension, Writing Tasks, Spelling…" />
              <p className="text-xs text-muted-foreground">Tip: use a clear type label like "Writing Tasks", "Grammar & Punctuation", "Numeracy".</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionEdit(null)}>Cancel</Button>
            <Button onClick={saveSection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passage editor */}
      <Dialog open={!!passageEdit} onOpenChange={(o) => !o && setPassageEdit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{passageEdit?.id ? "Edit passage" : "New passage"}</DialogTitle></DialogHeader>
          {passageEdit && (
            <div className="space-y-3">
              <div><Label>Title</Label>
                <Input value={passageEdit.title ?? ""} onChange={(e) => setPassageEdit({ ...passageEdit, title: e.target.value })} />
              </div>
              <div><Label>Passage text</Label>
                <Textarea rows={8} value={passageEdit.passage_text ?? ""} onChange={(e) => setPassageEdit({ ...passageEdit, passage_text: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassageEdit(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!passageEdit?.title?.trim()) { toast.error("Title required"); return; }
              await upsertPassage({ ...passageEdit, subject, year_band: yearBand });
              toast.success("Passage saved");
              setPassageEdit(null); reload();
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit question" : "New question"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Section</Label>
                  <Select value={editSection} onValueChange={setEditSection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.section_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={String(editing.level ?? 1)} onValueChange={(v) => setEditing({ ...editing, level: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3].map((l) => <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Question #</Label>
                  <Input type="number" value={editing.question_number ?? 1}
                    onChange={(e) => setEditing({ ...editing, question_number: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <Label>Passage (optional)</Label>
                <Select value={editing.passage_id ?? "__none__"} onValueChange={(v) => setEditing({ ...editing, passage_id: v === "__none__" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {passages.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Question text</Label>
                <Textarea rows={3} value={editing.question_text ?? ""} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} />
              </div>

              <div>
                <Label>Answer options</Label>
                <div className="space-y-2 mt-1">
                  {(editing.options ?? []).map((opt, i) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditing({ ...editing, correct_answer: opt.key })}
                        title="Mark as correct"
                        className={`w-7 h-7 rounded-full font-bold text-xs uppercase border-2 flex items-center justify-center ${editing.correct_answer === opt.key ? "bg-emerald-500 text-white border-emerald-500" : "bg-background border-border text-muted-foreground"}`}>
                        {opt.key}
                      </button>
                      <Input value={opt.text} onChange={(e) => {
                        const next = [...(editing.options ?? [])];
                        next[i] = { ...opt, text: e.target.value };
                        setEditing({ ...editing, options: next });
                      }} />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Click a letter to mark it as the correct answer.</p>
                </div>
              </div>

              <div>
                <Label>Explanation (shown after answer)</Label>
                <Textarea rows={2} value={editing.explanation ?? ""} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={editing.status ?? "draft"} onValueChange={(v) => setEditing({ ...editing, status: v as QuestionStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            {editing?.id && <Button variant="outline" onClick={() => setPreview(editing as AdminQuestion)}>Preview</Button>}
            <Button onClick={saveEditing}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Question preview</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-4">
              {preview.passage_id && (
                <Card className="bg-muted/30"><CardContent className="p-3 text-sm whitespace-pre-wrap">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Passage</div>
                  {passages.find((p) => p.id === preview.passage_id)?.passage_text}
                </CardContent></Card>
              )}
              <div className="text-base font-medium">{preview.question_text}</div>
              <div className="space-y-2">
                {preview.options.map((o) => (
                  <div key={o.key} className={`p-3 rounded border-2 ${o.key === preview.correct_answer ? "border-emerald-500 bg-emerald-50" : "border-border"}`}>
                    <strong className="uppercase mr-2">{o.key}.</strong>{o.text}
                    {o.key === preview.correct_answer && <span className="ml-2 text-xs font-bold text-emerald-700">✓ Correct</span>}
                  </div>
                ))}
              </div>
              {preview.explanation && <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">💡 {preview.explanation}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
