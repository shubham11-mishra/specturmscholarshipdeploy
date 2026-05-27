// Spectrum Navigator Copilot — Lovable AI Gateway
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Spectrum Copilot — a warm, sharp scholarship & school-readiness coach for Australian students and parents.

You help users:
- Find and prioritise scholarships from their shortlist
- Understand their Spectrum Wheel (8 dimensions) and current band (Earth → Aether)
- Plan applications, deadlines, and what to write
- Decode eligibility criteria and selection-test prep

Style: friendly, concise (≤150 words unless asked), use bullets, never invent scholarship facts not provided in the user context. If you don't know, say so and suggest where to look on the platform (/scholarships, /readiness, /applications, /wins).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const contextBlock = context
      ? `\n\nSTUDENT CONTEXT:\n${JSON.stringify(context, null, 2)}`
      : "";

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
          { role: "system", content: SYSTEM_PROMPT + contextBlock },
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
