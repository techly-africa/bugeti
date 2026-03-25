import { useMemo } from "react";
import { useActiveBudget, useTransactions } from "@/store";
import { useCategoryTree, getAllIds } from "./useCategoryTree";

export interface BudgetAlert {
  type: "already_over" | "projected_over" | "burning_fast";
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  severity: "warning" | "danger";
  /** Amount already spent in the current period */
  spent: number;
  /** RWF per day based on current spend */
  dailyRate: number;
  /** Days elapsed since period start */
  daysElapsed: number;
  /** Total days in the period */
  totalDays: number;
  daysLeft: number;
  projectedSpend: number;
  plannedAmount: number;
}

export function useBudgetAlerts(): BudgetAlert[] {
  const activeBudget = useActiveBudget();
  const transactions = useTransactions();
  const { rootCategories, descendantMap } = useCategoryTree();

  return useMemo(() => {
    if (!activeBudget) return [];

    const today = new Date();
    // Parse ISO date strings as local noon to avoid UTC-midnight ±1 day drift
    // in UTC+2 (Kigali) and other positive-offset timezones.
    const start = new Date(activeBudget.start_date + "T12:00:00");
    const end   = new Date(activeBudget.end_date   + "T12:00:00");

    // Clamp effective end to today so future days don't dilute the daily rate
    const effectiveEnd = new Date(Math.min(end.getTime(), today.getTime()));
    const daysElapsed = Math.max(
      1,
      Math.round((effectiveEnd.getTime() - start.getTime()) / 86_400_000)
    );
    const totalDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000)
    );
    const daysLeft = Math.max(0, totalDays - daysElapsed);
    const periodFraction = daysElapsed / totalDays;

    const alerts: BudgetAlert[] = [];

    for (const cat of rootCategories) {
      if (cat.planned_amount <= 0) continue;

      const allIds = getAllIds(cat.id, descendantMap);
      // Only true expenses drive velocity — transfers (pocket money splits, etc.)
      // are intentional allocations, not runaway spending
      const spent = transactions
        .filter((t) => allIds.has(t.category_id) && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      if (spent === 0) continue;

      const dailyRate = spent / daysElapsed;
      const projectedSpend = dailyRate * totalDays;
      const spentFraction = spent / cat.planned_amount;

      const base = {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        spent,
        dailyRate,
        daysElapsed,
        totalDays,
        daysLeft,
        projectedSpend,
        plannedAmount: cat.planned_amount,
      };

      // Already over budget
      if (spent > cat.planned_amount) {
        alerts.push({ ...base, type: "already_over", severity: "danger" });
        continue;
      }

      // Projected to exceed budget by end of period (≥5 days in to avoid early-month noise)
      if (daysElapsed >= 5 && projectedSpend > cat.planned_amount * 1.05) {
        alerts.push({ ...base, type: "projected_over", severity: "danger" });
        continue;
      }

      // Burning fast: spending 25%+ faster than linear pace and already at ≥50%
      if (
        daysElapsed >= 3 &&
        spentFraction > periodFraction + 0.25 &&
        spentFraction >= 0.5
      ) {
        alerts.push({ ...base, type: "burning_fast", severity: "warning" });
      }
    }

    // Danger alerts first; cap at 3 to avoid alert fatigue
    return alerts
      .toSorted((a, b) => (a.severity === "danger" && b.severity !== "danger" ? -1 : 1))
      .slice(0, 3);
  }, [activeBudget, rootCategories, descendantMap, transactions]);
}
