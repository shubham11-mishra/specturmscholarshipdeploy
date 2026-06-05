import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { Search, ShieldCheck, ShieldOff, UserPlus, Crown, Clock } from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  last_name: string | null;
  email: string | null;
  year_level: string | null;
};

const displayName = (p: Profile) => {
  const first = (p.full_name ?? "").trim();
  const last = (p.last_name ?? "").trim();
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (p.email) return p.email;
  return "Unnamed";
};

type AdminInvite = {
  id: string;
  email: string;
  invited_user_id: string | null;
  status: string;
  invited_at: string;
  accepted_at: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserManagement() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [pendingInvites, setPendingInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const setBusy = (id: string, on: boolean) =>
    setBusyIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });

  const load = async () => {
    setLoading(true);
    const [pRes, rRes, iRes] = await Promise.all([
      supabase.from("profiles").select("id,full_name,last_name,email,year_level").limit(1000),
      supabase.from("user_roles").select("user_id").eq("role", "admin"),
      supabase.from("admin_invitations").select("id,email,invited_user_id,status,invited_at,accepted_at").eq("status", "pending").order("invited_at", { ascending: false }),
    ]);
    setProfiles((pRes.data ?? []) as Profile[]);
    setAdminIds(new Set((rRes.data ?? []).map((r: any) => r.user_id)));
    setPendingInvites((iRes.data ?? []) as AdminInvite[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Grant: writes user_roles + admin_profiles + admin_invitations(accepted) so all 3
  // tables stay in sync with the UI.
  const grant = async (userId: string) => {
    const target = profiles.find(p => p.id === userId);
    if (!target) { toast.error("User not found"); return; }
    if (adminIds.has(userId)) { toast.info("Already an admin."); return; }

    setBusy(userId, true);
    // Optimistic
    setAdminIds(prev => new Set(prev).add(userId));

    const [{ error: roleErr }, { error: apErr }] = await Promise.all([
      supabase.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" },
      ),
      supabase.from("admin_profiles").upsert(
        { id: userId, email: target.email ?? "", full_name: target.full_name },
        { onConflict: "id" },
      ),
    ]);

    if (roleErr || apErr) {
      // rollback
      setAdminIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
      setBusy(userId, false);
      toast.error(roleErr?.message || apErr?.message || "Failed to grant admin");
      return;
    }

    await supabase.from("admin_invitations").insert({
      email: (target.email ?? "").toLowerCase(),
      invited_user_id: userId,
      invited_by: user?.id ?? null,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    });

    setBusy(userId, false);
    toast.success("Admin role granted");
  };

  // Revoke: removes role + clears any pending invitation for that user.
  // Does NOT delete admin_profiles (keeps audit trail).
  const revoke = async (userId: string) => {
    if (userId === user?.id && adminIds.size <= 1) {
      toast.error("You are the only administrator. Promote another admin before revoking your own access.");
      return;
    }
    setBusy(userId, true);
    // Optimistic
    const prevAdmins = adminIds;
    setAdminIds(prev => { const n = new Set(prev); n.delete(userId); return n; });

    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      setAdminIds(prevAdmins);
      setBusy(userId, false);
      toast.error(error.message);
      return;
    }
    await supabase
      .from("admin_invitations")
      .update({ status: "revoked" })
      .eq("invited_user_id", userId)
      .eq("status", "pending");
    setPendingInvites(prev => prev.filter(p => p.invited_user_id !== userId));
    setBusy(userId, false);
    toast.success("Admin role revoked");
  };

  const addAdminByEmail = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_RE.test(email)) { toast.error("Enter a valid email address."); return; }
    const existing = profiles.find(p => (p.email ?? "").toLowerCase() === email);
    if (existing && adminIds.has(existing.id)) {
      toast.info("That user is already an admin.");
      return;
    }
    setAdding(true);

    const { data, error } = await supabase.functions.invoke("invite-admin", {
      body: { email, redirectTo: "https://scholarshipsearcher.com.au/reset-password" },
    });
    if (error || (data && (data as any).error)) {
      toast.error(error?.message || (data as any)?.error || "Invite failed");
      setAdding(false);
      return;
    }
    toast.success((data as any)?.invited ? "Invitation email sent — admin role will be active after they accept." : "Admin role granted.");
    setNewAdminEmail("");
    setAdding(false);
    load();
  };

  // Admins shown only in the Administrators section
  const admins = profiles.filter(p => adminIds.has(p.id));
  // Lower list excludes admins (dedupe) and applies search
  const nonAdmins = profiles.filter(p => !adminIds.has(p.id));
  const filtered = nonAdmins.filter(p =>
    !q ||
    displayName(p).toLowerCase().includes(q.toLowerCase()) ||
    (p.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const isSoleAdmin = adminIds.size <= 1;

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
              placeholder="Invite admin by email — they'll receive a set-password link"
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
          ) : admins.map(a => {
            const isMe = a.id === user?.id;
            const disableRevoke = isMe && isSoleAdmin;
            return (
              <div key={a.id} className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                  {displayName(a).slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{displayName(a)}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                </div>
                <Badge className="bg-primary text-[10px]">ADMIN</Badge>
                {isMe && <Badge variant="outline" className="text-[10px]">You</Badge>}
                {disableRevoke ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button variant="outline" size="sm" disabled>
                          <ShieldOff className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      You are the only administrator. Promote another admin before removing your own access.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <ConfirmDialog
                    trigger={
                      <Button variant="outline" size="sm" disabled={busyIds.has(a.id)}>
                        <ShieldOff className="w-4 h-4 mr-1" />
                        {busyIds.has(a.id) ? "Removing…" : "Remove"}
                      </Button>
                    }
                    title="Remove admin role?"
                    description={`${displayName(a)} will lose access to the admin panel.`}
                    confirmLabel="Remove"
                    variant="destructive"
                    onConfirm={() => revoke(a.id)}
                  />
                )}
              </div>
            );
          })}
        </div>

        {pendingInvites.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Pending invitations</h3>
              <Badge variant="outline" className="text-[10px]">{pendingInvites.length}</Badge>
            </div>
            <div className="divide-y border rounded-lg">
              {pendingInvites.map(inv => (
                <div key={inv.id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0 truncate">{inv.email}</div>
                  <Badge variant="outline" className="text-[10px]">Awaiting setup</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(inv.invited_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* All users browser (admins excluded — they appear above) */}
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
          ) : filtered.map(p => (
            <div key={p.id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {displayName(p).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{displayName(p)}</div>
                <div className="text-xs text-muted-foreground truncate">{p.email}</div>
              </div>
              {p.year_level && <Badge variant="outline" className="text-[10px]">Year {p.year_level}</Badge>}
              <Button size="sm" onClick={() => grant(p.id)}><ShieldCheck className="w-4 h-4 mr-1" /> Make admin</Button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
