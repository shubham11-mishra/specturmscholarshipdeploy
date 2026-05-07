import { useEffect, useState } from "react";
import { Sparkles, ChevronDown, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import UserDashboardSheet from "./UserDashboardSheet";

const Navbar = () => {
  const { user, fullName } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 20);
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-20 px-4 md:px-8 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? "bg-card/95 backdrop-blur-xl border-b border-primary/10 shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <a
        href="/"
        className="flex items-center no-underline"
        aria-label="Spectrum — Every school. Every opportunity."
      >
        <img
          src={logoHorizontal}
          alt="Spectrum"
          className="h-14 md:h-16 w-auto"
          draggable={false}
        />
      </a>

      <div className="flex items-center gap-2">
        {user ? (
          <button
            onClick={() => setDashOpen(true)}
            aria-label="Open dashboard"
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-secondary border border-primary/15 hover:border-primary/40 hover:bg-primary/8 transition-all cursor-pointer"
          >
            <span className="w-7 h-7 rounded-full gradient-brand text-primary-foreground text-[11px] font-bold flex items-center justify-center">
              {(fullName || user.user_metadata?.full_name || user.email || "U")
                .split(" ")
                .map((n: string) => n[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase() || <UserIcon className="w-3.5 h-3.5" />}
            </span>
            <span className="text-[13px] font-semibold text-foreground max-w-[140px] truncate">
              {fullName || user.user_metadata?.full_name || user.email?.split("@")[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate("/auth")}
              className="px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-[0.08em] text-primary border border-primary/40 hover:bg-primary/8 transition-all bg-transparent cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/auth?mode=signup")}
              className="gradient-brand text-primary-foreground px-5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-[0.08em] hover:opacity-95 transition-all flex items-center gap-1.5 shadow-brand border-none cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get Started
            </button>
          </>
        )}
      </div>
      {user && <UserDashboardSheet open={dashOpen} onOpenChange={setDashOpen} />}
    </nav>
  );
};

export default Navbar;
