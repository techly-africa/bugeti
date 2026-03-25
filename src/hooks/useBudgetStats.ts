import { useMemo } from "react";
import { useCategories, useTransactions } from "@/store";
import type { BudgetSummary, CategoryWithStats } from "@/lib/types";

export function useBudgetStats(): BudgetSummary {
  const categories = useCategories();
  const transactions = useTransactions();

  return useMemo(() => {
    // Only top-level categories (level 0, no parent) for the main summary
    const rootCategories = categories.filter((c) => !c.parent_id);

    const categoriesWithStats: CategoryWithStats[] = rootCategories.map((cat) => {
      // Include transactions from this category and all its sub-categories
      const descendantIds = getDescendantIds(cat.id, categories);
      const allIds = [cat.id, ...descendantIds];

      // Transfers count against the envelope (the allocation left the account)
      // but are distinguished from true expenses for velocity/alert purposes
      const catTxs = transactions.filter(
        (t) => allIds.includes(t.category_id) && (t.type === "expense" || t.type === "transfer")
      );
      const spent = catTxs.reduce((sum, t) => sum + t.amount, 0);
      const remaining = cat.planned_amount - spent;
      const percentage =
        cat.planned_amount > 0
          ? Math.min(Math.round((spent / cat.planned_amount) * 100), 999)
          : 0;

      // Build children stats
      const children = buildChildStats(cat.id, categories, transactions);

      return {
        ...cat,
        spent,
        remaining,
        percentage,
        transactions: catTxs,
        children,
      };
    });

    // Revenue: sum of all income transactions
    const total_revenue = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const total_planned = rootCategories.reduce(
      (sum, c) => sum + c.planned_amount,
      0
    );
    const total_spent = categoriesWithStats.reduce((sum, c) => sum + c.spent, 0);
    const total_remaining = total_planned - total_spent;
    const savings = total_revenue - total_spent;
    const percentage_used =
      total_planned > 0
        ? Math.min(Math.round((total_spent / total_planned) * 100), 999)
        : 0;

    return {
      total_revenue,
      total_planned,
      total_spent,
      total_remaining,
      savings,
      percentage_used,
      categories: categoriesWithStats,
    };
  }, [categories, transactions]);
}

function getDescendantIds(parentId: string, all: typeof useCategories extends () => infer R ? R : never): string[] {
  const children = all.filter((c) => c.parent_id === parentId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(c.id, all)]);
}

function buildChildStats(
  parentId: string,
  allCats: ReturnType<typeof useCategories>,
  allTxs: ReturnType<typeof useTransactions>
): CategoryWithStats[] {
  const children = allCats.filter((c) => c.parent_id === parentId);
  return children.map((cat) => {
    const catTxs = allTxs.filter(
      (t) => t.category_id === cat.id && (t.type === "expense" || t.type === "transfer")
    );
    const spent = catTxs.reduce((sum, t) => sum + t.amount, 0);
    const remaining = cat.planned_amount - spent;
    const percentage =
      cat.planned_amount > 0
        ? Math.min(Math.round((spent / cat.planned_amount) * 100), 999)
        : 0;
    return {
      ...cat,
      spent,
      remaining,
      percentage,
      transactions: catTxs,
      children: cat.level < 2 ? buildChildStats(cat.id, allCats, allTxs) : [],
    };
  });
}
