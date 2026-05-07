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
  const { user, signOut, fullName } = useAuth();
  const { count } = useShortlist();

  const isActive = (path: string) => pathname === path;

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

      <SidebarContent className="px-2">
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
