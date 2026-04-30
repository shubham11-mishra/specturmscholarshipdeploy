import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, Sparkles, CheckCircle2, MapPin, GraduationCap, Heart } from "lucide-react";
import logoStacked from "@/assets/logo-stacked.svg";

const CATEGORIES = ["Academic", "Music", "Sport", "General"];
const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const YEAR_LEVELS = ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];

const FEATURES = [
  "2,400+ scholarships in one place",
  "Smart matching by year & category",
  "Save & track your shortlist",
  "Deadline alerts & reminders",
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
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

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGoogle = async () => {
    setError("");
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        if (!fullName.trim() || !email.trim() || password.length < 6) {
          setError("Please fill in your name, email, and a password (6+ chars).");
          setSubmitting(false);
          return;
        }
        if (!yearLevel) {
          setError("Please select your current year level.");
          setSubmitting(false);
          return;
        }
        if (!stateCode || !/^\d{4}$/.test(postcode.trim())) {
          setError("Please select your state and enter a valid 4-digit postcode.");
          setSubmitting(false);
          return;
        }
        if (selectedCategories.length === 0) {
          setError("Please select at least one interest category.");
          setSubmitting(false);
          return;
        }
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
          const inserts = selectedCategories.map((category) => ({
            user_id: userId,
            category,
          }));
          const { error: interestsError } = await supabase.from("user_interests").insert(inserts);
          if (interestsError) throw interestsError;
        }
        navigate("/");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* LEFT — Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-center items-center text-center px-10 py-16 overflow-hidden bg-gradient-to-br from-[#7B2D8E] via-[#6B2A85] to-[#2EC4B6]">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <img src={logoStacked} alt="Spectrum" className="w-32 h-32 mb-6 drop-shadow-xl" draggable={false} />
          <h2 className="font-display text-white text-4xl font-extrabold tracking-[0.18em] mb-2">
            SPECTRUM
          </h2>
          <p className="text-white/70 text-[11px] tracking-[0.28em] uppercase mb-12">
            Every School. Every Opportunity.
          </p>

          <ul className="space-y-4 text-left w-full">
            {FEATURES.map((feature, i) => (
              <li key={feature} className="flex items-center gap-3 text-white/90 text-sm">
                <span
                  className="w-2 h-2 rounded-full bg-[#2EC4B6] shrink-0"
                  style={{ boxShadow: "0 0 12px rgba(46,196,182,0.8)" }}
                />
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
            {isLogin ? "Sign In" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin
              ? "Welcome back. Access your saved scholarships."
              : "Tell us a bit about you to personalize your matches."}
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            )}

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                aria-label="Email"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Password"
                  aria-label="Password"
                  className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isLogin && (
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError("Please enter your email first, then click Forgot Password.");
                        return;
                      }
                      setError("");
                      setSubmitting(true);
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        if (error) throw error;
                        setError("Password reset link sent! Check your email.");
                      } catch (err: any) {
                        setError(err.message || "Something went wrong");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="text-xs text-accent font-semibold hover:text-accent/80 transition-colors bg-transparent border-none cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" /> Current year level
                  </label>
                  <select
                    value={yearLevel}
                    onChange={(e) => setYearLevel(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer"
                  >
                    <option value="">Select year level</option>
                    {YEAR_LEVELS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Where are you located?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all cursor-pointer"
                    >
                      <option value="">State</option>
                      {AU_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      required
                      inputMode="numeric"
                      pattern="\d{4}"
                      placeholder="Postcode"
                      className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="Suburb (optional)"
                    className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" /> Pick your interests & strengths
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const selected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`relative rounded-xl border px-4 py-3 text-sm font-medium cursor-pointer transition-all flex items-center gap-2 ${
                            selected
                              ? "border-primary/50 bg-primary/10 text-primary glow-primary"
                              : "border-border bg-secondary text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          }`}
                        >
                          {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Select all that apply.</p>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] cursor-pointer hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? (isLogin ? "Please wait..." : "Creating...") : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <span className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-sm text-accent font-semibold hover:text-accent/80 transition-colors bg-transparent border-none cursor-pointer"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
