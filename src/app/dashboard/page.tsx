"use client";

export const dynamic = "force-dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarPlus, Check, Loader2, PlusCircle, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { BudgetSummaryCard } from "@/components/budget/BudgetSummaryCard";
import { CategoryCard } from "@/components/budget/CategoryCard";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { SectionHelp } from "@/components/shared/SectionHelp";
import { useT } from "@/hooks/useT";
import { useBudgetStats } from "@/hooks/useBudgetStats";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import {
  useActiveBudget,
  useCategories,
  useTransactions,
  useUser,
  useHousehold,
  useAppStore,
} from "@/store";
import { db } from "@/db";
import { formatRWF } from "@/lib/constants";
import { syncDown } from "@/lib/sync";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { HouseholdMember, RecurringPayment, Trip } from "@/lib/types";

// School term months: Jan (0), May (4), Sep (8)
const SCHOOL_TERM_MONTHS = new Set([0, 4, 8]);

export default function DashboardPage() {
  const t = useT();
  const user = useUser();
  const activeBudget = useActiveBudget();
  const categories = useCategories();
  const transactions = useTransactions();
  const household = useHousehold();

  const stats = useBudgetStats();
  const alerts = useBudgetAlerts();

  const currentMonth = new Date().getMonth();
  const isSchoolTerm = SCHOOL_TERM_MONTHS.has(currentMonth);

  const [loading, setLoading] = useState(true);
  const [hasNoData, setHasNoData] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<Trip[]>([]);
  const [recurringDue, setRecurringDue] = useState<RecurringPayment[]>([]);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    if (!user) {
      globalThis.location.href = "/auth";
      setLoading(false);
      return;
    }

    async function load(u: NonNullable<typeof user>) {
      try {
        const budgets = await db.budgets.toArray();
        if (budgets.length === 0) {
          // Try to sync from Supabase before giving up
          const synced = await syncDown(u.id);
          const restoredBudgets = synced ? await db.budgets.toArray() : [];
          if (restoredBudgets.length === 0) {
            setHasNoData(true);
            return;
          }
          await proceedWithLoading(restoredBudgets);
          return;
        }
        await proceedWithLoading(budgets);
      } catch (err) {
        console.error("[dashboard] load failed:", err);
        setHasNoData(true);
      } finally {
        setLoading(false);
      }
    }

    async function proceedWithLoading(budgets: any[]) {
      // Pick the most-recent active monthly budget; fall back to any budget
      const monthly = budgets
        .filter((b) => b.budget_type === "monthly" && b.status === "active")
        .sort((a, b) => b.start_date.localeCompare(a.start_date));
      const budget = monthly[0] ?? budgets.at(-1)!;

      // Fetch all data in parallel
      const [households, cats, txs] = await Promise.all([
        db.households.toArray(),
        db.categories.where("budget_id").equals(budget.id).sortBy("sort_order"),
        db.transactions.where("budget_id").equals(budget.id).sortBy("date").then((arr) => arr.toReversed()),
      ]);

      // Single store update → single re-render
      useAppStore.setState({
        activeBudget: budget,
        ...(households[0] ? { household: households[0] } : {}),
        categories: cats,
        transactions: txs,
      });

      // Load members for filter chips
      if (households[0]) {
        const mems = await db.members.where("household_id").equals(households[0].id).toArray();
        setMembers(mems);
      }
    }

    load(user);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load upcoming event reminders
  useEffect(() => {
    if (!household) return;
    db.trips
      .where("household_id").equals(household.id)
      .filter((t) => t.status !== "completed")
      .toArray()
      .then((trips) => {
        const now = Date.now();
        const soon = trips.filter((t) => {
          const msUntil = new Date(t.start_date).getTime() - now;
          const daysUntil = Math.ceil(msUntil / 86_400_000);
          if (daysUntil < 0) return false; // already past
          const threshold = t.reminder_days_before ?? 7;
          return daysUntil <= threshold;
        });
        // Sort by soonest first
        soon.sort((a, b) => a.start_date.localeCompare(b.start_date));
        setUpcomingTrips(soon);
      });
  }, [household]);

  // Load recurring bills due this month
  const loadRecurring = useCallback(async () => {
    if (!household) return;
    const rows = await db.recurring_payments
      .where("household_id").equals(household.id)
      .filter((p) => p.active)
      .toArray();
    const now = new Date();
    const due = rows.filter((p) => {
      if (!p.last_paid_at) return true;
      const paid = new Date(p.last_paid_at);
      return paid.getFullYear() !== now.getFullYear() || paid.getMonth() !== now.getMonth();
    });
    due.sort((a, b) => a.due_day - b.due_day);
    setRecurringDue(due);
  }, [household]);

  useEffect(() => { loadRecurring(); }, [loadRecurring]);

  const handleMarkPaid = async (payment: RecurringPayment) => {
    if (!user || !activeBudget) return;
    setPayingId(payment.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await db.recurring_payments.update(payment.id, { last_paid_at: today });
      if (payment.category_id && payment.amount > 0) {
        const tx = {
          id: crypto.randomUUID(),
          category_id: payment.category_id,
          budget_id: activeBudget.id,
          household_id: household!.id,
          added_by: user.id,
          type: "expense" as const,
          amount: payment.amount,
          note: payment.name,
          date: today,
          payment_method: payment.payment_method,
          synced: false,
          created_at: new Date().toISOString(),
        };
        await db.transactions.add(tx);
      }
      await loadRecurring();
    } finally {
      setPayingId(null);
    }
  };

  const handleCloneBudget = useCallback(async () => {
    if (!activeBudget || !user || !household) return;
    setCloning(true);
    try {
      // Compute next month's date range from activeBudget.start_date
      const start = new Date(activeBudget.start_date);
      const nextStart = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const nextEnd   = new Date(nextStart.getFullYear(), nextStart.getMonth() + 1, 0);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      // Check if a budget already exists for that month
      const existing = await db.budgets.toArray();
      const alreadyExists = existing.some(
        (b) => b.start_date === fmt(nextStart) && b.household_id === household.id
      );
      if (alreadyExists) {
        toast.error("A budget for next month already exists.");
        return;
      }

      const newBudgetId = crypto.randomUUID();
      const newBudget = {
        ...activeBudget,
        id: newBudgetId,
        start_date: fmt(nextStart),
        end_date: fmt(nextEnd),
        name: `${nextStart.toLocaleString("en-RW", { month: "long", year: "numeric" })} Budget`,
        status: "active" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Clone top-level categories first, then children (to preserve parent_id mapping)
      const topLevel = categories.filter((c) => !c.parent_id);
      const children  = categories.filter((c) =>  c.parent_id);

      const idMap = new Map<string, string>(); // old id → new id

      const newTopLevel = topLevel.map((c) => {
        const newId = crypto.randomUUID();
        idMap.set(c.id, newId);
        return { ...c, id: newId, budget_id: newBudgetId, parent_id: null };
      });

      const newChildren = children.map((c) => {
        const newId = crypto.randomUUID();
        idMap.set(c.id, newId);
        return {
          ...c,
          id: newId,
          budget_id: newBudgetId,
          parent_id: idMap.get(c.parent_id!) ?? null,
        };
      });

      const newCategories = [...newTopLevel, ...newChildren];

      // Persist locally
      await db.budgets.put(newBudget);
      await db.categories.bulkPut(newCategories);

      // Sync to Supabase if online
      if (navigator.onLine && isSupabaseConfigured()) {
        await supabase.from("budgets").insert(newBudget);
        await supabase.from("categories").insert(newCategories);
      }

      // Switch active budget in store
      useAppStore.setState({ activeBudget: newBudget, categories: newTopLevel, transactions: [] });

      toast.success("Budget cloned for next month!");
    } catch (err) {
      console.error("[clone]", err);
      toast.error("Failed to clone budget.");
    } finally {
      setCloning(false);
    }
  }, [activeBudget, categories, household, user]);

  const recentTxs = transactions.slice(0, 5);

  const membersMap = Object.fromEntries(members.map((m) => [m.id, m.display_name]));
  const filteredCategoryIds = new Set(
    assigneeFilter
      ? categories.filter((c) => c.assigned_to === assigneeFilter).map((c) => c.id)
      : categories.map((c) => c.id)
  );

  if (hasNoData) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center flex-1 h-[60vh] gap-3 px-4 text-center animate-in fade-in zoom-in duration-500">
          <span className="text-6xl mb-2">👋</span>
          <h2 className="text-2xl font-bold bg-gradient-to-br from-primary to-emerald-700 bg-clip-text text-transparent">
            Welcome to Bugeti
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
            It looks like you don't have a budget set up yet. If you were invited by family, wait for your data to sync, or create a new budget now.
          </p>
          <Button asChild className="w-full max-w-xs h-12 text-base font-semibold shadow-lg shadow-primary/20">
            <Link href="/onboarding">Create my first budget 🚀</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!activeBudget || !stats) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
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

        {/* Assignee filter chips (only when household has multiple members) */}
        {members.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setAssigneeFilter(null)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border transition-all",
                assigneeFilter === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              All
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setAssigneeFilter(assigneeFilter === m.id ? null : m.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs border transition-all",
                  assigneeFilter === m.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-transparent"
                )}
              >
                {m.display_name[0].toUpperCase()} {m.display_name}
              </button>
            ))}
          </div>
        )}

        {/* School term alert */}
        {isSchoolTerm && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <span className="text-lg">📚</span>
            <span>{t("schoolTermAlert")}</span>
          </div>
        )}

        {/* Upcoming event reminders */}
        {upcomingTrips.length > 0 && (
          <div className="space-y-2">
            {upcomingTrips.map((trip) => {
              const daysUntil = Math.ceil(
                (new Date(trip.start_date).getTime() - Date.now()) / 86_400_000
              );
              const urgency = daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`;
              return (
                <Link
                  key={trip.id}
                  href={`/travel/${trip.id}`}
                  className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 hover:bg-primary/10 transition-colors"
                >
                  <span className="text-2xl shrink-0">{trip.cover_emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{trip.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{trip.destination}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Bell size={11} className="text-primary" />
                    <span className="text-xs font-medium text-primary">{urgency}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Monthly Bills */}
        {recurringDue.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-sm">🔁 Monthly Bills</h2>
                <SectionHelp title="Monthly Bills">
                  <p>These are your fixed recurring payments — rent, water, electricity, internet, and more.</p>
                  <p>Each bill shows how many days until it's due. Tap <strong>Paid</strong> to mark it as settled and automatically log it as an expense in your budget.</p>
                  <p>Go to <strong>Manage</strong> to add, edit, or remove bills.</p>
                </SectionHelp>
              </div>
              <Link href="/recurring" className="text-xs text-primary font-medium">
                Manage →
              </Link>
            </div>
            <div className="bg-card rounded-2xl border divide-y overflow-hidden">
              {recurringDue.map((p) => {
                const today = new Date().getDate();
                const overdue = p.due_day < today;
                const daysLeft = p.due_day - today;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className={cn(
                        "text-xs",
                        overdue ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-muted-foreground"
                      )}>
                        {overdue
                          ? `${Math.abs(daysLeft)}d overdue`
                          : daysLeft === 0 ? "Due today"
                          : `Due in ${daysLeft}d`}
                        {p.amount > 0 && ` · ${formatRWF(p.amount)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleMarkPaid(p)}
                      disabled={payingId === p.id}
                      className={cn(
                        "shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all",
                        overdue
                          ? "border-red-300 text-red-700 hover:bg-red-50"
                          : "border-primary/30 text-primary hover:bg-primary/5"
                      )}
                    >
                      {payingId === p.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : <Check size={11} />}
                      Paid
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
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

        {/* Budget Envelope Summary */}
        <div className="flex items-center gap-1.5 -mb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">This month</p>
          <SectionHelp title="Budget Overview">
            <p><strong>Income</strong> is the total money you planned to receive this month (salary, business revenue, etc.).</p>
            <p><strong>Total Budget</strong> is how much you've allocated across all spending categories.</p>
            <p><strong>Spent</strong> is every expense recorded so far this month.</p>
            <p><strong>Remaining</strong> is what's left in your envelope. The 80/20 split is a guide: put 80% into savings and keep 20% as an emergency buffer.</p>
          </SectionHelp>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <p className="text-xs text-muted-foreground">{t("income")}</p>
            </div>
            <p className="font-bold text-sm text-green-600">
              {formatRWF(stats.total_revenue)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">{t("totalBudget")}</p>
            </div>
            <p className="font-bold text-sm text-primary">
              {formatRWF(stats.total_planned)}
            </p>
          </div>
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs text-muted-foreground">{t("spent")}</p>
            </div>
            <p className="font-bold text-sm text-red-500">
              {formatRWF(stats.total_spent)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-2xl border p-3 text-center",
              stats.total_remaining >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wallet className={cn("h-3.5 w-3.5", stats.total_remaining >= 0 ? "text-green-700" : "text-red-600")} />
              <p className="text-xs text-muted-foreground">
                {t("remaining")}
              </p>
            </div>
            <p className={cn("font-bold text-sm", stats.total_remaining >= 0 ? "text-green-700" : "text-red-600")}>
              {formatRWF(Math.abs(stats.total_remaining))}
            </p>
            {stats.total_remaining > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-green-200/60 flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[10px] text-green-700">
                  <span className="opacity-80">80% Savings</span>
                  <span className="font-semibold tabular-nums">{formatRWF(stats.total_remaining * 0.8)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-emerald-800">
                  <span className="opacity-80">20% Emergency</span>
                  <span className="font-semibold tabular-nums">{formatRWF(stats.total_remaining * 0.2)}</span>
                </div>
              </div>
            )}
            {stats.total_remaining < 0 && (
              <p className="text-[10px] text-red-500 mt-0.5">over budget</p>
            )}
          </div>
        </div>

        {/* Budget summary donut */}
        <div className="flex items-center gap-1.5 -mb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Spending breakdown</p>
          <SectionHelp title="Spending Breakdown">
            <p>This donut chart shows how your budget is distributed across all categories.</p>
            <p>Each slice represents a category. The larger the slice, the bigger its share of your total planned spending.</p>
            <p>The center shows your overall spending progress for the month.</p>
          </SectionHelp>
        </div>
        <BudgetSummaryCard
          summary={stats}
          budgetName={activeBudget.name}
          period={activeBudget.period}
        />

        {/* Clone budget */}
        <div className="flex items-center gap-1.5 -mb-1">
          <SectionHelp title="Duplicate for Next Month">
            <p>This copies your current budget — all categories and their planned amounts — into a fresh budget for next month.</p>
            <p>Transactions are not copied, so you start clean. It's the fastest way to keep the same structure month to month without rebuilding from scratch.</p>
          </SectionHelp>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={handleCloneBudget}
          disabled={cloning}
        >
          {cloning
            ? <Loader2 size={13} className="animate-spin" />
            : <CalendarPlus size={13} />}
          Duplicate for next month
        </Button>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm">{t("categories")}</h2>
              <SectionHelp title="Budget Categories">
                <p>Categories are the spending envelopes in your budget — Housing, Food, Transport, School Fees, and so on.</p>
                <p>Each category shows a progress bar: how much of your planned amount you've already spent. Green means on track; red means over budget.</p>
                <p>Tap a category to see all its transactions. Tap <strong>+ Add category</strong> to create a new spending envelope.</p>
              </SectionHelp>
            </div>
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
              {stats.categories
                .filter((cat) => filteredCategoryIds.has(cat.id))
                .map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    assigneeName={cat.assigned_to ? membersMap[cat.assigned_to] : undefined}
                  />
                ))}
              <Link
                href="/budget/category/new"
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors gap-2"
              >
                <PlusCircle size={24} />
                <span className="text-sm font-medium">{t("addCategory")}</span>
              </Link>
            </div>
          )}
        </section>

        {/* Recent transactions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm">{t("recentTransactions")}</h2>
              <SectionHelp title="Recent Transactions">
                <p>Every expense, income, or transfer you record in Bugeti appears here, newest first.</p>
                <p>Transactions are automatically grouped by category and counted against your budget envelope.</p>
                <p>Tap <strong>View all</strong> to search and filter your full history. Tap the <strong>+</strong> button in the navigation to add a new transaction.</p>
              </SectionHelp>
            </div>
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
          <Link
            href="/travel"
            className="flex items-center gap-2 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors"
          >
            <span className="text-2xl">✈️</span>
            <div>
              <p className="font-semibold text-sm">Events & Trips</p>
              <p className="text-xs text-muted-foreground">Weddings, travel…</p>
            </div>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
