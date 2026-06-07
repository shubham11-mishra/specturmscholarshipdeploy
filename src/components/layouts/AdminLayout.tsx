import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileQuestion, BookOpen, Users, Trophy, Wrench, ArrowLeft, ClipboardCheck, LogOut } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { cn } from "@/lib/utils";
import { adminSignOut } from "@/lib/adminAuth";

const adminNav = [
  { label: "Admin Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Pending Approvals", path: "/admin/pending-approvals", icon: ClipboardCheck },
  { label: "Assessment Editor", path: "/admin/assessments", icon: Wrench },
  { label: "Question Bank", path: "/admin/questions", icon: FileQuestion },
  { label: "Passage Manager", path: "/admin/passages", icon: BookOpen },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Gamification Settings", path: "/admin/gamification", icon: Trophy },
];

const AdminLayout = ({ children, pageTitle }: { children: ReactNode; pageTitle: string }) => {
  const navigate = useNavigate();
  const handleSignOut = () => {
    adminSignOut();
    navigate("/sign-in", { replace: true });
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

          <div className="px-3 pb-4 pt-3 border-t border-white/10 space-y-1">
            <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-semibold text-white/70 hover:bg-white/5 hover:text-white no-underline">
              <ArrowLeft className="w-4 h-4" />
              Back to student app
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-semibold text-white/70 hover:bg-white/5 hover:text-white text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b bg-background flex items-center px-6">
            <h1 className="text-lg font-bold">{pageTitle}</h1>
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
