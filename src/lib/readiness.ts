// Wheel-average → 0-100 score → 5-band readiness mapping

export const BAND_CUTOFFS = {
  earth: { min: 0, max: 20, label: "Earth", emoji: "🌱", color: "#8B6914", meaning: "Foundations & engagement" },
  water: { min: 21, max: 40, label: "Water", emoji: "💧", color: "#02B2FC", meaning: "Modelled flow, guided learning" },
  fire: { min: 41, max: 60, label: "Fire", emoji: "🔥", color: "#FF0F3B", meaning: "Core activation, independent practice" },
  air: { min: 61, max: 80, label: "Air", emoji: "🌬️", color: "#7ECFED", meaning: "Extension & connection" },
  aether: { min: 81, max: 100, label: "Aether", emoji: "✨", color: "#FAC82C", meaning: "Mastery & independence" },
} as const;

export type BandKey = keyof typeof BAND_CUTOFFS;

export function wheelAverageToScore(scores10: number[]): number {
  if (!scores10.length) return 0;
  const avg = scores10.reduce((a, b) => a + b, 0) / scores10.length;
  return Math.round(avg * 10);
}

export function bandForScore(score: number) {
  const entries = Object.entries(BAND_CUTOFFS) as [BandKey, typeof BAND_CUTOFFS[BandKey]][];
  for (const [key, band] of entries) {
    if (score >= band.min && score <= band.max) return { key, ...band };
  }
  return { key: "earth" as BandKey, ...BAND_CUTOFFS.earth };
}

export const ELEMENT_JOURNEY = [
  { key: "earth", label: "Earth", action: "Assess", desc: "Foundations" },
  { key: "water", label: "Water", action: "Discover", desc: "Guided learning" },
  { key: "fire", label: "Fire", action: "Prepare", desc: "Activation" },
  { key: "air", label: "Air", action: "Enrich", desc: "Extension" },
  { key: "aether", label: "Aether", action: "Apply", desc: "Mastery" },
] as const;
