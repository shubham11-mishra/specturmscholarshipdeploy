import { createClient } from '@supabase/supabase-js';

const COPILOT_SUPABASE_URL = import.meta.env.VITE_COPILOT_SUPABASE_URL;
const COPILOT_SUPABASE_ANON_KEY = import.meta.env.VITE_COPILOT_SUPABASE_ANON_KEY;

// Import the copilot client like this:
// import { copilotSupabase } from "@/integrations/supabase/copilotClient";

export const copilotSupabase = createClient(COPILOT_SUPABASE_URL, COPILOT_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
