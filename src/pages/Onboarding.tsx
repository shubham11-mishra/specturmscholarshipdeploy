import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SpectrumLayout from "@/components/SpectrumLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const YEAR_LEVELS = ["Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"];
const ACHIEVEMENT_LEVELS = [
  { v: "school", l: "School" },
  { v: "regional", l: "Regional" },
  { v: "state", l: "State" },
  { v: "national", l: "National" },
  { v: "international", l: "International" },
];

const STEPS = ["About You", "Academic", "Extracurriculars", "Goals", "Matches"];

// State-aware academic field config
const academicFieldsForState = (state: string) => {
  switch (state) {
    case "NSW":
      return { gradeScale: "Bands 1-6 (HSC) / Letter (Junior)", placeholder: "e.g. Band 5 / A" };
    case "VIC":
      return { gradeScale: "VCE Study Score 0-50 / Letter (Junior)", placeholder: "e.g. 38 / B+" };
    case "QLD":
      return { gradeScale: "A-E (Senior) / 1-7 (Junior)", placeholder: "e.g. A / 6" };
    case "SA":
    case "WA":
    case "TAS":
    case "ACT":
    case "NT":
      return { gradeScale: "A-E / Percentage", placeholder: "e.g. A / 85%" };
    default:
      return { gradeScale: "Grade", placeholder: "Enter grade" };
  }
};

