import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const cleanString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))]
    : [];

const boolValue = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return null;
};

const numberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const profileDataFromUserMetadata = (sessionUser: User) => {
  const meta = sessionUser.user_metadata ?? {};
  const categories = stringArray(meta.scholarship_categories);

  return {
    id: sessionUser.id,
    email: sessionUser.email ?? cleanString(meta.email),
    full_name: cleanString(meta.full_name) ?? cleanString(meta.name) ?? sessionUser.email?.split("@")[0] ?? null,
    last_name: cleanString(meta.last_name),
    state: cleanString(meta.state) ?? "NSW",
    postcode: cleanString(meta.postcode) ?? "0000",
    suburb: cleanString(meta.suburb),
    year_level: cleanString(meta.year_level),
    school_type: cleanString(meta.school_type),
    current_school_name: cleanString(meta.current_school_name),
    current_school_type: cleanString(meta.current_school_type) ?? cleanString(meta.school_type)?.toLowerCase() ?? null,
    gender: cleanString(meta.gender),
    parent_email: cleanString(meta.parent_email),
    financial_need: cleanString(meta.financial_need),
    target_year: cleanString(meta.target_year),
    extracurriculars: stringArray(meta.extracurriculars),
    scholarship_categories: categories.length > 0 ? categories : stringArray(meta.interests),
    is_indigenous: boolValue(meta.is_indigenous) ?? false,
    is_rural: boolValue(meta.is_rural) ?? false,
    faith_background: cleanString(meta.faith_background),
    preferred_sectors: stringArray(meta.preferred_sectors),
    willing_to_board: cleanString(meta.willing_to_board),
    max_travel_km: numberValue(meta.max_travel_km) ?? 999,
    has_sibling_enrolled: boolValue(meta.has_sibling_enrolled) ?? false,
    target_start_year: numberValue(meta.target_start_year),
    applying_year_level: numberValue(meta.applying_year_level),
    dream_schools: cleanString(meta.dream_schools),
    onboarding_completed: boolValue(meta.onboarding_completed) ?? false,
    view_mode: "student",
    streak_days: 1,
    streak_label: "Fire Band",
  };
};

export const ensureOwnProfile = async (sessionUser: User) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, state, postcode, suburb, year_level, gender")
    .eq("id", sessionUser.id)
    .maybeSingle();

  if (error) {
    console.error("Error checking user profile:", error);
    return { data: null, error };
  }

  const metaProfile = profileDataFromUserMetadata(sessionUser);

  // No row yet → insert full profile from metadata.
  if (!data?.id) {
    const insertResult = await supabase
      .from("profiles")
      .upsert(metaProfile as any, { onConflict: "id" })
      .select("id")
      .maybeSingle();
    if (insertResult.error) console.error("Error creating missing user profile:", insertResult.error);
    return insertResult;
  }

  // Row exists — backfill any missing fields from metadata so old/default rows
  // (e.g. full_name NULL, state defaulted to NSW, postcode '0000') get repaired.
  const patch: Record<string, unknown> = {};
  if (!data.full_name && metaProfile.full_name) patch.full_name = metaProfile.full_name;
  if (!data.suburb && metaProfile.suburb) patch.suburb = metaProfile.suburb;
  if (!data.year_level && metaProfile.year_level) patch.year_level = metaProfile.year_level;
  if (!data.gender && metaProfile.gender) patch.gender = metaProfile.gender;
  const metaState = cleanString(sessionUser.user_metadata?.state);
  const metaPostcode = cleanString(sessionUser.user_metadata?.postcode);
  if ((!data.state || (data.state === "NSW" && metaState && metaState !== "NSW")) && metaState) {
    patch.state = metaState;
  }
  if ((!data.postcode || data.postcode === "0000") && metaPostcode && metaPostcode !== "0000") {
    patch.postcode = metaPostcode;
  }

  if (Object.keys(patch).length > 0) {
    const upd = await supabase.from("profiles").update(patch as any).eq("id", sessionUser.id);
    if (upd.error) console.error("Error backfilling user profile:", upd.error);
  }

  return { data, error: null };
};

export const saveOwnProfile = async (sessionUser: User, values: Record<string, unknown>) => {
  const ensured = await ensureOwnProfile(sessionUser);
  if (ensured.error) return ensured;

  return supabase
    .from("profiles")
    .update({ email: sessionUser.email ?? null, ...values } as any)
    .eq("id", sessionUser.id)
    .select("id")
    .maybeSingle();
};