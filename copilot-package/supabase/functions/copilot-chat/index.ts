// @ts-nocheck — this file runs in Deno (Supabase Edge Functions), not Node.js
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── RAG helpers ────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "what","which","where","when","how","are","the","for","and","can","you","me",
  "my","is","in","of","to","a","i","do","have","has","any","some","there","show",
  "find","tell","about","with","from","that","this","will","would","could","should",
  "give","get","list","help","need","want","like","look","know","make","been","were",
  "they","them","than","also","just","more","their","our","your","its","all","but",
  "not","yes","does","did","was","had","his","her","him","who","why","yes","no",
  "please","okay","sure","great","good","best","top","many","much","very","really",
  "scholarships","scholarship","school","schools","student","students","apply",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, 6);
}

async function ragSearch(
  lastMessage: string,
  profileState: string | null,
  profileIds: Set<string>,
): Promise<Record<string, unknown>[]> {
  const keywords = extractKeywords(lastMessage);
  if (keywords.length === 0) return [];

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return [];

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Each keyword is checked across 5 columns — all ORed together
  const orParts = keywords.flatMap(kw => [
    `program_name.ilike.%${kw}%`,
    `category.ilike.%${kw}%`,
    `sub_type.ilike.%${kw}%`,
    `overview.ilike.%${kw}%`,
    `eligibility_criteria.ilike.%${kw}%`,
  ]).join(",");

  let query = supabase
    .from("scholarships")
    .select([
      "id","school_name","program_name","category","sub_type",
      "state","suburb","sector","school_type","year_levels",
      "value_aud","value_type","scholarship_url","overview",
      "eligibility_criteria","application_close_date","closing_label",
      "days_left","gender_eligibility","number_awarded",
      "test_month","test_provider","contact_email","contact_phone",
    ].join(","))
    .or(orParts)
    .neq("scholarship_confidence", "not_found")
    .eq("is_active", "True");

  // AND: state filter (matches student's state OR national scholarships)
  if (profileState) {
    query = query.or(`state.eq.${profileState},state.is.null`);
  }

  const { data } = await query.limit(8);

  // Deduplicate against profile-matched scholarships already in context
  return (data ?? []).filter((s: Record<string, unknown>) => !profileIds.has(s.id as string));
}

// ─── System prompt ───────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Spectrum Copilot — a sharp, warm scholarship and school-readiness coach for Australian students and parents.

CRITICAL RULES:
- Recommend scholarships ONLY from the lists provided (TOP PROFILE MATCHES and/or QUERY-RELEVANT SCHOLARSHIPS). Never invent or guess scholarship names.
- Always refer to scholarships by their exact school_name and program_name from the list.
- The TOP PROFILE MATCHES are ranked by match_score (highest first) — treat higher scores as stronger recommendations.
- QUERY-RELEVANT SCHOLARSHIPS are retrieved specifically because they match what the student just asked — use these when the user asks about a specific topic (e.g. "violin", "rowing", "Year 9 NSW").
- Use the student's actual profile data (state, year level, wheel scores, gender, preferred sectors, financial need, etc.) to give personalised, specific advice.
- If the student's wheel score in a dimension is low (below 5), acknowledge it as a gap and suggest how to improve it.
- If the student's wheel score is high (7+), highlight it as a strength relevant to matching scholarships.
- Never invent facts not in the provided data.
- LINKS RULE: Do NOT include links in normal responses. Only provide clickable markdown links when the user explicitly asks — e.g. "give me the link", "take me to the website", "where do I apply", "how do I apply to X", "website for X", "link for X". When links are requested, format them as: [School Name — Program Name](url). If url is null, tell the user to search the school website directly.
- GENDER RULE: Always check the student's gender before recommending any scholarship.
  - If the student is MALE (boy): only recommend scholarships where school_type is "Boys" or "Co-ed". Never recommend girls-only schools.
  - If the student is FEMALE (girl): only recommend scholarships where school_type is "Girls" or "Co-ed". Never recommend boys-only schools.
  - If gender is not specified: recommend co-ed schools only.

━━━ WHAT YOU CAN DO ━━━

**1. MY MATCHES**
Triggered when the student asks: "what are my top matches", "show me my best scholarships", "which scholarships suit me", "what should I apply for", or similar.
→ List their top 5 matched scholarships from the provided list.
→ For each: school name, program name, match score, match tier, and 1-2 reasons why it fits their profile.
→ Format as a numbered list. Mention the deadline for each.

