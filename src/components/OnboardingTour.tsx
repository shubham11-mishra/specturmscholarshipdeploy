import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Compass, Target, Heart, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "spectrum-tour-completed-v1";

type Step = {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  accent: string;
};

const STEPS: Step[] = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Welcome to Spectrum Navigator",
    body: (
      <>
        Your personal guide to scholarships, school selection, and academic readiness. Let's take a
        quick 60‑second tour of the most powerful features.
      </>
    ),
    accent: "hsl(var(--gold))",
  },
  {
    icon: <Compass className="w-6 h-6" />,
    title: "Your Spectrum Wheel",
    body: (
      <>
        Rate yourself across 6 dimensions — Academic, STEM, Arts, Sports, Leadership, Test Readiness.
        Your ratings drive every recommendation we make. You can update these anytime from{" "}
        <span className="font-semibold text-foreground">Readiness → My Wheel</span>.
      </>
    ),
    accent: "hsl(var(--spec-teal, 180 80% 50%))",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Readiness Score (0–100)",
    body: (
      <>
        Your wheel average becomes a Readiness Score, mapped to a 5‑element journey:
        <div className="grid grid-cols-5 gap-1 mt-3 text-center text-[11px] font-semibold">
          <div className="rounded-lg py-2 bg-[#8B6914]/10 text-[#8B6914]">🌱<br/>Earth</div>
          <div className="rounded-lg py-2 bg-[#02B2FC]/10 text-[#02B2FC]">💧<br/>Water</div>
          <div className="rounded-lg py-2 bg-[#FF0F3B]/10 text-[#FF0F3B]">🔥<br/>Fire</div>
          <div className="rounded-lg py-2 bg-[#7ECFED]/20 text-[#0a7ea4]">🌬️<br/>Air</div>
          <div className="rounded-lg py-2 bg-[#FAC82C]/15 text-[#8B6914]">✨<br/>Aether</div>
        </div>
        <div className="mt-3">
          Each band suggests the next concrete actions to grow — from foundations through mastery.
        </div>
      </>
    ),
    accent: "hsl(var(--spec-red, 351 100% 53%))",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Scholarships & Shortlist",
    body: (
      <>
        Browse live Australian scholarships matched to your profile. Tap{" "}
        <Heart className="inline w-3.5 h-3.5 text-[hsl(var(--spec-red))]" /> on any card to save it
        to your <span className="font-semibold text-foreground">Shortlist</span>, then track them
        under <span className="font-semibold text-foreground">Applications</span>.
      </>
    ),
    accent: "hsl(var(--gold))",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "AI Copilot",
    body: (
      <>
        Your personal scholarship coach. The Copilot knows your wheel, shortlist, and applications,
        so you can ask things like:
        <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
          <li>"Which 3 scholarships should I prioritise this month?"</li>
          <li>"Help me draft a personal statement opening."</li>
          <li>"What's holding me back from the next band?"</li>
        </ul>
        Open it any time from the <span className="font-semibold text-foreground">AI Copilot</span>{" "}
        tab in the sidebar.
      </>
    ),
    accent: "hsl(var(--spec-red, 351 100% 53%))",
  },
];

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

const OnboardingTour = ({ forceOpen, onClose }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    if (!user) return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user, forceOpen]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    setStep(0);
    onClose?.();
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div
          className="h-1.5 w-full transition-colors"
          style={{ background: current.accent }}
        />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-foreground"
              style={{ background: current.accent }}
            >
              {current.icon}
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {current.title}
              </h2>
            </div>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed min-h-[120px]">
            {current.body}
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? 24 : 8,
                  background: i === step ? current.accent : "hsl(var(--muted))",
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mt-5">
            <Button variant="ghost" size="sm" onClick={finish}>
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
              )}
              <Button size="sm" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
                {isLast ? "Got it!" : (<>Next <ChevronRight className="w-4 h-4" /></>)}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTour;
