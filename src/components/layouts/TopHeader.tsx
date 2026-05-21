import { Link, useNavigate } from "react-router-dom";
import { Heart, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import NotificationsBell from "@/components/NotificationsBell";
import HelpButton from "@/components/HelpButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getInitials = (name?: string | null) =>
  (name || "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "S";

const TopHeader = ({ title }: { title: string }) => {
  const { fullName, signOut } = useAuth();
  const { count } = useShortlist();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString("en-AU", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const displayTitle =
    title === "Readiness"
      ? `${(fullName || "Your").split(" ")[0]}'s Readiness Wheel`
      : title;

  return (
    <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-[22px] font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
        {displayTitle}
      </h1>

      <div className="flex items-center gap-4">
        <span className="text-[13px] text-muted-foreground hidden md:inline">{today}</span>

        <HelpButton />

        <NotificationsBell scrolled />

        <Link to="/shortlist" className="relative no-underline group" aria-label="Shortlist">
          <Heart className="w-5 h-5 text-muted-foreground group-hover:text-[hsl(var(--spec-red))] transition" />
          {count > 0 && (
            <span
              className="absolute -top-1.5 -right-2 text-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1"
              style={{ background: "hsl(var(--gold))" }}
            >
              {count}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] text-foreground hover:opacity-90 transition border-none cursor-pointer"
              style={{ background: "hsl(var(--gold))" }}
              aria-label="Account menu"
            >
              {getInitials(fullName)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <UserIcon className="w-4 h-4 mr-2" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile/edit")}>
              <Settings className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopHeader;
