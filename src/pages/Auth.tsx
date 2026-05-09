import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff, Sparkles, Check, ChevronLeft, ChevronRight, User, BookOpen, Palette, Target, PartyPopper } from "lucide-react";
import logoMark from "@/assets/logo-mark.svg";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
const YEAR_LEVELS = ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];
const SCHOOL_TYPES = ["Government", "Catholic", "Independent", "Other"];
const GRADES = ["HD", "A", "B", "C", "D"] as const;
const GRADE_LABELS: Record<string, string> = { HD: "High Distinction (HD)", A: "Distinction (A)", B: "Credit (B)", C: "Pass (C)", D: "Below (D)" };
const SUBJECTS = ["English", "Mathematics", "Science", "History", "Geography", "PDHPE", "Visual Arts", "Music", "Drama", "Languages", "Computing/IT"];
const EXTRACURRICULARS = [
  "Music (instrument)", "Music (vocal)", "Drama / Theatre", "Visual Arts",
  "Dance", "Sport (team)", "Sport (individual)", "Debating / Public Speaking",
  "Student Leadership", "Community Volunteering", "STEM Club / Robotics", "Environmental Groups",
  "Cultural Groups",
];
const FINANCIAL_OPTIONS = ["Prefer not to say", "No financial need", "Some financial need", "Significant financial need"];
const TARGET_SCHOOLS = ["Knox Grammar", "Loreto Normanhurst", "Cranbrook", "The King's School", "Pymble Ladies' College", "Sydney Grammar", "Wenona", "Ravenswood", "Shore", "SCEGGS Darlinghurst"];
const SCHOLARSHIP_CATEGORIES = ["Academic Merit", "Music", "Sports", "STEM", "Arts", "Community Service", "All-Rounder", "Financial Need"];

