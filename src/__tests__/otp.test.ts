import { describe, it, expect } from "vitest";
import {
  generateOtp,
  signOtpToken,
  parseOtpToken,
  verifyOtpToken,
  OTP_TTL_MS,
} from "@/lib/otp";

const SECRET = "test-secret-key";
const EMAIL = "user@example.com";

// ─── generateOtp ──────────────────────────────────────────────────────────────

describe("generateOtp", () => {
  it("returns a 6-character string", () => {
    expect(generateOtp()).toHaveLength(6);
  });

  it("contains only digits", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  it("stays within 100000–999999 range", () => {
    for (let i = 0; i < 50; i++) {
      const n = Number(generateOtp());
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });

  it("produces varied output (not constant)", () => {
    const samples = new Set(Array.from({ length: 20 }, () => generateOtp()));
    expect(samples.size).toBeGreaterThan(5);
  });
});

// ─── signOtpToken / parseOtpToken ─────────────────────────────────────────────

describe("signOtpToken + parseOtpToken", () => {
  it("round-trips email and issuedAt", () => {
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, "123456", issuedAt, SECRET);
    const parsed = parseOtpToken(token);
    expect(parsed.email).toBe(EMAIL);
    expect(parsed.issuedAt).toBe(issuedAt);
  });

  it("produces a base64url string (no +, /, = padding)", () => {
    const token = signOtpToken(EMAIL, "123456", Date.now(), SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("different secrets produce different tokens", () => {
    const t1 = signOtpToken(EMAIL, "123456", 1000, "secret-a");
    const t2 = signOtpToken(EMAIL, "123456", 1000, "secret-b");
    expect(t1).not.toBe(t2);
  });

  it("different OTPs produce different tokens", () => {
    const ts = Date.now();
    const t1 = signOtpToken(EMAIL, "111111", ts, SECRET);
    const t2 = signOtpToken(EMAIL, "222222", ts, SECRET);
    expect(t1).not.toBe(t2);
  });

  it("parseOtpToken throws on malformed input", () => {
    expect(() => parseOtpToken("not-valid-base64url!!!")).toThrow();
  });
});

// ─── verifyOtpToken ───────────────────────────────────────────────────────────

describe("verifyOtpToken — happy path", () => {
  it("returns ok:true for a valid token and OTP", () => {
    const otp = "654321";
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, otp, issuedAt, SECRET);
    const result = verifyOtpToken(token, otp, SECRET, issuedAt + 1000);
    expect(result.ok).toBe(true);
  });

  it("accepts a token issued at the very start of the TTL window", () => {
    const otp = "111111";
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, otp, issuedAt, SECRET);
    // 1 ms after issue
    expect(verifyOtpToken(token, otp, SECRET, issuedAt + 1).ok).toBe(true);
  });

  it("accepts a token 1 ms before expiry", () => {
    const otp = "222222";
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, otp, issuedAt, SECRET);
    expect(verifyOtpToken(token, otp, SECRET, issuedAt + OTP_TTL_MS - 1).ok).toBe(true);
  });
});

describe("verifyOtpToken — expired", () => {
  it("returns expired when now > issuedAt + TTL", () => {
    const otp = "333333";
    const issuedAt = Date.now() - OTP_TTL_MS - 1;
    const token = signOtpToken(EMAIL, otp, issuedAt, SECRET);
    const result = verifyOtpToken(token, otp, SECRET, Date.now());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("returns expired at exactly the TTL boundary", () => {
    const otp = "444444";
    const issuedAt = 0;
    const token = signOtpToken(EMAIL, otp, issuedAt, SECRET);
    const result = verifyOtpToken(token, otp, SECRET, OTP_TTL_MS + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });
});

describe("verifyOtpToken — wrong code", () => {
  it("returns invalid for a wrong OTP", () => {
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, "999999", issuedAt, SECRET);
    const result = verifyOtpToken(token, "000000", SECRET, issuedAt + 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("returns invalid for a one-digit-off OTP", () => {
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, "123456", issuedAt, SECRET);
    const result = verifyOtpToken(token, "123457", SECRET, issuedAt + 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("returns invalid when OTP has correct digits but wrong order", () => {
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, "123456", issuedAt, SECRET);
    const result = verifyOtpToken(token, "654321", SECRET, issuedAt + 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });
});

describe("verifyOtpToken — wrong secret", () => {
  it("returns invalid when verified with the wrong secret", () => {
    const otp = "555555";
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, otp, issuedAt, SECRET);
    const result = verifyOtpToken(token, otp, "wrong-secret", issuedAt + 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });
});

describe("verifyOtpToken — malformed token", () => {
  it("returns malformed for a random string", () => {
    const result = verifyOtpToken("not-a-token", "123456", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });

  it("returns malformed for an empty string", () => {
    const result = verifyOtpToken("", "123456", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });

  it("returns malformed for valid base64 but wrong JSON structure", () => {
    const bad = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    const result = verifyOtpToken(bad, "123456", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });

  it("returns malformed for a tampered token (flipped byte in sig)", () => {
    const otp = "666666";
    const issuedAt = Date.now();
    const token = signOtpToken(EMAIL, otp, issuedAt, SECRET);
    const parsed = parseOtpToken(token);
    // Flip first hex char of sig
    const tamperedSig =
      parsed.sig[0] === "a" ? "b" + parsed.sig.slice(1) : "a" + parsed.sig.slice(1);
    const tampered = Buffer.from(
      JSON.stringify({ email: parsed.email, issuedAt: parsed.issuedAt, sig: tamperedSig })
    ).toString("base64url");
    const result = verifyOtpToken(tampered, otp, SECRET, issuedAt + 1000);
    expect(result.ok).toBe(false);
  });

  it("returns malformed when email field is missing", () => {
    const bad = Buffer.from(JSON.stringify({ issuedAt: Date.now(), sig: "abc" })).toString("base64url");
    const result = verifyOtpToken(bad, "123456", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });

  it("returns malformed when issuedAt is not a number", () => {
    const bad = Buffer.from(
      JSON.stringify({ email: EMAIL, issuedAt: "not-a-number", sig: "abc" })
    ).toString("base64url");
    const result = verifyOtpToken(bad, "123456", SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("malformed");
  });
});
