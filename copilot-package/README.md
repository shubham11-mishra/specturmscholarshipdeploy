# Spectrum Copilot — Integration Package

## What's in this folder

These are the only files added/modified to build the AI Copilot feature.
Drop them into your project at the same paths and the Copilot works.

```
copilot-package/
├── src/
│   ├── pages/
│   │   ├── Copilot.tsx               ← Copilot page (chat, My Matches, Comparison)
│   │   └── Auth.tsx                  ← Updated onboarding (queries scholarships)
│   ├── integrations/supabase/
│   │   └── copilotClient.ts          ← Supabase client for the copilot project
│   └── lib/
│       ├── matching.ts               ← Scholarship scoring engine
│       └── matchingEngine.ts         ← Matching logic
└── supabase/
    └── functions/
        └── copilot-chat/
            └── index.ts              ← Edge Function: RAG search + Groq AI
```

---

## Environment Variables Required

Add these to your `.env` file (never commit this file):

```
VITE_COPILOT_SUPABASE_URL=https://rvvhqhirveqpvqrvtlwj.supabase.co
VITE_COPILOT_SUPABASE_ANON_KEY=eyJ...
GROQ_API_KEY=gsk_...
```

Also add them to your hosting platform (Vercel / Netlify) dashboard.

---

## How It Works

### 1. Scholarship Database
- 6,080 scholarships stored in Supabase (`rvvhqhirveqpvqrvtlwj` — "sample" project)
- The Copilot reads from this project via `copilotClient.ts`

### 2. Profile Matching
- When the Copilot loads, it fetches the student's profile (state, year level, wheel scores, gender, interests)
- `matching.ts` scores every scholarship against the profile
- Top 15 ranked scholarships are passed to the AI as context

### 3. RAG Search (Retrieval-Augmented Generation)
- When the student asks a question (e.g. "any violin scholarships in VIC?")
- The Edge Function extracts keywords from the message
- Searches all 6,080 scholarships across `program_name`, `category`, `overview`, `eligibility_criteria`
- Merges query-relevant results with the profile-matched top 15
- Passes the combined list to the Groq AI

### 4. AI Response
- Groq API (Llama 4 Scout) generates a streamed response
- Uses both profile matches AND RAG results as context
- Follows strict rules: only recommends scholarships from the provided data

---

## Deploy the Edge Function

```bash
npx supabase functions deploy copilot-chat --project-ref rvvhqhirveqpvqrvtlwj
```

Set the Groq API key as a Supabase secret:
```bash
npx supabase secrets set GROQ_API_KEY=gsk_... --project-ref rvvhqhirveqpvqrvtlwj
```

---

## Add the Route

In your router file, add:
```tsx
import Copilot from "@/pages/Copilot";
<Route path="/copilot" element={<Copilot />} />
```
