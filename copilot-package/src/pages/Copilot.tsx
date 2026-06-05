import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { copilotSupabase } from "@/integrations/supabase/copilotClient";
import { Send, Sparkles, Loader2, TrendingUp, MessageSquare, ExternalLink, ChevronDown, ChevronUp, Columns2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { calculateMatch } from "@/lib/matching";
import type { StudentProfile, ScholarshipRow, MatchResult } from "@/lib/matching";

type Msg = { role: "user" | "assistant"; content: string };
type Tab = "chat" | "matches" | "compare";

interface RawScholarship {
  id: string;
  school_name: string;
  program_name?: string;
  category?: string;
  value_aud?: string;
  value_num?: string;
  year_levels?: string;
  application_close_date?: string;
  days_left?: string;
  closing_label?: string;
  state?: string;
  eligibility_criteria?: string;
  overview?: string;
  scholarship_url?: string;
  scholarship_confidence?: string;
  gender_eligibility?: string;
}

interface WinDetails {
  fits: string[];
  improve: string[];
  nextStep: string;
  competitiveness: "High" | "Medium" | "Low";
}

const QUICK_PROMPTS = [
  "Which 3 opportunities should I prioritise this month?",
  "Help me draft a personal statement opening.",
  "What's holding me back from the next band?",
  "Explain what the 8 wheel dimensions mean.",
];

const COMP_STYLE: Record<string, string> = {
  High:   "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low:    "bg-gray-100 text-gray-500",
};

const SCORE_BAR: Record<string, string> = {
  High:   "bg-green-500",
  Medium: "bg-yellow-400",
  Low:    "bg-gray-400",
};

function getWinDetails(student: StudentProfile, s: RawScholarship, result: MatchResult): WinDetails {
  const fits: string[] = [];
  const improve: string[] = [];
  const w = student.wheel as Record<string, number> | null | undefined;
  const cat = (s.category || "").toLowerCase();

  // Location alignment
  if (!s.state) {
    fits.push("Open to students nationally");
  } else if (student.state && s.state.toUpperCase() === student.state.toUpperCase()) {
    fits.push(`Available in your state (${s.state})`);
  }

  // Interest / school alignment
  if (s.category && student.scholarship_categories?.length) {
    const catLower = s.category.toLowerCase();
    const matchesInterest = student.scholarship_categories.some(c =>
      catLower.includes(c.toLowerCase()) || c.toLowerCase().includes(catLower)
    );
    if (matchesInterest) fits.push(`Matches your interest in ${s.category}`);
  }

  if (w) {
    const academic    = w.academic_self    ?? w.academic    ?? 0;
    const stem        = w.stem_self        ?? w.stem        ?? 0;
    const arts        = w.arts_self        ?? w.arts_creative ?? 0;
    const sports      = w.sports_self      ?? w.sports_fitness ?? 0;
    const leadership  = w.leadership_self  ?? w.leadership  ?? 0;
    const testReady   = w.test_readiness_self ?? w.test_readiness ?? 0;

    // Why it fits — profile strength signals
    if (academic >= 7 && (cat.includes("academic") || cat.includes("merit") || cat.includes("gifted")))
      fits.push("Strong academic profile");
    if (leadership >= 7 && (cat.includes("leadership") || cat.includes("all-rounder") || cat.includes("service")))
      fits.push("Strong leadership profile");
    if (arts >= 7 && (cat.includes("music") || cat.includes("arts") || cat.includes("creative") || cat.includes("performing")))
      fits.push("Strong arts & creative profile");
    if (sports >= 7 && (cat.includes("sport") || cat.includes("athletic")))
      fits.push("Strong sports profile");
    if (stem >= 7 && cat.includes("stem"))
      fits.push("Strong STEM profile");
    if (testReady >= 7)
      fits.push("Strong interview & test readiness");

    // What to improve — gap signals
    if (academic < 5 && (cat.includes("academic") || cat.includes("merit")))
      improve.push("Strengthen academic results");
    if (leadership < 5 && (cat.includes("leadership") || cat.includes("all-rounder") || cat.includes("service")))
      improve.push("Build leadership evidence (SRC, clubs, volunteering)");
    if (arts < 5 && (cat.includes("music") || cat.includes("arts") || cat.includes("creative")))
      improve.push("Build arts portfolio or performance history");
    if (sports < 5 && (cat.includes("sport") || cat.includes("athletic")))
      improve.push("Develop sports achievements and representation");
    if (testReady < 5 && result.score >= 50)
      improve.push("Build interview and test preparation");
  }

  // State mismatch (only relevant when no state filter was applied)
  if (s.state && student.state && s.state.toUpperCase() !== student.state.toUpperCase())
    improve.push(`Scholarship is in ${s.state} — not your state`);

  const studentYear = parseInt((student.year_level || "").replace(/\D/g, ""), 10);
  const yls = (s.year_levels || "").match(/\d+/g)?.map(Number).filter(n => n >= 3 && n <= 12) ?? [];
  if (yls.length > 0 && !isNaN(studentYear) && !yls.includes(studentYear))
    improve.push(`Required year levels: ${s.year_levels}`);

  if (result.locked && result.unlockReason) improve.push(result.unlockReason);

  if (improve.length === 0 && result.score < 55)
    improve.push("Strengthen your wheel scores to improve this match");

  // Suggested next step
  let nextStep = "";
  if (result.daysLeft !== null && result.daysLeft >= 0 && result.daysLeft <= 14)
    nextStep = `Apply within ${result.daysLeft} day${result.daysLeft === 1 ? "" : "s"} — closing soon!`;
  else if (result.daysLeft !== null && result.daysLeft > 0 && result.daysLeft <= 30)
    nextStep = `Apply within ${result.daysLeft} days`;
  else if (result.score >= 75)
    nextStep = "Strong match — start your application";
  else if (result.score >= 55)
    nextStep = "Good fit — review eligibility criteria";
  else
    nextStep = "Build your profile to strengthen this match";

  const competitiveness: WinDetails["competitiveness"] =
    result.score >= 70 ? "High" : result.score >= 45 ? "Medium" : "Low";

  return { fits, improve, nextStep, competitiveness };
}

// Map raw DB interest keys to human-readable labels (for display only)
const INTEREST_LABELS: Record<string, string> = {
  academic: "Academic / Merit", stem: "STEM", arts_creative: "Arts & Creative",
  sports_fitness: "Sports & Fitness", leadership: "Leadership", music: "Music",
  boarding: "Boarding", indigenous: "Indigenous", rural: "Rural / Regional",
  financial: "Financial Need / Bursary", "all-rounder": "All-Rounder",
  drama: "Drama", dance: "Dance", science: "Science", technology: "Technology",
  engineering: "Engineering", maths: "Mathematics", mathematics: "Mathematics",
};

// Map raw DB interest keys to exact scholarships.category values for DB matching
const INTEREST_TO_CATEGORY: Record<string, string> = {
  academic: "Academic", stem: "STEM", arts_creative: "Arts",
  sports_fitness: "Sports", leadership: "Leadership", music: "Music",
  boarding: "Boarding", indigenous: "Indigenous", rural: "Rural",
  financial: "Financial", drama: "Arts", dance: "Arts",
  science: "STEM", technology: "STEM", engineering: "STEM",
  maths: "STEM", mathematics: "STEM", "all-rounder": "All-Rounder",
};

const Copilot = () => {
  const { user, loading, location, yearLevel, fullName } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Hi${fullName ? ` ${fullName.split(" ")[0]}` : ""} — I'm your Spectrum Copilot. Ask me anything about opportunities, your readiness, or what to do next.` },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [context, setContext] = useState<Record<string, unknown> | null>(null);
  const [scholarships, setScholarships] = useState<RawScholarship[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [compareSchools, setCompareSchools] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, wheelRes, progRes, shortRes, activitiesRes, userInterestsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("wheel_scores").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_progress").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("navigator_shortlist").select("scholarship_id,match_score,match_band,status").eq("user_id", user.id),
        supabase.from("student_activities").select("activity_type,element_stage,points_earned,description").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("user_interests").select("category").eq("user_id", user.id),
      ]);

      const profile = profileRes.data;
      // Merge user_interests + profiles.scholarship_categories for complete interest list
      const userInterestKeys = userInterestsRes.data?.map(i => i.category) ?? [];
      const profileCategoryKeys = Array.isArray(profile?.scholarship_categories)
        ? (profile.scholarship_categories as string[])
        : [];
      const rawInterests = [...new Set([...userInterestKeys, ...profileCategoryKeys])];
      const interests = rawInterests.map(i => INTEREST_LABELS[i.toLowerCase()] ?? i);

      // Normalise wheel scores — live DB uses _self suffixed keys
      const rw = wheelRes.data as unknown as Record<string, number> | null;
      const wheel: import("@/lib/navigator").WheelScores | null = rw ? {
        academic:       rw.academic_self       ?? rw.academic       ?? 5,
        stem:           rw.stem_self           ?? rw.stem           ?? 5,
        arts_creative:  rw.arts_creative_self  ?? rw.arts_creative  ?? rw.arts_self  ?? 5,
        sports_fitness: rw.sports_fitness_self ?? rw.sports_fitness ?? rw.sports_self ?? 5,
        leadership:     rw.leadership_self     ?? rw.leadership     ?? 5,
        test_readiness: rw.test_readiness_self ?? rw.test_readiness ?? 5,
      } : null;

      // Fetch scholarships: match state OR national (null state). No year-level query
      // filter — JS matching handles it correctly with range expansion.
      let scholarshipsQuery = copilotSupabase
        .from("scholarships")
        .select("id,school_name,program_name,program_type,category,sub_type,value_aud,value_num,value_type,year_levels,application_open_date,application_close_date,days_left,closing_label,state,suburb,postcode,sector,school_sector,school_type,gender,eligibility_criteria,overview,description,scholarship_url,website_url,scholarship_confidence,gender_eligibility,number_awarded,test_month,test_provider,special_conditions,contact_email,contact_phone")
        .eq("is_active", "True");
      if (profile?.state) {
        scholarshipsQuery = scholarshipsQuery.or(`state.eq.${profile.state},state.is.null`);
      }
      const { data: scholarshipsData } = await scholarshipsQuery;

      const p = profile as Record<string, unknown> | null;
      const applyingYear = p?.applying_year_level
        ? `Year ${p.applying_year_level}`
        : (p?.target_year as string | null) ?? null;

      // Fetch gap recommendations for low-scoring wheel dimensions
      const lowDimensions: string[] = [];
      if (rw) {
        const dimScores: Record<string, number> = {
          academic:       rw.academic_self       ?? rw.academic       ?? 5,
          stem:           rw.stem_self           ?? rw.stem           ?? 5,
          arts_creative:  rw.arts_creative_self  ?? rw.arts_creative  ?? rw.arts_self  ?? 5,
          sports_fitness: rw.sports_fitness_self ?? rw.sports_fitness ?? rw.sports_self ?? 5,
          leadership:     rw.leadership_self     ?? rw.leadership     ?? 5,
          test_readiness: rw.test_readiness_self ?? rw.test_readiness ?? 5,
        };
        Object.entries(dimScores).forEach(([dim, score]) => { if (score < 6) lowDimensions.push(dim); });
      }
      let gapRecs: unknown[] = [];
      if (lowDimensions.length > 0) {
        const { data: gapData } = await supabase
          .from("gap_recommendations")
          .select("dimension,title,description,effort_level,priority")
          .in("dimension", lowDimensions)
          .eq("is_active", true)
          .order("display_order")
          .limit(10);
        gapRecs = (gapData as unknown[]) ?? [];
      }

      const sp: StudentProfile = {
        state: (p?.state as string) ?? null,
        postcode: (p?.postcode as string) ?? null,
        year_level: applyingYear ?? (p?.year_level as string) ?? yearLevel ?? null,
        target_year: (p?.target_year as string) ?? null,
        scholarship_categories: rawInterests.map(i => INTEREST_TO_CATEGORY[i.toLowerCase()] ?? i),
        wheel,
        band: progRes.data?.current_band ?? null,
        gender: (p?.gender as string) ?? null,
        is_indigenous: false,
        is_rural: false,
        financial_need: (p?.financial_need as string) ?? null,
        preferred_sectors: null,
      };

      setStudentProfile(sp);
      const rawRows = (scholarshipsData as RawScholarship[]) ?? [];
      setScholarships(rawRows);

      // Score and rank using the same engine as My Matches so the AI
      // receives the same top scholarships the student sees on the tab.
      const scoredForAI = rawRows
        .map(s => {
          const raw = s as unknown as Record<string, unknown>;
          const row: ScholarshipRow = {
            id: s.id, school_name: s.school_name, state: s.state ?? null,
            category: s.category ?? null, year_levels: s.year_levels ?? null,
            gender_eligibility: s.gender_eligibility ?? null,
            school_type: raw.school_type as string ?? null,
            sector: raw.sector as string ?? null,
            school_sector: raw.school_sector as string ?? null,
            value_num: s.value_num ?? null,
            application_close_date: s.application_close_date ?? null,
            days_left: s.days_left ?? null,
            scholarship_url: s.scholarship_url ?? null,
            scholarship_confidence: s.scholarship_confidence ?? null,
          };
          const result = calculateMatch(sp, row);
          return { ...s, match_score: result.score, match_reasons: result.reasons, match_tier: result.tier };
        })
        .sort((a, b) => b.match_score - a.match_score);

      const trim = (v: unknown, len = 150) =>
        typeof v === "string" && v.length > len ? v.slice(0, len) + "…" : v ?? null;

      const top15 = scoredForAI.slice(0, 30).map(s => {
        const raw = s as Record<string, unknown>;
        return {
          id: s.id,
          school_name: s.school_name,
          program_name: s.program_name,
          program_type: raw.program_type ?? null,
          category: s.category,
          sub_type: raw.sub_type ?? null,
          match_score: s.match_score,
          match_reasons: s.match_reasons,
          match_tier: s.match_tier,
          value_aud: s.value_aud,
          value_num: s.value_num,
          value_type: raw.value_type ?? null,
          year_levels: s.year_levels,
          gender_eligibility: s.gender_eligibility ?? null,
          school_type: raw.school_type ?? null,
          school_sector: raw.school_sector ?? null,
          gender: raw.gender ?? null,
          state: s.state,
          suburb: raw.suburb ?? null,
          postcode: raw.postcode ?? null,
          sector: raw.sector ?? null,
          closing_label: s.closing_label,
          application_close_date: s.application_close_date,
          days_left: s.days_left,
          number_awarded: raw.number_awarded ?? null,
          test_month: raw.test_month ?? null,
          test_provider: raw.test_provider ?? null,
          application_fee: raw.application_fee ?? null,
          overview: trim(raw.overview),
          eligibility_criteria: trim(raw.eligibility_criteria),
          special_conditions: trim(raw.special_conditions),
          contact_email: raw.contact_email ?? null,
          contact_phone: raw.contact_phone ?? null,
          scholarship_url: s.scholarship_url,
          website_url: raw.website_url ?? null,
        };
      });

      setLoadingContext(false);
      setContext({
        name: fullName,
        year_level: applyingYear ?? yearLevel,
        state: p?.state ?? location,
        postcode: p?.postcode ?? null,
        suburb: p?.suburb ?? null,
        gender: p?.gender ?? null,
        school_type: p?.school_type ?? null,
        target_schools: Array.isArray(p?.target_schools) ? p.target_schools : (p?.target_schools ?? null),
        financial_need: p?.financial_need ?? null,
        extracurriculars: p?.extracurriculars ?? [],
        target_year: p?.target_year ?? null,
        readiness_band: progRes.data?.current_band ?? null,
        readiness_xp: progRes.data?.total_points ?? null,
        wheel_scores: wheel,
        interests,
        raw_interests: rawInterests,
        recent_activities: (activitiesRes.data ?? []).slice(0, 5),
        shortlisted_count: shortRes.data?.length ?? 0,
        gap_recommendations: gapRecs,
        matching_scholarships: top15,
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
      const url = `${import.meta.env.VITE_COPILOT_SUPABASE_URL}/functions/v1/copilot-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_COPILOT_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ messages: next, context }),
      });
      if (!res.ok || !res.body) {
        const errBody = await res.text().catch(() => "");
        toast.error(`Copilot error ${res.status}: ${errBody.slice(0, 120) || "no response body"}`);
        setSending(false); setMessages(next); return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", acc = "";
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
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content ?? "";
            if (delta) { acc += delta; setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: acc }; return c; }); }
          } catch { /* ignore */ }
        }
      }
    } catch { toast.error("Network error talking to Copilot."); }
    finally { setSending(false); }
  };

  // Score all scholarships
  const scoredMatches = studentProfile
    ? scholarships.map(s => {
        const rawS = s as unknown as Record<string, unknown>;
        const row: ScholarshipRow = {
          id: s.id, school_name: s.school_name, state: s.state ?? null,
          category: s.category ?? null, year_levels: s.year_levels ?? null,
          gender_eligibility: s.gender_eligibility ?? null,
          school_type: rawS.school_type as string ?? null,
          sector: rawS.sector as string ?? null,
          school_sector: rawS.school_sector as string ?? null,
          value_num: s.value_num ?? null,
          application_close_date: s.application_close_date ?? null, days_left: s.days_left ?? null,
          scholarship_url: s.scholarship_url ?? null, scholarship_confidence: s.scholarship_confidence ?? null,
        };
        const result = calculateMatch(studentProfile, row);
        const details = getWinDetails(studentProfile, s, result);
        return { s, result, details };
      }).sort((a, b) => b.result.score - a.result.score)
    : [];

  // Group by school — each school once, sorted by best program score
  const schoolGroups = scoredMatches.reduce<Record<string, typeof scoredMatches>>((acc, m) => {
    const key = m.s.school_name?.trim() || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});
  const groupedSchools = Object.entries(schoolGroups)
    .sort((a, b) => b[1][0].result.score - a[1][0].result.score);

  const toggleSchool = (name: string) =>
    setExpandedSchools(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });

  const toggleCompare = (name: string) =>
    setCompareSchools(prev => {
      const n = new Set(prev);
      if (n.has(name)) { n.delete(name); }
      else if (n.size < 3) { n.add(name); }
      return n;
    });

  if (loading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto pt-2 pb-8 px-4 flex flex-col h-screen">

        {/* Header */}
        <header className="mb-3">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Spectrum Copilot</span>
          </div>
          <h1 className="text-3xl font-extrabold mt-1">Your opportunity coach</h1>
          <p className="text-sm text-muted-foreground">Personalised to your wheel, shortlist, and applications.</p>
        </header>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-3 border border-border rounded-xl p-1 bg-secondary/40 w-fit">
          <button onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "chat" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
          <button onClick={() => setActiveTab("matches")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "matches" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <TrendingUp className="w-4 h-4" /> My Matches
            {groupedSchools.length > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{groupedSchools.length}</span>
            )}
          </button>
          <button onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "compare" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Columns2 className="w-4 h-4" /> Compare
            {compareSchools.size > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{compareSchools.size}</span>
            )}
          </button>
        </div>

        {/* ── CHAT TAB ── */}
        {activeTab === "chat" && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                    {m.role === "assistant" ? (
                      m.content
                        ? <ReactMarkdown
                            components={{
                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                              li: ({children}) => <li className="leading-snug">{children}</li>,
                              strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                              h3: ({children}) => <p className="font-bold mt-2 mb-1">{children}</p>,
                              a: ({href, children}) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline underline-offset-2 hover:opacity-75 inline-flex items-center gap-0.5"
                                >
                                  {children}
                                  <ExternalLink className="w-3 h-3 inline-block ml-0.5" />
                                </a>
                              ),
                            }}
                          >{m.content}</ReactMarkdown>
                        : (sending && i === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : "…")
                    ) : m.content}
                  </div>
                </div>
              ))}
            </div>
            {messages.length <= 1 && !loadingContext && (
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} onClick={() => send(p)} disabled={sending} className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-primary/15 text-foreground border border-border transition-colors disabled:opacity-40">{p}</button>
                ))}
              </div>
            )}
            {loadingContext && messages.length <= 1 && (
              <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading your profile and matches…
              </p>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={loadingContext ? "Loading your profile…" : "Ask Copilot anything…"} disabled={sending || loadingContext}
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <button type="submit" disabled={sending || !input.trim()} className="px-4 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center gap-1.5">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
              </button>
            </form>
          </>
        )}

        {/* ── MY MATCHES TAB ── */}
        {activeTab === "matches" && (
          <div className="flex-1 overflow-y-auto space-y-3 pb-2">
            {groupedSchools.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                <p className="font-medium">No matches loaded yet</p>
                <p className="text-sm mt-1">Make sure your profile has a state and year level set.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {groupedSchools.length} schools matched — {scoredMatches.length} programs total. Sorted by best match.
                </p>

                {groupedSchools.map(([schoolName, programs]) => {
                  const best = programs[0];
                  const { details, result } = best;
                  const isExpanded = expandedSchools.has(schoolName);
                  const hasMultiple = programs.length > 1;

                  return (
                    <div key={schoolName} className="rounded-xl border border-border bg-card overflow-hidden">

                      {/* School header */}
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm leading-tight">{schoolName}</p>
                            {best.s.state && <p className="text-xs text-muted-foreground mt-0.5">{best.s.state}</p>}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${COMP_STYLE[details.competitiveness]}`}>
                            {details.competitiveness} Match
                          </span>
                        </div>

                        {/* Score bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Win probability</span>
                            <span className="text-lg font-extrabold">{result.score}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${SCORE_BAR[details.competitiveness]}`} style={{ width: `${result.score}%` }} />
                          </div>
                        </div>

                        {/* Why it fits */}
                        {details.fits.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 mb-1">Why it fits</p>
                            <ul className="space-y-0.5">
                              {details.fits.map((r, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                  <span className="text-green-500 shrink-0">✓</span> {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* What to improve */}
                        {details.improve.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-orange-600 mb-1">What to improve</p>
                            <ul className="space-y-0.5">
                              {details.improve.map((r, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                  <span className="text-orange-400 shrink-0">↑</span> {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Suggested next step */}
                        {details.nextStep && (
                          <div className="rounded-lg bg-primary/8 px-3 py-2">
                            <p className="text-xs font-semibold text-primary">Suggested next step</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{details.nextStep}</p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1 border-t border-border">
                          <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
                            {best.s.value_aud && <span className="font-medium text-foreground">{best.s.value_aud}</span>}
                            {best.s.closing_label && <span>{best.s.closing_label}</span>}
                            {!best.s.closing_label && best.s.application_close_date && <span>Closes {best.s.application_close_date}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCompare(schoolName)}
                              disabled={!compareSchools.has(schoolName) && compareSchools.size >= 3}
                              className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40 ${
                                compareSchools.has(schoolName)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                              }`}>
                              {compareSchools.has(schoolName) ? "✓ Comparing" : "+ Compare"}
                            </button>
                            {best.s.scholarship_url && (
                              <a href={best.s.scholarship_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Multiple programs toggle */}
                      {hasMultiple && (
                        <>
                          <button onClick={() => toggleSchool(schoolName)}
                            className="w-full flex items-center justify-between px-4 py-2 bg-secondary/40 text-xs text-muted-foreground hover:bg-secondary/70 transition-colors border-t border-border">
                            <span>{programs.length} programs available at this school</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-border">
                              {programs.map(({ s, result: r, details: d }) => (
                                <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{s.program_name || "General Scholarship"}</p>
                                    {s.category && <p className="text-xs text-muted-foreground">{s.category}</p>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COMP_STYLE[d.competitiveness]}`}>{r.score}%</span>
                                    {s.scholarship_url && (
                                      <a href={s.scholarship_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-70">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── COMPARE TAB ── */}
        {activeTab === "compare" && (() => {
          const selected = groupedSchools.filter(([name]) => compareSchools.has(name));

          if (compareSchools.size === 0) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <Columns2 className="w-10 h-10 opacity-30" />
                <p className="font-medium">No schools selected yet</p>
                <p className="text-sm">Go to <strong>My Matches</strong> and tap <strong>+ Compare</strong> on up to 3 schools.</p>
                <button onClick={() => setActiveTab("matches")} className="mt-2 text-sm text-primary font-medium hover:underline">
                  Go to My Matches →
                </button>
              </div>
            );
          }

          if (compareSchools.size === 1) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <Columns2 className="w-10 h-10 opacity-30" />
                <p className="font-medium">Select at least 2 schools to compare</p>
                <p className="text-sm">You have 1 school selected. Add 1–2 more from <strong>My Matches</strong>.</p>
                <button onClick={() => setActiveTab("matches")} className="mt-2 text-sm text-primary font-medium hover:underline">
                  Go to My Matches →
                </button>
              </div>
            );
          }

          const rows: { label: string; render: (best: typeof selected[0][1][0]) => React.ReactNode }[] = [
            {
              label: "Win Probability",
              render: ({ result, details }) => (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-extrabold">{result.score}%</span>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${SCORE_BAR[details.competitiveness]}`} style={{ width: `${result.score}%` }} />
                  </div>
                </div>
              ),
            },
            {
              label: "Competitiveness",
              render: ({ details }) => (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COMP_STYLE[details.competitiveness]}`}>
                  {details.competitiveness}
                </span>
              ),
            },
            {
              label: "Value",
              render: ({ s }) => <span className="text-sm font-medium">{s.value_aud || "—"}</span>,
            },
            {
              label: "Deadline",
              render: ({ s }) => (
                <span className="text-sm">
                  {s.closing_label || (s.application_close_date ? `Closes ${s.application_close_date}` : "—")}
                </span>
              ),
            },
            {
              label: "Year Levels",
              render: ({ s }) => <span className="text-sm">{s.year_levels || "—"}</span>,
            },
            {
              label: "Category",
              render: ({ s }) => <span className="text-sm">{s.category || "—"}</span>,
            },
            {
              label: "Why it fits",
              render: ({ details }) =>
                details.fits.length > 0 ? (
                  <ul className="space-y-1 text-left">
                    {details.fits.map((f, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-green-500 shrink-0">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-xs text-muted-foreground">—</span>,
            },
            {
              label: "What to improve",
              render: ({ details }) =>
                details.improve.length > 0 ? (
                  <ul className="space-y-1 text-left">
                    {details.improve.map((r, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-orange-400 shrink-0">↑</span> {r}
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-xs text-green-600 text-xs">Nothing critical</span>,
            },
            {
              label: "Suggested step",
              render: ({ details }) => <span className="text-xs text-primary font-medium">{details.nextStep}</span>,
            },
            {
              label: "Link",
              render: ({ s }) =>
                s.scholarship_url ? (
                  <a href={s.scholarship_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                ) : <span className="text-xs text-muted-foreground">—</span>,
            },
          ];

          return (
            <div className="flex-1 overflow-auto pb-2">
              <p className="text-sm text-muted-foreground mb-3">
                Comparing {selected.length} school{selected.length > 1 ? "s" : ""} — tap <strong>+ Compare</strong> on My Matches to change selection.
              </p>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="bg-secondary/50 border-b border-border">
                      <th className="w-28 px-3 py-2 text-left text-xs font-semibold text-muted-foreground"></th>
                      {selected.map(([name]) => (
                        <th key={name} className="px-3 py-2 text-center text-xs font-bold text-foreground">
                          {name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ label, render }) => (
                      <tr key={label} className="border-b border-border last:border-0 hover:bg-secondary/20">
                        <td className="px-3 py-3 text-xs font-semibold text-muted-foreground align-top whitespace-nowrap">{label}</td>
                        {selected.map(([name, programs]) => (
                          <td key={name} className="px-3 py-3 text-center align-top">
                            {render(programs[0])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      </main>
    </div>
  );
};

export default Copilot;
