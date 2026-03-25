import { useMemo } from "react";
import { useActiveBudget, useCategories, useTransactions } from "@/store";

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
  const categories = useCategories();
  const transactions = useTransactions();

  return useMemo(() => {
    if (!activeBudget) return [];

    const today = new Date();
    const start = new Date(activeBudget.start_date);
    const end = new Date(activeBudget.end_date);

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

    const rootCategories = categories.filter(
      (c) => !c.parent_id && c.planned_amount > 0
    );
    const alerts: BudgetAlert[] = [];

    for (const cat of rootCategories) {
      const allIds = new Set([cat.id, ...getDescendantIds(cat.id, categories)]);
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
    const sorted = alerts.toSorted((a, b) =>
      a.severity === "danger" && b.severity !== "danger" ? -1 : 1
    );
    return sorted.slice(0, 3);
  }, [activeBudget, categories, transactions]);
}

function getDescendantIds(
  parentId: string,
  all: { id: string; parent_id?: string | null }[]
): string[] {
  const children = all.filter((c) => c.parent_id === parentId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(c.id, all)]);
}
