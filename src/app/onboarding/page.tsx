"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronRight, Users, User, Plus, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/shared/AmountInput";
import { DEFAULT_CATEGORIES, generateId, generateInviteCode } from "@/lib/constants";
import { useAppStore, useUser } from "@/store";
import { db } from "@/db";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useT } from "@/hooks/useT";
import { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "household" | "budget" | "categories" | "done";

export default function OnboardingPage() {
  const t = useT();
  const user = useUser();
  const { setHousehold, setActiveBudget, setCategories } = useAppStore();

  const [step, setStep] = useState<Step>("household");
  const [loading, setLoading] = useState(false);

  // Household
  const [householdType, setHouseholdType] = useState<"individual" | "family">("individual");
  const [householdName, setHouseholdName] = useState(
    user ? `${user.display_name}'s Budget` : "My Budget"
  );

  // Budget
  const [budgetName, setBudgetName] = useState("March 2026 Budget");
  const [budgetPeriod, setBudgetPeriod] = useState<"monthly" | "weekly">("monthly");
  const [revenueSource, setRevenueSource] = useState("");
  const [revenueDuration, setRevenueDuration] = useState("");

  // Categories — dynamic list
  const [categoriesList, setCategoriesList] = useState(
    DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: `local_${i}`,
      selected: [0, 1, 2, 3, 4, 6, 7].includes(i),
      planned_amount: 0,
    }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleCat = (id: string) => {
    setCategoriesList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const updateCat = (id: string, updates: Partial<typeof categoriesList[0]>) => {
    setCategoriesList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

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

  const removeCategory = (id: string) => {
    setCategoriesList(categoriesList.filter((c) => c.id !== id));
  };

  const handleFinish = async () => {
    if (!user) return;
    const u = user;
    setLoading(true);

    try {
      const householdId = generateId();
      const budgetId = generateId();

      // Save household to IndexedDB
      const household = {
        id: householdId,
        name: householdName,
        invite_code: generateInviteCode(),
        created_by: u.id,
        created_at: new Date().toISOString(),
      };
      await db.households.add(household);

      // Save household member
      await db.members.add({
        id: generateId(),
        household_id: householdId,
        user_id: u.id,
        role: "owner",
        display_name: u.display_name,
        joined_at: new Date().toISOString(),
      });

      // Save budget
      const now = new Date();
      const budget = {
        id: budgetId,
        household_id: householdId,
        name: budgetName,
        period: budgetPeriod,
        start_date: new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0],
        end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0],
        currency: "RWF" as const,
        budget_type: "monthly" as const,
        account_type: "common" as const,
        status: "active" as const,
        revenue_source: revenueSource || undefined,
        revenue_duration: revenueDuration || undefined,
        created_by: u.id,
        created_at: new Date().toISOString(),
      };
      await db.budgets.add(budget);

      // Save selected categories
      const finalCats: Category[] = categoriesList
        .filter((c) => c.selected)
        .map(({ selected, ...rest }) => ({
          ...rest,
          id: rest.id.startsWith("local_") ? generateId() : rest.id,
          budget_id: budgetId,
        })) as Category[];
      await db.categories.bulkAdd(finalCats);

      // ─── Save to Supabase (if online & configured) ───
      if (typeof navigator !== "undefined" && navigator.onLine && isSupabaseConfigured()) {
        try {
          // 1. Profile sync — ensure it exists
          await supabase.from("profiles").upsert({
            id: u.id,
            email: u.email,
            display_name: u.display_name,
            preferred_language: "en",
          });

          // 2. Household
          await supabase.from("households").insert(household);

          // 3. Member
          await supabase.from("household_members").insert({
            id: generateId(),
            household_id: householdId,
            user_id: u.id,
            role: "owner",
            display_name: u.display_name,
          });

          // 4. Budget
          await supabase.from("budgets").insert(budget);

          // 5. Categories
          if (finalCats.length > 0) {
            await supabase.from("categories").insert(finalCats);
          }
        } catch (syncErr) {
          console.error("Cloud sync failed during onboarding:", syncErr);
          // Non-blocking: background sync or retry later
        }
      }

      // Update store
      setHousehold(household);
      setActiveBudget(budget);
      setCategories(finalCats);

      toast.success("Budget created! Let's go 🚀");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error("Failed to save. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {(["household", "budget", "categories"] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                step === s
                  ? "bg-primary w-6"
                  : ["household", "budget", "categories"].indexOf(s) <
                    ["household", "budget", "categories"].indexOf(step)
                    ? "bg-primary"
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step: Household */}
        {step === "household" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Who is this budget for?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setHouseholdType("individual")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    householdType === "individual"
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  )}
                >
                  <User size={28} className="text-primary" />
                  <span className="text-sm font-medium">Just me</span>
                </button>
                <button
                  onClick={() => setHouseholdType("family")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    householdType === "family"
                      ? "border-primary bg-primary/5"
                      : "border-muted"
                  )}
                >
                  <Users size={28} className="text-primary" />
                  <span className="text-sm font-medium">Family</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <Label>{t("householdName")}</Label>
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g. Uwase Family Budget"
                />
              </div>

              <Button className="w-full" onClick={() => setStep("budget")}>
                {t("next")} <ChevronRight size={16} />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Budget setup */}
        {step === "budget" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Set up your first budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("budgetName")}</Label>
                <Input
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
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
                        "py-2 px-4 rounded-lg border text-sm font-medium transition-all",
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

              <div className="space-y-3 pt-2 border-t mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Revenue (Optional)
                </p>
                <div className="space-y-1.5">
                  <Label>Source of funds</Label>
                  <Input
                    value={revenueSource}
                    onChange={(e) => setRevenueSource(e.target.value)}
                    placeholder="e.g. Salary, Business, MoMo transfer"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expected for how long?</Label>
                  <Input
                    value={revenueDuration}
                    onChange={(e) => setRevenueDuration(e.target.value)}
                    placeholder="e.g. Recurring monthly, 3 months"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("household")}>
                  {t("back")}
                </Button>
                <Button className="flex-1" onClick={() => setStep("categories")}>
                  {t("next")} <ChevronRight size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Categories & amounts */}
        {step === "categories" && (
          <Card><CardHeader>
            <CardTitle className="text-lg">Choose your categories</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select what matters & set amounts (you can edit later)
            </p>
          </CardHeader><CardContent className="space-y-3">
              <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                {categoriesList.map((cat) => (
                  <div
                    key={cat.id}
                    className={cn(
                      "rounded-xl border p-3 transition-all",
                      cat.selected
                        ? "border-primary bg-primary/5"
                        : "border-muted opacity-60"
                    )}
                  >
                    {editingId === cat.id ? (
                      <div className="space-y-2 animate-in slide-in-from-top-1">
                        <div className="flex gap-2">
                          <Input
                            value={cat.icon}
                            onChange={(e) => updateCat(cat.id, { icon: e.target.value })}
                            className="w-12 px-0 text-center text-xl" />
                          <Input
                            value={cat.name}
                            onChange={(e) => updateCat(cat.id, { name: e.target.value })}
                            className="flex-1"
                            placeholder="Category Name" />
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleCat(cat.id)} className="flex items-center gap-2 flex-1 text-left">
                          <span className="text-xl">{cat.icon}</span>
                          <span className="text-sm font-medium">{cat.name}</span>
                        </button>
                        {cat.selected ? (
                          <div className="flex items-center gap-2">
                            <AmountInput
                              value={cat.planned_amount}
                              onChange={(v) => updateCat(cat.id, { planned_amount: v })}
                              className="w-32" />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(cat.id)}>
                              <Pencil size={12} />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeCategory(cat.id)}>
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full border-dashed py-6 rounded-xl text-muted-foreground hover:text-primary hover:border-primary transition-all"
                  onClick={addCategory}
                >
                  <Plus size={16} className="mr-2" /> Add custom category
                </Button>
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground text-center">
                Total planned:{" "}
                <span className="font-bold text-foreground">
                  {categoriesList
                    .filter((c) => c.selected)
                    .reduce((sum, c) => sum + (c.planned_amount || 0), 0)
                    .toLocaleString("en-RW")}{" "}
                  RWF
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("budget")}>
                  {t("back")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleFinish}
                  disabled={loading || categoriesList.filter((c) => c.selected).length === 0}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : null}
                  {t("done")} 🚀
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
    </div >
  );
}