**2. SCHOLARSHIP COMPARISON**
Triggered when the student asks to compare two or more scholarships, e.g. "compare X and Y", "which is better between X and Y", "difference between X and Y".
→ Do a side-by-side comparison of the named scholarships from the provided list.
→ Cover: match score, value, category, deadline, year levels, why each fits or doesn't fit the student.
→ End with a clear recommendation based on their profile.

**3. ESSAY DRAFTING**
Triggered when the student asks: "help me write an essay", "draft my application", "write a personal statement for X", "help me apply to X", or similar.
→ Write a personalised scholarship application essay for the named scholarship.
→ Use the student's profile: their state, year level, wheel score strengths, interests, goals, and why_it_fits reasons from the matched scholarship.
→ Structure: opening hook → personal strengths → why this school/scholarship → future goals → closing.
→ Keep it 200-300 words, warm and genuine in tone. Tell the student they can personalise it further.

**4. INTERVIEW SIMULATION**
Triggered when the student asks: "help me practise my interview", "simulate an interview for X", "what questions will they ask", "mock interview", or similar.
→ Start the mock interview for the named scholarship.
→ Introduce yourself as the interviewer from that school.
→ Ask ONE interview question at a time. Wait for the student's answer.
→ After each answer, give brief feedback (what was strong, what to improve), then ask the next question.
→ Cover 4-5 questions total: personal background, academic/sporting strengths, why this school, future goals, handling challenges.
→ At the end, give an overall performance summary with tips.

**5. SCHOLARSHIP CALENDAR / DEADLINES**
Triggered when the student asks: "what are my deadlines", "when do I need to apply", "show me the calendar", "which ones close soon", "upcoming deadlines", or similar.
→ List ALL matched scholarships from the provided list that have a deadline.
→ Sort by urgency — closest deadline first.
→ Format clearly: School — Program — Deadline — Days left.
→ Highlight any closing within 30 days as urgent.
→ If a scholarship has no deadline listed, note it as "Check school website".

━━━ SCHOLARSHIP DATA FIELDS AVAILABLE ━━━
Each scholarship in your context has these fields — use them all when answering questions:
- school, suburb, state, sector (Independent/Catholic/Government), school_type
- program, category, sub_type
- match_score, match_tier, why_it_fits
- value (e.g. "50% Fee Reduction"), value_type (Full/Partial)
- year_levels, number_awarded
- application_open, deadline, days_left
- test_month, test_provider (e.g. ACER, Audition, Internal)
- special_conditions, eligibility
- overview, description (use description for detailed questions)
- contact_email, contact_phone
- url

Always use these fields to give complete, accurate answers. If a student asks "when is the test?" use test_month. If they ask "is it a full scholarship?" use value_type. If they ask "how many are given?" use number_awarded. If they ask "how do I contact them?" use contact_email/contact_phone.

━━━ HOW TO USE STUDENT DATA ━━━
When making ANY recommendation, cross-reference ALL of the following from the student profile:

- **wheel_scores**: academic, stem, arts_creative, sports_fitness, leadership, test_readiness (1-10)
  → High score (7+) = strength → recommend scholarships in that category
  → Low score (<5) = gap → acknowledge it and suggest how to improve
- **interests**: what the student is passionate about → match to scholarship category
- **preferred_sectors**: career goals → align scholarships to future direction
- **dream_schools**: if a student mentions a dream school, check if it's in the matched list
- **willing_to_board**: if true, include boarding schools in recommendations
- **has_sibling_enrolled**: mention sibling discount if relevant scholarship offers it
- **is_indigenous / is_rural**: boost and highlight indigenous/rural scholarships
- **financial_need**: prioritise bursary and means-tested scholarships
- **readiness_band**: Earth/Water = early stage, Fire = mid, Air = advanced
- **gender**: boys → boys/co-ed only, girls → girls/co-ed only
- **current_school + current_school_type**: context for fit and transition

Never give a generic answer. Always explain WHY a scholarship fits based on the student's specific scores, interests, goals and background.

