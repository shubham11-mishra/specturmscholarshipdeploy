import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

type Notification = { id: string; kind: string; title: string; body: string | null; link: string | null; read: boolean; created_at: string };

const NotificationsBell = ({ scrolled }: { scrolled: boolean }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as Notification[]);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unread = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  const open = (n: Notification) => {
    if (!n.read) supabase.from("notifications").update({ read: true }).eq("id", n.id).then(load);
    if (n.link) navigate(n.link);
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className={`relative inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all border-none cursor-pointer ${
            scrolled ? "text-foreground/70 hover:bg-primary/8 hover:text-primary bg-transparent" : "text-white hover:text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] bg-transparent"
          }`}
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground rounded-full min-w-[16px] h-[16px] flex items-center justify-center text-[10px] font-bold px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm">Notifications</h3>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
              You're all caught up.
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary transition-colors ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{n.title}</div>
                    {n.body && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                      {new Date(n.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
