"use client";

export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Globe, Copy, Home, Loader2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/layout/AppShell";
import { useT } from "@/hooks/useT";
import { useAppStore, useHousehold, useLang, useUser } from "@/store";
import { signOut, supabase, isSupabaseConfigured, getSupabase } from "@/lib/supabase";
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

  const { setHousehold } = useAppStore();

  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Household name editing
  const [editingName, setEditingName] = useState(false);
  const [householdNameDraft, setHouseholdNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!household) return;
    const rows = await db.members.where("household_id").equals(household.id).toArray();
    setMembers(rows);
  }, [household]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!household || !user) return;
    setAddingMember(true);

    try {
      // Get the caller's JWT so the server-side invite route can verify identity
      let token: string | null = null;
      if (isSupabaseConfigured()) {
        const { data: { session } } = await getSupabase().auth.getSession();
        if (!session) {
          toast.error("Session expired. Please sign in again.");
          router.push("/auth");
          return;
        }
        token = session.access_token;
      }

      const res = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: memberEmail,
          displayName: memberName,
          householdId: household.id,
          householdName: household.name,
          invitedBy: user.display_name,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to send invitation.");
        return;
      }

      const userId: string = json.userId;
      const memberId = generateId();

      // Persist locally so the owner sees the member immediately
      await db.members.add({
        id: memberId,
        household_id: household.id,
        user_id: userId,
        role: "member",
        display_name: memberName || memberEmail,
        joined_at: new Date().toISOString(),
      });

      // Pre-create a private budget envelope for the invitee
      const now = new Date();
      const privateBudget = {
        id: generateId(),
        household_id: household.id,
        name: `${memberName || memberEmail}'s Budget`,
        period: "monthly" as const,
        budget_type: "monthly" as const,
        account_type: "private" as const,
        status: "active" as const,
        start_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
        end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
        currency: "RWF" as const,
        created_by: userId,
        created_at: now.toISOString(),
      };
      await db.budgets.add(privateBudget);

      if (navigator.onLine && isSupabaseConfigured()) {
        try {
          await Promise.all([
            supabase.from("household_members").upsert({
              id: memberId,
              household_id: household.id,
              user_id: userId,
              role: "member",
              display_name: memberName || memberEmail,
              joined_at: new Date().toISOString(),
            }),
            supabase.from("budgets").upsert(privateBudget),
          ]);
        } catch (syncErr) {
          console.warn("[Settings] Cloud sync failed:", syncErr);
        }
      }

      toast.success(`Invitation sent to ${memberEmail}.`);
      setMemberName("");
      setMemberEmail("");
      setShowAddMember(false);
      loadMembers();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send invitation.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleSaveHouseholdName = async () => {
    if (!household || !householdNameDraft.trim()) return;
    setSavingName(true);
    try {
      await db.households.update(household.id, { name: householdNameDraft.trim() });
      const updated = { ...household, name: householdNameDraft.trim() };
      setHousehold(updated);
      if (navigator.onLine && isSupabaseConfigured()) {
        await supabase.from("households").update({ name: householdNameDraft.trim() }).eq("id", household.id);
      }
      toast.success("Household name updated.");
      setEditingName(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update household name.");
    } finally {
      setSavingName(false);
    }
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
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={householdNameDraft}
                    onChange={(e) => setHouseholdNameDraft(e.target.value)}
                    className="flex-1 h-8 text-sm font-semibold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveHouseholdName();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSaveHouseholdName} disabled={savingName}>
                    {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} className="text-primary" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingName(false)}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{household.name}</p>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                    onClick={() => { setHouseholdNameDraft(household.name); setEditingName(true); }}
                  >
                    <Pencil size={13} />
                  </Button>
                </div>
              )}

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
                  <p className="text-xs text-muted-foreground">
                    They'll receive an email with a link to set their password.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Full name</Label>
                    <Input
                      placeholder="Agathe Uwase"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
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
                      Send invitation
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
