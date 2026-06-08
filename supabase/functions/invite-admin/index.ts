// Invite or promote an admin. Caller must already be an admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "missing_auth" }, 401);

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return json({ error: "unauthenticated" }, 401);
    const caller = userRes.user;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Confirm caller is admin
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!callerRoles) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const redirectTo = String(body.redirectTo ?? "");
    if (!email) return json({ error: "missing_email" }, 400);

    // Check if a user already exists with that email
    const { data: existing, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) return json({ error: listErr.message }, 500);
    const match = existing.users.find((u) => (u.email ?? "").toLowerCase() === email);

    if (match) {
      // Grant role immediately
      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id: match.id, role: "admin" });
      if (insErr && !insErr.message.includes("duplicate")) {
        return json({ error: insErr.message }, 500);
      }
      return json({ ok: true, mode: "granted", user_id: match.id });
    }

    // Create pending invitation row if none exists
    const { data: existingInvite } = await admin
      .from("admin_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();
    if (!existingInvite) {
      await admin
        .from("admin_invitations")
        .insert({ email, invited_by: caller.id, status: "pending" });
    }

    // Send invite email via Supabase Auth
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
    });
    if (inviteErr) return json({ error: inviteErr.message }, 500);

    return json({ ok: true, mode: "invited", user_id: inviteData.user?.id ?? null });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
