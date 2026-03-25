"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronRight, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/shared/AmountInput";
import { DEFAULT_CATEGORIES, generateId, generateInviteCode } from "@/lib/constants";
import { useAppStore, useUser } from "@/store";
import { db } from "@/db";
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

  // Categories — editable amounts
  const [catAmounts, setCatAmounts] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_CATEGORIES.map((c, i) => [`cat_${i}`, 0]))
  );
  const [selectedCats, setSelectedCats] = useState<Set<number>>(
    new Set([0, 1, 2, 3, 4, 6, 7]) // food, transport, school, health, rent, airtime, savings
  );

  const toggleCat = (i: number) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const householdId = generateId();
      const budgetId = generateId();

      // Save household to IndexedDB
      const household = {
        id: householdId,
        name: householdName,
        invite_code: generateInviteCode(),
        created_by: user.id,
        created_at: new Date().toISOString(),
      };
      await db.households.add(household);

      // Save household member
      await db.members.add({
        id: generateId(),
        household_id: householdId,
        user_id: user.id,
        role: "owner",
        display_name: user.display_name,
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
        created_by: user.id,
        created_at: new Date().toISOString(),
      };
      await db.budgets.add(budget);

      // Save selected categories
      const cats: Category[] = Array.from(selectedCats).map((i) => ({
        ...DEFAULT_CATEGORIES[i],
        id: generateId(),
        budget_id: budgetId,
        planned_amount: catAmounts[`cat_${i}`] ?? 0,
      }));
      await db.categories.bulkAdd(cats);

      // Update store
      setHousehold(household);
      setActiveBudget(budget);
      setCategories(cats);

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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose your categories</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select what matters & set amounts (you can edit later)
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                {DEFAULT_CATEGORIES.map((cat, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl border p-3 transition-all",
                      selectedCats.has(i)
                        ? "border-primary bg-primary/5"
                        : "border-muted opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleCat(i)} className="flex items-center gap-2 flex-1">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-sm font-medium">{cat.name}</span>
                      </button>
                      {selectedCats.has(i) && (
                        <AmountInput
                          value={catAmounts[`cat_${i}`] ?? 0}
                          onChange={(v) =>
                            setCatAmounts((prev) => ({
                              ...prev,
                              [`cat_${i}`]: v,
                            }))
                          }
                          className="w-40"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground text-center">
                Total planned:{" "}
                <span className="font-bold text-foreground">
                  {Array.from(selectedCats)
                    .reduce((sum, i) => sum + (catAmounts[`cat_${i}`] ?? 0), 0)
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
                  disabled={loading || selectedCats.size === 0}
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
    </div>
  );
}
