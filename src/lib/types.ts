// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Currency = "RWF" | "USD";

export type MemberRole = "owner" | "member" | "viewer";

export type BudgetPeriod = "monthly" | "weekly";

export type BudgetType =
  | "monthly"
  | "travel"
  | "vacation"
  | "event"
  | "project"
  | "school_year";

export type BudgetStatus = "planning" | "active" | "closed";

export type AccountType = "common" | "savings" | "private";

export type TransactionType = "expense" | "income" | "transfer";

export type PaymentMethod =
  | "mtn_momo"
  | "airtel_money"
  | "bank_transfer"
  | "cash";

// ─── Household ────────────────────────────────────────────────────────────────

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: MemberRole;
  display_name: string;
  joined_at: string;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  household_id: string;
  name: string;
  period: BudgetPeriod;
  budget_type: BudgetType;
  account_type: AccountType;
  status: BudgetStatus;
  start_date: string;   // ISO date
  end_date: string;     // ISO date
  total_envelope?: number; // for custom budget types
  currency: Currency;
  created_by: string;
  created_at: string;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  budget_id: string;
  parent_id?: string | null; // null = top-level, set = sub-budget
  level: number;             // 0 = root, 1 = sub, 2 = sub-sub (max 3 levels)
  name: string;
  name_rw?: string;
  planned_amount: number;
  icon: string;
  color: string;
  sort_order: number;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  category_id: string;
  budget_id: string;
  household_id: string;
  added_by: string;
  type: TransactionType;
  amount: number;
  note: string;
  date: string;            // ISO date
  payment_method: PaymentMethod;
  receipt_url?: string;
  ocr_raw?: string;
  synced: boolean;
  created_at: string;
}

// ─── Ikimina (Group Savings Circle) ───────────────────────────────────────────

export interface Ikimina {
  id: string;
  household_id: string;
  name: string;
  name_rw?: string;
  total_members: number;
  contribution_amount: number; // per cycle, RWF
  cycle: "weekly" | "monthly";
  start_date: string;
  status: "active" | "completed" | "paused";
  created_by: string;
  created_at: string;
}

export interface IkiminaContribution {
  id: string;
  ikimina_id: string;
  member_name: string;
  amount: number;
  date: string;
  cycle_number: number;
  payment_method: PaymentMethod;
  note?: string;
  created_at: string;
}

// ─── Derived / UI Types ───────────────────────────────────────────────────────

export interface CategoryWithStats extends Category {
  spent: number;
  remaining: number;
  percentage: number;
  transactions: Transaction[];
  children?: CategoryWithStats[]; // sub-categories
}

export interface BudgetSummary {
  total_revenue: number;
  total_planned: number;
  total_spent: number;
  total_remaining: number;
  savings: number;           // total_revenue - total_spent
  percentage_used: number;
  categories: CategoryWithStats[];
}

// ─── Language ─────────────────────────────────────────────────────────────────

export type Lang = "en" | "rw";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  phone?: string;
  avatar_url?: string;
  preferred_language: "en" | "rw";
  created_at: string;
}

// ─── Travel ───────────────────────────────────────────────────────────────────

export type TripStatus = "planning" | "upcoming" | "active" | "completed";

export type ItineraryItemType =
  | "transport"
  | "accommodation"
  | "activity"
  | "food"
  | "other";

export interface Trip {
  id: string;
  household_id: string;
  name: string;
  destination: string;
  start_date: string;  // ISO date
  end_date: string;    // ISO date
  status: TripStatus;
  cover_emoji: string;
  budget_id?: string;  // optional linked budget envelope
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  day: number;           // 1-based day relative to trip start
  time?: string;         // "HH:MM" 24-hr, optional
  title: string;
  description?: string;
  location?: string;
  type: ItineraryItemType;
  estimated_cost: number;
  created_at: string;
}

// ─── OCR ──────────────────────────────────────────────────────────────────────

export interface OcrResult {
  amount?: number;
  date?: string;
  merchant?: string;
  raw_text: string;
  confidence: number;
}
