import { useEffect, useState } from "react";
import { Sparkles, LogOut, User, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { useNavigate } from "react-router-dom";
import logoHorizontal from "@/assets/logo-horizontal.svg";

const Navbar = () => {
  const { user, signOut } = useAuth();
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
      className={`fixed top-0 left-0 right-0 z-50 h-16 px-4 md:px-8 flex items-center justify-between transition-all duration-300 ${
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
          className="h-9 md:h-10 w-auto"
          draggable={false}
        />
      </a>

      <div className="flex items-center gap-1.5">
        <a
          href="/"
          className="hidden md:inline-block px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground/65 hover:bg-primary/8 hover:text-primary transition-all no-underline"
        >
          Browse
        </a>
        <button
          onClick={() => navigate("/shortlist")}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground/65 hover:bg-primary/8 hover:text-primary transition-all bg-transparent border-none cursor-pointer relative"
        >
          <Heart className="w-3.5 h-3.5" />
          Shortlist
          {count > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold px-1">
              {count}
            </span>
          )}
        </button>

        {user ? (
          <div className="flex items-center gap-2 ml-1">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-[12px] text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span className="max-w-[140px] truncate">{user.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all bg-transparent border-none cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/auth")}
            className="gradient-brand text-primary-foreground px-5 py-2 rounded-lg text-[12px] font-bold uppercase tracking-[0.08em] hover:opacity-95 transition-all flex items-center gap-1.5 shadow-brand border-none cursor-pointer ml-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Get Started
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
