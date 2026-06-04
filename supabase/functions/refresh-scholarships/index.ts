// deno-lint-ignore-file
// Admin-triggered scholarship refresh: fetches latest scholarship/school candidates
// from configured sources, checks each source URL for liveness ("poison pill" detection),
// then inserts them into `scholarship_imports` with status='pending' for admin review.
//
// Auth: the caller must be a signed-in admin (verified via user_roles).
// Replace SAMPLE_SOURCES with a real scraper / external API as needed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Edit / extend this list (or replace with a live scraper) to feed real sources.
// Each entry becomes one pending record for admin review.
const SAMPLE_SOURCES: Array<Record<string, any>> = [
  {
    school_name: "James Ruse Agricultural High School",
    program_name: "Selective Entry",
    state: "NSW",
    suburb: "Carlingford",
    postcode: "2118",
    scholarship_url: "https://james-ruse-h.schools.nsw.gov.au/enrolment/selective-high-school-placement.html",
    description: "Highly competitive selective placement test entry for Year 7.",
    year_levels: "Year 7",
    category: "Academic Merit",
    source: "manual-curation",
  },
  {
    school_name: "Sydney Grammar School",
    program_name: "Academic Scholarship",
    state: "NSW",
    suburb: "Darlinghurst",
    postcode: "2010",
    scholarship_url: "https://www.sydgram.nsw.edu.au/Enrolment/Scholarships",
    description: "Academic scholarships for Years 7 and 9 entry.",
    year_levels: "Year 7, Year 9",
    value_aud: "Up to 100% tuition",
    category: "Academic Merit",
    source: "manual-curation",
  },
  {
    school_name: "Melbourne Grammar School",
    program_name: "Sir John Monash Scholarship",
    state: "VIC",
    suburb: "South Yarra",
    postcode: "3141",
    scholarship_url: "https://www.mgs.vic.edu.au/example-broken-url-for-demo",
    description: "Leadership and academic scholarship for Year 9 entry.",
    year_levels: "Year 9",
    category: "All-Rounder",
    source: "manual-curation",
  },
];

async function checkUrl(url?: string | null): Promise<{ broken: boolean; status: number | null; note: string | null }> {
  if (!url) return { broken: true, status: null, note: "Missing URL" };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    clearTimeout(timer);
    if (res.status >= 400) {
      return { broken: true, status: res.status, note: `HTTP ${res.status}` };
    }
    return { broken: false, status: res.status, note: null };
  } catch (e: any) {
    return { broken: true, status: null, note: e?.message?.slice(0, 200) ?? "Fetch failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin role required" }), { status: 403, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    // Admin Postgres client (service role) to bypass RLS for staging inserts.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Optional: accept a custom payload of records from the caller.
    let payload: any = null;
    try { payload = await req.json(); } catch { /* no body is fine */ }
    const incoming: Record<string, any>[] = Array.isArray(payload?.records) && payload.records.length > 0
      ? payload.records
      : SAMPLE_SOURCES;

    const inserted: any[] = [];
    const skipped: any[] = [];

    for (const r of incoming) {
      // Skip if there is already a pending row for this school+url
      const { data: existing } = await admin
        .from("scholarship_imports")
        .select("id")
        .eq("school_name", r.school_name)
        .eq("status", "pending")
        .maybeSingle();
      if (existing) { skipped.push({ school_name: r.school_name, reason: "already pending" }); continue; }

      const link = await checkUrl(r.scholarship_url);
      const { data, error } = await admin.from("scholarship_imports").insert({
        status: "pending",
        school_name: r.school_name,
        program_name: r.program_name ?? null,
        state: r.state ?? null,
        suburb: r.suburb ?? null,
        postcode: r.postcode ?? null,
        scholarship_url: r.scholarship_url ?? null,
        website_url: r.website_url ?? null,
        description: r.description ?? null,
        year_levels: r.year_levels ?? null,
        value_aud: r.value_aud ?? null,
        category: r.category ?? null,
        link_broken: link.broken,
        link_status_code: link.status,
        link_note: link.note,
        payload: r,
        source: r.source ?? "refresh-scholarships",
        fetched_at: new Date().toISOString(),
      }).select("id, school_name, link_broken").single();
      if (error) { skipped.push({ school_name: r.school_name, reason: error.message }); continue; }
      inserted.push(data);
    }

    return new Response(JSON.stringify({ inserted_count: inserted.length, skipped_count: skipped.length, inserted, skipped }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});
