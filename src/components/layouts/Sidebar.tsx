import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/logo-mark.svg";

const navItems = [
  { label: "Dashboard", icon: "📋", path: "/dashboard", end: true },
  { label: "Scholarships", icon: "🎯", path: "/" },
  { label: "Shortlist", icon: "❤️", path: "/shortlist" },
  { label: "Readiness", icon: "📊", path: "/readiness" },
  { label: "AI Copilot", icon: "✨", path: "/copilot", badge: "AI" },
  { label: "Assessments", icon: "📚", path: "/assessments" },
  { label: "Applications", icon: "📝", path: "/applications" },
  { label: "Wins", icon: "🏆", path: "/wins" },
];

const getInitials = (name?: string | null) =>
  (name || "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

type Props = { className?: string; onNavigate?: () => void };

const Sidebar = ({ className, onNavigate }: Props) => {
  const { fullName, location: loc, yearLevel } = useAuth();
  const { count: shortlistCount } = useShortlist();
  const { isAdmin, isParent } = useUserRole();

  return (
    <aside
      className={cn("w-60 flex-shrink-0 flex flex-col h-screen sticky top-0", className)}
      style={{ background: "hsl(var(--hero-dark))", color: "white" }}
    >
      <div className="px-6 py-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2.5 no-underline" onClick={onNavigate}>
          <img src={logoMark} alt="" className="w-8 h-8" />
          <div className="leading-tight">
            <div className="text-white font-bold text-[15px] tracking-wide" style={{ fontFamily: "var(--font-display)" }}>SPECTRUM</div>
            <div className="text-white/60 text-[9px] tracking-[0.2em] font-semibold">NAVIGATOR</div>
          </div>
        </Link>
      </div>

      {(isParent || isAdmin) && (
        <div className="px-4 pt-4">
          <div className="bg-white/5 rounded-full p-1 flex">
            <button className="flex-1 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-foreground" style={{ background: "hsl(var(--gold))" }}>
              🎓 Student
            </button>
            {isParent && (
              <button title="Switch to Parent dashboard" onClick={() => { onNavigate?.(); window.location.href = "/parent"; }}
                className="flex-1 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-white/60 hover:text-white transition">
                👥 Parent
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mx-4 my-4 bg-white/5 rounded-xl p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] text-foreground" style={{ background: "hsl(var(--gold))" }}>
            {getInitials(fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-semibold text-[13px] truncate">{fullName || "Student"}</div>
            <div className="text-white/55 text-[11px]">
              {yearLevel ? `Year ${yearLevel}` : "Student"}{loc.state ? ` · ${loc.state}` : ""}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-colors no-underline",
              isActive ? "text-foreground" : "text-white/75 hover:bg-white/5 hover:text-white",
            )}
            style={({ isActive }) => isActive ? { background: "hsl(var(--gold))" } : undefined}
          >
            {({ isActive }) => (
              <>
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.label === "Shortlist" && shortlistCount > 0 && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center", isActive ? "bg-foreground/15 text-foreground" : "text-white")}
                    style={!isActive ? { background: "hsl(var(--spec-red))" } : undefined}>
                    {shortlistCount}
                  </span>
                )}
                {item.badge && (
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--spec-red))" }}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {isAdmin && (
        <div className="px-3 pb-2">
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold no-underline text-white/75 hover:bg-white/5 hover:text-white"
          >
            <span className="text-base">🛠️</span>
            <span className="flex-1">Admin Panel</span>
            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: "hsl(var(--spec-red))" }}>
              ADMIN
            </span>
          </Link>
        </div>
      )}

      <div className="px-6 py-3 text-[10px] text-white/35">
        Spectrum Navigator · v1.0
      </div>
    </aside>
  );
};

export default Sidebar;
