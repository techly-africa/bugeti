"use client";

export const dynamic = "force-dynamic";
import { useEffect } from "react";
import Link from "next/link";
import { PlusCircle, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { BudgetSummaryCard } from "@/components/budget/BudgetSummaryCard";
import { CategoryCard } from "@/components/budget/CategoryCard";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { useT } from "@/hooks/useT";
import { useBudgetStats } from "@/hooks/useBudgetStats";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import {
  useActiveBudget,
  useCategories,
  useTransactions,
  useUser,
  useAppStore,
} from "@/store";
import { db } from "@/db";
import { formatRWF } from "@/lib/constants";
import { syncDown } from "@/lib/sync";
import { cn } from "@/lib/utils";

// School term months: Jan (0), May (4), Sep (8)
const SCHOOL_TERM_MONTHS = new Set([0, 4, 8]);

export default function DashboardPage() {
  const t = useT();
  const user = useUser();
  const activeBudget = useActiveBudget();
  const categories = useCategories();
  const transactions = useTransactions();
  const { setCategories, setTransactions, setActiveBudget, setHousehold } =
    useAppStore();

  const stats = useBudgetStats();
  const alerts = useBudgetAlerts();

  const currentMonth = new Date().getMonth();
  const isSchoolTerm = SCHOOL_TERM_MONTHS.has(currentMonth);

  // Load from IndexedDB on mount
  useEffect(() => {
    if (!user) {
      globalThis.location.href = "/auth";
      return;
    }

    async function load(u: NonNullable<typeof user>) {
      const budgets = await db.budgets.toArray();
      if (budgets.length === 0) {
        // Try to sync from Supabase before giving up
        const synced = await syncDown(u.id);
        if (!synced) {
          globalThis.location.href = "/onboarding";
          return;
        }
        // If synced, re-fetch budgets
        const restoredBudgets = await db.budgets.toArray();
        if (restoredBudgets.length === 0) {
          globalThis.location.href = "/onboarding";
          return;
        }
        // Continue with restored data
        await proceedWithLoading(restoredBudgets);
        return;
      }

      await proceedWithLoading(budgets);
    }

    async function proceedWithLoading(budgets: any[]) {
      // Pick the most-recent active monthly budget; fall back to any budget
      const monthly = budgets
        .filter((b) => b.budget_type === "monthly" && b.status === "active")
        .sort((a, b) => b.start_date.localeCompare(a.start_date));
      const budget = monthly[0] ?? budgets.at(-1)!
      setActiveBudget(budget);

      const households = await db.households.toArray();
      if (households[0]) setHousehold(households[0]);

      const cats = await db.categories
        .where("budget_id")
        .equals(budget.id)
        .sortBy("sort_order");
      setCategories(cats);

      const txs = await db.transactions
        .where("budget_id")
        .equals(budget.id)
        .sortBy("date")
        .then((arr) => arr.toReversed());
      setTransactions(txs);
    }

    load(user);
  }, [user, setActiveBudget, setCategories, setTransactions, setHousehold]);

  const recentTxs = transactions.slice(0, 5);

  if (!activeBudget) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <span className="text-5xl">📊</span>
          <p className="text-muted-foreground text-sm">No budget yet</p>
          <Button asChild>
            <Link href="/onboarding">Create your first budget</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const savingsPositive = stats.savings >= 0;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Account switcher */}
        <div className="flex items-center justify-between">
          <AccountSwitcher />
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleString("en-RW", { month: "long", year: "numeric" })}
          </span>
        </div>

        {/* School term alert */}
        {isSchoolTerm && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <span className="text-lg">📚</span>
            <span>{t("schoolTermAlert")}</span>
          </div>
        )}

        {/* Budget velocity / overspend alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert) => {
              const overspent = alert.spent - alert.plannedAmount;
              const excess = Math.round(alert.projectedSpend - alert.plannedAmount);
              const pctUsed = Math.round((alert.spent / alert.plannedAmount) * 100);
              const pctOfPeriod = Math.round((alert.daysElapsed / alert.totalDays) * 100);

              let rationale = "";
              if (alert.type === "already_over") {
                rationale = `Spent ${formatRWF(alert.spent)} of ${formatRWF(alert.plannedAmount)} budget — ${formatRWF(overspent)} over.`;
              } else if (alert.type === "projected_over") {
                rationale = `${formatRWF(alert.spent)} spent in ${alert.daysElapsed} of ${alert.totalDays} days (${formatRWF(Math.round(alert.dailyRate))}/day). At this rate: ${formatRWF(Math.round(alert.projectedSpend))} by month end — ${formatRWF(excess)} over plan.`;
              } else {
                rationale = `${pctUsed}% of budget used in just ${pctOfPeriod}% of the period. Projected: ${formatRWF(Math.round(alert.projectedSpend))}.`;
              }

              return (
                <div
                  key={alert.categoryId}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    alert.severity === "danger"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{alert.categoryIcon}</span>
                    <p className="font-semibold">{alert.categoryName}</p>
                    <span className={cn(
                      "ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full",
                      alert.severity === "danger"
                        ? "bg-red-200/60 text-red-800"
                        : "bg-amber-200/60 text-amber-800"
                    )}>
                      {alert.type === "already_over" && t("alertAlreadyOver")}
                      {alert.type === "projected_over" && t("alertProjectedOver")}
                      {alert.type === "burning_fast" && t("alertBurningFast")}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 leading-snug">{rationale}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Revenue / Expenses / Savings summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <p className="text-xs text-muted-foreground">{t("revenue")}</p>
            </div>
            <p className="font-bold text-sm text-green-600">
              {formatRWF(stats.total_revenue)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs text-muted-foreground">{t("totalExpenses")}</p>
            </div>
            <p className="font-bold text-sm text-red-500">
              {formatRWF(stats.total_spent)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-2xl border p-3 text-center",
              savingsPositive ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wallet className={cn("h-3.5 w-3.5", savingsPositive ? "text-green-700" : "text-red-600")} />
              <p className="text-xs text-muted-foreground">{t("savings")}</p>
            </div>
            <p className={cn("font-bold text-sm", savingsPositive ? "text-green-700" : "text-red-600")}>
              {formatRWF(Math.abs(stats.savings))}
            </p>
            {!savingsPositive && (
              <p className="text-xs text-red-500">over</p>
            )}
          </div>
        </div>

        {/* Budget summary donut */}
        <BudgetSummaryCard
          summary={stats}
          budgetName={activeBudget.name}
          period={activeBudget.period}
        />

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">{t("categories")}</h2>
            <Link
              href="/budget/category/new"
              className="text-xs text-primary font-medium"
            >
              + {t("addCategory")}
            </Link>
          </div>
          {categories.filter((c) => !c.parent_id).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No categories yet
            </p>
          ) : (
            <div className="space-y-2">
              {stats.categories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          )}
        </section>

        {/* Recent transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">
              {t("recentTransactions")}
            </h2>
            <Link
              href="/transactions"
              className="text-xs text-primary font-medium"
            >
              {t("viewAll")}
            </Link>
          </div>

          {recentTxs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 bg-muted/30 rounded-xl">
              <span className="text-4xl">🧾</span>
              <p className="text-muted-foreground text-sm">
                {t("noTransactions")}
              </p>
              <Button asChild size="sm">
                <Link href="/transactions/new">
                  <PlusCircle size={14} className="mr-1" />
                  {t("addExpense")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border px-4">
              {recentTxs.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                return (
                  <TransactionItem key={tx.id} transaction={tx} category={cat} />
                );
              })}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3 pb-2">
          <Link
            href="/custom-budgets"
            className="flex items-center gap-2 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors"
          >
            <span className="text-2xl">🗂️</span>
            <div>
              <p className="font-semibold text-sm">{t("customBudgets")}</p>
              <p className="text-xs text-muted-foreground">Travel, Events…</p>
            </div>
          </Link>
          <Link
            href="/ikimina"
            className="flex items-center gap-2 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors"
          >
            <span className="text-2xl">🤝</span>
            <div>
              <p className="font-semibold text-sm">{t("ikiminaTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("ikiminaSubtitle")}</p>
            </div>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
