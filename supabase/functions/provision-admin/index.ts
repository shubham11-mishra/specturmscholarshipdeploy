import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (_req) => {
  if (_req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const email = "searcherscholarship@gmail.com";
  const password = "scholarshipsearcher$%12";

  // Try to find existing user
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = list?.users?.find((u) => u.email?.toLowerCase() === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Scholarship Searcher Admin" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    user = data.user;
  } else {
    await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }

  if (user) {
    await supabase.from("user_roles").upsert(
      { user_id: user.id, role: "admin" },
      { onConflict: "user_id,role" },
    );
  }

  return new Response(JSON.stringify({ ok: true, user_id: user?.id }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
