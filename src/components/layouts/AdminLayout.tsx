import { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { LayoutDashboard, FileQuestion, BookOpen, Users, Trophy, Wrench, ArrowLeft } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Admin Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Assessment Editor", path: "/admin/assessments", icon: Wrench },
  { label: "Question Bank", path: "/admin/questions", icon: FileQuestion },
  { label: "Passage Manager", path: "/admin/passages", icon: BookOpen },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Gamification Settings", path: "/admin/gamification", icon: Trophy },
];

const AdminLayout = ({ children, pageTitle }: { children: ReactNode; pageTitle: string }) => {
  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-secondary/40">
        <aside className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 bg-slate-900 text-white">
          <div className="px-6 py-5 border-b border-white/10">
            <div className="text-white font-bold text-[15px] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
              SPECTRUM
            </div>
            <div className="text-white/60 text-[9px] tracking-[0.2em] font-semibold">ADMIN PANEL</div>
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
                    isActive ? "bg-primary text-primary-foreground" : "text-white/75 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="px-3 pb-4">
            <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px] font-semibold text-white/70 hover:bg-white/5 hover:text-white no-underline">
              <ArrowLeft className="w-4 h-4" />
              Back to student app
            </Link>
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
