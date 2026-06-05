# Spectrum Copilot — Setup Guide

Follow these steps to connect the Spectrum Copilot to your project.

---

## Step 1 — Copy these files into your project

```
src/pages/Copilot.tsx
src/lib/matching.ts
src/integrations/supabase/copilotClient.ts
supabase/functions/copilot-chat/index.ts
```

---

## Step 2 — Install required packages

```bash
npm install react-markdown @supabase/supabase-js sonner lucide-react react-router-dom
```

---

## Step 3 — Add environment variables

In your `.env` file:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Make sure `.env` is in your `.gitignore` — never commit API keys to the repo.

---

## Step 4 — Deploy the edge function

```bash
supabase functions deploy copilot-chat --project-ref your-project-ref
```

---

## Step 5 — Add your OpenAI key as a Supabase secret

In your Supabase dashboard → Edge Functions → Secrets:

```
OPENAI_API_KEY = your-openai-api-key
```

Or via CLI:

```bash
supabase secrets set OPENAI_API_KEY=your-openai-api-key --project-ref your-project-ref
```

---

## Step 6 — Add the route to your app

```tsx
import Copilot from "@/pages/Copilot";

<Route path="/copilot" element={<Copilot />} />
```

---

## Your project must already have these files

| File | What it must export |
|------|---------------------|
| `src/hooks/useAuth.tsx` | `user`, `loading`, `fullName`, `yearLevel`, `location` |
| `src/lib/navigator.ts` | `WheelScores` type, `WheelDimensionKey` type |
| `src/integrations/supabase/client.ts` | `supabase` — the main Supabase client |

---

## Your Supabase database must have these tables

- `profiles`
- `wheel_scores`
- `student_progress`
- `user_interests`
- `student_activities`
- `navigator_shortlist`
- `gap_recommendations`
- `scholarships`
