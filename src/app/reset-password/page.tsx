"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";
import { updatePassword, getSession, isSupabaseConfigured } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(!isSupabaseConfigured()); // demo: always ready

  // Supabase processes the recovery token from the URL hash automatically
  // (detectSessionInUrl: true). We poll briefly to confirm the session is live.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      const { session } = await getSession();
      if (session) {
        setSessionReady(true);
        clearInterval(interval);
      }
      if (++attempts >= 10) clearInterval(interval); // stop after 5 s
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDone(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-green-50 to-background p-4">
      <div className="flex flex-col items-center gap-4 mb-6">
        <Logo variant="icon" height={80} />
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Set a new password</CardTitle>
          {!done && (
            <p className="text-sm text-muted-foreground mt-1">
              Choose a strong password for your Bugeti account.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle size={22} className="text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-sm">Password updated!</p>
                <p className="text-sm text-muted-foreground">
                  You can now sign in with your new password.
                </p>
              </div>
              <Button className="w-full" asChild>
                <Link href="/auth">Go to sign in</Link>
              </Button>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Validating reset link…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>New password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Confirm password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-destructive">Passwords don&apos;t match</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || password !== confirm || password.length < 8}
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                Update password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
