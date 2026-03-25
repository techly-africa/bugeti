"use client";

export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Globe, Copy, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/layout/AppShell";
import { useT } from "@/hooks/useT";
import { useAppStore, useHousehold, useLang, useUser } from "@/store";
import { signOut, registerMemberAccount } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { db, clearAllData } from "@/db";
import { generateId } from "@/lib/constants";
import type { HouseholdMember } from "@/lib/types";

export default function SettingsPage() {
  const t = useT();
  const user = useUser();
  const household = useHousehold();
  const lang = useLang();
  const { setLang } = useAppStore();
  const resetAppData = useAppStore((s) => s.resetAppData);
  const router = useRouter();

  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!household) return;
    const rows = await db.members.where("household_id").equals(household.id).toArray();
    setMembers(rows);
  }, [household]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!household) return;
    setAddingMember(true);

    const { userId, error } = await registerMemberAccount(memberEmail, memberPassword, memberName);

    if (error || !userId) {
      toast.error(error ?? "Failed to create member account.");
      setAddingMember(false);
      return;
    }

    await db.members.add({
      id: generateId(),
      household_id: household.id,
      user_id: userId,
      role: "member",
      display_name: memberName,
      joined_at: new Date().toISOString(),
    });

    toast.success(`${memberName} has been added to ${household.name}.`);
    setMemberName("");
    setMemberEmail("");
    setMemberPassword("");
    setShowAddMember(false);
    setAddingMember(false);
    loadMembers();
  };

  const handleSignOut = async () => {
    await signOut();
    await clearAllData();
    resetAppData();
    router.push("/auth");
  };

  const copyInviteCode = () => {
    if (household?.invite_code) {
      navigator.clipboard.writeText(household.invite_code);
      toast.success("Invite code copied!");
    }
  };

  const initials = user?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="font-bold text-xl">{t("settings")}</h1>

        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {initials ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user?.display_name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Household / Invite */}
        {household && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Home size={14} />
                {t("household")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold">{household.name}</p>

              {/* Members list */}
              {members.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {members.map((m) => {
                      const mi = m.display_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <div key={m.id} className="flex items-center gap-2.5">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-muted font-semibold">
                              {mi}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-none truncate">
                              {m.display_name}
                              {m.user_id === user?.id && (
                                <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                              )}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Invite Code</p>
                  <p className="font-mono font-bold text-lg tracking-widest text-primary">
                    {household.invite_code}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={copyInviteCode}>
                  <Copy size={14} className="mr-1" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with family members so they can join your budget
              </p>

              <Separator />

              {/* Add member */}
              {!showAddMember && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAddMember(true)}
                >
                  Add Household Member
                </Button>
              )}
              {showAddMember && (
                <form onSubmit={handleAddMember} className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">New member account</p>
                  <div className="space-y-1">
                    <Label className="text-xs">Full name</Label>
                    <Input
                      placeholder="Agathe Uwase"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      placeholder="member@example.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      placeholder="Min. 8 characters"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowAddMember(false)}
                      disabled={addingMember}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" className="flex-1" disabled={addingMember}>
                      {addingMember && <Loader2 size={13} className="animate-spin mr-1.5" />}
                      Add Member
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
              <Globe size={14} />
              {t("language")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLang("en")}
                className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  lang === "en"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted text-muted-foreground"
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => setLang("rw")}
                className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  lang === "rw"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted text-muted-foreground"
                }`}
              >
                🇷🇼 Kinyarwanda
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Sign out */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut size={16} className="mr-2" />
          {t("signOut")}
        </Button>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Bugeti POC · Made for Rwanda 🇷🇼
        </p>
      </div>
    </AppShell>
  );
}
