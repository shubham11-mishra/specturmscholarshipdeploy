import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Which 3 scholarships should I prioritise this month?",
  "Help me draft a personal statement opening.",
  "What's holding me back from the next band?",
  "Explain what the 8 wheel dimensions mean.",
];

const Copilot = () => {
  const { user, loading, location, yearLevel, fullName } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Hi${fullName ? ` ${fullName.split(" ")[0]}` : ""} — I'm your Spectrum Copilot. Ask me anything about scholarships, your readiness, or what to do next.` },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [wheelRes, progRes, shortRes, appsRes] = await Promise.all([
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_progress").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("navigator_shortlist").select("scholarship_id").eq("user_id", user.id),
        supabase.from("applications").select("status,outcome").eq("user_id", user.id),
      ]);
      setContext({
        name: fullName,
        location,
        year_level: yearLevel,
        wheel: wheelRes.data,
        progress: progRes.data,
        shortlisted_count: shortRes.data?.length ?? 0,
        applications: appsRes.data ?? [],
      });
    })();
  }, [user, fullName, location, yearLevel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setSending(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copilot-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: next, context }),
      });
      if (res.status === 429) { toast.error("Too many requests — try again in a moment."); setSending(false); setMessages(next); return; }
      if (res.status === 402) { toast.error("Workspace AI credits exhausted."); setSending(false); setMessages(next); return; }
      if (!res.ok || !res.body) { toast.error("Copilot is unavailable right now."); setSending(false); setMessages(next); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      toast.error("Network error talking to Copilot.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">

      <main className="max-w-3xl mx-auto pt-2 pb-8 px-4 flex flex-col h-screen">
        <header className="mb-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Spectrum Copilot</span>
          </div>
          <h1 className="text-3xl font-extrabold mt-1">Your scholarship coach</h1>
          <p className="text-sm text-muted-foreground">Personalised to your wheel, shortlist, and applications.</p>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {m.content || (sending && i === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : "…")}
              </div>
            </div>
          ))}
        </div>

        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button key={p} onClick={() => send(p)} className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/15 text-foreground border border-border transition-colors">
                {p}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Copilot anything…"
            disabled={sending}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" disabled={sending || !input.trim()} className="px-4 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center gap-1.5">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </form>
      </main>
    </div>
  );
};

export default Copilot;
