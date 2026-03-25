"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

  const [loading, setLoading] = useState(false);

  // Sign In state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign Up state
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suName, setSuName] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await signIn(siEmail, siPassword);
    setLoading(false);

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
      window.location.href = "/dashboard";
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await signUp(suEmail, suPassword, suName);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email!,
        display_name: suName,
        preferred_language: "en",
        created_at: data.user.created_at,
      });
      toast.success("Account created! Let's set up your budget.");
      window.location.href = "/onboarding";
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-background p-4">
      <div className="fixed top-0 left-0 right-0 z-50">
        <DemoBanner />
      </div>

      {/* Splash header */}
      <div className="flex flex-col items-center gap-4 mb-8 mt-12">
        {/* Icon mark — large on splash */}
        <Logo variant="icon" color="dark" height={80} />
        {/* Wordmark below */}
        <Logo variant="wordmark" color="dark" height={36} />
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          {t("tagline")}
        </p>
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
                  <Label>{t("password")}</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    required
                  />
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
                  <Input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    minLength={8}
                    required
                  />
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
