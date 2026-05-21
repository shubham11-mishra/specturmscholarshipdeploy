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
import { Search, ShieldCheck, ShieldOff } from "lucide-react";

type Profile = { id: string; full_name: string | null; email: string | null; year_level: string | null };

export default function UserManagement() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [pRes, rRes] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,year_level").limit(500),
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

  const filtered = profiles.filter(p =>
    !q ||
    (p.full_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (p.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
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
