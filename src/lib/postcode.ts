// AU postcode → state inference + suburb lookup helpers.
// We don't have a full suburb dataset; we infer state from postcode ranges
// (covers all valid AU postcodes) and try to look up a suburb by querying the
// scholarships table opportunistically.

import { supabase } from "@/integrations/supabase/client";

export type AuState = "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "ACT" | "NT";

/**
 * Infer Australian state from a 4-digit postcode.
 * Reference: Australia Post postcode ranges.
 */
export function stateFromPostcode(postcode: string): AuState | null {
  const pc = parseInt((postcode || "").trim(), 10);
  if (!Number.isFinite(pc)) return null;
  // NT
  if ((pc >= 200 && pc <= 299) || (pc >= 800 && pc <= 999)) return "NT";
  // ACT
  if ((pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return "ACT";
  // NSW
  if ((pc >= 1000 && pc <= 2599) || (pc >= 2619 && pc <= 2899) || (pc >= 2921 && pc <= 2999)) return "NSW";
  // VIC
  if ((pc >= 3000 && pc <= 3999) || (pc >= 8000 && pc <= 8999)) return "VIC";
  // QLD
  if ((pc >= 4000 && pc <= 4999) || (pc >= 9000 && pc <= 9999)) return "QLD";
  // SA
  if (pc >= 5000 && pc <= 5999) return "SA";
  // WA
  if (pc >= 6000 && pc <= 6999) return "WA";
  // TAS
  if (pc >= 7000 && pc <= 7999) return "TAS";
  return null;
}

/**
 * Look up suburb candidates for a postcode by checking known schools in the
 * scholarships table. Returns empty list if none found.
 */
export async function lookupSuburbsForPostcode(postcode: string): Promise<string[]> {
  const pc = (postcode || "").trim();
  if (!/^\d{4}$/.test(pc)) return [];
  const { data } = await supabase
    .from("scholarships")
    .select("suburb")
    .eq("postcode", pc)
    .not("suburb", "is", null)
    .limit(50);
  if (!data) return [];
  const set = new Set<string>();
  data.forEach((r) => {
    const s = (r.suburb || "").trim();
    if (s) set.add(s);
  });
  return Array.from(set).sort();
}
