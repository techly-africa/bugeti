import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPasswordResetEmail } from "@/lib/sendgrid";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email, redirectTo } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8090";
    const finalRedirect = redirectTo ?? `${appUrl}/reset-password`;

    const admin = getAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: finalRedirect },
    });

    if (error || !data.properties?.action_link) {
      console.error("[send-reset] generateLink error:", error);
      // Don't reveal whether the email exists — always appear to succeed
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
