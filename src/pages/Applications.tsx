import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Trophy, ExternalLink, CalendarClock, ChevronRight, Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

const COLUMNS: { key: string; label: string; tint: string }[] = [
  { key: "not_started", label: "Not started", tint: "bg-muted/50" },
  { key: "in_progress", label: "In progress", tint: "bg-amber-100/60" },
  { key: "submitted", label: "Submitted", tint: "bg-blue-100/60" },
  { key: "completed", label: "Decided", tint: "bg-emerald-100/60" },
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
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("applications")
        .select("id, scholarship_id, status, outcome, outcome_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      const rows = (data ?? []) as AppRow[];
      const ids = [...new Set(rows.map((r) => r.scholarship_id))];
      if (ids.length) {
        const { data: schs } = await supabase
          .from("scholarships")
          .select("id, program_name, school_name, application_close_date, days_left, value_aud, scholarship_url")
          .in("id", ids);
        const map = new Map((schs ?? []).map((s: any) => [s.id, s]));
        rows.forEach((r) => (r.scholarship = map.get(r.scholarship_id) ?? null));
      }
      setApps(rows);
      setLoading(false);
    })();
  }, [user]);

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
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground">Applications Hub</h1>
            <p className="text-muted-foreground mt-2">Move cards as you progress. Capture outcomes when decisions land.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="https://scholarshipsearcher.com.au/#results-grid">Browse opportunities</a>
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
                  <Link
                    key={app.id}
                    to={`/scholarships/${app.scholarship_id}`}
                    className={`shrink-0 w-44 p-3 rounded-lg border ${tone} hover:shadow-sm transition`}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wide">
                      {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : `${d}d left`}
                    </div>
                    <div className="text-sm font-semibold mt-1 line-clamp-2">
                      {app.scholarship?.program_name || app.scholarship?.school_name}
                    </div>
                    <div className="text-[11px] opacity-70 mt-1">{due.toLocaleDateString()}</div>
                  </Link>
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
                      <Link to={`/scholarships/${a.scholarship_id}`} className="block">
                        <div className="text-sm font-semibold text-foreground line-clamp-2">
                          {a.scholarship?.program_name || a.scholarship?.school_name || "Scholarship"}
                        </div>
                        {a.scholarship?.program_name && a.scholarship?.school_name && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {a.scholarship.school_name}
                          </div>
                        )}
                      </Link>
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

                      {a.scholarship?.scholarship_url && (
                        <a
                          href={a.scholarship.scholarship_url}
                          target="_blank"
                          rel="noopener"
                          className="flex items-center gap-1 text-[11px] text-primary mt-2 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Open source
                        </a>
                      )}
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
            <h3 className="font-serif text-2xl font-bold mb-1">No applications yet</h3>
            <p className="text-muted-foreground mb-4">
              Start one from any scholarship's Detail page.
            </p>
            <Button asChild className="gradient-brand text-primary-foreground">
              <a href="https://scholarshipsearcher.com.au/#results-grid">Find scholarships</a>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Applications;
