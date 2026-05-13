import { useEffect, useState } from "react";
import { Sparkles, LogOut, User, Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import NotificationsBell from "@/components/NotificationsBell";

const Navbar = () => {
  const { user, fullName, signOut } = useAuth();
  const { count } = useShortlist();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

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
        aria-label="Spectrum Navigator — Navigate every educational opportunity"
      >
        <img
          src={logoHorizontal}
          alt="Spectrum Navigator"
          className="h-12 md:h-14 w-auto"
          draggable={false}
        />
      </a>

      <div className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
        {(user
          ? [
              { label: "Home", to: "/" },
              { label: "Find Scholarships", to: "/scholarships" },
              { label: "My Wheel", to: "/wheel" },
              { label: "My Profile", to: "/profile" },
            ]
          : [
              { label: "Home", to: "/" },
              { label: "Find Schools", to: "/#results-grid" },
              { label: "About", to: "/#about" },
              { label: "Contact", to: "/#contact" },
            ]
        ).map((l) => (
          <a
            key={l.label}
            href={l.to}
            className={`text-[14px] font-semibold transition-colors no-underline ${
              scrolled ? "text-foreground/80 hover:text-primary" : "text-white hover:text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            }`}
          >
            {l.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {user && (
          <button
            onClick={() => navigate("/shortlist")}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-[0.08em] transition-all bg-transparent border-none cursor-pointer relative ${
              scrolled
                ? "text-foreground/65 hover:bg-primary/8 hover:text-primary"
                : "text-white hover:text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Shortlist
            {count > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1">
                {count}
              </span>
            )}
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={() => navigate("/profile")}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all border-none cursor-pointer ${
                scrolled
                  ? "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  : "bg-white/90 text-foreground hover:bg-white"
              }`}
              aria-label="Edit profile"
            >
              <User className="w-3.5 h-3.5" />
              <span className="max-w-[160px] truncate">{fullName || user.user_metadata?.full_name || user.email?.split("@")[0]}</span>
            </button>
            <button
              onClick={() => signOut()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all bg-transparent border-none cursor-pointer ${
                scrolled
                  ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  : "text-white hover:text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 ml-1">
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
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
