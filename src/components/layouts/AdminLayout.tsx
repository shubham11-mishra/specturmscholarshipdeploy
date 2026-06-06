import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Wrench, LogOut, ClipboardCheck } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const adminNav = [
  { label: "Admin Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Pending Approvals", path: "/admin/pending-approvals", icon: ClipboardCheck },
  { label: "Assessment Editor", path: "/admin/assessments", icon: Wrench },
  { label: "User Management", path: "/admin/users", icon: Users },
];

const AdminLayout = ({ children, pageTitle }: { children: ReactNode; pageTitle: string }) => {
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-secondary/40">
        <aside
          className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 text-white relative"
          style={{ background: "hsl(var(--hero-dark))" }}
        >
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "var(--gradient-rainbow)" }} />

          <div className="px-6 py-5 border-b border-white/10">
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-foreground font-bold"
                style={{ background: "hsl(var(--gold))" }}
              >
                S
              </div>
              <div className="leading-tight">
                <div className="text-white font-bold text-[15px] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  SPECTRUM
                </div>
                <div className="text-white/60 text-[9px] tracking-[0.2em] font-semibold">ADMIN PANEL</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {adminNav.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors no-underline",
                    isActive ? "text-foreground" : "text-white/75 hover:bg-white/5 hover:text-white",
                  )
                }
                style={({ isActive }) => (isActive ? { background: "hsl(var(--gold))" } : undefined)}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b bg-background flex items-center justify-between px-6">
            <h1 className="text-lg font-bold">{pageTitle}</h1>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto p-6 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
};

export default AdminLayout;
