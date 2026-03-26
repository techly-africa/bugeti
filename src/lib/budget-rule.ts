import { CATEGORY_RULES, RULE_TARGETS, type BudgetRule } from "./constants";

export interface RuleCategory {
  name: string;
  selected: boolean;
  planned_amount: number;
}

export interface RuleResult {
  name: string;
  planned_amount: number;
}

/**
 * Distributes `income` across selected categories using the 50/30/20 rule.
 *
 * Within each bucket (needs/wants/savings) the allocation is split equally
 * among all selected categories that belong to that bucket.
 *
 * Categories not in CATEGORY_RULES default to "wants".
 * Unselected categories are returned unchanged.
 * Returns 0 for every category when income is 0 or negative.
 */
export function distribute503020(
  income: number,
  categories: RuleCategory[]
): RuleResult[] {
  if (income <= 0) {
    return categories.map(({ name, planned_amount }) => ({ name, planned_amount }));
  }

  // Count selected categories per bucket
  const counts: Record<BudgetRule, number> = { needs: 0, wants: 0, savings: 0 };
  for (const cat of categories) {
    if (!cat.selected) continue;
    counts[CATEGORY_RULES[cat.name] ?? "wants"]++;
  }

  return categories.map((cat) => {
    if (!cat.selected) return { name: cat.name, planned_amount: cat.planned_amount };
    const rule = CATEGORY_RULES[cat.name] ?? "wants";
    const share =
      counts[rule] > 0
        ? Math.round((income * RULE_TARGETS[rule]) / counts[rule])
        : 0;
    return { name: cat.name, planned_amount: share };
  });
}

/**
 * Sums planned amounts per bucket for the given category list.
 */
export function summarizeByRule(
  categories: RuleCategory[]
): Record<BudgetRule, number> {
  const totals: Record<BudgetRule, number> = { needs: 0, wants: 0, savings: 0 };
  for (const cat of categories) {
    if (!cat.selected) continue;
    totals[CATEGORY_RULES[cat.name] ?? "wants"] += cat.planned_amount;
  }
  return totals;
}
