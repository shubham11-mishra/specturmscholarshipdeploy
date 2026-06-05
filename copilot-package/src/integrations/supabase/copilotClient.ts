/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Connects to the Supabase project that holds the scholarships table.
// If you have a separate project for scholarships, set VITE_COPILOT_SUPABASE_URL
// and VITE_COPILOT_SUPABASE_ANON_KEY in your .env.
// Otherwise it automatically uses the same project as the main app.
const COPILOT_SUPABASE_URL =
  import.meta.env.VITE_COPILOT_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL;

const COPILOT_SUPABASE_ANON_KEY =
  import.meta.env.VITE_COPILOT_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the copilot client like this:
// import { copilotSupabase } from "@/integrations/supabase/copilotClient";

export const copilotSupabase = createClient(COPILOT_SUPABASE_URL, COPILOT_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