const STEPS = [
  { label: "About You", icon: User, color: "hsl(var(--gold))" },
  { label: "Academic", icon: BookOpen, color: "hsl(var(--spec-green))" },
  { label: "Extracurriculars", icon: Palette, color: "hsl(var(--spec-blue))" },
  { label: "Goals", icon: Target, color: "hsl(var(--spec-red))" },
  { label: "Your Matches", icon: PartyPopper, color: "hsl(var(--spec-orange))" },
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 — About You
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [stateCode, setStateCode] = useState("");

  // Step 2 — Academic grades { subject: grade }
  const [grades, setGrades] = useState<Record<string, string>>({});

  // Step 3 — Extracurriculars
  const [extras, setExtras] = useState<string[]>([]);
  const [financial, setFinancial] = useState("Prefer not to say");

  // Step 4 — Goals
  const [targetYear, setTargetYear] = useState("Year 10");
  const [targetSchools, setTargetSchools] = useState<string[]>([]);
  const [scholarshipCats, setScholarshipCats] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 5 — computed matches from DB
  const [matchLoading, setMatchLoading] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [competitiveCount, setCompetitiveCount] = useState(0);
  const [matchPercent, setMatchPercent] = useState(0);
  const [topMatches, setTopMatches] = useState<Array<{ id: string; school_name: string; program_name: string | null; category: string | null; state: string | null }>>([]);

  useEffect(() => {
    if (step !== 4) return;
    let cancelled = false;
    (async () => {
      setMatchLoading(true);
      const { data } = await supabase
        .from("scholarships")
        .select("id, school_name, program_name, category, state, year_levels, gender_eligibility, is_active")
        .limit(2000);
      if (cancelled || !data) { setMatchLoading(false); return; }

      const norm = (s: string | null | undefined) => (s ?? "").toLowerCase();
      const cats = scholarshipCats.map((c) => norm(c));
      const yearNum = (yearLevel.match(/\d+/) || [""])[0];
      const targetYearNum = (targetYear.match(/\d+/) || [""])[0];

      const eligible = data.filter((s) => {
        // state match (or unspecified)
        const stateOk = !s.state || norm(s.state) === norm(stateCode);
        // year match (or unspecified)
        const yl = norm(s.year_levels);
        const yearOk = !yl || (!!yearNum && yl.includes(yearNum)) || (!!targetYearNum && yl.includes(targetYearNum));
        return stateOk && yearOk;
      });

      const matchesCategory = (s: typeof eligible[number]) => {
        if (!cats.length) return false;
        const c = norm(s.category);
        return cats.some((cat) => c.includes(cat) || cat.includes(c));
      };

      const competitive = eligible.filter((s) => {
        if (!matchesCategory(s)) return false;
        // bonus competitiveness: has grades or extras
        const hasStrengths = Object.values(grades).some((g) => g === "HD" || g === "A") || extras.length >= 2;
        return hasStrengths;
      });

      const pct = eligible.length
        ? Math.min(100, Math.round((competitive.length / eligible.length) * 100))
        : 0;

      setEligibleCount(eligible.length);
      setCompetitiveCount(competitive.length);
      setMatchPercent(pct);
      setTopMatches(
        (competitive.length ? competitive : eligible)
          .slice(0, 5)
          .map((s) => ({ id: s.id, school_name: s.school_name, program_name: s.program_name, category: s.category, state: s.state })),
      );
      setMatchLoading(false);
    })();
    return () => { cancelled = true; };
  }, [step, scholarshipCats, stateCode, yearLevel, targetYear, grades, extras]);

  useEffect(() => {
    const hash = window.location.hash;
    if (user && !hash.includes("type=recovery")) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setIsLogin(false);
  }, []);

  const toggleIn = (list: string[], setter: (v: string[]) => void, val: string) =>
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

  const handleGoogle = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) {
        setError(error.message || "Google sign-in failed");
        setSubmitting(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) { setError(err.message || "Something went wrong"); }
    finally { setSubmitting(false); }
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!firstName.trim() || !lastName.trim()) return "Please enter your first and last name.";
      if (!yearLevel) return "Please select your current year level.";
      if (!schoolType) return "Please select your school type.";
      if (!stateCode) return "Please select your state.";
      if (!/^\d{4}$/.test(postcode.trim())) return "Please enter a valid 4-digit postcode.";
      if (!email.trim()) return "Please enter your email.";
      if (password.length < 6) return "Password must be at least 6 characters.";
    }
    return null;
  };

  const goNext = async () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const goBack = () => { setError(""); setStep(Math.max(0, step - 1)); };

  const handleFinalSubmit = async () => {
    setError(""); setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            state: stateCode,
            postcode: postcode.trim(),
            suburb: suburb.trim(),
            year_level: yearLevel,
            school_type: schoolType,
            grades,
            extracurriculars: extras,
            financial_need: financial,
            target_year: targetYear,
            target_schools: targetSchools,
            scholarship_categories: scholarshipCats,
          },
        },
      });
      if (error && !error.message.toLowerCase().includes("rate limit")) throw error;

      const userId = data?.session?.user?.id ?? data?.user?.id;
      if (userId && scholarshipCats.length) {
        await supabase.from("user_interests").insert(
          scholarshipCats.map((category) => ({ user_id: userId, category }))
        );
      }
      toast.success("Welcome to Spectrum Tuition!");
      navigate("/");
    } catch (err: any) { setError(err.message || "Something went wrong"); }
    finally { setSubmitting(false); }
  };

  // ---------- LOGIN VIEW ----------
  if (isLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--gradient-canvas)" }}>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-3">
              <img src={logoMark} alt="Spectrum Tuition" className="w-10 h-10" />
              <span className="font-display text-xl font-extrabold tracking-tight text-foreground">SPECTRUM <span className="text-muted-foreground text-xs tracking-[0.3em]">TUITION</span></span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-foreground text-center">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your scholarship matches.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-md">
            {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all" />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 pr-12 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none shadow-brand">
                <Sparkles className="w-4 h-4" />{submitting ? "Please wait..." : "Sign In"}
              </button>
            </form>
            <div className="mt-5 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <button onClick={() => { setIsLogin(false); setStep(0); setError(""); }} className="text-accent font-semibold hover:text-accent/80 bg-transparent border-none cursor-pointer">Sign Up</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- SIGNUP WIZARD ----------
  const StepIndicator = () => (
    <div className="flex items-start justify-center gap-1 sm:gap-2 mb-8 max-w-3xl mx-auto">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.label} className="flex items-start flex-1">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0"
                style={{
                  background: done ? "hsl(var(--ink))" : active ? s.color : "hsl(var(--secondary))",
                  color: done || active ? "white" : "hsl(var(--muted-foreground))",
                  boxShadow: active ? `0 4px 16px ${s.color.replace(")", " / 0.4)")}` : "none",
                }}
              >
                {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-[11px] sm:text-xs mt-2 text-center font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-0.5 flex-1 mt-[22px] mx-1 rounded-full" style={{ background: i < step ? "hsl(var(--ink))" : "hsl(var(--border))" }} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-10" style={{ background: "var(--gradient-canvas)" }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-4">
            <img src={logoMark} alt="Spectrum Tuition" className="w-10 h-10" />
            <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
              SPECTRUM <span className="text-muted-foreground text-[10px] tracking-[0.3em] align-middle">TUITION</span>
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground text-center">
            {step === 4 ? "Finding your matches…" : "Let's build your scholarship profile"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Step {step + 1} of 5 · Takes less than 3 minutes</p>
        </div>

        <StepIndicator />

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-md">
          {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

          {/* STEP 1 — About You */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-foreground font-display text-xl font-bold">
                <User className="w-5 h-5" style={{ color: "hsl(var(--gold))" }} /> About You
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Student's First Name">
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Mia" className={inputCls} />
                </Field>
                <Field label="Last Name">
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Chen" className={inputCls} />
                </Field>
                <Field label="Current Year Level">
                  <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </Field>
                <Field label="School Type">
                  <select value={schoolType} onChange={(e) => setSchoolType(e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {SCHOOL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Suburb">
                  <input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Chatswood" className={inputCls} />
                </Field>
                <Field label="Postcode">
                  <input value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2067" className={inputCls} />
                </Field>
              </div>

              <Field label="State / Territory">
                <div className="flex flex-wrap gap-2">
                  {AU_STATES.map((s) => (
                    <button key={s} type="button" onClick={() => setStateCode(s)}
                      className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${stateCode === s ? "border-primary bg-primary/10 text-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Account</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} /></Field>
                  <Field label="Password">
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={`${inputCls} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground bg-transparent border-none cursor-pointer">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Academic */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-foreground font-display text-xl font-bold">
                <BookOpen className="w-5 h-5" style={{ color: "hsl(var(--spec-green))" }} /> Academic
              </div>
              <p className="text-sm text-muted-foreground">Set your current grade for each subject you study. This powers your match score.</p>
              <div className="space-y-2">
                {SUBJECTS.map((subj) => (
                  <div key={subj} className="flex items-center gap-3 py-1">
                    <div className="w-32 text-sm font-medium text-foreground shrink-0">{subj}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {GRADES.map((g) => {
                        const sel = grades[subj] === g;
                        return (
                          <button key={g} type="button" onClick={() => setGrades({ ...grades, [subj]: g })}
                            className={`w-9 h-9 rounded-md border text-xs font-bold transition-all cursor-pointer ${sel ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground/40"}`}>
                            {g}
                          </button>
                        );
                      })}
                    </div>
                    {grades[subj] && <div className="text-xs text-muted-foreground ml-2">{GRADE_LABELS[grades[subj]]}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — Extracurriculars */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-foreground font-display text-xl font-bold">
                <Palette className="w-5 h-5" style={{ color: "hsl(var(--spec-blue))" }} /> Extracurriculars
              </div>
              <p className="text-sm text-muted-foreground">Select all that apply — include anything in the last 2 years.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXTRACURRICULARS.map((x) => {
                  const sel = extras.includes(x);
                  return (
                    <button key={x} type="button" onClick={() => toggleIn(extras, setExtras, x)}
                      className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${sel ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                      {x}
                    </button>
                  );
                })}
              </div>
              <div className="pt-2">
                <p className="text-sm font-semibold text-foreground mb-2">Financial need indicator <span className="text-muted-foreground font-normal">(optional)</span></p>
                <div className="flex flex-wrap gap-2">
                  {FINANCIAL_OPTIONS.map((opt) => (
                    <button key={opt} type="button" onClick={() => setFinancial(opt)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer ${financial === opt ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">This unlocks means-tested and equity scholarships. Never shown to schools.</p>
              </div>
            </div>
          )}

          {/* STEP 4 — Goals */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-foreground font-display text-xl font-bold">
                <Target className="w-5 h-5" style={{ color: "hsl(var(--spec-red))" }} /> Goals
              </div>
              <Field label="Target entry year level">
                <select value={targetYear} onChange={(e) => setTargetYear(e.target.value)} className={inputCls}>
                  {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <p className="text-xs text-muted-foreground mt-1">We'll prioritise scholarships for this entry point.</p>
              </Field>
              <Field label="Target schools (select any)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TARGET_SCHOOLS.map((s) => {
                    const sel = targetSchools.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleIn(targetSchools, setTargetSchools, s)}
                        className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${sel ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Scholarship categories you're interested in">
                <div className="flex flex-wrap gap-2">
                  {SCHOLARSHIP_CATEGORIES.map((c) => {
                    const sel = scholarshipCats.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => toggleIn(scholarshipCats, setScholarshipCats, c)}
                        className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${sel ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {/* STEP 5 — Your Matches */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="flex items-center justify-center gap-2 text-foreground font-display text-xl font-bold mb-6">
                <PartyPopper className="w-5 h-5" style={{ color: "hsl(var(--spec-orange))" }} /> Your Matches
              </div>
              <div className="relative w-44 h-44 mx-auto mb-6">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
                    strokeDasharray={`${(2 * Math.PI * 44 * matchPercent) / 100} ${2 * Math.PI * 44}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 600ms ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display text-4xl font-extrabold text-foreground">{matchLoading ? "…" : matchPercent}</div>
                  <div className="text-xs text-muted-foreground">%</div>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">{matchLoading ? "Building your results…" : "Based on your profile, here's what we found."}</p>
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-foreground font-semibold mb-1">
                You're eligible for <span className="bg-foreground text-background rounded-md px-3 py-1 ml-1 font-bold">{eligibleCount} scholarship{eligibleCount === 1 ? "" : "s"}</span>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {competitiveCount > 0
                  ? `You're strongly competitive for ${competitiveCount} right now.`
                  : "Add more strengths to boost your competitiveness."}
              </p>

              {topMatches.length > 0 && (
                <div className="text-left bg-secondary/40 border border-border rounded-xl p-3 mb-6 max-h-52 overflow-y-auto">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-1">Top matches</div>
                  <ul className="space-y-1.5">
                    {topMatches.map((m) => (
                      <li key={m.id} className="text-sm text-foreground flex items-start gap-2 px-1">
                        <Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                        <span>
                          <span className="font-semibold">{m.school_name}</span>
                          {m.program_name ? <span className="text-muted-foreground"> · {m.program_name}</span> : null}
                          {m.category ? <span className="text-muted-foreground"> · {m.category}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button onClick={handleFinalSubmit} disabled={submitting}
                className="bg-primary text-primary-foreground rounded-xl px-6 py-3.5 text-sm font-bold cursor-pointer hover:opacity-95 transition-all inline-flex items-center gap-2 disabled:opacity-50 border-none shadow-brand">
                {submitting ? "Creating account…" : <>View your dashboard <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={goBack} disabled={step === 0}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button type="button" onClick={goNext}
              className="bg-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-bold cursor-pointer hover:opacity-95 transition-all inline-flex items-center gap-2 border-none shadow-brand">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="text-center mt-6 text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <button onClick={() => { setIsLogin(true); setError(""); }} className="text-accent font-semibold hover:text-accent/80 bg-transparent border-none cursor-pointer">Sign In</button>
        </div>
      </div>
    </div>
  );
};

const inputCls = "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-foreground mb-1.5 block">{label}</label>
    {children}
  </div>
);

export default Auth;
