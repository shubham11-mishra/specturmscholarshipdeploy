// Invite a new admin by email. Caller must already be an authenticated admin.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Validate caller is an admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdminRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .limit(1);
    if (!isAdminRows || isAdminRows.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const redirectTo = String(body.redirectTo ?? "");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Find or invite user
    let targetUserId: string | null = null;

    // Look up existing user by email via profiles (most reliable)
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      targetUserId = existingProfile.id;
      console.log("[invite-admin] existing user found", { email, userId: targetUserId });
    } else {
      console.log("[invite-admin] inviting new user", { email, redirectTo });
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo || undefined,
      });
      if (inviteErr || !invited.user) {
        console.error("[invite-admin] inviteUserByEmail failed", inviteErr);
        return new Response(JSON.stringify({ error: inviteErr?.message || "Invite failed (email service may be rate-limited)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.log("[invite-admin] invite sent", { userId: invited.user.id });
      const { error: metadataErr } = await admin.auth.admin.updateUserById(invited.user.id, {
        user_metadata: {
          ...(invited.user.user_metadata ?? {}),
          admin_invite_pending: true,
          admin_invite_email: email,
          admin_invite_created_at: new Date().toISOString(),
        },
      });
      if (metadataErr) {
        console.error("[invite-admin] admin invite metadata failed", metadataErr);
        return new Response(JSON.stringify({ error: metadataErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      targetUserId = invited.user.id;
    }

    // 4. Grant admin role (idempotent)
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: targetUserId, invited: !existingProfile?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
