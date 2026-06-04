import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCcw, Check, X, AlertTriangle, ExternalLink, Search, Loader2 } from "lucide-react";

type ImportRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  school_name: string;
  program_name: string | null;
  state: string | null;
  suburb: string | null;
  postcode: string | null;
  scholarship_url: string | null;
  description: string | null;
  year_levels: string | null;
  value_aud: string | null;
  category: string | null;
  link_broken: boolean;
  link_status_code: number | null;
  link_note: string | null;
  fetched_at: string;
};

export default function PendingApprovals() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scholarship_imports")
      .select("*")
      .eq("status", tab)
      .order("fetched_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data ?? []) as ImportRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-scholarships", { body: {} });
      if (error) throw error;
      toast.success(`Fetched ${data?.inserted_count ?? 0} new pending records (${data?.skipped_count ?? 0} skipped).`);
      setTab("pending");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const approve = async (row: ImportRow) => {
    setActingId(row.id);
    try {
      // Insert approved import into live scholarships table
      const { data: live, error: insErr } = await supabase.from("scholarships").insert({
        school_name: row.school_name,
        program_name: row.program_name,
        state: row.state,
        suburb: row.suburb,
        postcode: row.postcode,
        scholarship_url: row.scholarship_url,
        description: row.description,
        year_levels: row.year_levels,
        value_aud: row.value_aud,
        category: row.category,
        dataset_type: "scholarship",
      }).select("id").single();
      if (insErr) throw insErr;

      const { error: updErr } = await supabase
        .from("scholarship_imports")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
          approved_scholarship_id: live?.id ?? null,
        })
        .eq("id", row.id);
      if (updErr) throw updErr;

      toast.success(`Approved: ${row.school_name}`);
      setRows((r) => r.filter((x) => x.id !== row.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Approve failed");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (row: ImportRow) => {
    setActingId(row.id);
    const { error } = await supabase
      .from("scholarship_imports")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq("id", row.id);
    setActingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Rejected: ${row.school_name}`);
    setRows((r) => r.filter((x) => x.id !== row.id));
  };

  const filtered = rows.filter(r =>
    !q ||
    r.school_name.toLowerCase().includes(q.toLowerCase()) ||
    (r.program_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (r.state ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div>
            <h2 className="text-base font-bold">Scholarship data refresh</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fetch fresh records from configured sources. New records land here as <b>pending</b> and are not shown to students until approved.
            </p>
          </div>
          <Button onClick={refresh} disabled={refreshing}>
            {refreshing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Refreshing…</> : <><RefreshCcw className="w-4 h-4 mr-2" /> Refresh Data</>}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
            {(["pending", "approved", "rejected"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search school, program, state…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="divide-y">
        {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-16" /></div>) : (
          filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No {tab} records.</div>
          ) : filtered.map(row => (
            <div key={row.id} className="p-4 flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{row.school_name}</h3>
                  {row.program_name && <Badge variant="outline" className="text-[10px]">{row.program_name}</Badge>}
                  {row.state && <Badge variant="outline" className="text-[10px]">{row.state}</Badge>}
                  {row.category && <Badge variant="outline" className="text-[10px]">{row.category}</Badge>}
                  {row.link_broken && (
                    <Badge className="text-[10px] bg-destructive text-destructive-foreground">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Link broken{row.link_status_code ? ` · ${row.link_status_code}` : ""}
                    </Badge>
                  )}
                </div>
                {row.description && <p className="text-xs text-muted-foreground line-clamp-2">{row.description}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                  {row.year_levels && <span>{row.year_levels}</span>}
                  {row.value_aud && <span>· {row.value_aud}</span>}
                  {row.scholarship_url && (
                    <a href={row.scholarship_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="w-3 h-3" /> source
                    </a>
                  )}
                  <span>· fetched {new Date(row.fetched_at).toLocaleString()}</span>
                  {row.link_note && row.link_broken && <span className="text-destructive">· {row.link_note}</span>}
                </div>
              </div>
              {tab === "pending" && (
                <div className="flex gap-2 md:flex-shrink-0">
                  <Button size="sm" variant="outline" disabled={actingId === row.id} onClick={() => reject(row)}>
                    <X className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" disabled={actingId === row.id} onClick={() => approve(row)}>
                    {actingId === row.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                    Approve
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
