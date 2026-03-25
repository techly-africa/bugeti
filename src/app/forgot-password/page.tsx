"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isSupabaseConfigured()) {
      // Demo mode — skip API call
      setLoading(false);
      setSent(true);
      return;
    }

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : "/reset-password";

    try {
      await fetch("/api/email/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });
    } catch {
      // Network error — still show success to avoid email enumeration
    }

    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-green-50 to-background p-4">
      <div className="flex flex-col items-center gap-4 mb-6">
        <Logo variant="icon" height={80} />
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Reset your password</CardTitle>
          {!sent && (
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Mail size={22} className="text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">Check your inbox</p>
                <p className="text-sm text-muted-foreground">
                  We sent a reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  {!isSupabaseConfigured() && (
                    <span className="block mt-1 text-xs text-amber-600">
                      Demo mode — no email sent. Go to{" "}
                      <Link href="/reset-password" className="underline">
                        reset password
                      </Link>{" "}
                      directly.
                    </span>
                  )}
                </p>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email address</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Send reset link
              </Button>
              <Link
                href="/auth"
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
