import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/sendgrid";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const SECRET = process.env.OTP_SECRET ?? "bugeti-otp-fallback";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const { token, otp, displayName } = await req.json();

    if (!token || !otp) {
      return NextResponse.json({ error: "token and otp are required" }, { status: 400 });
    }

    // Decode token
    let parsed: { email: string; issuedAt: number; sig: string };
    try {
      parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const { email, issuedAt, sig } = parsed;

    // Check expiry
    if (Date.now() - issuedAt > OTP_TTL_MS) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    // Recompute expected signature
    const payload = `${email}:${otp}:${issuedAt}`;
    const expected = createHmac("sha256", SECRET).update(payload).digest("hex");

    // Constant-time comparison
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const valid =
      sigBuf.length === expectedBuf.length &&
      timingSafeEqual(sigBuf, expectedBuf);

    if (!valid) {
      return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
    }

    // OTP verified — send welcome email (non-fatal)
    try {
      await sendWelcomeEmail(email, displayName ?? email.split("@")[0]);
    } catch (err) {
      console.error(`[verify-otp] Welcome email failed for ${email}:`, err);
    }

    // Generate a Supabase magic-link token so the client can establish a session.
    // This is needed when the remote project has email confirmation enabled —
    // signUp() won't issue a session until the email is confirmed.
    let supabaseToken: { token_hash: string; type: string } | null = null;
    const admin = getAdminClient();
    if (admin) {
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        if (linkData?.properties?.hashed_token) {
          supabaseToken = { token_hash: linkData.properties.hashed_token, type: "magiclink" };
        }
      } catch (err) {
        console.error("[verify-otp] Failed to generate Supabase session token:", err);
      }
    }

    return NextResponse.json({ ok: true, email, supabaseToken });
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
