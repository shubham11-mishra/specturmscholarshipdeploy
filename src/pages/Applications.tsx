import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Loader2, Trophy, ExternalLink, CalendarClock, ChevronRight, Heart,
  FileText, CheckSquare, Square, PencilLine,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type AppRow = {
  id: string;
  scholarship_id: string;
  status: string;
  outcome: string | null;
  outcome_at: string | null;
  updated_at: string;
  scholarship?: {
    id: string;
    program_name: string | null;
    school_name: string;
    application_close_date: string | null;
    days_left: string | null;
    value_aud: string | null;
    scholarship_url: string | null;
  } | null;
};

type ChecklistItem = {
  id: string;
  application_id: string;
  item_key: string;
  item_label: string;
  completed: boolean;
  completed_at: string | null;
};

type EssayRow = {
  id: string;
  application_id: string;
  prompt: string;
  word_limit: number | null;
  draft: string;
  version: number;
  status: string;
  updated_at: string;
};

const COLUMNS: { key: string; label: string; tint: string }[] = [
  { key: "not_started", label: "Not started", tint: "bg-muted/50" },
  { key: "in_progress", label: "In progress", tint: "bg-amber-100/60" },
  { key: "submitted", label: "Submitted", tint: "bg-blue-100/60" },
  { key: "completed", label: "Decided", tint: "bg-emerald-100/60" },
];

const ESSAY_STATUSES = [
  { key: "not_started", label: "Not started" },
  { key: "in_progress", label: "Draft" },
  { key: "submitted", label: "Finalised" },
];