interface Subject { subject: string; grade: string; }
interface Activity { category: string; activity_name: string; level: string; years: number; notes?: string; }
interface TargetSchool { school_name: string; is_selective: boolean; boarding_preference: string; }

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [state, setState] = useState("NSW");
  const [yearLevel, setYearLevel] = useState("Year 7");
  const [citizenship, setCitizenship] = useState("Australian Citizen");
  const [indigenous, setIndigenous] = useState("No");
  const [regional, setRegional] = useState("Metropolitan");
  const [siblingEnrolled, setSiblingEnrolled] = useState(false);
  const [religion, setReligion] = useState("None / Prefer not to say");

  // Step 2
  const [naplanBand, setNaplanBand] = useState("");
  const [scholarshipTest, setScholarshipTest] = useState("");
  const [scholarshipScore, setScholarshipScore] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([
    { subject: "English", grade: "" }, { subject: "Mathematics", grade: "" },
  ]);

  // Step 3
  const [activities, setActivities] = useState<Activity[]>([
    { category: "Sport", activity_name: "", level: "school", years: 1, notes: "" },
  ]);

  // Step 4
  const [targets, setTargets] = useState<TargetSchool[]>([
    { school_name: "", is_selective: false, boarding_preference: "Day" },
  ]);
  const [feeTolerance, setFeeTolerance] = useState("Up to $20k");
  const [boardingPref, setBoardingPref] = useState("Day");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("student_profile").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setStep(data.current_step || 1);
        setCitizenship(data.citizenship || "Australian Citizen");
        setIndigenous(data.indigenous_status || "No");
        setRegional(data.regional_classification || "Metropolitan");
        setSiblingEnrolled(data.sibling_enrolled || false);
        setReligion(data.religious_affiliation || "None / Prefer not to say");
        setBoardingPref(data.boarding_preference || "Day");
        setFeeTolerance(data.fee_tolerance || "Up to $20k");
        if (data.onboarding_completed) navigate("/dashboard");
      }
    });
  }, [user, navigate]);

  const fields = academicFieldsForState(state);

  const saveStep1 = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("student_profile").upsert({
      user_id: user.id, citizenship, indigenous_status: indigenous,
      regional_classification: regional, sibling_enrolled: siblingEnrolled,
      religious_affiliation: religion, boarding_preference: boardingPref,
      fee_tolerance: feeTolerance, current_step: 2,
    });
    await supabase.from("profiles").update({ state, year_level: yearLevel }).eq("id", user.id);
    setSaving(false); setStep(2);
  };

  const saveStep2 = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("student_academic").delete().eq("user_id", user.id);
    const rows = subjects.filter((s) => s.subject && s.grade).map((s) => ({
      user_id: user.id, state, year_level: yearLevel, subject: s.subject,
      grade_value: s.grade, grade_scale: fields.gradeScale,
      naplan_band: naplanBand || null, scholarship_test: scholarshipTest || null,
      scholarship_score: scholarshipScore || null,
    }));
    if (rows.length) await supabase.from("student_academic").insert(rows);
    // Award academic baseline points
    if (rows.length) {
      await supabase.from("student_points_log").insert({
        user_id: user.id, activity_code: "onboarding_academic", dimension: "academic", points: 15,
        note: "Academic profile captured",
      });
    }
    await supabase.from("student_profile").update({ current_step: 3 }).eq("user_id", user.id);
    setSaving(false); setStep(3);
  };

  const saveStep3 = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("student_extracurriculars").delete().eq("user_id", user.id);
    const rows = activities.filter((a) => a.activity_name).map((a) => ({
      user_id: user.id, category: a.category, activity_name: a.activity_name,
      level: a.level as any, years_participated: a.years, notes: a.notes || null,
    }));
    if (rows.length) {
      await supabase.from("student_extracurriculars").insert(rows);
      await supabase.from("student_points_log").insert(rows.map((r) => ({
        user_id: user.id, activity_code: "onboarding_activity",
        dimension: r.category.toLowerCase().includes("leader") ? "leadership" as const : "co_curricular" as const,
        points: r.level === "national" ? 12 : r.level === "state" ? 8 : r.level === "regional" ? 5 : 3,
        note: `${r.activity_name} (${r.level})`,
      })));
    }
    await supabase.from("student_profile").update({ current_step: 4 }).eq("user_id", user.id);
    setSaving(false); setStep(4);
  };

  const saveStep4 = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("student_target_schools").delete().eq("user_id", user.id);
    const rows = targets.filter((t) => t.school_name).map((t) => ({
      user_id: user.id, school_name: t.school_name, is_selective: t.is_selective,
      boarding_preference: t.boarding_preference, label: "best_fit" as const,
    }));
    if (rows.length) await supabase.from("student_target_schools").insert(rows);
    await supabase.from("student_profile").update({ current_step: 5 }).eq("user_id", user.id);
    setSaving(false); setStep(5);
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("student_profile").update({ onboarding_completed: true }).eq("user_id", user.id);
    await supabase.from("student_badges").upsert({ user_id: user.id, badge_code: "scholar_in_training", tier: "earth" });
    toast.success("Onboarding complete! Welcome to Spectrum.");
    setSaving(false);
    navigate("/dashboard");
  };

  return (
    <SpectrumLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-4xl font-bold mb-2">Welcome to Spectrum</h1>
        <p className="text-muted-foreground mb-8">Let's build your scholarship readiness profile in 5 quick steps.</p>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((label, i) => {
            const idx = i + 1;
            const active = step === idx;
            const done = step > idx;
            return (
              <div key={label} className="flex-1 flex items-center">
                <div className={`flex flex-col items-center gap-1 ${active ? "text-primary" : done ? "text-accent" : "text-muted-foreground"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    active ? "bg-primary text-primary-foreground" : done ? "bg-accent text-accent-foreground" : "bg-muted"
                  }`}>{done ? <Check className="w-4 h-4" /> : idx}</div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
                </div>
                {idx < STEPS.length && <div className={`flex-1 h-px mx-2 ${done ? "bg-accent" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-semibold mb-3">About You</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Year Level</Label>
                  <Select value={yearLevel} onValueChange={setYearLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{YEAR_LEVELS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Citizenship / Residency</Label>
                  <Select value={citizenship} onValueChange={setCitizenship}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Australian Citizen">Australian Citizen</SelectItem>
                      <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                      <SelectItem value="Temporary Visa">Temporary Visa</SelectItem>
                      <SelectItem value="International">International Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Aboriginal / Torres Strait Islander</Label>
                  <Select value={indigenous} onValueChange={setIndigenous}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Aboriginal">Aboriginal</SelectItem>
                      <SelectItem value="Torres Strait Islander">Torres Strait Islander</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Location Type</Label>
                  <Select value={regional} onValueChange={setRegional}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Metropolitan">Metropolitan</SelectItem>
                      <SelectItem value="Regional">Regional</SelectItem>
                      <SelectItem value="Remote">Remote / Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Religious Affiliation</Label>
                  <Select value={religion} onValueChange={setReligion}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None / Prefer not to say">None / Prefer not to say</SelectItem>
                      <SelectItem value="Catholic">Catholic</SelectItem>
                      <SelectItem value="Anglican">Anglican</SelectItem>
                      <SelectItem value="Christian (other)">Christian (other)</SelectItem>
                      <SelectItem value="Jewish">Jewish</SelectItem>
                      <SelectItem value="Muslim">Muslim</SelectItem>
                      <SelectItem value="Hindu">Hindu</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Checkbox id="sib" checked={siblingEnrolled} onCheckedChange={(v) => setSiblingEnrolled(!!v)} />
                <Label htmlFor="sib" className="cursor-pointer">A sibling is currently enrolled at one of my target schools</Label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-semibold mb-1">Academic Profile</h2>
              <p className="text-sm text-muted-foreground mb-3">Grading scale for {state}: <strong>{fields.gradeScale}</strong></p>
              <div>
                <Label>Subjects & Grades</Label>
                {subjects.map((s, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                    <Input placeholder="Subject" value={s.subject} onChange={(e) => {
                      const c = [...subjects]; c[i].subject = e.target.value; setSubjects(c);
                    }} />
                    <Input placeholder={fields.placeholder} value={s.grade} onChange={(e) => {
                      const c = [...subjects]; c[i].grade = e.target.value; setSubjects(c);
                    }} />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setSubjects([...subjects, { subject: "", grade: "" }])}>+ Add subject</Button>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div><Label>NAPLAN Band (most recent)</Label>
                  <Input placeholder="e.g. Band 9" value={naplanBand} onChange={(e) => setNaplanBand(e.target.value)} />
                </div>
                <div><Label>Scholarship Test (if sat)</Label>
                  <Select value={scholarshipTest} onValueChange={setScholarshipTest}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACER">ACER</SelectItem>
                      <SelectItem value="Edutest">Edutest</SelectItem>
                      <SelectItem value="AAS">AAS</SelectItem>
                      <SelectItem value="None">Not yet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Test Score / Percentile</Label>
                  <Input placeholder="e.g. 92nd percentile" value={scholarshipScore} onChange={(e) => setScholarshipScore(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-semibold mb-3">Extracurriculars</h2>
              <p className="text-sm text-muted-foreground -mt-2">Tell us about activities, leadership, sport, music, service.</p>
              {activities.map((a, i) => (
                <Card key={i} className="p-3 space-y-2 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={a.category} onValueChange={(v) => { const c = [...activities]; c[i].category = v; setActivities(c); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sport">Sport</SelectItem>
                        <SelectItem value="Music">Music</SelectItem>
                        <SelectItem value="Debate">Debate / Public Speaking</SelectItem>
                        <SelectItem value="STEM">STEM / Academic Comp</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                        <SelectItem value="Leadership">Leadership Role</SelectItem>
                        <SelectItem value="Service">Community Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Activity name" value={a.activity_name} onChange={(e) => {
                      const c = [...activities]; c[i].activity_name = e.target.value; setActivities(c);
                    }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={a.level} onValueChange={(v) => { const c = [...activities]; c[i].level = v; setActivities(c); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ACHIEVEMENT_LEVELS.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" placeholder="Years" value={a.years} onChange={(e) => {
                      const c = [...activities]; c[i].years = +e.target.value; setActivities(c);
                    }} />
                  </div>
                  <Textarea placeholder="Tell us more (optional) — niche interests, achievements, context" value={a.notes}
                    onChange={(e) => { const c = [...activities]; c[i].notes = e.target.value; setActivities(c); }} />
                </Card>
              ))}
              <Button variant="outline" size="sm" onClick={() =>
                setActivities([...activities, { category: "Sport", activity_name: "", level: "school", years: 1 }])
              }>+ Add activity</Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-semibold mb-3">Goals & Target Schools</h2>
              {targets.map((t, i) => (
                <Card key={i} className="p-3 space-y-2 bg-muted/30">
                  <Input placeholder="School name (e.g. James Ruse, Scotch College)" value={t.school_name} onChange={(e) => {
                    const c = [...targets]; c[i].school_name = e.target.value; setTargets(c);
                  }} />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={t.is_selective} onCheckedChange={(v) => {
                        const c = [...targets]; c[i].is_selective = !!v; setTargets(c);
                      }} />
                      <Label className="cursor-pointer text-sm">Selective school</Label>
                    </div>
                    <Select value={t.boarding_preference} onValueChange={(v) => {
                      const c = [...targets]; c[i].boarding_preference = v; setTargets(c);
                    }}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Boarding">Boarding</SelectItem>
                        <SelectItem value="Either">Either</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              ))}
              <Button variant="outline" size="sm" onClick={() =>
                setTargets([...targets, { school_name: "", is_selective: false, boarding_preference: "Day" }])
              }>+ Add school</Button>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div><Label>Boarding preference</Label>
                  <Select value={boardingPref} onValueChange={setBoardingPref}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day">Day</SelectItem>
                      <SelectItem value="Boarding">Boarding</SelectItem>
                      <SelectItem value="Either">Either</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fee tolerance</Label>
                  <Select value={feeTolerance} onValueChange={setFeeTolerance}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Up to $10k">Up to $10k</SelectItem>
                      <SelectItem value="Up to $20k">Up to $20k</SelectItem>
                      <SelectItem value="Up to $35k">Up to $35k</SelectItem>
                      <SelectItem value="Up to $50k">Up to $50k</SelectItem>
                      <SelectItem value="Any">Any (full fee)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles />
              </div>
              <h2 className="font-display text-2xl font-semibold">You're all set!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We'll match you against thousands of Australian scholarships and start computing your readiness across the 7 dimensions.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-6 mt-4 border-t">
            <Button variant="outline" disabled={step === 1 || saving} onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < 5 ? (
              <Button disabled={saving} onClick={() => {
                if (step === 1) saveStep1();
                else if (step === 2) saveStep2();
                else if (step === 3) saveStep3();
                else if (step === 4) saveStep4();
              }}>
                {saving ? "Saving..." : "Continue"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button disabled={saving} onClick={finish}>
                {saving ? "Finishing..." : "Go to Dashboard"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </SpectrumLayout>
  );
};

import { Sparkles as SparklesIcon } from "lucide-react";
export default Onboarding;
