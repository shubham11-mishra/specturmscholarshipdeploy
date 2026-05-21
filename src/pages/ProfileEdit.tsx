import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, MapPin, GraduationCap, Heart, User as UserIcon, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORIES = ["Academic", "Music", "Sport", "General"];
const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const YEAR_LEVELS = ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];

const ProfileEdit = () => {
  const { user, loading, refreshInterests } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [postcode, setPostcode] = useState("");
  const [suburb, setSuburb] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: interests }] = await Promise.all([
        supabase.from("profiles").select("full_name, state, postcode, suburb, year_level").eq("id", user.id).maybeSingle(),
        supabase.from("user_interests").select("category").eq("user_id", user.id),
      ]);
      setFullName(profile?.full_name ?? "");
      setStateCode(profile?.state ?? "");
      setPostcode(profile?.postcode ?? "");
      setSuburb(profile?.suburb ?? "");
      setYearLevel(profile?.year_level ?? "");
      setSelectedCategories(interests?.map((i) => i.category) ?? []);
      setInitializing(false);
    })();
  }, [user]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) return toast.error("Please enter your full name.");
    if (!stateCode || !/^\d{4}$/.test(postcode.trim())) return toast.error("Select state and a valid 4-digit postcode.");
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          state: stateCode,
          postcode: postcode.trim(),
          suburb: suburb.trim() || null,
          year_level: yearLevel || null,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: delErr } = await supabase.from("user_interests").delete().eq("user_id", user.id);
      if (delErr) throw delErr;
      if (selectedCategories.length > 0) {
        const { error: insErr } = await supabase
          .from("user_interests")
          .insert(selectedCategories.map((category) => ({ user_id: user.id, category })));
        if (insErr) throw insErr;
      }

      await refreshInterests();
      toast.success("Profile updated successfully.");
      setConfirmOpen(false);
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || initializing) {
    return (
      <div className="min-h-screen bg-background">

        <div className="pt-2 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      <main className="pt-2 pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-2">
              Your Profile
            </h1>
            <p className="text-sm text-muted-foreground">
              Update your details so we can personalize your opportunity matches.
            </p>
          </div>

          <form onSubmit={handleSaveClick} className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={user?.email ?? ""}
                disabled
                className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Current year level
              </label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
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
                <MapPin className="w-3.5 h-3.5" /> Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
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
                  inputMode="numeric"
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
                <Heart className="w-3.5 h-3.5" /> Interests & strengths
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
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.12em] cursor-pointer hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none shadow-lg"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update your profile details and personalize your opportunity matches.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleConfirmSave(); }} disabled={saving}>
              {saving ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileEdit;
