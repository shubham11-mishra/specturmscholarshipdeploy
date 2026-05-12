// Navigator constants — shared across components

export type WheelDimensionKey =
  | "academic"
  | "stem"
  | "arts_creative"
  | "sports_fitness"
  | "leadership"
  | "service_community"
  | "interview"
  | "test_readiness";

export interface WheelDimension {
  key: WheelDimensionKey;
  label: string;
  emoji: string;
  prompt: string;
  scaleHint: string;
  category: string;
  color: string;
}

export const WHEEL_DIMENSIONS: WheelDimension[] = [
  {
    key: "academic",
    label: "Academic",
    emoji: "📚",
    prompt: "How would you rate your overall academic performance compared to your year level?",
    scaleHint: "1–3 below avg · 4–5 average · 6–7 above avg · 8–9 high achiever · 10 top 1%",
    category: "Academic",
    color: "hsl(280, 60%, 45%)",
  },
  {
    key: "stem",
    label: "STEM",
    emoji: "🧬",
    prompt: "How strong is your interest and ability in science, technology, engineering or maths?",
    scaleHint: "1–3 limited · 4–5 moderate · 6–7 above avg · 8–9 competes/top marks · 10 exceptional",
    category: "STEM",
    color: "hsl(190, 70%, 40%)",
  },
  {
    key: "arts_creative",
    label: "Arts & Creative",
    emoji: "🎨",
    prompt: "How would you rate your creative and artistic abilities?",
    scaleHint: "1–3 limited · 4–5 casual · 6–7 active · 8–9 advanced (AMEB, eisteddfod) · 10 elite",
    category: "Arts",
    color: "hsl(330, 70%, 50%)",
  },
  {
    key: "sports_fitness",
    label: "Sports & Fitness",
    emoji: "⚽",
    prompt: "How would you rate your sporting ability and physical fitness?",
    scaleHint: "1–3 limited · 4–5 casual · 6–7 represents school · 8–9 regional/state · 10 national",
    category: "Sports",
    color: "hsl(140, 55%, 40%)",
  },
  {
    key: "leadership",
    label: "Leadership",
    emoji: "✨",
    prompt: "How active are you in formal leadership roles (captain, prefect, club president)?",
    scaleHint: "1–3 limited · 4–5 occasional · 6–7 active · 8–9 captain/prefect · 10 founder/leader",
    category: "Leadership",
    color: "hsl(40, 85%, 50%)",
  },
  {
    key: "service_community",
    label: "Service & Community",
    emoji: "🤝",
    prompt: "How much documented community service or volunteering have you done?",
    scaleHint: "1–3 limited · 4–5 occasional · 6–7 regular · 8–9 significant impact · 10 community-recognised",
    category: "Cultural",
    color: "hsl(160, 50%, 45%)",
  },
  {
    key: "interview",
    label: "Interview Readiness",
    emoji: "🎤",
    prompt: "How confident are you in interview settings (school, scholarship, public speaking)?",
    scaleHint: "1–3 nervous/untested · 4–5 some experience · 6–7 comfortable · 8–9 polished · 10 highly confident",
    category: "Interview",
    color: "hsl(260, 60%, 55%)",
  },
  {
    key: "test_readiness",
    label: "Test Readiness",
    emoji: "✅",
    prompt: "How prepared do you feel for scholarship exams or entrance tests?",
    scaleHint: "1–3 not started · 4–5 some awareness · 6–7 some practice · 8–9 extensive prep · 10 fully ready",
    category: "Test Readiness",
    color: "hsl(15, 80%, 55%)",
  },
];

export type WheelScores = Record<WheelDimensionKey, number>;

export const DEFAULT_WHEEL_SCORES: WheelScores = {
  academic: 5,
  stem: 5,
  arts_creative: 5,
  sports_fitness: 5,
  leadership: 5,
  service_community: 5,
  interview: 5,
  test_readiness: 5,
};

export const ELEMENT_BANDS = [
  { key: "Earth", label: "Earth — Assess", min: 0, color: "hsl(35, 50%, 45%)" },
  { key: "Water", label: "Water — Discover & Plan", min: 100, color: "hsl(200, 70%, 45%)" },
  { key: "Fire", label: "Fire — Prepare", min: 300, color: "hsl(15, 80%, 55%)" },
  { key: "Air", label: "Air — Enrich", min: 600, color: "hsl(190, 60%, 55%)" },
  { key: "Aether", label: "Aether — Apply", min: 1000, color: "hsl(280, 60%, 55%)" },
] as const;

export const bandForPoints = (points: number) => {
  let current: typeof ELEMENT_BANDS[number] = ELEMENT_BANDS[0];
  for (const band of ELEMENT_BANDS) if (points >= band.min) current = band;
  return current;
};
