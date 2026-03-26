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
  revenue_source?: string;
  revenue_duration?: string;
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
  assigned_to?: string | null; // household_member.id — who is responsible
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
  receipt_url?: string;  // Supabase storage path — use getReceiptSignedUrl() to display
  ocr_raw?: string;
  synced: boolean;
  created_at: string;
  updated_at?: string;
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

// ─── Travel & Events ──────────────────────────────────────────────────────────

export type TripStatus = "planning" | "upcoming" | "active" | "completed";

/**
 * What kind of family event this is.
 * Drives the UI: cover emojis, itinerary labels, gift-budget field, etc.
 */
export type EventType =
  | "travel"     // Family vacation / trip abroad
  | "visit"      // Visiting friends or relatives
  | "wedding"    // Wedding, kwita izina, umuganura
  | "event"      // Community celebration or ceremony
  | "birthday"   // Kids' or family birthday
  | "school"     // Graduation, prize-giving, parents' day
  | "religious"  // Church, mosque, umuganda, national day
  | "other";

export type ItineraryItemType =
  | "transport"
  | "accommodation"
  | "activity"
  | "food"
  | "gift"       // Gifts / wedding contributions / ibice
  | "ceremony"   // Ceremony or main event moment
  | "other";

export interface Trip {
  id: string;
  household_id: string;
  name: string;
  destination: string;   // Location / venue
  start_date: string;    // ISO date
  end_date: string;      // ISO date
  status: TripStatus;
  cover_emoji: string;
  event_type: EventType; // defaults to "travel" for backward compat
  budget_id?: string;    // optional spending envelope (transactions linked here)
  savings_goal_id?: string; // optional savings-budget being built toward this event
  gift_budget?: number;  // planned spend on gifts (wedding, birthday, etc.)
  attendees?: string[];           // household member user IDs who are attending
  reminder_days_before?: number;  // 0 = day-of, 1 = 1 day before, 3, 7, 14
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

// ─── Recurring Payments ───────────────────────────────────────────────────────

export type RecurringFrequency = "monthly" | "weekly" | "quarterly" | "yearly";

export interface RecurringPayment {
  id: string;
  household_id: string;
  name: string;
  name_rw?: string;
  amount: number;
  frequency: RecurringFrequency;
  due_day: number;         // day of month (1–28)
  icon: string;
  category_id?: string;    // linked budget category
  payment_method: PaymentMethod;
  notes?: string;
  active: boolean;
  last_paid_at?: string;   // ISO date of last payment
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
