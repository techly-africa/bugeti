import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Token ────────────────────────────────────────────────────────────────────

export interface OtpToken {
  email: string;
  issuedAt: number;
  sig: string;
}

export function signOtpToken(
  email: string,
  otp: string,
  issuedAt: number,
  secret: string
): string {
  const payload = `${email}:${otp}:${issuedAt}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ email, issuedAt, sig })).toString("base64url");
}

export function parseOtpToken(token: string): OtpToken {
  return JSON.parse(Buffer.from(token, "base64url").toString("utf-8")) as OtpToken;
}

// ─── OTP generation ───────────────────────────────────────────────────────────

/** Generates a 6-digit numeric OTP string, zero-padded to always be 6 chars. */
export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

// ─── Verification ─────────────────────────────────────────────────────────────

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "invalid" | "malformed" };

export function verifyOtpToken(
  token: string,
  otp: string,
  secret: string,
  now = Date.now()
): VerifyResult {
  let parsed: OtpToken;
  try {
    parsed = parseOtpToken(token);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const { email, issuedAt, sig } = parsed;

  if (
    typeof email !== "string" ||
    typeof issuedAt !== "number" ||
    typeof sig !== "string"
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (now - issuedAt > OTP_TTL_MS) {
    return { ok: false, reason: "expired" };
  }

  const payload = `${email}:${otp}:${issuedAt}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true };
}
