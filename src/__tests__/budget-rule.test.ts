import { describe, it, expect } from "vitest";
import { distribute503020, summarizeByRule, type RuleCategory } from "@/lib/budget-rule";
import { DEFAULT_CATEGORIES, CATEGORY_RULES } from "@/lib/constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSelected(names: string[]): RuleCategory[] {
  return names.map((name) => ({ name, selected: true, planned_amount: 0 }));
}

function allDefault(income: number): RuleCategory[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    name: c.name,
    selected: true,
    planned_amount: 0,
  }));
}

// ─── distribute503020 ─────────────────────────────────────────────────────────

describe("distribute503020 — basic allocation", () => {
  it("allocates 50% to needs when there is 1 needs category selected", () => {
    const cats: RuleCategory[] = [
      { name: "Rent", selected: true, planned_amount: 0 },
    ];
    const result = distribute503020(100000, cats);
    expect(result[0].planned_amount).toBe(50000); // 50% of 100k
  });

  it("splits 30% equally among wants categories", () => {
    const cats: RuleCategory[] = [
      { name: "Entertainment", selected: true, planned_amount: 0 },
      { name: "Clothing", selected: true, planned_amount: 0 },
    ];
    const result = distribute503020(100000, cats);
    // 30% / 2 = 15 000 each
    expect(result[0].planned_amount).toBe(15000);
    expect(result[1].planned_amount).toBe(15000);
  });

  it("allocates 20% to a single savings category", () => {
    const cats: RuleCategory[] = [
      { name: "Savings", selected: true, planned_amount: 0 },
    ];
    // "Savings" is not in CATEGORY_RULES → defaults to "wants" (30%)
    // Use a category that IS classified as savings
    const savingsCatName = Object.entries(CATEGORY_RULES).find(
      ([, v]) => v === "savings"
    )?.[0];

    if (savingsCatName) {
      const cats2: RuleCategory[] = [{ name: savingsCatName, selected: true, planned_amount: 0 }];
      const result = distribute503020(100000, cats2);
      expect(result[0].planned_amount).toBe(20000);
    }
  });

  it("rounds to whole numbers", () => {
    // 3 needs categories: 50000 / 3 = 16666.67 → each gets 16667
    const cats = makeSelected(["Rent", "Food & Groceries", "Transport"]);
    const result = distribute503020(100000, cats);
    for (const r of result) {
      expect(Number.isInteger(r.planned_amount)).toBe(true);
    }
  });
});

describe("distribute503020 — income edge cases", () => {
  it("returns unchanged amounts when income is 0", () => {
    const cats: RuleCategory[] = [
      { name: "Rent", selected: true, planned_amount: 50000 },
    ];
    const result = distribute503020(0, cats);
    expect(result[0].planned_amount).toBe(50000);
  });

  it("returns unchanged amounts when income is negative", () => {
    const cats: RuleCategory[] = [
      { name: "Rent", selected: true, planned_amount: 12000 },
    ];
    const result = distribute503020(-5000, cats);
    expect(result[0].planned_amount).toBe(12000);
  });

  it("handles a very large income", () => {
    const cats = makeSelected(["Rent"]);
    const result = distribute503020(1_000_000_000, cats);
    expect(result[0].planned_amount).toBe(500_000_000);
  });

  it("handles a very small income (1 RWF)", () => {
    const cats = makeSelected(["Rent"]);
    const result = distribute503020(1, cats);
    expect(result[0].planned_amount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result[0].planned_amount)).toBe(true);
  });
});

describe("distribute503020 — selection edge cases", () => {
  it("leaves unselected categories unchanged", () => {
    const cats: RuleCategory[] = [
      { name: "Rent", selected: false, planned_amount: 99999 },
      { name: "Food & Groceries", selected: true, planned_amount: 0 },
    ];
    const result = distribute503020(100000, cats);
    // Rent unselected — unchanged
    expect(result[0].planned_amount).toBe(99999);
  });

  it("returns 0 for a bucket with no selected categories", () => {
    // Only select a savings category; needs/wants buckets are empty
    const savingsCatName = Object.entries(CATEGORY_RULES).find(
      ([, v]) => v === "savings"
    )?.[0];
    if (!savingsCatName) return;
    const cats: RuleCategory[] = [{ name: savingsCatName, selected: true, planned_amount: 0 }];
    const result = distribute503020(100000, cats);
    expect(result[0].planned_amount).toBe(20000);
  });

  it("returns empty array for empty input", () => {
    expect(distribute503020(100000, [])).toEqual([]);
  });

  it("handles all categories unselected", () => {
    const cats: RuleCategory[] = DEFAULT_CATEGORIES.map((c) => ({
      name: c.name,
      selected: false,
      planned_amount: 0,
    }));
    const result = distribute503020(100000, cats);
    for (const r of result) {
      expect(r.planned_amount).toBe(0);
    }
  });

  it("unknown category name defaults to wants bucket", () => {
    const cats: RuleCategory[] = [
      { name: "My Custom Category", selected: true, planned_amount: 0 },
    ];
    const result = distribute503020(100000, cats);
    // 1 wants category → 30% of income
    expect(result[0].planned_amount).toBe(30000);
  });
});

describe("distribute503020 — result shape", () => {
  it("result has same length as input", () => {
    const cats = allDefault(100000);
    const result = distribute503020(100000, cats);
    expect(result).toHaveLength(cats.length);
  });

  it("result preserves category names in order", () => {
    const cats = makeSelected(["Rent", "Entertainment", "Transport"]);
    const result = distribute503020(100000, cats);
    expect(result.map((r) => r.name)).toEqual(["Rent", "Entertainment", "Transport"]);
  });
});

// ─── summarizeByRule ──────────────────────────────────────────────────────────

describe("summarizeByRule", () => {
  it("sums amounts by bucket correctly", () => {
    const cats: RuleCategory[] = [
      { name: "Rent", selected: true, planned_amount: 50000 },        // needs
      { name: "Food & Groceries", selected: true, planned_amount: 30000 }, // needs
      { name: "Entertainment", selected: true, planned_amount: 20000 },    // wants
    ];
    const totals = summarizeByRule(cats);
    expect(totals.needs).toBe(80000);
    expect(totals.wants).toBe(20000);
    expect(totals.savings).toBe(0);
  });

  it("ignores unselected categories", () => {
    const cats: RuleCategory[] = [
      { name: "Rent", selected: false, planned_amount: 100000 },
      { name: "Entertainment", selected: true, planned_amount: 10000 },
    ];
    const totals = summarizeByRule(cats);
    expect(totals.needs).toBe(0);
    expect(totals.wants).toBe(10000);
  });

  it("returns all zeros for empty list", () => {
    const totals = summarizeByRule([]);
    expect(totals.needs).toBe(0);
    expect(totals.wants).toBe(0);
    expect(totals.savings).toBe(0);
  });

  it("returns all zeros when all categories are unselected", () => {
    const cats: RuleCategory[] = DEFAULT_CATEGORIES.map((c) => ({
      name: c.name,
      selected: false,
      planned_amount: 99999,
    }));
    const totals = summarizeByRule(cats);
    expect(totals.needs).toBe(0);
    expect(totals.wants).toBe(0);
    expect(totals.savings).toBe(0);
  });

  it("unknown names default to wants bucket", () => {
    const cats: RuleCategory[] = [
      { name: "Something Custom", selected: true, planned_amount: 5000 },
    ];
    const totals = summarizeByRule(cats);
    expect(totals.wants).toBe(5000);
  });
});
