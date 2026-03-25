import { useMemo } from "react";
import { useTransactions } from "@/store";
import { useCategoryTree, getAllIds } from "./useCategoryTree";
import type { BudgetSummary, Category, CategoryWithStats, Transaction } from "@/lib/types";

export function useBudgetStats(): BudgetSummary {
  const transactions = useTransactions();
  const { categories, rootCategories, descendantMap } = useCategoryTree();

  return useMemo(() => {
    const categoriesWithStats: CategoryWithStats[] = rootCategories.map((cat) => {
      const allIds = getAllIds(cat.id, descendantMap);

      // Transfers count against the envelope (the allocation left the account)
      // but are distinguished from true expenses for velocity/alert purposes
      const catTxs = transactions.filter(
        (t) => allIds.has(t.category_id) && (t.type === "expense" || t.type === "transfer")
      );
      const spent = catTxs.reduce((sum, t) => sum + t.amount, 0);
      const remaining = cat.planned_amount - spent;
      const percentage =
        cat.planned_amount > 0
          ? Math.min(Math.round((spent / cat.planned_amount) * 100), 999)
          : 0;

      const children = buildChildStats(cat.id, categories, transactions);

      return { ...cat, spent, remaining, percentage, transactions: catTxs, children };
    });

    const total_revenue = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const total_planned   = rootCategories.reduce((sum, c) => sum + c.planned_amount, 0);
    const total_spent     = categoriesWithStats.reduce((sum, c) => sum + c.spent, 0);
    const total_remaining = total_revenue - total_planned;
    const savings         = total_revenue - total_spent;
    const percentage_used =
      total_planned > 0
        ? Math.min(Math.round((total_spent / total_planned) * 100), 999)
        : 0;

    return { total_revenue, total_planned, total_spent, total_remaining, savings, percentage_used, categories: categoriesWithStats };
  }, [rootCategories, descendantMap, categories, transactions]);
}

function buildChildStats(
  parentId: string,
  allCats: Category[],
  allTxs: Transaction[]
): CategoryWithStats[] {
  return allCats
    .filter((c) => c.parent_id === parentId)
    .map((cat) => {
      const catTxs = allTxs.filter(
        (t) => t.category_id === cat.id && (t.type === "expense" || t.type === "transfer")
      );
      const spent     = catTxs.reduce((sum, t) => sum + t.amount, 0);
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
