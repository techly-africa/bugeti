import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomInt } from "crypto";
import { sendOtpEmail } from "@/lib/sendgrid";
import { isSupabaseConfigured } from "@/lib/supabase";

const SECRET = process.env.OTP_SECRET ?? "bugeti-otp-fallback";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function signToken(email: string, otp: string, issuedAt: number): string {
  const payload = `${email}:${otp}:${issuedAt}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ email, issuedAt, sig })).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const otp = String(randomInt(100000, 999999));
    const issuedAt = Date.now();
    const token = signToken(email, otp, issuedAt);

    try {
      await sendOtpEmail(email, otp);
    } catch (err) {
      // In development or demo mode, log the OTP so the developer can see it
      // and continue testing without real email configured.
      if (process.env.NODE_ENV === "development" || !isSupabaseConfigured()) {
        console.log(`[AUTH] OTP for ${email}: ${otp}`);
      } else {
        throw err;
      }
    }

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[send-otp]", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
