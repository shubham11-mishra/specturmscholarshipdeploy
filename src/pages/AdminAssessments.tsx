import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Eye, Upload, Search, AlertTriangle, FileText, CheckCircle2, FileCode2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  listSections, listQuestions, listPassages, upsertQuestion, deleteQuestion, setQuestionStatus,
  upsertPassage, deletePassage, findDuplicates, parseCSV, parseJSON, importQuestions,
  type AdminSection, type AdminQuestion, type AdminPassage, type QuestionStatus,
} from "@/lib/adminAssessments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CSV_TEMPLATE = `subject,year_band,section_name,level,question_number,question_text,passage_title,passage_text,option_a,option_b,option_c,option_d,correct_answer,explanation,status
english,6-8,Verbal Reasoning,1,1,"What is a synonym of 'happy'?",,,Glad,Sad,Angry,Tired,a,Glad means the same as happy.,published
maths,6-8,Numerical Reasoning,2,1,"What is 12 x 8?",,,72,84,96,108,c,12 x 8 = 96,draft`;

const emptyQuestion: Partial<AdminQuestion> = {
  question_text: "", level: 1, question_number: 1, status: "draft",
  options: [{ key: "a", text: "" }, { key: "b", text: "" }, { key: "c", text: "" }, { key: "d", text: "" }],
  correct_answer: "a", explanation: "", passage_id: null,
};

const SUBJECTS = ["english", "maths"];
const YEAR_BANDS = ["Prep-2","2-4","4-6","6-8","8-10","Y11","Y12","Scholarship/SEALP","Selective"];

export default function AdminAssessments() {
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [passages, setPassages] = useState<AdminPassage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fSubject, setFSubject] = useState<string>("all");
  const [fBand, setFBand] = useState<string>("all");
  const [fLevel, setFLevel] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fSearch, setFSearch] = useState("");

  // Editor state
  const [editing, setEditing] = useState<Partial<AdminQuestion> | null>(null);
  const [editSubject, setEditSubject] = useState<string>("english");
  const [editBand, setEditBand] = useState<string>("6-8");
  const [editSection, setEditSection] = useState<string>("");
  const [editNewSection, setEditNewSection] = useState<string>("");
  const [preview, setPreview] = useState<AdminQuestion | null>(null);

  // Passage editor
  const [passageEdit, setPassageEdit] = useState<Partial<AdminPassage> | null>(null);

  // Import
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<QuestionStatus>("draft");
  const [importSkipDup, setImportSkipDup] = useState(true);
  const [importing, setImporting] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [s, q, p] = await Promise.all([listSections(), listQuestions(), listPassages()]);
    setSections(s); setQuestions(q); setPassages(p);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) reload(); }, [isAdmin]);

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      const sec = sectionById.get(q.section_id);
      if (fSubject !== "all" && sec?.subject !== fSubject) return false;
      if (fBand !== "all" && sec?.year_band !== fBand) return false;
      if (fLevel !== "all" && q.level !== Number(fLevel)) return false;
      if (fStatus !== "all" && q.status !== fStatus) return false;
      if (fSearch.trim() && !q.question_text.toLowerCase().includes(fSearch.toLowerCase())) return false;
      return true;
    });
  }, [questions, sectionById, fSubject, fBand, fLevel, fStatus, fSearch]);

  const duplicatesFor = (q: AdminQuestion) => findDuplicates(q.question_text, questions, q.id);
  const editingDuplicates = useMemo(
    () => editing?.question_text ? findDuplicates(editing.question_text, questions, editing.id) : [],
    [editing?.question_text, questions, editing?.id]
  );

  const openNew = () => {
    setEditing({ ...emptyQuestion });
    setEditSubject("english");
    setEditBand("6-8");
    setEditSection("");
    setEditNewSection("");
  };

  const openEdit = (q: AdminQuestion) => {
    const sec = sectionById.get(q.section_id);
    setEditing({ ...q, options: q.options?.length ? q.options : emptyQuestion.options });
    setEditSubject(sec?.subject ?? "english");
    setEditBand(sec?.year_band ?? "6-8");
    setEditSection(q.section_id);
    setEditNewSection("");
  };

  const saveEditing = async () => {
    if (!editing) return;
    if (!editing.question_text?.trim()) { toast.error("Question text is required"); return; }

    let section_id = editSection;
    try {
      if (!section_id) {
        const name = editNewSection.trim() || "General";
        const { ensureSection } = await import("@/lib/adminAssessments");
        const s = await ensureSection(editSubject, editBand, name);
        section_id = s.id;
      }
      await upsertQuestion({ ...editing, section_id });
      toast.success(editing.id ? "Question updated" : "Question created");
      setEditing(null);
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    }
  };

  const runImport = async () => {
    setImporting(true);
    try {
      let rows;
      const trimmed = importText.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) rows = parseJSON(trimmed);
      else rows = parseCSV(trimmed);
      const res = await importQuestions(rows, { status: importStatus, skipDuplicates: importSkipDup });
      toast.success(`Imported ${res.inserted}, skipped ${res.skipped}${res.errors.length ? `, ${res.errors.length} errors` : ""}`);
      if (res.errors.length) console.warn("Import errors", res.errors);
      setImportOpen(false);
      setImportText("");
      reload();
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (roleLoading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Assessment Editor</h1>
          <p className="text-sm text-muted-foreground">Manage questions, passages, sections — drafts stay hidden from students.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1" /> Import</Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New question</Button>
        </div>
      </header>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
          <TabsTrigger value="passages">Passages ({passages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4 mt-4">
          {/* Filters */}
          <Card><CardContent className="p-4 grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={fSearch} onChange={(e) => setFSearch(e.target.value)} placeholder="Search question text…" className="pl-9" />
            </div>
            <Select value={fSubject} onValueChange={setFSubject}>
              <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fBand} onValueChange={setFBand}>
              <SelectTrigger><SelectValue placeholder="Year band" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All year bands</SelectItem>
                {YEAR_BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select value={fLevel} onValueChange={setFLevel}>
                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {[1,2,3].map((l) => <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent></Card>

          {/* Question list */}
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-12 border border-dashed rounded-lg">
                  No questions match the current filters.
                </div>
              )}
              {filtered.map((q) => {
                const sec = sectionById.get(q.section_id);
                const dups = duplicatesFor(q);
                return (
                  <Card key={q.id}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-1">
                          <Badge variant="outline" className="capitalize">{sec?.subject}</Badge>
                          <Badge variant="outline">{sec?.year_band}</Badge>
                          <Badge variant="outline">{sec?.section_name}</Badge>
                          <Badge variant="outline">Level {q.level}</Badge>
                          {q.status === "draft"
                            ? <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Draft</Badge>
                            : <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Published</Badge>}
                          {q.passage_id && <Badge variant="outline" className="gap-1"><FileText className="w-3 h-3" />Passage</Badge>}
                          {dups.length > 0 && (
                            <Badge className="bg-rose-100 text-rose-900 gap-1 hover:bg-rose-100">
                              <AlertTriangle className="w-3 h-3" /> {dups.length} possible duplicate{dups.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{q.question_text || <em className="text-muted-foreground">empty</em>}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setPreview(q)} title="Preview"><Eye className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(q)} title="Edit"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost"
                          title={q.status === "published" ? "Unpublish" : "Publish"}
                          onClick={async () => {
                            await setQuestionStatus(q.id, q.status === "published" ? "draft" : "published");
                            toast.success(`Marked ${q.status === "published" ? "draft" : "published"}`);
                            reload();
                          }}>
                          <CheckCircle2 className={`w-4 h-4 ${q.status === "published" ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </Button>
                        <Button size="icon" variant="ghost"
                          onClick={async () => {
                            if (!confirm("Delete this question?")) return;
                            await deleteQuestion(q.id);
                            toast.success("Deleted");
                            reload();
                          }} title="Delete">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="passages" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPassageEdit({ title: "", passage_text: "" })}>
              <Plus className="w-4 h-4 mr-1" /> New passage
            </Button>
          </div>
          {passages.length === 0 && <div className="text-center text-sm text-muted-foreground py-12 border border-dashed rounded-lg">No passages yet.</div>}
          {passages.map((p) => {
            const linkedCount = questions.filter((q) => q.passage_id === p.id).length;
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      {p.subject && <Badge variant="outline">{p.subject}</Badge>}
                      {p.year_band && <Badge variant="outline">{p.year_band}</Badge>}
                      <Badge variant="outline">{linkedCount} linked question{linkedCount === 1 ? "" : "s"}</Badge>
                    </div>
                    <div className="font-semibold">{p.title}</div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.passage_text}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setPassageEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost"
                      onClick={async () => {
                        if (linkedCount > 0) { toast.error("Unlink linked questions first"); return; }
                        if (!confirm("Delete this passage?")) return;
                        await deletePassage(p.id); reload(); toast.success("Deleted");
                      }}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Question editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit question" : "New question"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Subject</Label>
                  <Select value={editSubject} onValueChange={setEditSubject}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year band</Label>
                  <Select value={editBand} onValueChange={setEditBand}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{YEAR_BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={String(editing.level ?? 1)} onValueChange={(v) => setEditing({ ...editing, level: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[1,2,3].map((l) => <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Section</Label>
                  <Select value={editSection || "__new__"} onValueChange={(v) => setEditSection(v === "__new__" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__">— Create new —</SelectItem>
                      {sections.filter((s) => s.subject === editSubject && s.year_band === editBand).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.section_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!editSection && (
                    <Input className="mt-2" placeholder="New section name (e.g. Verbal Reasoning)"
                      value={editNewSection} onChange={(e) => setEditNewSection(e.target.value)} />
                  )}
                </div>
                <div>
                  <Label>Passage (optional)</Label>
                  <Select value={editing.passage_id ?? "__none__"} onValueChange={(v) => setEditing({ ...editing, passage_id: v === "__none__" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {passages.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Question text</Label>
                <Textarea rows={3} value={editing.question_text ?? ""} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} />
                {editingDuplicates.length > 0 && (
                  <div className="mt-2 p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    <strong>{editingDuplicates.length} possible duplicate{editingDuplicates.length > 1 ? "s" : ""}:</strong>
                    <ul className="list-disc pl-4 mt-1">
                      {editingDuplicates.slice(0, 3).map((d) => <li key={d.id} className="truncate">{d.question_text}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <Label>Answer options</Label>
                <div className="space-y-2 mt-1">
                  {(editing.options ?? []).map((opt, i) => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, correct_answer: opt.key })}
                        title="Mark as correct"
                        className={`w-7 h-7 rounded-full font-bold text-xs uppercase border-2 flex items-center justify-center ${
                          editing.correct_answer === opt.key
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : "bg-background border-border text-muted-foreground"
                        }`}>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Question number</Label>
                  <Input type="number" value={editing.question_number ?? 1}
                    onChange={(e) => setEditing({ ...editing, question_number: Number(e.target.value) })} />
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            {editing?.id && <Button variant="outline" onClick={() => setPreview(editing as AdminQuestion)}>Preview</Button>}
            <Button onClick={saveEditing}>Save</Button>
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
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Subject (optional)</Label>
                  <Select value={passageEdit.subject ?? "__none__"} onValueChange={(v) => setPassageEdit({ ...passageEdit, subject: v === "__none__" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Year band (optional)</Label>
                  <Select value={passageEdit.year_band ?? "__none__"} onValueChange={(v) => setPassageEdit({ ...passageEdit, year_band: v === "__none__" ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {YEAR_BANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
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
              await upsertPassage(passageEdit);
              toast.success("Passage saved");
              setPassageEdit(null); reload();
            }}>Save</Button>
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

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bulk import questions</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Paste <strong>CSV</strong> (with header row) or a <strong>JSON</strong> array. Missing sections will be auto-created.
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer text-primary">Show CSV template <FileCode2 className="inline w-3 h-3" /></summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto whitespace-pre">{CSV_TEMPLATE}</pre>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setImportText(CSV_TEMPLATE)}>Use template</Button>
            </details>
            <Textarea rows={10} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste CSV or JSON here…" className="font-mono text-xs" />
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Default status:</Label>
                <Select value={importStatus} onValueChange={(v) => setImportStatus(v as QuestionStatus)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={importSkipDup} onChange={(e) => setImportSkipDup(e.target.checked)} />
                Skip likely duplicates
              </label>
              <Input type="file" accept=".csv,.json,.txt" className="text-xs"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setImportText(await f.text());
                }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button>
            <Button onClick={runImport} disabled={importing || !importText.trim()}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
