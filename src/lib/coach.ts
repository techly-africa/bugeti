import { CategoryWithStats } from "./types";
import { CATEGORY_RULES } from "./constants";
import { formatRWF } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CoachTipType =
  | "over_budget"      // already exceeded planned amount
  | "burning_fast"     // on track to exceed by end of period
  | "idle"             // barely used — money could be reallocated
  | "unplanned"        // no budget set but spending is happening
  | "wants_heavy"      // discretionary category eating too much of income
  | "perfect";         // explicitly "looks good" (suppressed — only returned on request)

export interface CoachTip {
  type: CoachTipType;
  headline: string;
  detail: string;
}

export interface CoachContext {
  /** Total income this period */
  totalRevenue: number;
  /** Days elapsed since period start (min 1) */
  daysElapsed: number;
  /** Total days in the period */
  totalDays: number;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Returns the most important coach tip for a category, or null if everything
 * looks fine. Priorities: over_budget > unplanned > burning_fast > wants_heavy > idle.
 */
export function getCategoryCoachTip(
  cat: CategoryWithStats,
  ctx: CoachContext
): CoachTip | null {
  const { spent, planned_amount, name } = cat;
  const { totalRevenue, daysElapsed, totalDays } = ctx;

  // ── 1. No budget set but money is being spent ──────────────────────────────
  if (planned_amount === 0 && spent > 0) {
    return {
      type: "unplanned",
      headline: "No budget set",
      detail: `You've spent ${formatRWF(spent)} on "${name}" with no budget envelope. Set a limit so this doesn't creep up unnoticed.`,
    };
  }

  if (planned_amount === 0) return null; // nothing to analyse

  // ── 2. Already over budget ─────────────────────────────────────────────────
  if (spent > planned_amount) {
    const overshoot = spent - planned_amount;
    const pct = Math.round((overshoot / planned_amount) * 100);
    return {
      type: "over_budget",
      headline: `${pct}% over budget`,
      detail: `"${name}" has exceeded its ${formatRWF(planned_amount)} envelope by ${formatRWF(overshoot)}. Review recent transactions and consider moving funds from an under-used category.`,
    };
  }

  // ── 3. Burning fast — project to the end of the period ────────────────────
  if (daysElapsed >= 5 && spent > 0) {
    const dailyRate = spent / daysElapsed;
    const projected  = dailyRate * totalDays;
    if (projected > planned_amount * 1.05) {
      const daysLeft = Math.max(0, totalDays - daysElapsed);
      const safeDaily = planned_amount > 0
        ? Math.round((planned_amount - spent) / Math.max(daysLeft, 1))
        : 0;
      return {
        type: "burning_fast",
        headline: "Projected to overspend",
        detail: `At ${formatRWF(Math.round(dailyRate))}/day you'll reach ${formatRWF(Math.round(projected))} by end of period — ${formatRWF(Math.round(projected - planned_amount))} over your ${formatRWF(planned_amount)} plan. Stay under ${formatRWF(safeDaily)}/day to finish on budget.`,
      };
    }
  }

  // ── 4. "Wants" category eating more than 30% of income ────────────────────
  const rule = CATEGORY_RULES[name];
  if (rule === "wants" && totalRevenue > 0) {
    const shareOfIncome = spent / totalRevenue;
    if (shareOfIncome > 0.30) {
      return {
        type: "wants_heavy",
        headline: `${Math.round(shareOfIncome * 100)}% of income on wants`,
        detail: `"${name}" is consuming ${Math.round(shareOfIncome * 100)}% of your income this period. The 50/30/20 rule recommends keeping all discretionary spending (wants) below 30%. Consider trimming here to strengthen savings.`,
      };
    }
  }

  // ── 5. Idle — barely used past mid-period ─────────────────────────────────
  const periodFraction = daysElapsed / totalDays;
  if (periodFraction >= 0.5 && spent < planned_amount * 0.05) {
    const realloc = Math.round(planned_amount * 0.8);
    return {
      type: "idle",
      headline: "Under-used envelope",
      detail: `You're past the halfway point but have only spent ${formatRWF(spent)} of your ${formatRWF(planned_amount)} "${name}" budget. Consider reallocating ~${formatRWF(realloc)} to savings or a category running short.`,
    };
  }

  return null;
}
