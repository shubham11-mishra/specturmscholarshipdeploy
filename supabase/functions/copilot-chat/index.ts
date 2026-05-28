// Spectrum Navigator Copilot — Lovable AI Gateway + live scholarship search
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Spectrum Copilot — a warm, sharp scholarship & school-readiness coach for Australian students and parents.

You help users:
- Find specific schools, scholarships, gifted programs and selective entry opportunities from the LIVE database
- Prioritise opportunities from their shortlist
- Understand their Spectrum Wheel (8 dimensions) and current band (Earth → Aether)
- Plan applications, deadlines, and what to write
- Decode eligibility criteria and selection-test prep

CRITICAL RULES:
- When SCHOLARSHIP_MATCHES is provided, use ONLY those results to answer factual questions about schools/scholarships. Never invent schools, deadlines, values, or URLs.
- Always include each opportunity's school name, state, category, closing label, and a link if present.
- If SCHOLARSHIP_MATCHES is empty, say you couldn't find a match and suggest the user refine (state, year level, keyword) or browse /scholarships.
- Style: friendly, concise (≤180 words unless asked). Use markdown — bullets and **bold** for school names.`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const CATEGORY_HINTS: Record<string, string[]> = {
  Academic: ["academic", "scholar", "honours", "gifted", "selective", "merit"],
  Music: ["music", "choral", "instrumental", "band", "orchestra"],
  Sport: ["sport", "sporting", "athletic", "athlete"],
  Arts: ["art", "drama", "dance", "creative", "performing"],
  Indigenous: ["indigenous", "first nations", "aboriginal", "torres strait"],
  Boarding: ["boarding", "boarder"],
  Equity: ["equity", "bursary", "means", "financial", "low income", "disadvantage"],
  All_Rounder: ["all rounder", "all-rounder", "general excellence"],
};

function extractFilters(text: string, userContext: any) {
  const upper = text.toUpperCase();
  const lower = text.toLowerCase();
  const state = AU_STATES.find((s) => new RegExp(`\\b${s}\\b`).test(upper)) ?? userContext?.location?.state ?? null;

  const categories: string[] = [];
  for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some((h) => lower.includes(h))) categories.push(cat);
  }

  // strip stopwords; collect distinctive keywords
  const stop = new Set(["the","a","an","and","or","for","of","in","to","on","with","what","which","is","are","can","you","me","my","our","i","do","does","show","tell","find","list","scholarships","scholarship","school","schools","opportunity","opportunities","please","near","around","best","good"]);
  const tokens = lower.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).filter((t) => t.length >= 3 && !stop.has(t) && !AU_STATES.includes(t.toUpperCase()));
  const keywords = Array.from(new Set(tokens)).slice(0, 6);

  return { state, categories, keywords };
}

async function searchScholarships(text: string, userContext: any) {
  const { state, categories, keywords } = extractFilters(text, userContext);

  let q = admin
    .from("scholarships")
    .select("school_name,state,suburb,category,program_name,program_type,overview,year_levels,closing_label,value_aud,scholarship_url,gender_eligibility")
    .limit(15);

  if (state) q = q.eq("state", state);
  if (categories.length) q = q.in("category", categories);

  if (keywords.length) {
    const or = keywords
      .flatMap((k) => [
        `school_name.ilike.%${k}%`,
        `suburb.ilike.%${k}%`,
        `program_name.ilike.%${k}%`,
        `overview.ilike.%${k}%`,
        `description.ilike.%${k}%`,
      ])
      .join(",");
    q = q.or(or);
  }

  const { data, error } = await q;
  if (error) {
    console.error("scholarship search error", error);
    return [];
  }
  // fallback: if nothing found with all filters, retry without category
  if ((!data || data.length === 0) && (categories.length || keywords.length)) {
    let q2 = admin
      .from("scholarships")
      .select("school_name,state,suburb,category,program_name,program_type,overview,year_levels,closing_label,value_aud,scholarship_url,gender_eligibility")
      .limit(15);
    if (state) q2 = q2.eq("state", state);
    if (keywords.length) {
      const or = keywords
        .flatMap((k) => [
          `school_name.ilike.%${k}%`,
          `program_name.ilike.%${k}%`,
          `overview.ilike.%${k}%`,
        ])
        .join(",");
      q2 = q2.or(or);
    }
    const r2 = await q2;
    return r2.data ?? [];
  }
  return data ?? [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const matches = lastUser ? await searchScholarships(String(lastUser.content || ""), context) : [];

    const contextBlock = context
      ? `\n\nSTUDENT CONTEXT:\n${JSON.stringify(context, null, 2)}`
      : "";
    const matchesBlock = `\n\nSCHOLARSHIP_MATCHES (live from database, ${matches.length} rows):\n${JSON.stringify(matches, null, 2)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextBlock + matchesBlock },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const status = res.status === 429 ? 429 : res.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: errText }), { status, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    return new Response(res.body, {
      headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
