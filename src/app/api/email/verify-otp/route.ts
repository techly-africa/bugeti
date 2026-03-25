import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { sendWelcomeEmail } from "@/lib/sendgrid";
import { isSupabaseConfigured } from "@/lib/supabase";

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

    // OTP verified — send welcome email
    try {
      await sendWelcomeEmail(email, displayName ?? email.split("@")[0]);
    } catch (err) {
      // Allow verification to succeed even if email fails in demo/dev
      if (process.env.NODE_ENV === "development" || !isSupabaseConfigured()) {
        console.warn(`[AUTH] Welcome email failed for ${email}, but continuing.`);
      } else {
        throw err;
      }
    }

    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
