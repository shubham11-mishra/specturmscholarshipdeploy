import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_WHEEL_SCORES, type WheelScores } from "@/lib/navigator";

const normalizeScore = (value: unknown, fallback: number) => {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) return fallback;
  return Math.min(10, Math.max(1, Math.round(score)));
};

export const wheelScoresFromMetadata = (metadata: unknown): WheelScores => {
  const source =
    metadata && typeof metadata === "object" && "wheel_scores" in metadata
      ? (metadata as { wheel_scores?: Record<string, unknown> }).wheel_scores ?? {}
      : {};

  return {
    academic: normalizeScore(source.academic, DEFAULT_WHEEL_SCORES.academic),
    stem: normalizeScore(source.stem, DEFAULT_WHEEL_SCORES.stem),
    arts_creative: normalizeScore(source.arts_creative, DEFAULT_WHEEL_SCORES.arts_creative),
    sports_fitness: normalizeScore(source.sports_fitness, DEFAULT_WHEEL_SCORES.sports_fitness),
    leadership: normalizeScore(source.leadership, DEFAULT_WHEEL_SCORES.leadership),
    test_readiness: normalizeScore(source.test_readiness, DEFAULT_WHEEL_SCORES.test_readiness),
  };
};

export const wheelScoresPayload = (userId: string, scores: WheelScores, completedAt?: string | null) => ({
  user_id: userId,
  academic_self: scores.academic,
  stem_self: scores.stem,
  arts_self: scores.arts_creative,
  arts_creative_self: scores.arts_creative,
  sports_self: scores.sports_fitness,
  leadership_self: scores.leadership,
  test_readiness_self: scores.test_readiness,
  service_community_self: 5,
  interview_self: 5,
  completed_at: completedAt,
});

export const saveWheelScoresForUser = async (userId: string, scores: WheelScores, completedAt = new Date().toISOString()) => {
  const payload = wheelScoresPayload(userId, scores, completedAt);
  const { data: existingRows, error: readError } = await supabase
    .from("wheel_scores")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (readError) return { error: readError };

  const existingId = existingRows?.[0]?.id;
  if (existingId) {
    const { error } = await supabase.from("wheel_scores").update(payload).eq("id", existingId);
    return { error };
  }

  const { error } = await supabase.from("wheel_scores").insert(payload);
  return { error };
};

export const ensureWheelScoresForUser = async (userId: string, metadata: unknown) => {
  const { data: existingRows, error: readError } = await supabase
    .from("wheel_scores")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (readError || existingRows?.length) return { error: readError };

  // Always stamp completed_at so the wheel renders as a saved record from day one.
  return saveWheelScoresForUser(userId, wheelScoresFromMetadata(metadata), new Date().toISOString());
};