━━━ GENERAL STYLE ━━━
- Friendly, specific, concise (≤200 words for general answers, longer for essays/interviews).
- Use bullet points and bold headings for clarity.
- Always address the student by name and refer to their specific data — never be generic.`;

// ─── Main handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { messages, context } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Extract last user message for RAG keyword search
    const lastUserMessage = (messages as { role: string; content: string }[])
      .filter(m => m.role === "user")
      .pop()?.content ?? "";

    let systemWithContext = SYSTEM_PROMPT;

    if (context) {
      const { matching_scholarships, profile, ...studentData } = context as Record<string, unknown>;

      systemWithContext += `\n\n━━━ STUDENT PROFILE ━━━\n${JSON.stringify(studentData, null, 2)}`;

      // Priority flags
      const flags: string[] = [];
      const fn = ((studentData.financial_need as string) || "").toLowerCase();
      if (fn === "yes" || fn === "true" || fn === "high") {
        flags.push("⚠ FINANCIAL NEED FLAG: This student has HIGH financial need. You MUST acknowledge this in your response and highlight any bursary, means-tested, or fee-reduction scholarships — even if their general match score is not the highest. Always recommend they explore financial need-based options alongside their top matches.");
      }
      const isIndigenous = studentData.is_indigenous === true || studentData.is_indigenous === "true";
      if (isIndigenous) {
        flags.push("⚠ INDIGENOUS FLAG: This student identifies as indigenous. You MUST acknowledge this and prioritise any indigenous, First Nations, or Aboriginal scholarships available.");
      }
      const isRural = studentData.is_rural === true || studentData.is_rural === "true";
      if (isRural) {
        flags.push("⚠ RURAL FLAG: This student is from a rural or regional area. You MUST acknowledge this and highlight rural/regional/boarding scholarships.");
      }
      if (flags.length > 0) {
        systemWithContext += `\n\n━━━ PRIORITY FLAGS — MUST ADDRESS IN RESPONSE ━━━\n${flags.join("\n")}`;
      }

      // ── Profile-matched scholarships (top 8 by score) ──────────────────────
      const profileIds = new Set<string>();
      if (Array.isArray(matching_scholarships) && matching_scholarships.length > 0) {
        const trim = (v: unknown, len = 100) =>
          typeof v === "string" && v.length > len ? v.slice(0, len) + "…" : v ?? null;

        const scholarshipSummary = matching_scholarships.slice(0, 8).map((s: Record<string, unknown>, i: number) => {
          profileIds.add(s.id as string);
          return {
            rank: i + 1,
            school: s.school_name,
            suburb: s.suburb,
            state: s.state,
            sector: s.sector,
            school_type: s.school_type,
            program: s.program_name,
            category: s.category,
            sub_type: s.sub_type,
            match_score: s.match_score,
            match_tier: s.match_tier,
            why_it_fits: s.match_reasons,
            value: s.value_aud,
            value_type: s.value_type,
            year_levels: s.year_levels,
            application_open: s.application_open_date,
            deadline: s.closing_label || s.application_close_date,
            days_left: s.days_left,
            number_awarded: s.number_awarded,
            test_month: s.test_month,
            test_provider: s.test_provider,
            special_conditions: trim(s.special_conditions),
            overview: trim(s.overview),
            eligibility: trim(s.eligibility_criteria),
            contact_email: s.contact_email,
            contact_phone: s.contact_phone,
            url: s.scholarship_url,
          };
        });
        systemWithContext += `\n\n━━━ TOP PROFILE MATCHES (ranked by match score, highest first) ━━━\n${JSON.stringify(scholarshipSummary, null, 2)}`;
      }

      // ── RAG: search all 6,080 scholarships for query-relevant results ──────
      try {
        const profileState = studentData.state as string | null;
        const ragResults = await ragSearch(lastUserMessage, profileState, profileIds);

        if (ragResults.length > 0) {
          const trim = (v: unknown, len = 120) =>
            typeof v === "string" && v.length > len ? v.slice(0, len) + "…" : v ?? null;

          const ragSummary = ragResults.map((s: Record<string, unknown>) => ({
            school: s.school_name,
            suburb: s.suburb,
            state: s.state,
            sector: s.sector,
            school_type: s.school_type,
            program: s.program_name,
            category: s.category,
            sub_type: s.sub_type,
            value: s.value_aud,
            value_type: s.value_type,
            year_levels: s.year_levels,
            deadline: s.closing_label || s.application_close_date,
            days_left: s.days_left,
            number_awarded: s.number_awarded,
            test_month: s.test_month,
            test_provider: s.test_provider,
            overview: trim(s.overview),
            eligibility: trim(s.eligibility_criteria),
            contact_email: s.contact_email,
            contact_phone: s.contact_phone,
            url: s.scholarship_url,
          }));

          systemWithContext += `\n\n━━━ QUERY-RELEVANT SCHOLARSHIPS (retrieved from full database matching your question — use these to answer specific queries) ━━━\n${JSON.stringify(ragSummary, null, 2)}`;
        }
      } catch (ragErr) {
        console.error("RAG search failed (non-fatal):", ragErr);
        // Falls back to profile matches only — user still gets a good response
      }
    }

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        stream: true,
        messages: [
          { role: "system", content: systemWithContext },
          ...(messages as { role: string; content: string }[]).filter((m) => m.content),
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const status = res.status === 429 ? 429 : res.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: errText }), {
        status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(res.body, {
      headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
