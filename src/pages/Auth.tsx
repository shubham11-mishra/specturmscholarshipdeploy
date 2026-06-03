import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Eye, EyeOff, Sparkles, Check, ChevronLeft, ChevronRight,
  User, Compass, Palette, Target, PartyPopper, Loader2,
} from "lucide-react";
import logoHorizontal from "@/assets/searcher-navbar-light.png";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CompassMark from "@/components/CompassMark";
import { stateFromPostcode, lookupSuburbsForPostcode } from "@/lib/postcode";
import { Slider } from "@/components/ui/slider";
import SpectrumWheel from "@/components/navigator/SpectrumWheel";
import {
  WHEEL_DIMENSIONS, DEFAULT_WHEEL_SCORES, type WheelScores,
} from "@/lib/navigator";
import { saveWheelScoresForUser } from "@/lib/wheelScores";
import {
  rankEligible, dedupeBySchool, getMatchBand,
  type Student, type ScholarshipRow,
} from "@/lib/matchingEngine";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];
const YEAR_LEVELS = ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];
const APPLY_YEAR_LEVELS = ["Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];
const SCHOOL_TYPES = [
  { value: "government", label: "Government" },
  { value: "catholic", label: "Catholic" },
  { value: "independent", label: "Independent" },
  { value: "other", label: "Other" },
];
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const FAITHS = ["None", "Catholic", "Anglican", "Christian (other)", "Jewish", "Islamic", "Hindu", "Buddhist", "Other", "Prefer not to say"];
const SECTORS = [
  { value: "independent", label: "Independent" },
  { value: "catholic", label: "Catholic" },
  { value: "government", label: "Government" },
  { value: "anglican", label: "Anglican" },
  { value: "open_to_all", label: "Open to all" },
];
const BOARDING = [
  { value: "day_only", label: "Day only" },
  { value: "boarding_only", label: "Boarding only" },
  { value: "either", label: "Either" },
];
const TRAVEL_OPTIONS = [
  { value: 5, label: "5 km" }, { value: 10, label: "10 km" },
  { value: 25, label: "25 km" }, { value: 50, label: "50 km" },
  { value: 100, label: "100 km" }, { value: 999, label: "Any distance" },
];
const EXTRACURRICULARS = [
  "Music (instrument)", "Music (vocal)", "Drama", "Theatre", "Visual Arts",
  "Dance", "Sport (team)", "Sport (individual)", "Debating", "Public Speaking",
  "Student Leadership", "Community Volunteering", "STEM Club", "Robotics",
  "Environmental Groups", "Cultural Groups",
];
const FINANCIAL_OPTIONS = [
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "none", label: "No financial need" },
  { value: "some", label: "Some financial need" },
  { value: "significant", label: "Significant financial need" },
];
const SCHOLARSHIP_CATEGORIES = ["Academic Merit", "Music", "Sports", "STEM", "Arts", "Community Service", "All-Rounder", "Financial Need"];

const STEPS = [
  { label: "About You", icon: User, color: "hsl(var(--gold))" },
  { label: "Your Wheel", icon: Compass, color: "hsl(var(--spec-green))" },
  { label: "Background", icon: Palette, color: "hsl(var(--spec-blue))" },
  { label: "Goals", icon: Target, color: "hsl(var(--spec-red))" },
  { label: "Your Matches", icon: PartyPopper, color: "hsl(var(--spec-orange))" },
];

