import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/sendgrid";
import { verifyOtpToken } from "@/lib/otp";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const SECRET = process.env.OTP_SECRET ?? "bugeti-otp-fallback";

function otpErrorMessage(reason: "expired" | "invalid" | "malformed"): string {
  if (reason === "expired") return "OTP has expired. Please request a new code.";
  if (reason === "malformed") return "Invalid token. Please start over.";
  return "Incorrect code. Please try again.";
}

// 5 verify attempts per IP per 10 minutes — prevents brute-force guessing
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 5;

// Also limit per token: an attacker who stole a token can't brute-force the 6-digit code
const TOKEN_WINDOW_MS = 10 * 60 * 1000;
const TOKEN_MAX = 5;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { token, otp, displayName } = body;

    if (!token || typeof token !== "string" || !otp || typeof otp !== "string") {
      return NextResponse.json({ error: "token and otp are required" }, { status: 400 });
    }

    // Rate limit per IP
    const ip = getClientIp(req);
    const ipRl = rateLimit(`verify-otp:ip:${ip}`, IP_WINDOW_MS, IP_MAX);
    if (!ipRl.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait before trying again." },
        {
          status: 429,
          headers: { "Retry-After": retryAfterSeconds(ipRl.retryAfterMs) },
        }
      );
    }

    // Rate limit per token (use first 16 chars as a stable bucket key)
    const tokenKey = token.slice(0, 16);
    const tokenRl = rateLimit(`verify-otp:token:${tokenKey}`, TOKEN_WINDOW_MS, TOKEN_MAX);
    if (!tokenRl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts for this code. Request a new one." },
        {
          status: 429,
          headers: { "Retry-After": retryAfterSeconds(tokenRl.retryAfterMs) },
        }
      );
    }

    const result = verifyOtpToken(token, otp, SECRET);
    if (!result.ok) {
      return NextResponse.json({ error: otpErrorMessage(result.reason) }, { status: 400 });
    }

    // Safe: token already verified above — just read the email field
    const { email } = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));

    // Send welcome email (non-fatal)
    try {
      await sendWelcomeEmail(email, displayName ?? email.split("@")[0]);
    } catch (err) {
      console.error(`[verify-otp] Welcome email failed for ${email}:`, err);
    }

    // Generate a Supabase magic-link token so the client can establish a session.
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
