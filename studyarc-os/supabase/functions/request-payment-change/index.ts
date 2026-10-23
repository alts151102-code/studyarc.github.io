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
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("PAYMENT_CHANGE_FROM_EMAIL");
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !fromEmail) {
    return respond(503, { error: "Payment change email service is not configured." });
  }

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
  if (ownerError || !owner) return respond(403, { error: "Only the provisioned owner can request this change." });

  const recentCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentRequests, error: rateLimitError } = await admin
    .from("payment_change_requests")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", user.id)
    .gte("created_at", recentCutoff);
  if (rateLimitError) return respond(500, { error: "Could not verify the request rate limit." });
  if ((recentRequests || 0) >= 5) return respond(429, { error: "Too many requests. Try again later." });

  let requestedUpi = "";
  try {
    const body = await request.json();
    requestedUpi = String(body.requestedUpi || "").trim();
  } catch {
    return respond(400, { error: "A valid payment destination is required." });
  }
  if (!/^[\w.-]{2,64}@[\w.-]{2,64}$/.test(requestedUpi)) {
    return respond(400, { error: "Enter a valid UPI ID." });
  }

  const { error: insertError } = await admin.from("payment_change_requests").insert({
    requested_by: user.id,
    requested_upi: requestedUpi,
  });
  if (insertError) return respond(500, { error: "The change request could not be recorded." });

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: ["alt.s151102@gmail.com"],
      subject: "StudyArc payment destination change request",
      text: [
        "A payment destination change was requested for StudyArc.",
        `Requested destination: ${requestedUpi}`,
        `Requested by: ${user.email || user.id}`,
        "No payment destination was changed. The active beneficiary remains 8799340567@fam.",
        "Review and approve any configuration change manually in the secured backend.",
      ].join("\n"),
    }),
  });
  if (!emailResponse.ok) return respond(502, { error: "The request was saved, but the owner notification email failed." });

  return respond(200, { message: "Request sent to the owner. The active payment destination remains unchanged." });
});