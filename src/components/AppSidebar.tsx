import { Home, Heart, User as UserIcon, Sparkles, LogIn, LogOut, Compass, GraduationCap, Users, Flame } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useShortlist } from "@/hooks/useShortlist";

const navItems = [
  { title: "Browse", url: "/", icon: Home },
  { title: "Shortlist", url: "/shortlist", icon: Heart, requiresAuth: true },
  { title: "Profile", url: "/profile", icon: UserIcon, requiresAuth: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut, fullName, viewMode, setViewMode, yearLevel, location, streakLabel } = useAuth();
  const { count } = useShortlist();

  const isActive = (path: string) => pathname === path;

  const initials = (fullName || user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <NavLink to="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-brand shrink-0">
            <Compass className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="font-display font-extrabold text-xl text-sidebar-foreground tracking-tight">
              Spectrum
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2 gap-3">
        {!collapsed && (
          <div className="px-2 space-y-3">
            {/* Student / Parent toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/8 border border-white/10">
              <button
                onClick={() => setViewMode("student")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer ${
                  viewMode === "student"
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                    : "bg-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Student
              </button>
              <button
                onClick={() => setViewMode("parent")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer ${
                  viewMode === "parent"
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                    : "bg-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Parent
              </button>
            </div>

            {/* User card */}
            {user && (
              <div className="p-3 rounded-xl bg-white/8 border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                      {fullName || user.email?.split("@")[0]}
                    </div>
                    <div className="text-[11px] text-sidebar-foreground/60 truncate">
                      {[yearLevel, location.state].filter(Boolean).join(" · ") || "Set up profile"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-400/90 to-pink-500/90 text-white text-[10px] font-bold">
                    <Flame className="w-3 h-3" />
                    {streakLabel || "Fire Band"}
                  </span>
                  <span className="text-[11px] text-sidebar-foreground/70 font-medium">
                    {count} {count === 1 ? "match" : "matches"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                if (item.requiresAuth && !user) return null;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`h-10 rounded-lg transition-all ${
                        active
                          ? "bg-white/15 text-sidebar-foreground font-semibold hover:bg-white/20"
                          : "text-sidebar-foreground/75 hover:bg-white/8 hover:text-sidebar-foreground"
                      }`}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && (
                          <span className="flex-1 text-sm">{item.title}</span>
                        )}
                        {!collapsed && item.title === "Shortlist" && count > 0 && (
                          <span className="bg-accent text-accent-foreground rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold">
                            {count}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        {user ? (
          <div className="space-y-2">
            {!collapsed && (
              <div className="px-3 py-2 rounded-lg bg-white/8">
                <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold">
                  Signed in
                </div>
                <div className="text-sm text-sidebar-foreground font-medium truncate">
                  {fullName || user.email?.split("@")[0]}
                </div>
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/75 hover:bg-white/10 hover:text-sidebar-foreground transition-all bg-transparent border-none cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => navigate("/auth?mode=signup")}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-primary to-accent text-white hover:opacity-95 transition-all border-none cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              {!collapsed && <span>Get Started</span>}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/85 hover:bg-white/10 hover:text-sidebar-foreground transition-all bg-transparent border border-white/15 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {!collapsed && <span>Sign In</span>}
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