const parseDeadline = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const daysUntil = (d: Date | null): number | null => {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const Applications = () => {
  const { user, loading: authLoading } = useAuth();
  const { shortlisted, loading: shortlistLoading } = useShortlist();
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/sign-in");
  }, [authLoading, user, navigate]);

  // ---------- Sync apps with current shortlist ----------
  const syncWithShortlist = useCallback(async (uid: string) => {
    // 1) Load existing apps
    const { data: existing } = await supabase
      .from("applications")
      .select("id, scholarship_id, status, outcome")
      .eq("user_id", uid);
    const existingMap = new Map(
      (existing ?? []).map((a) => [a.scholarship_id, a as { id: string; scholarship_id: string; status: string; outcome: string | null }]),
    );

    const shortlistIds = Array.from(shortlisted);

    // 2) Only create apps for shortlist IDs that map to real scholarships
    const toMaybeCreate = shortlistIds.filter((sid) => !existingMap.has(sid));
    if (toMaybeCreate.length) {
      const { data: valid } = await supabase
        .from("scholarships")
        .select("id")
        .in("id", toMaybeCreate);
      const validIds = new Set((valid ?? []).map((s: { id: string }) => s.id));
      const inserts = toMaybeCreate
        .filter((sid) => validIds.has(sid))
        .map((sid) => ({ user_id: uid, scholarship_id: sid, status: "not_started" }));
      if (inserts.length) {
        await supabase.from("applications").insert(inserts);
      }
    }

    // 3) Remove apps for scholarships that are no longer shortlisted
    //    (preserve any with progress beyond draft or with a recorded outcome)
    const orphans = (existing ?? []).filter(
      (a) =>
        !shortlisted.has(a.scholarship_id) &&
        !a.outcome &&
        (a.status === "not_started" || a.status === "in_progress"),
    );
    if (orphans.length) {
      await supabase
        .from("applications")
        .delete()
        .in("id", orphans.map((o) => o.id));
    }
  }, [shortlisted]);

  // ---------- Load apps + scholarships ----------
  const refresh = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("applications")
      .select("id, scholarship_id, status, outcome, outcome_at, updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    const rows = (data ?? []) as AppRow[];
    const ids = [...new Set(rows.map((r) => r.scholarship_id))];
    if (ids.length) {
      const { data: schs } = await supabase
        .from("scholarships")
        .select("id, program_name, school_name, application_close_date, days_left, value_aud, scholarship_url")
        .in("id", ids);
      const map = new Map((schs ?? []).map((s: { id: string }) => [s.id, s]));
      rows.forEach((r) => (r.scholarship = (map.get(r.scholarship_id) as AppRow["scholarship"]) ?? null));
    }
    setApps(rows);
  }, []);

  useEffect(() => {
    if (!user || shortlistLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await syncWithShortlist(user.id);
      if (cancelled) return;
      await refresh(user.id);
      if (cancelled) return;
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, shortlistLoading, syncWithShortlist, refresh]);

  const setStatus = async (id: string, status: string) => {
    const prev = apps;
    setApps((cur) => cur.map((a) => (a.id === id ? { ...a, status } : a)));
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) {
      setApps(prev);
      toast.error("Could not update status");
    } else {
      toast.success(`Moved to ${status.replace("_", " ")}`);
    }
  };

  const setOutcome = async (id: string, outcome: string) => {
    const prev = apps;
    setApps((cur) =>
      cur.map((a) =>
        a.id === id ? { ...a, outcome, outcome_at: new Date().toISOString(), status: "completed" } : a,
      ),
    );
    const { error } = await supabase
      .from("applications")
      .update({ outcome, outcome_at: new Date().toISOString(), status: "completed" })
      .eq("id", id);
    if (error) {
      setApps(prev);
      toast.error("Could not save outcome");
      return;
    }
    if (outcome === "won") {
      toast.success("🏆 Win logged — view it in your Trophy Room");
    } else {
      toast.success("Outcome saved");
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, AppRow[]> = {};
    COLUMNS.forEach((c) => (g[c.key] = []));
    apps.forEach((a) => {
      const k = COLUMNS.find((c) => c.key === a.status) ? a.status : "not_started";
      g[k].push(a);
    });
    return g;
  }, [apps]);

  const deadlines = useMemo(() => {
    const upcoming = apps
      .map((a) => ({ app: a, due: parseDeadline(a.scholarship?.application_close_date ?? null) }))
      .filter((x): x is { app: AppRow; due: Date } => !!x.due && (daysUntil(x.due) ?? -1) >= -3)
      .sort((x, y) => x.due.getTime() - y.due.getTime())
      .slice(0, 12);
    return upcoming;
  }, [apps]);

  const wins = apps.filter((a) => a.outcome === "won").length;

  const openApp = useMemo(() => apps.find((a) => a.id === openId) ?? null, [apps, openId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-2 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading applications…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-2 pb-20 max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">Applications Hub</h1>
            <p className="text-muted-foreground mt-2">
              Auto-built from your shortlist. Track deadlines, documents, and essays in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/shortlist">Manage shortlist</Link>
            </Button>
            <Button asChild className="gradient-brand text-primary-foreground">
              <Link to="/wins">
                <Trophy className="w-4 h-4 mr-1" /> Trophy Room ({wins})
              </Link>
            </Button>
          </div>
        </div>

        {/* Deadline strip */}
        {deadlines.length > 0 && (
          <Card className="p-4 mb-6 overflow-x-auto">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
              <CalendarClock className="w-4 h-4" /> Next 12 deadlines
            </div>
            <div className="flex gap-2 min-w-max">
              {deadlines.map(({ app, due }) => {
                const d = daysUntil(due) ?? 0;
                const tone =
                  d < 0 ? "bg-destructive/10 text-destructive border-destructive/30"
                  : d <= 7 ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-secondary text-foreground border-border";
                return (
                  <button
                    key={app.id}
                    onClick={() => setOpenId(app.id)}
                    className={`shrink-0 w-44 p-3 rounded-lg border text-left ${tone} hover:shadow-sm transition`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wide">
                      {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `${d}d left`}
                    </div>
                    <div className="text-sm font-semibold mt-1 line-clamp-2">
                      {app.scholarship?.program_name || app.scholarship?.school_name}
                    </div>
                    <div className="text-[11px] opacity-70 mt-1">{due.toLocaleDateString()}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`rounded-xl border border-border p-3 ${col.tint}`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-semibold text-sm text-foreground">{col.label}</h2>
                <span className="text-xs text-muted-foreground bg-background/70 rounded-full px-2 py-0.5">
                  {grouped[col.key].length}
                </span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {grouped[col.key].length === 0 && (
                  <div className="text-xs text-muted-foreground/70 italic px-1">Nothing here yet.</div>
                )}
                {grouped[col.key].map((a) => {
                  const due = parseDeadline(a.scholarship?.application_close_date ?? null);
                  const d = daysUntil(due);
                  return (
                    <Card key={a.id} className="p-3 bg-background">
                      <button onClick={() => setOpenId(a.id)} className="block text-left w-full">
                        <div className="text-sm font-semibold text-foreground line-clamp-2">
                          {a.scholarship?.program_name || a.scholarship?.school_name || "Scholarship"}
                        </div>
                        {a.scholarship?.program_name && a.scholarship?.school_name && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {a.scholarship.school_name}
                          </div>
                        )}
                      </button>
                      <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                        <span>{a.scholarship?.value_aud ? `$${a.scholarship.value_aud}` : "—"}</span>
                        {d !== null && (
                          <span className={d < 0 ? "text-destructive font-semibold" : d <= 7 ? "text-amber-700 font-semibold" : ""}>
                            {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "today" : `${d}d`}
                          </span>
                        )}
                      </div>

                      {col.key !== "completed" ? (
                        <div className="flex gap-1 mt-2">
                          {col.key !== "not_started" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => {
                                const idx = COLUMNS.findIndex((c) => c.key === col.key);
                                setStatus(a.id, COLUMNS[idx - 1].key);
                              }}
                            >
                              ←
                            </Button>
                          )}
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px] flex-1 gradient-brand text-primary-foreground"
                            onClick={() => {
                              const idx = COLUMNS.findIndex((c) => c.key === col.key);
                              setStatus(a.id, COLUMNS[idx + 1].key);
                            }}
                          >
                            {COLUMNS[COLUMNS.findIndex((c) => c.key === col.key) + 1].label} <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          {a.outcome ? (
                            <div className="flex items-center gap-1 text-[11px]">
                              <span
                                className={`px-2 py-0.5 rounded-full font-semibold ${
                                  a.outcome === "won"
                                    ? "bg-emerald-200 text-emerald-900"
                                    : a.outcome === "waitlisted"
                                    ? "bg-amber-200 text-amber-900"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {a.outcome.toUpperCase()}
                              </span>
                              {a.outcome === "won" && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-1 text-[10px]" onClick={() => setOutcome(a.id, "won")}>
                                Won
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-1 text-[10px]" onClick={() => setOutcome(a.id, "waitlisted")}>
                                Wait
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-1 text-[10px]" onClick={() => setOutcome(a.id, "lost")}>
                                Lost
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 gap-2">
                        <button
                          onClick={() => setOpenId(a.id)}
                          className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Details
                        </button>
                        {a.scholarship?.scholarship_url && (
                          <a
                            href={a.scholarship.scholarship_url}
                            target="_blank"
                            rel="noopener"
                            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Source
                          </a>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {apps.length === 0 && (
          <Card className="p-10 text-center mt-8">
            <Heart className="w-10 h-10 mx-auto text-primary mb-3" />
            <h3 className="font-display text-2xl font-bold mb-1">No applications yet</h3>
            <p className="text-muted-foreground mb-4">
              Shortlist any scholarship and it'll appear here automatically.
            </p>
            <Button asChild className="gradient-brand text-primary-foreground">
              <Link to="/shortlist">Open my shortlist</Link>
            </Button>
          </Card>
        )}
      </main>

      <ApplicationDetailDialog
        app={openApp}
        onClose={() => setOpenId(null)}
        onStatusChange={(status) => openApp && setStatus(openApp.id, status)}
      />
    </div>
  );
};

/* -------------------- Detail dialog -------------------- */

function ApplicationDetailDialog({
  app, onClose, onStatusChange,
}: {
  app: AppRow | null;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [essays, setEssays] = useState<EssayRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!app) {
      setItems([]); setEssays([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: ci }, { data: es }] = await Promise.all([
        supabase
          .from("application_checklist_items")
          .select("id, application_id, item_key, item_label, completed, completed_at")
          .eq("application_id", app.id)
          .order("item_label"),
        supabase
          .from("application_essays")
          .select("id, application_id, prompt, word_limit, draft, version, status, updated_at")
          .eq("application_id", app.id)
          .order("created_at"),
      ]);
      if (cancelled) return;
      setItems((ci ?? []) as ChecklistItem[]);
      setEssays((es ?? []) as EssayRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [app]);

  const toggleItem = async (it: ChecklistItem) => {
    const next = !it.completed;
    setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, completed: next } : x)));
    const { error } = await supabase
      .from("application_checklist_items")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", it.id);
    if (error) {
      setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, completed: it.completed } : x)));
      toast.error("Could not save");
    }
  };

  const saveEssay = async (e: EssayRow, patch: Partial<Pick<EssayRow, "draft" | "status">>, bumpVersion: boolean) => {
    const optimistic: EssayRow = {
      ...e,
      ...patch,
      version: bumpVersion ? e.version + 1 : e.version,
      updated_at: new Date().toISOString(),
    };
    setEssays((cur) => cur.map((x) => (x.id === e.id ? optimistic : x)));
    const payload: { draft?: string; status?: string; version?: number } = { ...patch };
    if (bumpVersion) payload.version = optimistic.version;
    const { error } = await supabase.from("application_essays").update(payload).eq("id", e.id);
    if (error) {
      setEssays((cur) => cur.map((x) => (x.id === e.id ? e : x)));
      toast.error("Could not save essay");
    } else if (bumpVersion) {
      toast.success(`Saved v${optimistic.version}`);
    }
  };

  const addPrompt = async () => {
    if (!app) return;
    const { data, error } = await supabase
      .from("application_essays")
      .insert({ application_id: app.id, prompt: "New essay prompt", draft: "" })
      .select()
      .single();
    if (error || !data) { toast.error("Could not add"); return; }
    setEssays((cur) => [...cur, data as EssayRow]);
  };

  const removeEssay = async (id: string) => {
    const prev = essays;
    setEssays((cur) => cur.filter((x) => x.id !== id));
    const { error } = await supabase.from("application_essays").delete().eq("id", id);
    if (error) { setEssays(prev); toast.error("Could not delete"); }
  };

  const due = parseDeadline(app?.scholarship?.application_close_date ?? null);
  const d = daysUntil(due);
  const completedCount = items.filter((i) => i.completed).length;

  return (
    <Dialog open={!!app} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {app && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">
                {app.scholarship?.program_name || app.scholarship?.school_name || "Application"}
              </DialogTitle>
              <DialogDescription>
                {app.scholarship?.school_name}
              </DialogDescription>
            </DialogHeader>

            {/* Meta strip */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {due && (
                <Badge variant="outline" className={d !== null && d < 0 ? "border-destructive text-destructive" : d !== null && d <= 7 ? "border-amber-500 text-amber-700" : ""}>
                  <CalendarClock className="w-3 h-3 mr-1" />
                  {due.toLocaleDateString()} {d !== null && (d < 0 ? `· ${Math.abs(d)}d overdue` : d === 0 ? "· today" : `· ${d}d left`)}
                </Badge>
              )}
              {app.scholarship?.value_aud && <Badge variant="outline">${app.scholarship.value_aud}</Badge>}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status</span>
                <Select value={app.status} onValueChange={onStatusChange}>
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                {/* Checklist */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-primary" /> Document checklist
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {completedCount}/{items.length}
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No required documents listed.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {items.map((it) => (
                        <li key={it.id}>
                          <button
                            onClick={() => toggleItem(it)}
                            className="w-full flex items-start gap-2 text-left text-sm py-1.5 px-2 rounded hover:bg-muted/60"
                          >
                            {it.completed
                              ? <CheckSquare className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                              : <Square className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
                            <span className={it.completed ? "line-through text-muted-foreground" : ""}>
                              {it.item_label}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Essays */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <PencilLine className="w-4 h-4 text-primary" /> Essays
                    </h3>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addPrompt}>
                      + Add prompt
                    </Button>
                  </div>
                  {essays.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No essay prompts. Add one to start tracking.</p>
                  ) : (
                    <div className="space-y-3">
                      {essays.map((e) => (
                        <EssayEditor
                          key={e.id}
                          essay={e}
                          onSave={(patch, bump) => saveEssay(e, patch, bump)}
                          onDelete={() => removeEssay(e.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EssayEditor({
  essay, onSave, onDelete,
}: {
  essay: EssayRow;
  onSave: (patch: Partial<Pick<EssayRow, "draft" | "status">>, bumpVersion: boolean) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(essay.draft ?? "");
  const [status, setStatus] = useState(essay.status);
  const dirty = draft !== essay.draft;
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  useEffect(() => {
    setDraft(essay.draft ?? "");
    setStatus(essay.status);
  }, [essay.id, essay.draft, essay.status]);

  return (
    <div className="rounded-lg border border-border p-3 bg-background">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-foreground line-clamp-2">{essay.prompt}</div>
        <Badge variant="outline" className="shrink-0 text-[10px]">v{essay.version}</Badge>
      </div>
      <Textarea
        value={draft}
        onChange={(ev) => setDraft(ev.target.value)}
        placeholder="Start writing your draft…"
        rows={4}
        className="text-sm mt-2"
      />
      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <div className="text-[11px] text-muted-foreground">
          {words} words{essay.word_limit ? ` / ${essay.word_limit}` : ""}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => { setStatus(v); onSave({ status: v }, false); }}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ESSAY_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-7 text-xs gradient-brand text-primary-foreground"
            disabled={!dirty}
            onClick={() => onSave({ draft }, true)}
          >
            Save v{essay.version + 1}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onDelete}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Applications;
