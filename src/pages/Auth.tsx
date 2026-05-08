import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Eye, EyeOff, Sparkles, CheckCircle2, MapPin, GraduationCap, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import logoStacked from "@/assets/logo-stacked.svg";

const CATEGORIES = ["Academic", "Music", "Sport", "General"];
const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const YEAR_LEVELS = ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];

const FEATURES = [
  "4,000+ scholarships in one place",
  "Smart matching by year & category",
  "Save & track your shortlist",
  "Deadline alerts & reminders",
];

const STEPS = ["Account", "Location & Year", "Interests"];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [stateCode, setStateCode] = useState("");
  const [postcode, setPostcode] = useState("");
  const [suburb, setSuburb] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    if (user && !hash.includes("type=recovery")) navigate("/");
  }, [user, navigate]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") {
      setIsLogin(false);
    }
  }, []);

  const toggleCategory = (cat: string) =>
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const handleGoogle = async () => {
    setError("");
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        setError((result.error as Error).message || "Google sign-in failed");
        setSubmitting(false);
        return;
      }
      if (result.redirected) return;
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setSubmitting(false);
    }
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!fullName.trim()) return "Please enter your full name.";
      if (!email.trim()) return "Please enter your email.";
      if (password.length < 6) return "Password must be at least 6 characters.";
    }
    if (s === 1) {
      if (!yearLevel) return "Please select your current year level.";
      if (!stateCode || !/^\d{4}$/.test(postcode.trim())) return "Please select your state and enter a valid 4-digit postcode.";
    }
    if (s === 2) {
      if (selectedCategories.length === 0) return "Please select at least one interest.";
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => Math.min(2, s + 1));
  };

  const goBack = () => { setError(""); setStep((s) => Math.max(0, s - 1)); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally { setSubmitting(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(2);
    if (err) { setError(err); return; }
    setError(""); setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            state: stateCode,
            postcode: postcode.trim(),
            suburb: suburb.trim(),
            year_level: yearLevel,
          },
        },
      });
      if (error && !error.message.toLowerCase().includes("rate limit")) throw error;

      if (data?.session?.user) {
        const userId = data.session.user.id;
        const inserts = selectedCategories.map((category) => ({ user_id: userId, category }));
        const { error: interestsError } = await supabase.from("user_interests").insert(inserts);
        if (interestsError) throw interestsError;
      }
      toast.success("Account created! Welcome to Scholarship Searcher.");
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally { setSubmitting(false); }
  };

  const switchMode = (login: boolean) => {
    setIsLogin(login); setError(""); setStep(0);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* LEFT — Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-center items-center text-center px-10 py-16 overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(var(--hero-dark)) 0%, hsl(220 17% 15%) 100%)" }}>
        <div className="absolute top-0 left-0 right-0 rainbow-bar" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <img src={logoStacked} alt="Scholarship Searcher" className="w-32 h-32 mb-6 drop-shadow-xl" draggable={false} />
          <h2 className="font-display text-white text-3xl font-extrabold tracking-tight mb-2">
            Scholarship Searcher
          </h2>
          <p className="text-white/60 text-[11px] tracking-[0.28em] uppercase mb-12">
            Every School. Every Opportunity.
          </p>

          <ul className="space-y-4 text-left w-full">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-white/90 text-sm">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.8)" }} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* RIGHT — Form panel */}
      <main className="flex items-center justify-center px-4 sm:px-8 py-10 bg-background">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-1">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin
              ? "Sign in to access your saved scholarships."
              : step === 0
                ? "Start with the basics — takes less than a minute."
                : step === 1
                  ? "Where you are helps us surface local opportunities."
                  : "Pick what matters most to personalize your matches."}
          </p>

          {/* Step indicator (signup only) */}
          {!isLogin && (
            <div className="flex items-center gap-2 mb-6">
              {STEPS.map((label, i) => (
                <div key={label} className="flex-1 flex items-center gap-2">
                  <div className={`flex items-center gap-2 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border ${i < step ? "bg-primary border-primary text-primary-foreground" : i === step ? "border-primary text-primary bg-primary/10" : "border-border"}`}>
                      {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide hidden sm:inline">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer mb-4 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* LOGIN form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" aria-label="Email"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password" aria-label="Password"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all pr-16"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer flex items-center gap-1">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) { setError("Please enter your email first, then click Forgot Password."); return; }
                    setError(""); setSubmitting(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
                      if (error) throw error;
                      toast.success("Password reset link sent! Check your email.");
                    } catch (err: any) { setError(err.message || "Something went wrong"); } finally { setSubmitting(false); }
                  }}
                  className="text-xs text-accent font-semibold hover:text-accent/80 transition-colors bg-transparent border-none cursor-pointer"
                >Forgot password?</button>
              </div>
              <button type="submit" disabled={submitting} className="w-full gradient-brand text-primary-foreground rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none shadow-brand">
                <Sparkles className="w-4 h-4" />
                {submitting ? "Please wait..." : "Sign In"}
              </button>
            </form>
          ) : (
            /* SIGNUP wizard */
            <form onSubmit={step === 2 ? handleSignup : (e) => { e.preventDefault(); goNext(); }} className="space-y-4">
              {step === 0 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Smith"
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters"
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all pr-16" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer flex items-center gap-1">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" /> Current year level
                    </label>
                    <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} required
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer">
                      <option value="">Select year level</option>
                      {YEAR_LEVELS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Where are you located?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} required
                        className="w-full rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer">
                        <option value="">State</option>
                        {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))} required inputMode="numeric" pattern="\d{4}" placeholder="Postcode"
                        className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all" />
                    </div>
                    <input type="text" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Suburb (optional)"
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all" />
                  </div>
                </>
              )}

              {step === 2 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" /> Pick your interests & strengths
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const selected = selectedCategories.includes(cat);
                      return (
                        <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                          className={`relative rounded-xl border px-4 py-3 text-sm font-medium cursor-pointer transition-all flex items-center gap-2 ${selected ? "border-primary/60 bg-primary/10 text-primary glow-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
                          {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Select all that apply.</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                {step > 0 && (
                  <button type="button" onClick={goBack} className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <button type="submit" disabled={submitting} className="flex-1 gradient-brand text-primary-foreground rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none shadow-brand">
                  {step < 2 ? (<>Continue <ChevronRight className="w-4 h-4" /></>) : (<><Sparkles className="w-4 h-4" /> {submitting ? "Creating..." : "Create Account"}</>)}
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 text-center">
            <span className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button onClick={() => switchMode(!isLogin)} className="text-sm text-accent font-semibold hover:text-accent/80 transition-colors bg-transparent border-none cursor-pointer">
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
