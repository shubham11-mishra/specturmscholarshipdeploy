# Spectrum Copilot — Integration Guide

## How to make it work on your own server/account

### Step 1 — Copy the files
Copy everything inside `copilot-package/` into your project at the exact same folder paths.

---

### Step 2 — Create your Supabase project
1. Go to [supabase.com](https://supabase.com) → create a new project
2. Note down your **Project URL** and **Anon Key** from Project Settings → API

---

### Step 3 — Import the scholarship data
Run the import script to load the scholarships into your Supabase:
```bash
node scripts/import-scholarships.mjs YOUR_SERVICE_ROLE_KEY
```
Find your **Service Role Key** in Supabase → Project Settings → API.

---

### Step 4 — Deploy the Edge Function
```bash
npx supabase functions deploy copilot-chat --project-ref YOUR_PROJECT_REF
npx supabase secrets set GROQ_API_KEY=your_groq_key --project-ref YOUR_PROJECT_REF
```
Get a free Groq API key at [console.groq.com](https://console.groq.com)

---

### Step 5 — Add environment variables
Add these to your `.env` file (or Vercel/Netlify dashboard):
```
VITE_COPILOT_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_COPILOT_SUPABASE_ANON_KEY=your_anon_key
GROQ_API_KEY=your_groq_key
```

---

### Step 6 — Add the Copilot route
In your router file add:
```tsx
import Copilot from "@/pages/Copilot";
<Route path="/copilot" element={<Copilot />} />
```

---

## That's it — Copilot is live!

| What it does | How |
|---|---|
| Loads student profile | From your existing Supabase (main project) |
| Finds matching scholarships | From your copilot Supabase project |
| Searches 6,080 scholarships by keyword | RAG — built into the Edge Function |
| Generates AI responses | Groq API (Llama 4) — free tier available |
