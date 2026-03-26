import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPasswordResetEmail } from "@/lib/sendgrid";
import { rateLimit, retryAfterSeconds, isValidEmail } from "@/lib/rate-limit";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 3 reset emails per address per 15 minutes
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const { redirectTo } = body;

    if (!isValidEmail(email)) {
      // Don't reveal whether the email exists — silently succeed
      return NextResponse.json({ ok: true });
    }

    // Rate limit — still return 200 to prevent email enumeration
    const rl = rateLimit(`send-reset:${email}`, WINDOW_MS, MAX_PER_WINDOW);
    if (!rl.allowed) {
      // Return 200 (not 429) so attackers can't confirm the email is known
      return NextResponse.json({ ok: true });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";
    const finalRedirect =
      typeof redirectTo === "string" && redirectTo.startsWith("http")
        ? redirectTo
        : `${appUrl}/reset-password`;

    let admin;
    try {
      admin = getAdminClient();
    } catch {
      // Supabase not configured — silently succeed (demo mode)
      return NextResponse.json({ ok: true });
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: finalRedirect },
    });

    if (error || !data.properties?.action_link) {
      console.error("[send-reset] generateLink error:", error);
      return NextResponse.json({ ok: true });
    }

    try {
      await sendPasswordResetEmail(email, data.properties.action_link);
    } catch (emailErr) {
      console.error("[send-reset] Email delivery failed:", emailErr);
      console.log(`[AUTH] Password reset link for ${email}: ${data.properties.action_link}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-reset]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
