import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { Search, ShieldCheck, ShieldOff, UserPlus, Crown } from "lucide-react";

type Profile = { id: string; full_name: string | null; email: string | null; year_level: string | null };

export default function UserManagement() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [pRes, rRes] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,year_level").limit(1000),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    setProfiles((pRes.data ?? []) as Profile[]);
    setAdminIds(new Set((rRes.data ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const grant = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) { toast.error(error.message); return; }
    toast.success("Admin role granted");
    load();
  };
  const revoke = async (userId: string) => {
    if (userId === user?.id) { toast.error("You can't revoke your own admin access."); return; }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) { toast.error(error.message); return; }
    toast.success("Admin role revoked");
    load();
  };

  const addAdminByEmail = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    const match = profiles.find(p => (p.email ?? "").toLowerCase() === email);
    if (!match) {
      toast.error("No user found with that email. They must sign up first.");
      setAdding(false);
      return;
    }
    if (adminIds.has(match.id)) {
      toast.info("That user is already an admin.");
      setAdding(false);
      return;
    }
    await grant(match.id);
    setNewAdminEmail("");
    setAdding(false);
  };

  const filtered = profiles.filter(p =>
    !q ||
    (p.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (p.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const admins = profiles.filter(p => adminIds.has(p.id));

  return (
    <div className="space-y-6">
      {/* Admin management section */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-base">Administrators</h2>
          <Badge variant="outline" className="ml-1 text-[10px]">{admins.length}</Badge>
        </div>

        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <UserPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Add admin by email (user must already have an account)"
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAdminByEmail()}
            />
          </div>
          <Button onClick={addAdminByEmail} disabled={adding || !newAdminEmail.trim()}>
            <ShieldCheck className="w-4 h-4 mr-1" /> Grant admin
          </Button>
        </div>

        <div className="divide-y border rounded-lg">
          {loading ? (
            <div className="p-4"><Skeleton className="h-10" /></div>
          ) : admins.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No administrators yet.</div>
          ) : admins.map(a => (
            <div key={a.id} className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                {(a.full_name ?? a.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{a.full_name || "Unnamed"}</div>
                <div className="text-xs text-muted-foreground truncate">{a.email}</div>
              </div>
              <Badge className="bg-primary text-[10px]">ADMIN</Badge>
              {a.id === user?.id ? (
                <Badge variant="outline" className="text-[10px]">You</Badge>
              ) : (
                <ConfirmDialog
                  trigger={<Button variant="outline" size="sm"><ShieldOff className="w-4 h-4 mr-1" /> Remove</Button>}
                  title="Remove admin role?"
                  description={`${a.full_name || a.email} will lose access to the admin panel.`}
                  confirmLabel="Remove"
                  variant="destructive"
                  onConfirm={() => revoke(a.id)}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* All users browser */}
      <Card className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </Card>

      <Card className="divide-y">
        {loading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-10" /></div>) : (
          filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No users match.</div>
          ) : filtered.map(p => {
            const isAdmin = adminIds.has(p.id);
            return (
              <div key={p.id} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {(p.full_name ?? p.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.full_name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
                {p.year_level && <Badge variant="outline" className="text-[10px]">Year {p.year_level}</Badge>}
                {isAdmin && <Badge className="bg-primary text-[10px]">ADMIN</Badge>}
                {isAdmin ? (
                  <ConfirmDialog
                    trigger={<Button variant="outline" size="sm"><ShieldOff className="w-4 h-4 mr-1" /> Revoke</Button>}
                    title="Revoke admin role?"
                    description="This user will lose access to the admin panel."
                    confirmLabel="Revoke"
                    variant="destructive"
                    onConfirm={() => revoke(p.id)}
                  />
                ) : (
                  <Button size="sm" onClick={() => grant(p.id)}><ShieldCheck className="w-4 h-4 mr-1" /> Make admin</Button>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
