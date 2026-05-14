import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { Users, Copy, Plus, Trash2, GraduationCap, Trophy, Heart, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ChildSummary = {
  child_id: string;
  full_name: string | null;
  year_level: string | null;
  current_band: string | null;
  total_points: number | null;
  shortlisted_count: number;
  applications_count: number;
  wins_count: number;
};
type InviteCode = { id: string; code: string; expires_at: string; used_at: string | null };

const BAND_EMOJI: Record<string, string> = { Earth: "🟫", Water: "🟦", Fire: "🟧", Air: "⬜", Aether: "🟪" };

const generateCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};

const Parent = () => {
  const { user, loading } = useAuth();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [redeemCode, setRedeemCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [kidsRes, codesRes] = await Promise.all([
      supabase.rpc("get_linked_children_summary"),
      supabase.from("parent_invite_codes").select("id,code,expires_at,used_at").eq("child_id", user.id).order("created_at", { ascending: false }),
    ]);
    setChildren((kidsRes.data ?? []) as ChildSummary[]);
    setCodes((codesRes.data ?? []) as InviteCode[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const createCode = async () => {
    if (!user) return;
    setBusy(true);
    const code = generateCode();
    const { error } = await supabase.from("parent_invite_codes").insert({ child_id: user.id, code });
    setBusy(false);
    if (error) { toast.error("Couldn't create code"); return; }
    toast.success("Invite code created — share it with a parent");
    load();
  };

  const revokeCode = async (id: string) => {
    await supabase.from("parent_invite_codes").delete().eq("id", id);
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const redeem = async () => {
    if (!redeemCode.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("redeem_parent_invite", { _code: redeemCode.trim().toUpperCase() });
    setBusy(false);
    if (error) {
      const msg = error.message.includes("invalid_or_expired") ? "Invalid or expired code" :
                  error.message.includes("cannot_link_self") ? "You can't link to yourself" :
                  "Couldn't redeem code";
      toast.error(msg);
      return;
    }
    toast.success("Linked! Loading their dashboard…");
    setRedeemCode("");
    load();
  };

  const unlink = async (childId: string) => {
    if (!user) return;
    if (!confirm("Remove this child from your dashboard?")) return;
    await supabase.from("parent_links").delete().eq("parent_id", user.id).eq("child_id", childId);
    toast.success("Unlinked");
    load();
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">

      <main className="max-w-5xl mx-auto pt-2 pb-16 px-4">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-primary">
            <Users className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Parent dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-1">Your students</h1>
          <p className="text-muted-foreground mt-1">Track readiness, applications, and wins for the kids you mentor.</p>
        </header>

        {/* Linked children */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-4">Linked students ({children.length})</h2>
          {children.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No students linked yet. Ask your child to share a 6-character invite code from this page, then enter it below.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {children.map((c) => (
                <div key={c.child_id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-bold text-lg">{c.full_name ?? "Unnamed student"}</div>
                      <div className="text-xs text-muted-foreground">{c.year_level ? `Year ${c.year_level}` : "Year level not set"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl">{BAND_EMOJI[c.current_band ?? "Earth"] ?? "🟫"}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{c.current_band ?? "Earth"} band</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <Stat icon={<Sparkles className="w-3.5 h-3.5" />} label="Points" value={c.total_points ?? 0} />
                    <Stat icon={<Heart className="w-3.5 h-3.5" />} label="Shortlist" value={Number(c.shortlisted_count)} />
                    <Stat icon={<GraduationCap className="w-3.5 h-3.5" />} label="Apps" value={Number(c.applications_count)} />
                    <Stat icon={<Trophy className="w-3.5 h-3.5" />} label="Wins" value={Number(c.wins_count)} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Link to="/scholarships" className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/15">
                      Browse with them
                    </Link>
                    <button onClick={() => unlink(c.child_id)} className="text-xs text-muted-foreground hover:text-destructive p-2" aria-label="Unlink">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Redeem invite */}
        <section className="mb-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold mb-2">Link a student</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter the 6-character code your child shared with you.</p>
          <div className="flex gap-2">
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-lg font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={redeem} disabled={busy || redeemCode.length !== 6} className="px-5 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Link
            </button>
          </div>
        </section>

        {/* My invite codes (so a student-parent can also generate codes) */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">My invite codes</h2>
              <p className="text-sm text-muted-foreground">Share these with a parent to give them access to your dashboard.</p>
            </div>
            <button onClick={createCode} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New code
            </button>
          </div>
          {codes.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">No invite codes yet.</div>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => {
                const expired = new Date(c.expires_at) < new Date();
                const used = !!c.used_at;
                return (
                  <div key={c.id} className={`flex items-center justify-between rounded-xl border border-border p-3 ${used || expired ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-bold tracking-widest">{c.code}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary">
                        {used ? "Used" : expired ? "Expired" : `Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!used && !expired && (
                        <button onClick={() => copyCode(c.code)} className="p-2 text-muted-foreground hover:text-primary"><Copy className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => revokeCode(c.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-lg bg-secondary p-2 text-center">
    <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] font-bold uppercase">{icon}{label}</div>
    <div className="text-lg font-extrabold">{value}</div>
  </div>
);

export default Parent;
