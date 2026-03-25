import { Category } from "./types";

// ─── Default Rwandan Budget Categories ───────────────────────────────────────

export const DEFAULT_CATEGORIES: Omit<
  Category,
  "id" | "budget_id"
>[] = [
  { name: "Food & Groceries", name_rw: "Ibiryo", planned_amount: 0, icon: "🛒", color: "#16a34a", sort_order: 0, parent_id: null, level: 0 },
  { name: "Transport", name_rw: "Gutwara", planned_amount: 0, icon: "🚌", color: "#2563eb", sort_order: 1, parent_id: null, level: 0 },
  { name: "School Fees", name_rw: "Amashuri", planned_amount: 0, icon: "📚", color: "#7c3aed", sort_order: 2, parent_id: null, level: 0 },
  { name: "Health", name_rw: "Ubuzima", planned_amount: 0, icon: "🏥", color: "#dc2626", sort_order: 3, parent_id: null, level: 0 },
  { name: "Rent", name_rw: "Kodesha", planned_amount: 0, icon: "🏠", color: "#b45309", sort_order: 4, parent_id: null, level: 0 },
  { name: "Utilities", name_rw: "Amazi n'amashanyarazi", planned_amount: 0, icon: "💡", color: "#0891b2", sort_order: 5, parent_id: null, level: 0 },
  { name: "Airtime & Internet", name_rw: "Airtime", planned_amount: 0, icon: "📱", color: "#059669", sort_order: 6, parent_id: null, level: 0 },
  { name: "Househelp", name_rw: "Umukozi w'inzu", planned_amount: 0, icon: "🧹", color: "#0ea5e9", sort_order: 7, parent_id: null, level: 0 },
  { name: "Kids Expenses", name_rw: "Ibikoreshwa by'abana", planned_amount: 0, icon: "🧒", color: "#f59e0b", sort_order: 8, parent_id: null, level: 0 },
  { name: "Pocket Money", name_rw: "Amafaranga yo mu nkono", planned_amount: 0, icon: "👛", color: "#8b5cf6", sort_order: 9, parent_id: null, level: 0 },
  { name: "Entertainment", name_rw: "Ibikinisho", planned_amount: 0, icon: "🎉", color: "#db2777", sort_order: 10, parent_id: null, level: 0 },
  { name: "Clothing", name_rw: "Imyenda", planned_amount: 0, icon: "👗", color: "#9333ea", sort_order: 11, parent_id: null, level: 0 },
  { name: "Other", name_rw: "Ibindi", planned_amount: 0, icon: "📦", color: "#6b7280", sort_order: 12, parent_id: null, level: 0 },
];

// ─── 50/30/20 Rule — category bucket classification ──────────────────────────
// Keyed by the English category name from DEFAULT_CATEGORIES.
// "needs"   → 50% of income (essential, non-negotiable)
// "wants"   → 30% of income (discretionary)
// "savings" → 20% of income (future / debt repayment)

export type BudgetRule = "needs" | "wants" | "savings";

export const CATEGORY_RULES: Record<string, BudgetRule> = {
  "Food & Groceries":  "needs",
  "Transport":         "needs",
  "School Fees":       "needs",
  "Health":            "needs",
  "Rent":              "needs",
  "Utilities":         "needs",
  "Airtime & Internet":"needs",
  "Kids Expenses":     "needs",
  "Househelp":         "wants",
  "Pocket Money":      "wants",
  "Entertainment":     "wants",
  "Clothing":          "wants",
  "Other":             "wants",
};

export const RULE_LABELS: Record<BudgetRule, string> = {
  needs:   "Needs",
  wants:   "Wants",
  savings: "Savings",
};

export const RULE_COLORS: Record<BudgetRule, string> = {
  needs:   "bg-blue-100 text-blue-700",
  wants:   "bg-orange-100 text-orange-700",
  savings: "bg-green-100 text-green-700",
};

export const RULE_TARGETS: Record<BudgetRule, number> = {
  needs:   0.50,
  wants:   0.30,
  savings: 0.20,
};

// ─── RWF Formatting ───────────────────────────────────────────────────────────

export function formatRWF(amount: number): string {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function parseRWF(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

// ─── Budget status thresholds ─────────────────────────────────────────────────

export const BUDGET_THRESHOLDS = {
  WARNING: 75,  // % used to show warning
  DANGER: 90,   // % used to show danger
} as const;

// ─── Invite code generator ────────────────────────────────────────────────────

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ─── Unique ID ────────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}
