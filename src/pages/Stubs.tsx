import { ComingSoonPage } from "@/components/ComingSoonPage";
import { Target, KanbanSquare, CalendarDays, Bot, Trophy } from "lucide-react";

export const Gaps = () => (
  <ComingSoonPage title="Gap Analysis" description="Prioritised actions to lift your readiness." icon={Target} phase="Phase 2">
    <p className="text-sm text-muted-foreground">
      Side-by-side dimension scores vs target scholarship rubrics. Each gap will surface a recommended
      action — 70% generic education advice, 30% Spectrum Tuition courses — clearly labelled so you trust the diagnosis.
    </p>
  </ComingSoonPage>
);

export const Hub = () => (
  <ComingSoonPage title="Application Hub" description="Kanban tracker for every application." icon={KanbanSquare} phase="Phase 3">
    <p className="text-sm text-muted-foreground">
      Four stages: Not Started → In Progress → Submitted → Outcome. Each card carries deadlines, sub-task checklists,
      a reusable document repository, and outcome reasons that feed back into matching.
    </p>
  </ComingSoonPage>
);

export const Calendar = () => (
  <ComingSoonPage title="Deadline Calendar" description="Never miss an ACER test or application close date." icon={CalendarDays} phase="Phase 3">
    <p className="text-sm text-muted-foreground">
      Visual month view of every deadline tied to your matched scholarships, with email/SMS reminders 7 and 1 day out.
    </p>
  </ComingSoonPage>
);

export const Copilot = () => (
  <ComingSoonPage title="AI Copilot" description="Your personal scholarship strategist." icon={Bot} phase="Phase 5">
    <p className="text-sm text-muted-foreground">
      Three-layer architecture (LLM brain + context injection of your profile/scores/gaps + system-prompt guardrails) means
      the Copilot answers grounded in your actual data — not generic ChatGPT advice. Streaming chat coming soon.
    </p>
  </ComingSoonPage>
);

export const Achievements = () => (
  <ComingSoonPage title="Achievements" description="Badges, streaks, and Spectrum Points." icon={Trophy} phase="Phase 4">
    <p className="text-sm text-muted-foreground">
      Foundation, Skill, Activation, Mastery and Excellence tier badges. Every Spectrum course completion awards a badge
      AND boosts a real readiness dimension — making course value visible in real time.
    </p>
  </ComingSoonPage>
);
