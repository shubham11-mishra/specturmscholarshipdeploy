import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  Search, Plus, MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  Pencil, ShieldOff, KeyRound, UserCog, Loader2,
} from "lucide-react";

type Profile = {
  id: string;
  full_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_REDIRECT = `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`;

type SortKey = "name" | "email" | "joined";
type SortDir = "asc" | "desc";

const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

export default function UserManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const setBusy = (id: string, on: boolean) =>
    setBusyIds(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

  const load = async () => {
    setLoading(true);
    // Fetch admin role rows then their profiles. Always joins live DB state.
    const { data: roles, error: rErr } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin");
    if (rErr) { toast.error(rErr.message); setLoading(false); return; }
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) { setAdmins([]); setLoading(false); return; }
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id,full_name,last_name,email,created_at")
      .in("id", ids);
    if (pErr) { toast.error(pErr.message); setLoading(false); return; }
    setAdmins((profs ?? []) as Profile[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = admins.filter(a => {
      if (!term) return true;
      const name = `${a.full_name ?? ""} ${a.last_name ?? ""}`.toLowerCase();
      return name.includes(term) || (a.email ?? "").toLowerCase().includes(term);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name") {
        const an = `${a.full_name ?? ""} ${a.last_name ?? ""}`.trim().toLowerCase();
        const bn = `${b.full_name ?? ""} ${b.last_name ?? ""}`.trim().toLowerCase();
        return an.localeCompare(bn) * dir;
      }
      if (sortKey === "email") return (a.email ?? "").localeCompare(b.email ?? "") * dir;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });
  }, [admins, q, sortKey, sortDir]);

  const addAdmin = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { toast.error("Enter a valid email address."); return; }
    if (admins.some(a => (a.email ?? "").toLowerCase() === email)) {
      toast.info("That user is already an admin.");
      return;
    }
    setAdding(true);
    const { data, error } = await supabase.functions.invoke("invite-admin", {
      body: { email, redirectTo: RESET_REDIRECT },
    });
    if (error || (data && (data as any).error)) {
      toast.error(error?.message || (data as any)?.error || "Invite failed");
      setAdding(false);
      return;
    }
    toast.success((data as any)?.invited
      ? "Invitation email sent — admin will appear once they finish set-up."
      : "Admin role granted.");
    setNewEmail("");
    setAddOpen(false);
    setAdding(false);
    load();
  };

  const removeAdmin = async (p: Profile) => {
    if (admins.length <= 1) {
      toast.error("Cannot remove the last administrator.");
      return;
    }
    if (p.id === user?.id) {
      toast.error("You cannot remove your own admin role.");
      return;
    }
    setBusy(p.id, true);
    const prev = admins;
    setAdmins(a => a.filter(x => x.id !== p.id));
    const { error } = await supabase
      .from("user_roles").delete().eq("user_id", p.id).eq("role", "admin");
    if (error) {
      setAdmins(prev);
      toast.error(error.message);
    } else {
      await supabase.from("admin_invitations")
        .update({ status: "revoked" })
        .eq("invited_user_id", p.id).eq("status", "pending");
      toast.success("Admin role removed.");
    }
    setBusy(p.id, false);
  };

  const sendReset = async (p: Profile) => {
    if (!p.email) { toast.error("No email on file."); return; }
    setBusy(p.id, true);
    const { error } = await supabase.auth.resetPasswordForEmail(p.email, { redirectTo: RESET_REDIRECT });
    setBusy(p.id, false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent.");
  };

  const openEdit = (p: Profile) => {
    setEditTarget(p);
    setEditFirst(p.full_name ?? "");
    setEditLast(p.last_name ?? "");
    setEditOpen(true);
  };
  const saveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: editFirst.trim() || null, last_name: editLast.trim() || null })
      .eq("id", editTarget.id);
    setEditSaving(false);
    if (error) { toast.error(error.message); return; }
    setAdmins(a => a.map(x => x.id === editTarget.id
      ? { ...x, full_name: editFirst.trim() || null, last_name: editLast.trim() || null }
      : x));
    setEditOpen(false);
    toast.success("Profile updated.");
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
      {children} <SortIcon k={k} />
    </button>
  );

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" /> Administrators
              <Badge variant="outline" className="ml-1 text-[10px]">{admins.length}</Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Manage admin access. Changes sync to the database immediately.</p>
          </div>
          <div className="md:ml-auto flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name or email…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add an Admin
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead><SortBtn k="name">First Name</SortBtn></TableHead>
                <TableHead>Surname</TableHead>
                <TableHead><SortBtn k="email">Email</SortBtn></TableHead>
                <TableHead><SortBtn k="joined">Joined Date</SortBtn></TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                    {q ? "No admins match your search." : "No administrators yet."}
                  </TableCell>
                </TableRow>
              ) : filtered.map(a => {
                const isMe = a.id === user?.id;
                const busy = busyIds.has(a.id);
                const canRemove = !isMe && admins.length > 1;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.full_name?.trim() || "—"}</TableCell>
                    <TableCell>{a.last_name?.trim() || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(a.created_at)}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Active</Badge>
                      {isMe && <Badge variant="outline" className="ml-1 text-[10px]">You</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={busy}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEdit(a)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <UserCog className="w-4 h-4 mr-2" /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendReset(a)}>
                            <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <ConfirmDialog
                            trigger={
                              <DropdownMenuItem
                                onSelect={(e) => { e.preventDefault(); }}
                                disabled={!canRemove}
                                className="text-destructive focus:text-destructive"
                              >
                                <ShieldOff className="w-4 h-4 mr-2" /> Remove Admin
                              </DropdownMenuItem>
                            }
                            title="Remove admin role?"
                            description={`${a.full_name ?? a.email ?? "This user"} will lose access to the admin panel.`}
                            confirmLabel="Remove"
                            variant="destructive"
                            onConfirm={() => removeAdmin(a)}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add admin dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an Admin</DialogTitle>
            <DialogDescription>
              Send an invitation. The user will receive an email to set their password, then appear in this table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email address</Label>
            <Input
              id="admin-email"
              type="email"
              placeholder="admin@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAdmin()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
            <Button onClick={addAdmin} disabled={adding || !newEmail.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
              {adding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : <><Plus className="w-4 h-4 mr-1" />Send Invitation</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin Profile</DialogTitle>
            <DialogDescription>{editTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-first">First Name</Label>
              <Input id="edit-first" value={editFirst} onChange={e => setEditFirst(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last">Surname</Label>
              <Input id="edit-last" value={editLast} onChange={e => setEditLast(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
