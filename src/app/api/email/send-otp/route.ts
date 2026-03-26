import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/sendgrid";
import { generateOtp, signOtpToken } from "@/lib/otp";
import { rateLimit, retryAfterSeconds, isValidEmail } from "@/lib/rate-limit";

const SECRET = process.env.OTP_SECRET ?? "bugeti-otp-fallback";

// 3 OTPs per email per 10 minutes — prevents OTP bombing / SendGrid abuse
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    // Rate limit per email address
    const rl = rateLimit(`send-otp:${email}`, WINDOW_MS, MAX_PER_WINDOW);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many OTP requests. Please wait before trying again." },
        {
          status: 429,
          headers: { "Retry-After": retryAfterSeconds(rl.retryAfterMs) },
        }
      );
    }

    const otp = generateOtp();
    const issuedAt = Date.now();
    const token = signOtpToken(email, otp, issuedAt, SECRET);

    let emailSent = true;
    try {
      await sendOtpEmail(email, otp);
    } catch (err) {
      emailSent = false;
      console.error("[send-otp] Email delivery failed:", err);
      console.log(`[AUTH] OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({ token, emailSent });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
