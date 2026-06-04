import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If already signed in as admin, send through.
  useEffect(() => {
    if (!authLoading && !roleLoading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  // If signed in but NOT admin, bounce them out so they don't sit on this page logged in.
  useEffect(() => {
    if (!authLoading && !roleLoading && user && !isAdmin) {
      (async () => {
        await supabase.auth.signOut();
        toast.error("You do not have admin access.");
      })();
    }
  }, [authLoading, roleLoading, user, isAdmin]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      toast.error(error?.message || "Sign-in failed");
      setSubmitting(false);
      return;
    }

    // Verify admin role server-side via user_roles
    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");

    if (roleErr || !roles || roles.length === 0) {
      await supabase.auth.signOut();
      toast.error("You do not have admin access.");
      setSubmitting(false);
      return;
    }

    toast.success("Welcome back, admin.");
    navigate("/admin", { replace: true });
  };

  if (!authLoading && !roleLoading && user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "hsl(var(--hero-dark))" }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-white">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "hsl(var(--gold))" }}
          >
            <ShieldCheck className="w-6 h-6 text-foreground" />
          </div>
          <div className="font-bold text-xl tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            SPECTRUM
          </div>
          <div className="text-white/60 text-[10px] tracking-[0.25em] font-semibold">ADMIN PANEL</div>
        </div>

        <Card className="p-6">
          <h1 className="text-xl font-bold mb-1">Admin sign-in</h1>
          <p className="text-sm text-muted-foreground mb-5">
            Restricted access. Administrator credentials required.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-pw">Password</Label>
              <div className="relative">
                <Input
                  id="admin-pw"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</> : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-white/50 mt-4">
          Not an admin? <a href="/sign-in" className="underline text-white/80">Student sign-in</a>
        </p>
      </div>
    </div>
  );
}
