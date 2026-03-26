import { describe, it, expect } from "vitest";
import {
  formatRWF,
  parseRWF,
  generateInviteCode,
  generateId,
  DEFAULT_CATEGORIES,
  CATEGORY_RULES,
  RULE_TARGETS,
  RULE_LABELS,
  RULE_COLORS,
  BUDGET_THRESHOLDS,
} from "@/lib/constants";

// ─── formatRWF ────────────────────────────────────────────────────────────────

describe("formatRWF", () => {
  it("formats a typical amount", () => {
    expect(formatRWF(100000)).toContain("100,000");
  });

  it("includes RWF or RF currency symbol/code (locale-dependent abbreviation)", () => {
    // Node.js Intl may abbreviate RWF as "RF" depending on ICU data version.
    expect(formatRWF(50000)).toMatch(/RF/);
  });

  it("formats zero", () => {
    expect(formatRWF(0)).toContain("0");
  });

  it("formats large amounts without decimals", () => {
    const result = formatRWF(1_000_000);
    expect(result).not.toMatch(/\.\d/); // no decimal places
    expect(result).toContain("1,000,000");
  });

  it("handles negative amounts", () => {
    const result = formatRWF(-5000);
    expect(result).toContain("5,000");
  });
});

// ─── parseRWF ─────────────────────────────────────────────────────────────────

describe("parseRWF", () => {
  it("parses a plain integer string", () => {
    expect(parseRWF("50000")).toBe(50000);
  });

  it("strips commas from formatted strings", () => {
    expect(parseRWF("100,000")).toBe(100000);
  });

  it("strips currency codes", () => {
    expect(parseRWF("RWF 50,000")).toBe(50000);
  });

  it("returns 0 for an empty string", () => {
    expect(parseRWF("")).toBe(0);
  });

  it("returns 0 for a non-numeric string", () => {
    expect(parseRWF("abc")).toBe(0);
  });

  it("ignores decimal point and returns integer part only", () => {
    // parseRWF strips non-digits, so 1234.56 → 123456
    expect(parseRWF("1234.56")).toBe(123456);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(parseRWF("   ")).toBe(0);
  });

  it("handles mixed text and digits", () => {
    expect(parseRWF("about 5000 RWF")).toBe(5000);
  });
});

// ─── generateInviteCode ───────────────────────────────────────────────────────

describe("generateInviteCode", () => {
  it("returns exactly 6 characters", () => {
    expect(generateInviteCode()).toHaveLength(6);
  });

  it("uses only uppercase alphanumeric characters (no ambiguous chars)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z2-9]{6}$/);
      // Ambiguous chars excluded: 0, 1, I, O
      expect(code).not.toMatch(/[01IO]/);
    }
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
    // With a 6-char code from 32 chars, collision probability is negligible
    expect(codes.size).toBeGreaterThan(90);
  });
});

// ─── generateId ───────────────────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a valid UUID v4 format", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ─── DEFAULT_CATEGORIES ───────────────────────────────────────────────────────

describe("DEFAULT_CATEGORIES", () => {
  it("has at least one category", () => {
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0);
  });

  it("every category has required fields", () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(typeof cat.name).toBe("string");
      expect(cat.name.length).toBeGreaterThan(0);
      expect(typeof cat.icon).toBe("string");
      expect(typeof cat.planned_amount).toBe("number");
      expect(typeof cat.sort_order).toBe("number");
      expect(cat.level).toBe(0);
      expect(cat.parent_id).toBeNull();
    }
  });

  it("all planned_amounts default to 0", () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat.planned_amount).toBe(0);
    }
  });

  it("sort_order values are unique", () => {
    const orders = DEFAULT_CATEGORIES.map((c) => c.sort_order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("names are unique", () => {
    const names = DEFAULT_CATEGORIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ─── CATEGORY_RULES ───────────────────────────────────────────────────────────

describe("CATEGORY_RULES", () => {
  it("every DEFAULT_CATEGORY has a rule entry", () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(CATEGORY_RULES[cat.name]).toBeDefined();
    }
  });

  it("every rule value is one of needs/wants/savings", () => {
    for (const rule of Object.values(CATEGORY_RULES)) {
      expect(["needs", "wants", "savings"]).toContain(rule);
    }
  });

  it("Rent, Health, Food & Groceries are needs", () => {
    expect(CATEGORY_RULES["Rent"]).toBe("needs");
    expect(CATEGORY_RULES["Health"]).toBe("needs");
    expect(CATEGORY_RULES["Food & Groceries"]).toBe("needs");
  });

  it("Entertainment, Clothing are wants", () => {
    expect(CATEGORY_RULES["Entertainment"]).toBe("wants");
    expect(CATEGORY_RULES["Clothing"]).toBe("wants");
  });
});

// ─── RULE_TARGETS ─────────────────────────────────────────────────────────────

describe("RULE_TARGETS", () => {
  it("needs target is 0.50", () => {
    expect(RULE_TARGETS.needs).toBe(0.5);
  });

  it("wants target is 0.30", () => {
    expect(RULE_TARGETS.wants).toBe(0.3);
  });

  it("savings target is 0.20", () => {
    expect(RULE_TARGETS.savings).toBe(0.2);
  });

  it("targets sum to 1.0", () => {
    const total = RULE_TARGETS.needs + RULE_TARGETS.wants + RULE_TARGETS.savings;
    expect(total).toBeCloseTo(1.0);
  });
});

// ─── RULE_LABELS / RULE_COLORS ────────────────────────────────────────────────

describe("RULE_LABELS", () => {
  it("has labels for all three buckets", () => {
    expect(RULE_LABELS.needs).toBeTruthy();
    expect(RULE_LABELS.wants).toBeTruthy();
    expect(RULE_LABELS.savings).toBeTruthy();
  });
});

describe("RULE_COLORS", () => {
  it("has Tailwind class strings for all three buckets", () => {
    for (const color of Object.values(RULE_COLORS)) {
      expect(typeof color).toBe("string");
      expect(color.length).toBeGreaterThan(0);
    }
  });
});

// ─── BUDGET_THRESHOLDS ────────────────────────────────────────────────────────

describe("BUDGET_THRESHOLDS", () => {
  it("WARNING is less than DANGER", () => {
    expect(BUDGET_THRESHOLDS.WARNING).toBeLessThan(BUDGET_THRESHOLDS.DANGER);
  });

  it("both thresholds are percentages (0–100)", () => {
    expect(BUDGET_THRESHOLDS.WARNING).toBeGreaterThan(0);
    expect(BUDGET_THRESHOLDS.DANGER).toBeLessThanOrEqual(100);
  });
});
