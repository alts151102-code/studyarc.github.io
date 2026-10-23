import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return respond(503, { error: "Pro allowlist service is not configured." });

  const bearerToken = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearerToken) return respond(401, { error: "Sign in is required." });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userResult, error: authError } = await admin.auth.getUser(bearerToken);
  const user = userResult.user;
  if (authError || !user) return respond(401, { error: "Your session could not be verified." });

  const { data: owner, error: ownerError } = await admin
    .from("owner_accounts")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (ownerError || !owner) return respond(403, { error: "Only the provisioned owner can manage Pro access." });

  let email = "";
  let action = "";
  try {
    const body = await request.json();
    email = String(body.email || "").trim().toLowerCase();
    action = String(body.action || "");
  } catch {
    return respond(400, { error: "A valid email and action are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["grant", "revoke"].includes(action)) {
    return respond(400, { error: "Enter a valid email and choose grant or revoke." });
  }

  if (action === "grant") {
    const { error } = await admin.from("pro_allowlist").upsert({ email, granted_by: user.id }, { onConflict: "email" });
    if (error) return respond(500, { error: "Could not grant Pro access." });
    return respond(200, { message: `Pro access granted to ${email}. Their account data remains private.` });
  }

  const { error } = await admin.from("pro_allowlist").delete().eq("email", email);
  if (error) return respond(500, { error: "Could not revoke Pro access." });
  return respond(200, { message: `Pro access revoked for ${email}. Their account data remains private.` });
});