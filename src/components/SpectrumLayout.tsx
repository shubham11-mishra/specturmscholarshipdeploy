import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Search, Target, Sparkles, KanbanSquare, CalendarDays, Bot, User, LogOut, Trophy } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import logoHorizontal from "@/assets/logo-horizontal.svg";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/onboarding", label: "Onboarding", icon: Sparkles },
  { to: "/matches", label: "Matches", icon: Search },
  { to: "/gaps", label: "Gap Analysis", icon: Target },
  { to: "/hub", label: "Application Hub", icon: KanbanSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/copilot", label: "AI Copilot", icon: Bot },
  { to: "/achievements", label: "Achievements", icon: Trophy },
];

const SpectrumLayout = ({ children }: { children: ReactNode }) => {
  const { user, fullName, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <a href="/dashboard" className="flex items-center px-2 py-2">
              <img src={logoHorizontal} alt="Spectrum" className="h-9 w-auto" />
            </a>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Spectrum Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center gap-2 ${isActive ? "bg-primary/10 text-primary font-semibold" : ""}`
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/profile")}>
                  <User className="h-4 w-4" />
                  <span className="truncate">{fullName || user?.email?.split("@")[0] || "Profile"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 gap-3 bg-card/50 backdrop-blur sticky top-0 z-40">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default SpectrumLayout;