const yearNum = (s: string) => {
  const m = (s || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 1 — About You
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [yearLevel, setYearLevel] = useState("");
  const [currentSchoolName, setCurrentSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [stateCode, setStateCode] = useState("");

  // Step 2 — Wheel
  const [wheel, setWheel] = useState<WheelScores>(DEFAULT_WHEEL_SCORES);

  // Step 3 — Background
  const [extras, setExtras] = useState<string[]>([]);
  const [isIndigenous, setIsIndigenous] = useState(false);
  const [isRural, setIsRural] = useState(false);
  const [faithToggle, setFaithToggle] = useState(false);
  const [faith, setFaith] = useState("");
  const [financial, setFinancial] = useState("prefer_not_to_say");

  // Step 4 — Goals
  const currentYear = new Date().getFullYear();
  const [applyingYearLevel, setApplyingYearLevel] = useState("");
  const [targetStartYear, setTargetStartYear] = useState<number>(currentYear + 1);
  const [dreamSchools, setDreamSchools] = useState("");
  const [preferredSectors, setPreferredSectors] = useState<string[]>([]);
  const [willingToBoard, setWillingToBoard] = useState("");
  const [maxTravelKm, setMaxTravelKm] = useState<number>(999);
  const [hasSibling, setHasSibling] = useState(false);
  const [scholarshipCats, setScholarshipCats] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const [suburbOptions, setSuburbOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Step 5 — match results
  const [matchLoading, setMatchLoading] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [topMatches, setTopMatches] = useState<Array<ScholarshipRow & { matchScore: number }>>([]);

  // ----- step 5: load + score -----
  const buildStudent = (): Student => ({
    state: stateCode || null,
    gender: (gender || null) as Student["gender"],
    applyingYearLevel: yearNum(applyingYearLevel),
    preferredSectors,
    willingToBoard: (willingToBoard || null) as Student["willingToBoard"],
    isIndigenous,
    isRural,
    financialNeedIndicator: financial as Student["financialNeedIndicator"],
    hasSiblingEnrolled: hasSibling,
    dreamSchools,
    scholarshipCategoriesInterested: scholarshipCats,
    wheelScores: wheel,
  });

  useEffect(() => {
    if (step !== 4) return;
    let cancelled = false;
    (async () => {
      setMatchLoading(true);
      const { data } = await supabase
        .from("scholarships")
        .select("id, school_name, program_name, category, sub_type, state, sector, gender_eligibility, year_levels, application_close_date, days_left, is_active")
        .limit(5000);
      if (cancelled || !data) { setMatchLoading(false); return; }

      const ranked = rankEligible(buildStudent(), data as ScholarshipRow[]);
      const top = dedupeBySchool(ranked, 5);
      setEligibleCount(ranked.length);
      setTopMatches(top);
      setMatchLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Profile completeness — 0..100
  const completeness = useMemo(() => {
    let pts = 0; let total = 0;
    const inc = (cond: boolean, w = 1) => { total += w; if (cond) pts += w; };
    // step 1 required
    inc(!!firstName); inc(!!lastName); inc(!!gender); inc(!!yearLevel);
    inc(!!schoolType); inc(/^\d{4}$/.test(postcode)); inc(!!stateCode); inc(!!suburb);
    // step 1 optional
    inc(!!currentSchoolName, 0.5);
    // step 2 — wheel always present (default 5); reward if any non-5
    inc(Object.values(wheel).some((v) => v !== 5));
    // step 3
    inc(extras.length > 0); inc(isIndigenous || isRural || faithToggle, 0.5);
    inc(financial !== "prefer_not_to_say", 0.5);
    // step 4 optional
    inc(scholarshipCats.length > 0, 0.5);
    return Math.round((pts / total) * 100);
  }, [firstName, lastName, gender, yearLevel, schoolType, postcode, stateCode, suburb,
      currentSchoolName, wheel, extras, isIndigenous, isRural, faithToggle,
      financial, scholarshipCats]);

  // When a user lands here authenticated (e.g. via Google), check if they still
  // need to complete onboarding. If yes, drop them into the wizard starting at
  // the Wheel step so their data ends up in the DB (not the static 50/100).
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  useEffect(() => {
    const hash = window.location.hash;
    if (!user || hash.includes("type=recovery")) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, full_name, last_name, year_level, state, postcode, suburb, school_type")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.onboarding_completed) {
        navigate("/");
        return;
      }
      // Prefill what we have, jump into wizard at Wheel step
      const fullName = profile?.full_name || (user.user_metadata as any)?.full_name || "";
      const [fn, ...rest] = fullName.split(" ");
      if (fn && !firstName) setFirstName(fn);
      const ln = profile?.last_name || rest.join(" ");
      if (ln && !lastName) setLastName(ln);
      if (profile?.year_level && !yearLevel) setYearLevel(profile.year_level);
      if (profile?.state && !stateCode) setStateCode(profile.state);
      if (profile?.postcode && !postcode) setPostcode(profile.postcode);
      if (profile?.suburb && !suburb) setSuburb(profile.suburb);
      if (profile?.school_type && !schoolType) setSchoolType(profile.school_type);
      if (user.email && !email) setEmail(user.email);
      setIsLogin(false);
      setNeedsOnboarding(true);
      setStep((s) => (s === 0 ? 1 : s));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "signup") setIsLogin(false);
  }, []);

  // postcode → suburb + state
  useEffect(() => {
    if (!/^\d{4}$/.test(postcode)) { setSuburbOptions([]); return; }
    const inferred = stateFromPostcode(postcode);
    if (inferred && !stateCode) setStateCode(inferred);
    let cancelled = false;
    lookupSuburbsForPostcode(postcode).then((subs) => {
      if (cancelled) return;
      setSuburbOptions(subs);
      if (subs.length === 1 && !suburb) setSuburb(subs[0]);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postcode]);

  // email already-registered check
  useEffect(() => {
    if (isLogin) { setEmailTaken(false); return; }
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailTaken(false); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("email", trimmed).maybeSingle();
      setEmailTaken(!!data);
    }, 500);
    return () => clearTimeout(t);
  }, [email, isLogin]);

  const toggleIn = (list: string[], setter: (v: string[]) => void, val: string) =>
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);

  const handleGoogle = async () => {
    setError(""); setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/sign-in` },
      });
      if (error) { setError(error.message || "Google sign-in failed"); setSubmitting(false); }
    } catch (err: any) { setError(err.message || "Google sign-in failed"); setSubmitting(false); }
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

  // ----- validation -----
  const step0Valid =
    firstName.trim() && lastName.trim() && gender && yearLevel && schoolType &&
    /^\d{4}$/.test(postcode.trim()) && stateCode && suburb.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !emailTaken && password.length >= 8;
  const step3Valid = true;

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!firstName.trim() || !lastName.trim()) return "Please enter your first and last name.";
      if (!gender) return "Please select a gender option.";
      if (!yearLevel) return "Please select your current year level.";
      if (!schoolType) return "Please select your school type.";
      if (!/^\d{4}$/.test(postcode.trim())) return "Please enter a valid 4-digit postcode.";
      if (!stateCode) return "Please select your state.";
      if (!suburb.trim()) return "Please enter your suburb.";
      if (!email.trim()) return "Please enter your email.";
      if (emailTaken) return "That email is already registered. Please sign in instead.";
      if (password.length < 8) return "Password must be at least 8 characters.";
    }
    if (s === 3) {
      return null;
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) { setError(err); toast.error(err); return; }
    setError("");
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const goBack = () => { setError(""); setStep(Math.max(needsOnboarding ? 1 : 0, step - 1)); };

  const handleFinalSubmit = async () => {
    setError(""); setSubmitting(true);
    try {
      let userId: string | undefined = user?.id;

      // Only run signUp for brand-new email/password signups.
      if (!userId) {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: {
              full_name: `${firstName} ${lastName}`.trim(),
              last_name: lastName,
              gender,
              state: stateCode,
              postcode: postcode.trim(),
              suburb: suburb.trim(),
              year_level: yearLevel,
              school_type: schoolType,
              parent_email: parentEmail,
              current_school_name: currentSchoolName,
              current_school_type: schoolType ? schoolType.toLowerCase() : null,
              scholarship_categories: scholarshipCats,
              extracurriculars: extras,
              financial_need: financial,
              target_year: `Year ${yearNum(applyingYearLevel) ?? ""}`,
              is_indigenous: isIndigenous,
              is_rural: isRural,
              faith_background: faithToggle ? faith : null,
              preferred_sectors: preferredSectors,
              willing_to_board: willingToBoard,
              max_travel_km: maxTravelKm,
              has_sibling_enrolled: hasSibling,
              target_start_year: targetStartYear,
              applying_year_level: yearNum(applyingYearLevel),
              dream_schools: dreamSchools,
              onboarding_completed: true,
              wheel_scores: wheel,
            },
          },
        });
        if (error && !error.message.toLowerCase().includes("rate limit")) throw error;
        userId = data?.session?.user?.id ?? data?.user?.id;
      }

      if (userId) {
        await supabase.from("profiles").update({
          full_name: `${firstName} ${lastName}`.trim() || null,
          last_name: lastName || null,
          gender: gender || null,
          year_level: yearLevel || null,
          state: stateCode || undefined,
          postcode: postcode.trim() || undefined,
          suburb: suburb.trim() || null,
          school_type: schoolType || null,
          extracurriculars: extras,
          financial_need: financial,
          scholarship_categories: scholarshipCats,
          target_year: `Year ${yearNum(applyingYearLevel) ?? ""}`,
          parent_email: parentEmail || null,
          current_school_name: currentSchoolName || null,
          current_school_type: schoolType ? schoolType.toLowerCase() : null,
          is_indigenous: isIndigenous,
          is_rural: isRural,
          faith_background: faithToggle ? faith || null : null,
          preferred_sectors: preferredSectors,
          willing_to_board: willingToBoard,
          max_travel_km: maxTravelKm,
          has_sibling_enrolled: hasSibling,
          target_start_year: targetStartYear,
          applying_year_level: yearNum(applyingYearLevel),
          dream_schools: dreamSchools || null,
          onboarding_completed: true,
        }).eq("id", userId);

        const { error: wheelError } = await saveWheelScoresForUser(userId, wheel);
        if (wheelError) throw wheelError;

        if (scholarshipCats.length) {
          await supabase.from("user_interests").insert(
            scholarshipCats.map((category) => ({ user_id: userId, category })),
          );
        }
      }
      toast.success(`Welcome to Spectrum Navigator, ${firstName}! 🎉`);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      toast.error(err.message || "Could not save your profile.");
    } finally { setSubmitting(false); }
  };

  // ---------- LOGIN VIEW ----------
  if (isLogin) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-canvas)" }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-10 pt-28">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center mb-6">
              <Link to="/" aria-label="Back to home" className="mb-3 no-underline">
                <img src={logoHorizontal} alt="Opportunity Searcher" className="h-12 w-auto" draggable={false} />
              </Link>
              <h1 className="font-display text-3xl font-extrabold text-foreground text-center">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to access your opportunity matches.</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-md">
              {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className={inputCls} />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Password" className={`${inputCls} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] cursor-pointer hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none shadow-brand">
                  <Sparkles className="w-4 h-4" />{submitting ? "Please wait..." : "Sign In"}
                </button>
              </form>
              <div className="mt-3 text-center text-sm">
                <button
                  type="button"
                  onClick={async () => {
                    setError("");
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                      setError("Enter your email above, then click Forgot password.");
                      return;
                    }
                    setSubmitting(true);
                    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    setSubmitting(false);
                    if (err) setError(err.message);
                    else setError("Password reset link sent. Check your email.");
                  }}
                  className="text-accent font-semibold hover:text-accent/80 bg-transparent border-none cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="mt-3 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <button onClick={() => { setIsLogin(false); setStep(0); setError(""); }} className="text-accent font-semibold hover:text-accent/80 bg-transparent border-none cursor-pointer">Sign Up</button>
              </div>

            </div>
          </div>
        </div>
        <footer className="border-t border-primary/10 py-8 px-4 md:px-8 flex flex-wrap items-center justify-between gap-4 bg-card/40">
          <div className="flex items-center gap-2.5">
            <CompassMark size={24} id="auth-footer" />
            <span className="text-[11px] tracking-[0.12em] text-foreground/40 uppercase">
              Spectrum · Every School. Every Opportunity.
            </span>
          </div>
          <div className="flex flex-wrap gap-5">
            {[
              { label: "About", to: "/about" },
              { label: "FAQ", to: "/faq" },
              { label: "Contact", to: "/contact" },
              { label: "Privacy", to: "/privacy" },
              { label: "Terms", to: "/terms" },
              { label: "Refunds", to: "/refunds" },
              { label: "Cookies", to: "/cookies" },
              { label: "Disclaimer", to: "/disclaimer" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.to}
                className="text-[11px] text-foreground/40 tracking-[0.08em] uppercase no-underline hover:text-primary transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
        </footer>
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-canvas)" }}>
      <Navbar />
      <div className="flex-1 px-4 py-10 pt-28">
        <div className="max-w-3xl mx-auto">
          <div>SIGNUP PLACEHOLDER</div>
        </div>
      </div>
      <footer className="border-t border-primary/10 py-8 px-4 md:px-8 flex flex-wrap items-center justify-between gap-4 bg-card/40">
        <div>Footer</div>
      </footer>
    </div>
  );
      </footer>
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

const Chip = ({ active, onClick, children, block }: { active: boolean; onClick: () => void; children: React.ReactNode; block?: boolean }) => (
  <button type="button" onClick={onClick}
    className={`${block ? "text-left w-full" : ""} px-4 py-2 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${active ? "border-primary bg-primary/10 text-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
    {children}
  </button>
);

const CheckboxRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-primary cursor-pointer" />
    {label}
  </label>
);

export default Auth;
