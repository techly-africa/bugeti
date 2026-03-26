"use client";

export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";
import { useUser } from "@/store";
import { syncDown } from "@/lib/sync";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function VerifyPage() {
  const user = useUser();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no pending verification session
  useEffect(() => {
    const token = sessionStorage.getItem("otp_token");
    if (!token) window.location.href = "/auth";
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const otp = digits.join("");

  const handleDigit = (i: number, val: string) => {
    const char = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    if (char && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    const token = sessionStorage.getItem("otp_token");
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch("/api/email/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          otp,
          displayName: user?.display_name,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Incorrect code");
        return;
      }

      sessionStorage.removeItem("otp_token");
      toast.success("Email verified!");

      // Establish a Supabase session from the magic-link token returned by the server.
      if (isSupabaseConfigured() && data.supabaseToken) {
        const { error: sessionErr } = await supabase.auth.verifyOtp({
          token_hash: data.supabaseToken.token_hash,
          type: "magiclink",
        });
        if (sessionErr) console.warn("[verify] Supabase session creation failed:", sessionErr.message);
      }

      // Check if user already has data on Supabase (e.g. returning user or invited)
      let hasData = false;
      try {
        hasData = await syncDown(data.user_id || user?.id || "anonymous");
      } catch (syncErr) {
        console.warn("[verify] syncDown failed, proceeding to onboarding:", syncErr);
      }

      window.location.href = hasData ? "/dashboard" : "/onboarding";
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const email = sessionStorage.getItem("otp_email");
    if (!email) return;

    setResending(true);
    try {
      const res = await fetch("/api/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to resend code");
        return;
      }

      sessionStorage.setItem("otp_token", data.token);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setCountdown(60);
      toast.success("New code sent!");
    } catch {
      toast.error("Could not resend code. Please check your connection.");
    } finally {
      setResending(false);
    }
  };

  const email = typeof window !== "undefined"
    ? sessionStorage.getItem("otp_email") ?? ""
    : "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-green-50 to-background p-4">
      <div className="flex flex-col items-center gap-4 mb-6">
        <Logo variant="icon" height={80} />
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">Check your email</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* OTP input grid */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <Input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-12 text-center text-xl font-bold p-0"
              />
            ))}
          </div>

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={otp.length !== 6 || loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Verify
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t receive it?{" "}
            {countdown > 0 ? (
              <span className="text-muted-foreground">Resend in {countdown}s</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-primary font-medium hover:underline disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
