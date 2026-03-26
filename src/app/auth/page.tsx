"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { DemoBanner } from "@/components/shared/DemoBanner";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/hooks/useT";

export default function AuthPage() {
  const t = useT();
  const setUser = useAppStore((s) => s.setUser);
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  // Sign In state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPw, setSiShowPw] = useState(false);

  // Sign Up state
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suName, setSuName] = useState("");
  const [suShowPw, setSuShowPw] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await signIn(siEmail, siPassword);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          display_name:
            data.user.user_metadata?.display_name ?? siEmail.split("@")[0],
          preferred_language: "en",
          created_at: data.user.created_at,
        });
        router.push("/dashboard");
      }
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await signUp(suEmail, suPassword, suName);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (!data.user) return;

      setUser({
        id: data.user.id,
        email: data.user.email!,
        display_name: suName,
        preferred_language: "en",
        created_at: data.user.created_at,
      });

      // Send OTP and move to verification step
      const res = await fetch("/api/email/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: suEmail }),
      });

      if (!res.ok) {
        toast.error("Account created but couldn't send verification email. Please try again.");
        return;
      }

      const { token, emailSent } = await res.json();
      sessionStorage.setItem("otp_token", token);
      sessionStorage.setItem("otp_email", suEmail);
      if (emailSent === false) {
        toast.warning("Email delivery failed — check Vercel logs for your OTP code.");
      } else {
        toast.success("Check your email for a verification code.");
      }
      router.push("/verify");
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-background p-4">
      <div className="fixed top-0 left-0 right-0 z-50">
        <DemoBanner />
      </div>

      {/* Splash header */}
      <div className="flex flex-col items-center gap-4 mb-3 mt-12">
        <Logo variant="icon" height={160} />
        <LanguageToggle />
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <Tabs defaultValue="signin">
          <TabsList className="w-full rounded-none border-b bg-transparent h-12">
            <TabsTrigger value="signin" className="flex-1">
              {t("signIn")}
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              {t("signUp")}
            </TabsTrigger>
          </TabsList>

          {/* Sign In */}
          <TabsContent value="signin">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("signIn")}</CardTitle>
              <CardDescription>Welcome back to Bugeti</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("email")}</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>{t("password")}</Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      type={siShowPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setSiShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {siShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {t("signIn")}
                </Button>
              </form>
            </CardContent>
          </TabsContent>

          {/* Sign Up */}
          <TabsContent value="signup">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("signUp")}</CardTitle>
              <CardDescription>
                Start managing your money with Bugeti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("fullName")}</Label>
                  <Input
                    type="text"
                    placeholder="Agathe Uwase"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("email")}</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("password")}</Label>
                  <div className="relative">
                    <Input
                      type={suShowPw ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      className="pr-10"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setSuShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {suShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {t("signUp")}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      <p className="text-xs text-muted-foreground mt-6 text-center">
        {isSupabaseConfigured()
          ? "Works offline · Family-friendly · RWF native"
          : "🧪 Demo mode — any email & password works"}
      </p>
    </div>
  );
}
