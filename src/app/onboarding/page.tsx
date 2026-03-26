"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronRight, Users, User, Plus, X, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/shared/AmountInput";
import {
  DEFAULT_CATEGORIES,
  generateId,
  generateInviteCode,
  CATEGORY_RULES,
  RULE_LABELS,
  RULE_COLORS,
  RULE_TARGETS,
  formatRWF,
} from "@/lib/constants";
import { distribute503020 } from "@/lib/budget-rule";
import { useAppStore, useUser } from "@/store";
import { db } from "@/db";
import { supabase, isSupabaseConfigured, getSupabase } from "@/lib/supabase";
import { useT } from "@/hooks/useT";
import { Category, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "household" | "income" | "categories";

const STEPS: Step[] = ["household", "income", "categories"];

export default function OnboardingPage() {
  const t = useT();
  const user = useUser();
  const { setHousehold, setActiveBudget, setCategories } = useAppStore();

  const [step, setStep] = useState<Step>("household");
  const [loading, setLoading] = useState(false);

  // ── Step 1: Household ───────────────────────────────────────────────────────
  const [householdType, setHouseholdType] = useState<"individual" | "family">("individual");
  const [householdName, setHouseholdName] = useState(
    user ? `${user.display_name}'s Budget` : "My Budget"
  );

  // ── Step 1b: Invite emails (family type) ────────────────────────────────────
  const [inviteEmails, setInviteEmails] = useState<string[]>([""]);

  const addInviteRow = () => setInviteEmails((prev) => [...prev, ""]);
  const updateInviteEmail = (i: number, val: string) =>
    setInviteEmails((prev) => prev.map((e, idx) => (idx === i ? val : e)));
  const removeInviteRow = (i: number) =>
    setInviteEmails((prev) => prev.filter((_, idx) => idx !== i));

  // ── Step 2: Income ──────────────────────────────────────────────────────────
  const now = new Date();
  const monthName = now.toLocaleString("en", { month: "long" });
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [revenueSource, setRevenueSource] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<"monthly" | "weekly">("monthly");
  const [budgetName, setBudgetName] = useState(`${monthName} ${now.getFullYear()} Budget`);

  // ── Step 3: Categories ──────────────────────────────────────────────────────
  const [categoriesList, setCategoriesList] = useState(
    DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: `local_${i}`,
      selected: [0, 1, 2, 3, 4, 6, 7].includes(i),
      planned_amount: 0,
    }))
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Category helpers ────────────────────────────────────────────────────────
  const toggleCat = (id: string) =>
    setCategoriesList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );

  const updateCat = (id: string, updates: Partial<typeof categoriesList[0]>) =>
    setCategoriesList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

  const addCategory = () => {
    const newCat = {
      id: generateId(),
      name: "New Category",
      icon: "📦",
      color: "#6b7280",
      selected: true,
      planned_amount: 0,
      level: 0,
      sort_order: categoriesList.length,
    };
    setCategoriesList([...categoriesList, newCat]);
    setEditingId(newCat.id);
  };

  const removeCategory = (id: string) =>
    setCategoriesList(categoriesList.filter((c) => c.id !== id));

  // ── 50/30/20 auto-fill ──────────────────────────────────────────────────────
  const apply503020 = () => {
    if (!monthlyIncome) {
      toast.error("Enter your monthly income first");
      return;
    }
    setCategoriesList((prev) => {
      const results = distribute503020(monthlyIncome, prev);
      return prev.map((cat, i) => ({ ...cat, planned_amount: results[i].planned_amount }));
    });
    toast.success("Amounts filled using 50/30/20 rule");
  };

  // ── 50/30/20 live breakdown ─────────────────────────────────────────────────
  const selectedCats = categoriesList.filter((c) => c.selected);
  const bucketTotals = { needs: 0, wants: 0, savings: 0 };
  selectedCats.forEach((c) => {
    bucketTotals[CATEGORY_RULES[c.name] ?? "wants"] += c.planned_amount || 0;
  });
  const totalPlanned = Object.values(bucketTotals).reduce((a, b) => a + b, 0);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!user) return;
    const u = user;
    setLoading(true);

    try {
      const householdId = generateId();
      const budgetId = generateId();

      const household = {
        id: householdId,
        name: householdName,
        invite_code: generateInviteCode(),
        created_by: u.id,
        created_at: new Date().toISOString(),
      };
      await db.households.add(household);

      await db.members.add({
        id: generateId(),
        household_id: householdId,
        user_id: u.id,
        role: "owner",
        display_name: u.display_name,
        joined_at: new Date().toISOString(),
      });

      const n = new Date();
      const budget = {
        id: budgetId,
        household_id: householdId,
        name: budgetName,
        period: budgetPeriod,
        start_date: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split("T")[0],
        end_date: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split("T")[0],
        currency: "RWF" as const,
        budget_type: "monthly" as const,
        account_type: "common" as const,
        status: "active" as const,
        revenue_source: revenueSource || undefined,
        created_by: u.id,
        created_at: new Date().toISOString(),
      };
      await db.budgets.add(budget);

      const finalCats: Category[] = selectedCats.map(({ selected, ...rest }) => ({
        ...rest,
        id: rest.id.startsWith("local_") ? generateId() : rest.id,
        budget_id: budgetId,
      })) as Category[];
      await db.categories.bulkAdd(finalCats);

      // Create initial income transaction
      let incomeTx: Transaction | null = null;
      if (monthlyIncome > 0 && finalCats.length > 0) {
        incomeTx = {
          id: generateId(),
          category_id: finalCats[0].id,
          budget_id: budgetId,
          household_id: householdId,
          added_by: u.id,
          type: "income",
          amount: monthlyIncome,
          note: `Initial Income (${revenueSource || "General"})`,
          date: new Date().toISOString().split("T")[0],
          payment_method: "cash",
          synced: navigator.onLine && isSupabaseConfigured(),
          created_at: new Date().toISOString(),
        };
        await db.transactions.add(incomeTx);
      }

      // Cloud sync
      if (typeof navigator !== "undefined" && navigator.onLine && isSupabaseConfigured()) {
        try {
          await supabase.from("profiles").upsert({
            id: u.id, email: u.email, display_name: u.display_name, preferred_language: "en",
          });
          await supabase.from("households").insert(household);
          await supabase.from("household_members").insert({
            id: generateId(), household_id: householdId,
            user_id: u.id, role: "owner", display_name: u.display_name,
          });
          await supabase.from("budgets").insert(budget);
          if (finalCats.length > 0) await supabase.from("categories").insert(finalCats);
          if (incomeTx) await supabase.from("transactions").insert(incomeTx);
        } catch (syncErr) {
          console.error("Cloud sync failed during onboarding:", syncErr);
        }
      }

      setHousehold(household);
      setActiveBudget(budget);
      setCategories(finalCats);

      // Send invitations to family members
      const emailsToInvite = inviteEmails.filter((e) => e.trim());
      if (emailsToInvite.length > 0 && isSupabaseConfigured()) {
        // Use the already-authenticated client — NOT a fresh non-persisted one
        const { data: { session } } = await getSupabase().auth.getSession();
        const token = session?.access_token;

        const results = await Promise.allSettled(
          emailsToInvite.map((email) =>
            fetch("/api/invite", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                email,
                householdId,
                householdName: household.name,
                invitedBy: u.display_name,
              }),
            }).then((r) => r.json().then((body) => ({ email, ok: r.ok, body })))
          )
        );

        // For each successful invite, create a local member record so settings shows them
        let sent = 0;
        for (const result of results) {
          if (result.status !== "fulfilled" || !result.value.ok) continue;
          const { email, body } = result.value;
          const userId: string = body.userId;
          if (!userId) continue;

          const memberId = generateId();
          const memberRecord = {
            id: memberId,
            household_id: householdId,
            user_id: userId,
            role: "member" as const,
            display_name: email.split("@")[0],
            joined_at: new Date().toISOString(),
          };

          await db.members.put(memberRecord);

          if (navigator.onLine && isSupabaseConfigured()) {
            try {
              await supabase.from("household_members").upsert(memberRecord, { onConflict: "user_id,household_id" });
            } catch (syncErr) {
              console.warn("[onboarding] member sync failed:", syncErr);
            }
          }

          sent++;
        }

        if (sent > 0) toast.success(`Invitation${sent > 1 ? "s" : ""} sent to ${sent} member${sent > 1 ? "s" : ""}.`);
        else if (emailsToInvite.length > 0) toast.error("Invitations could not be sent. You can resend them from Settings.");
      }

      toast.success("Budget created! Let's go 🚀");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error("Failed to save. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Progress dot index ──────────────────────────────────────────────────────
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-green-50 to-background p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                step === s ? "bg-primary w-6" : i < stepIdx ? "bg-primary w-2" : "bg-muted w-2"
              )}
            />
          ))}
        </div>

        {/* ── Step 1: Who is this for ─────────────────────────────────────── */}
        {step === "household" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Who is this budget for?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(["individual", "family"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setHouseholdType(type)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                      householdType === type ? "border-primary bg-primary/5" : "border-muted"
                    )}
                  >
                    {type === "individual"
                      ? <User size={28} className="text-primary" />
                      : <Users size={28} className="text-primary" />}
                    <span className="text-sm font-medium">
                      {type === "individual" ? "Just me" : "Family"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>{t("householdName")}</Label>
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g. Uwase Family Budget"
                />
              </div>

              {householdType === "family" && (
                <div className="space-y-2">
                  <Label className="text-sm">Invite family members <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground">They'll receive an email to set their password and join your budget.</p>
                  {inviteEmails.map((email, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="family@example.com"
                        value={email}
                        onChange={(e) => updateInviteEmail(i, e.target.value)}
                        className="flex-1"
                      />
                      {inviteEmails.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground" onClick={() => removeInviteRow(i)}>
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed text-muted-foreground" onClick={addInviteRow}>
                    <Plus size={13} className="mr-1" /> Add another
                  </Button>
                </div>
              )}

              <Button className="w-full" onClick={() => setStep("income")}>
                {t("next")} <ChevronRight size={16} />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Income ──────────────────────────────────────────────── */}
        {step === "income" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What's your monthly income?</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your budget is built around the money you have. We'll use this to suggest smart amounts for each category.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Big income input */}
              <div className="space-y-1.5">
                <Label className="text-base font-semibold">Monthly income (RWF)</Label>
                <AmountInput
                  value={monthlyIncome}
                  onChange={setMonthlyIncome}
                  inputClassName="h-14 text-xl"
                />
              </div>

              {/* 50/30/20 preview */}
              {monthlyIncome > 0 && (
                <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    50 / 30 / 20 breakdown
                  </p>
                  {(["needs", "wants", "savings"] as const).map((rule) => (
                    <div key={rule} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", RULE_COLORS[rule])}>
                          {RULE_LABELS[rule]}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(RULE_TARGETS[rule] * 100)}%
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums">
                        {formatRWF(Math.round(monthlyIncome * RULE_TARGETS[rule]))}
                      </span>
                    </div>
                  ))}
                  {/* Bar */}
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="bg-blue-400" style={{ width: "50%" }} />
                    <div className="bg-orange-400" style={{ width: "30%" }} />
                    <div className="bg-green-500" style={{ width: "20%" }} />
                  </div>
                </div>
              )}

              {/* Source & period */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Source of income</Label>
                  <Input
                    value={revenueSource}
                    onChange={(e) => setRevenueSource(e.target.value)}
                    placeholder="e.g. Salary, Business, MoMo transfer"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("period")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["monthly", "weekly"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setBudgetPeriod(p)}
                        className={cn(
                          "py-3 px-4 rounded-lg border text-sm font-medium transition-all",
                          budgetPeriod === p
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-muted text-muted-foreground"
                        )}
                      >
                        {t(p)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Budget name</Label>
                  <Input
                    value={budgetName}
                    onChange={(e) => setBudgetName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("household")}>{t("back")}</Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (monthlyIncome > 0) apply503020();
                    setStep("categories");
                  }}
                >
                  {t("next")} <ChevronRight size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Step 3: Categories ──────────────────────────────────────────── */}
        {step === "categories" && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Your spending categories</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Adjust amounts or add your own
                  </p>
                </div>
                {monthlyIncome > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1 text-xs border-primary text-primary"
                    onClick={apply503020}
                  >
                    <Sparkles size={12} /> 50/30/20
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                {categoriesList.map((cat) => {
                  const rule = CATEGORY_RULES[cat.name] ?? "wants";
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "rounded-xl border p-3 transition-all",
                        cat.selected ? "border-primary bg-primary/5" : "border-muted opacity-60"
                      )}
                    >
                      {editingId === cat.id ? (
                        <div className="flex gap-2 animate-in slide-in-from-top-1">
                          <Input
                            value={cat.icon}
                            onChange={(e) => updateCat(cat.id, { icon: e.target.value })}
                            className="w-14 px-1 text-center text-xl"
                          />
                          <Input
                            value={cat.name}
                            onChange={(e) => updateCat(cat.id, { name: e.target.value })}
                            className="flex-1"
                            placeholder="Category Name"
                          />
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X size={16} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCat(cat.id)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                          >
                            <span className="text-xl shrink-0">{cat.icon}</span>
                            <div className="min-w-0">
                              <span className="text-sm font-medium block truncate">{cat.name}</span>
                              <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", RULE_COLORS[rule])}>
                                {RULE_LABELS[rule]}
                              </span>
                            </div>
                          </button>
                          {cat.selected ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <AmountInput
                                value={cat.planned_amount}
                                onChange={(v) => updateCat(cat.id, { planned_amount: v })}
                                className="w-36"
                                inputClassName="h-10 text-sm"
                              />
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => setEditingId(cat.id)}
                              >
                                <Pencil size={11} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0"
                              onClick={() => removeCategory(cat.id)}
                            >
                              <X size={13} />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <Button
                  variant="outline"
                  className="w-full border-dashed py-5 rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all"
                  onClick={addCategory}
                >
                  <Plus size={14} className="mr-2" /> Add custom category
                </Button>
              </div>

              {/* 50/30/20 breakdown bar */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  {(["needs", "wants", "savings"] as const).map((rule) => {
                    const pct = totalPlanned > 0
                      ? Math.round((bucketTotals[rule] / totalPlanned) * 100)
                      : 0;
                    const barColor = rule === "needs" ? "bg-blue-400" : rule === "wants" ? "bg-orange-400" : "bg-green-500";
                    return <div key={rule} className={barColor} style={{ width: `${pct}%` }} />;
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  {(["needs", "wants", "savings"] as const).map((rule) => {
                    const pct = totalPlanned > 0
                      ? Math.round((bucketTotals[rule] / totalPlanned) * 100)
                      : 0;
                    return (
                      <span key={rule} className={cn("font-medium", RULE_COLORS[rule].replace("bg-", "text-").split(" ")[0])}>
                        {RULE_LABELS[rule]} {pct}%
                      </span>
                    );
                  })}
                  <span className="font-bold text-foreground tabular-nums">
                    {totalPlanned.toLocaleString("en-RW")} RWF
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("income")}>{t("back")}</Button>
                <Button
                  className="flex-1"
                  onClick={handleFinish}
                  disabled={loading || selectedCats.length === 0}
                >
                  {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  {t("done")} 🚀
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
