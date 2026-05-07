import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, LogOut, User as UserIcon, Sparkles, GraduationCap, MapPin, Bookmark, Settings, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";
import { supabase } from "@/integrations/supabase/client";

interface UserDashboardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileData {
  full_name: string | null;
  state: string | null;
  postcode: string | null;
  suburb: string | null;
  year_level: string | null;
}

const UserDashboardSheet = ({ open, onOpenChange }: UserDashboardSheetProps) => {
  const { user, fullName, signOut } = useAuth();
  const { count } = useShortlist();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [{ data: p }, { data: i }] = await Promise.all([
        supabase.from("profiles").select("full_name, state, postcode, suburb, year_level").eq("id", user.id).maybeSingle(),
        supabase.from("user_interests").select("category").eq("user_id", user.id),
      ]);
      setProfile(p as ProfileData | null);
      setInterests(i?.map((r) => r.category) ?? []);
    })();
  }, [open, user]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const displayName = fullName || profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Friend";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const locationLine = [profile?.suburb, profile?.state, profile?.postcode].filter(Boolean).join(" · ") || "Add your location";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 border-l border-primary/15 bg-background overflow-y-auto"
      >
        {/* Header banner */}
        <div className="relative gradient-brand text-primary-foreground px-6 pt-8 pb-10">
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center border-none cursor-pointer text-primary-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-display text-xl font-extrabold">
              {initials || <UserIcon className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <SheetHeader className="text-left p-0 space-y-0.5">
                <SheetTitle className="text-primary-foreground text-lg font-display font-extrabold truncate">
                  {displayName}
                </SheetTitle>
                <p className="text-[12px] text-primary-foreground/75 truncate">{user?.email}</p>
              </SheetHeader>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-xl bg-white/12 backdrop-blur px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.1em] text-primary-foreground/70 font-semibold">Shortlisted</div>
              <div className="font-display text-2xl font-extrabold mt-0.5">{count}</div>
            </div>
            <div className="rounded-xl bg-white/12 backdrop-blur px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-[0.1em] text-primary-foreground/70 font-semibold">Year level</div>
              <div className="font-display text-base font-bold mt-1 truncate">{profile?.year_level || "—"}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* Quick info */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-foreground/80 truncate">{locationLine}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span className="text-foreground/80 truncate">{profile?.year_level || "Year level not set"}</span>
            </div>
            {interests.length > 0 && (
              <div className="flex items-start gap-2.5 text-sm">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((i) => (
                    <span key={i} className="text-[11px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav className="space-y-1.5">
            <DashItem icon={Bookmark} label="My Shortlist" badge={count > 0 ? String(count) : undefined} onClick={() => go("/shortlist")} />
            <DashItem icon={Settings} label="Edit Profile" onClick={() => go("/profile")} />
            <DashItem icon={Heart} label="Browse Scholarships" onClick={() => go("/")} />
          </nav>

          <div className="h-px bg-border" />

          <button
            onClick={async () => {
              onOpenChange(false);
              await signOut();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold text-sm py-3 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface DashItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  onClick: () => void;
}

const DashItem = ({ icon: Icon, label, badge, onClick }: DashItemProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/8 text-left text-sm font-medium text-foreground/85 hover:text-primary transition-all cursor-pointer bg-transparent"
  >
    <Icon className="w-4 h-4 text-primary" />
    <span className="flex-1">{label}</span>
    {badge && (
      <span className="bg-primary text-primary-foreground rounded-full min-w-[22px] h-[22px] flex items-center justify-center text-[11px] font-bold px-1.5">
        {badge}
      </span>
    )}
  </button>
);

export default UserDashboardSheet;
