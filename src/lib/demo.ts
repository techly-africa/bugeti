/**
 * Demo mode: seeds IndexedDB with realistic Rwandan family budget data
 * so anyone can explore Bugeti without signing up.
 *
 * Covers every page:
 *   Dashboard, Transactions, Reports, Our Plans (/travel + /travel/[id]),
 *   Savings, Custom Budgets, Personal, Ikimina, Recurring Bills, Settings
 */

import { db, clearAllData } from "@/db";
import type {
  Budget, Category, Household, HouseholdMember, Ikimina,
  IkiminaContribution, ItineraryItem, RecurringPayment,
  Transaction, Trip, UserProfile,
} from "@/lib/types";

// ─── Stable demo IDs ──────────────────────────────────────────────────────────

export const DEMO_USER_ID       = "demo-user-001";
export const DEMO_HOUSEHOLD_ID  = "demo-household-001";
export const DEMO_BUDGET_ID     = "demo-budget-001";
export const DEMO_SAVINGS_ID    = "demo-savings-001";
export const DEMO_PRIVATE_ID    = "demo-private-001";

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedDemoData() {
  await clearAllData();

  const now  = new Date();
  const year = now.getFullYear();
  const mon  = now.getMonth(); // 0-based
  const fmt  = (d: Date) => d.toISOString().slice(0, 10);
  const day  = (d: number) => fmt(new Date(year, mon, d));
  const monthStart = fmt(new Date(year, mon, 1));
  const monthEnd   = fmt(new Date(year, mon + 1, 0));

  // ── User ──────────────────────────────────────────────────────────────────
  const user: UserProfile = {
    id: DEMO_USER_ID,
    email: "demo@bugeti.app",
    display_name: "Agathe",
    preferred_language: "en",
    created_at: new Date(year, mon, 1).toISOString(),
  };
  await db.profiles.put(user);

  // ── Household ─────────────────────────────────────────────────────────────
  const household: Household = {
    id: DEMO_HOUSEHOLD_ID,
    name: "Uwase Family",
    invite_code: "DEMO123",
    created_by: DEMO_USER_ID,
    created_at: new Date(year, mon, 1).toISOString(),
  };
  await db.households.put(household);

  // ── Members ───────────────────────────────────────────────────────────────
  const members: HouseholdMember[] = [
    {
      id: "demo-member-001",
      household_id: DEMO_HOUSEHOLD_ID,
      user_id: DEMO_USER_ID,
      role: "owner",
      display_name: "Agathe",
      joined_at: new Date(year, mon, 1).toISOString(),
    },
    {
      id: "demo-member-002",
      household_id: DEMO_HOUSEHOLD_ID,
      user_id: "demo-user-002",
      role: "member",
      display_name: "Jean-Pierre",
      joined_at: new Date(year, mon, 1).toISOString(),
    },
  ];
  await db.members.bulkPut(members);

  // ── Main monthly budget ───────────────────────────────────────────────────
  const budget: Budget = {
    id: DEMO_BUDGET_ID,
    household_id: DEMO_HOUSEHOLD_ID,
    name: `${now.toLocaleString("en-RW", { month: "long", year: "numeric" })} Budget`,
    period: "monthly",
    budget_type: "monthly",
    account_type: "common",
    status: "active",
    start_date: monthStart,
    end_date: monthEnd,
    total_envelope: 800_000,
    currency: "RWF",
    revenue_source: "Salary",
    created_by: DEMO_USER_ID,
    created_at: new Date(year, mon, 1).toISOString(),
  };

  // ── Savings goal budget (Savings page) ───────────────────────────────────
  const savingsBudget: Budget = {
    id: DEMO_SAVINGS_ID,
    household_id: DEMO_HOUSEHOLD_ID,
    name: "Zanzibar Trip Fund",
    period: "monthly",
    budget_type: "travel",
    account_type: "savings",
    status: "active",
    start_date: monthStart,
    end_date: fmt(new Date(year, mon + 2, 10)),
    total_envelope: 500_000,
    currency: "RWF",
    created_by: DEMO_USER_ID,
    created_at: new Date(year, mon, 1).toISOString(),
  };

  // ── Private budget (Personal page) ───────────────────────────────────────
  const privateBudget: Budget = {
    id: DEMO_PRIVATE_ID,
    household_id: DEMO_HOUSEHOLD_ID,
    name: "Agathe — Personal",
    period: "monthly",
    budget_type: "monthly",
    account_type: "private",
    status: "active",
    start_date: monthStart,
    end_date: monthEnd,
    total_envelope: 50_000,
    currency: "RWF",
    created_by: DEMO_USER_ID,
    created_at: new Date(year, mon, 1).toISOString(),
  };

  // ── Custom budgets (school year + project) ────────────────────────────────
  const schoolBudget: Budget = {
    id: "demo-custom-01",
    household_id: DEMO_HOUSEHOLD_ID,
    name: "School Year 2025–26",
    period: "monthly",
    budget_type: "school_year",
    account_type: "common",
    status: "active",
    start_date: fmt(new Date(year, 0, 1)),
    end_date: fmt(new Date(year, 11, 31)),
    total_envelope: 960_000,
    currency: "RWF",
    created_by: DEMO_USER_ID,
    created_at: new Date(year, 0, 1).toISOString(),
  };
  const renovationBudget: Budget = {
    id: "demo-custom-02",
    household_id: DEMO_HOUSEHOLD_ID,
    name: "Kitchen Renovation",
    period: "monthly",
    budget_type: "project",
    account_type: "common",
    status: "planning",
    start_date: fmt(new Date(year, mon + 1, 1)),
    end_date: fmt(new Date(year, mon + 3, 30)),
    total_envelope: 1_200_000,
    currency: "RWF",
    created_by: DEMO_USER_ID,
    created_at: new Date(year, mon, 1).toISOString(),
  };

  await db.budgets.bulkPut([budget, savingsBudget, privateBudget, schoolBudget, renovationBudget]);

  // ── Categories for main budget ─────────────────────────────────────────────
  const cats: Category[] = [
    { id: "demo-cat-01", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Housing",            icon: "🏠", color: "#6366f1", planned_amount: 200_000, sort_order: 1 },
    { id: "demo-cat-02", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Food & Groceries",   icon: "🍽️", color: "#22c55e", planned_amount: 120_000, sort_order: 2 },
    { id: "demo-cat-03", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Transport",          icon: "🚗", color: "#f59e0b", planned_amount: 60_000,  sort_order: 3 },
    { id: "demo-cat-04", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "School Fees",        icon: "🏫", color: "#3b82f6", planned_amount: 80_000,  sort_order: 4 },
    { id: "demo-cat-05", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Utilities",          icon: "💡", color: "#f97316", planned_amount: 50_000,  sort_order: 5 },
    { id: "demo-cat-06", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Health",             icon: "🏥", color: "#ec4899", planned_amount: 30_000,  sort_order: 6 },
    { id: "demo-cat-07", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Airtime & Internet", icon: "📱", color: "#8b5cf6", planned_amount: 20_000,  sort_order: 7 },
    { id: "demo-cat-08", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Savings",            icon: "💰", color: "#10b981", planned_amount: 100_000, sort_order: 8, assigned_to: "demo-member-002" },
    { id: "demo-cat-09", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Social & Events",    icon: "🎉", color: "#ef4444", planned_amount: 60_000,  sort_order: 9 },
    { id: "demo-cat-10", budget_id: DEMO_BUDGET_ID, level: 0, parent_id: null, name: "Shopping",           icon: "🛒", color: "#14b8a6", planned_amount: 30_000,  sort_order: 10 },
  ];

  // Category for savings goal budget
  const savingsCat: Category = {
    id: "demo-savings-cat-01",
    budget_id: DEMO_SAVINGS_ID,
    level: 0, parent_id: null,
    name: "Zanzibar Fund",
    icon: "🏖️", color: "#0ea5e9",
    planned_amount: 500_000,
    sort_order: 1,
  };

  // Category for private budget
  const privateCat: Category = {
    id: "demo-private-cat-01",
    budget_id: DEMO_PRIVATE_ID,
    level: 0, parent_id: null,
    name: "Personal spending",
    icon: "👜", color: "#a855f7",
    planned_amount: 50_000,
    sort_order: 1,
  };

  await db.categories.bulkPut([...cats, savingsCat, privateCat]);

  // ── Transactions for main budget ──────────────────────────────────────────
  const mkTx = (
    id: string, catId: string, budgetId: string, amount: number, note: string,
    date: string, method: Transaction["payment_method"] = "mtn_momo",
    type: Transaction["type"] = "expense"
  ): Transaction => ({
    id, category_id: catId, budget_id: budgetId,
    household_id: DEMO_HOUSEHOLD_ID, added_by: DEMO_USER_ID,
    type, amount, note, date, payment_method: method,
    synced: true, created_at: new Date(date).toISOString(),
  });

  const mainTxs: Transaction[] = [
    mkTx("demo-tx-00", "demo-cat-08", DEMO_BUDGET_ID, 800_000, "Monthly salary",          day(1),  "bank_transfer", "income"),
    mkTx("demo-tx-01", "demo-cat-01", DEMO_BUDGET_ID, 180_000, "Rent — Kacyiru",          day(2),  "bank_transfer"),
    mkTx("demo-tx-02", "demo-cat-01", DEMO_BUDGET_ID, 15_000,  "Security fee",            day(2),  "cash"),
    mkTx("demo-tx-03", "demo-cat-02", DEMO_BUDGET_ID, 25_000,  "Kimironko market",        day(3),  "cash"),
    mkTx("demo-tx-04", "demo-cat-02", DEMO_BUDGET_ID, 18_500,  "Nakumatt groceries",      day(7),  "mtn_momo"),
    mkTx("demo-tx-05", "demo-cat-02", DEMO_BUDGET_ID, 12_000,  "Weekly market",           day(10), "cash"),
    mkTx("demo-tx-06", "demo-cat-02", DEMO_BUDGET_ID, 8_000,   "Bread & dairy",           day(14), "cash"),
    mkTx("demo-tx-07", "demo-cat-03", DEMO_BUDGET_ID, 22_000,  "Fuel",                    day(4),  "mtn_momo"),
    mkTx("demo-tx-08", "demo-cat-03", DEMO_BUDGET_ID, 8_500,   "Moto taxi — school runs", day(8),  "cash"),
    mkTx("demo-tx-09", "demo-cat-04", DEMO_BUDGET_ID, 75_000,  "Lycée de Kigali — term 1",day(3),  "bank_transfer"),
    mkTx("demo-tx-10", "demo-cat-05", DEMO_BUDGET_ID, 20_000,  "Electricity — RECO",      day(5),  "mtn_momo"),
    mkTx("demo-tx-11", "demo-cat-05", DEMO_BUDGET_ID, 8_000,   "Water — WASAC",           day(5),  "mtn_momo"),
    mkTx("demo-tx-12", "demo-cat-06", DEMO_BUDGET_ID, 15_000,  "Pharmacy — Igihozo",      day(9),  "cash"),
    mkTx("demo-tx-13", "demo-cat-07", DEMO_BUDGET_ID, 10_000,  "MTN internet bundle",     day(1),  "mtn_momo"),
    mkTx("demo-tx-14", "demo-cat-07", DEMO_BUDGET_ID, 5_000,   "Airtel airtime",          day(6),  "airtel_money"),
    mkTx("demo-tx-15", "demo-cat-08", DEMO_BUDGET_ID, 50_000,  "Savings transfer",        day(2),  "bank_transfer"),
    mkTx("demo-tx-16", "demo-cat-09", DEMO_BUDGET_ID, 30_000,  "Wedding contribution",    day(11), "mtn_momo"),
    mkTx("demo-tx-17", "demo-cat-10", DEMO_BUDGET_ID, 22_000,  "Kids' school shoes",      day(8),  "cash"),
  ];

  // Savings goal transactions (shown on Savings page)
  const savingsTxs: Transaction[] = [
    mkTx("demo-stx-01", "demo-savings-cat-01", DEMO_SAVINGS_ID, 80_000, "Deposit — Jan savings",  day(5),  "bank_transfer", "income"),
    mkTx("demo-stx-02", "demo-savings-cat-01", DEMO_SAVINGS_ID, 60_000, "Deposit — Feb savings",  day(3),  "bank_transfer", "income"),
    mkTx("demo-stx-03", "demo-savings-cat-01", DEMO_SAVINGS_ID, 40_000, "Deposit — this month",   day(2),  "bank_transfer", "income"),
  ];

  // Personal budget transactions (shown on Personal page)
  const privateTxs: Transaction[] = [
    mkTx("demo-ptx-01", "demo-private-cat-01", DEMO_PRIVATE_ID, 12_000, "Lunch — office",         day(3),  "cash"),
    mkTx("demo-ptx-02", "demo-private-cat-01", DEMO_PRIVATE_ID, 8_000,  "Hair salon",             day(7),  "mtn_momo"),
    mkTx("demo-ptx-03", "demo-private-cat-01", DEMO_PRIVATE_ID, 5_000,  "Book — Umuvugizi Press", day(10), "cash"),
  ];

  await db.transactions.bulkPut([...mainTxs, ...savingsTxs, ...privateTxs]);

  // ── Recurring bills ────────────────────────────────────────────────────────
  const bills: RecurringPayment[] = [
    { id: "demo-bill-01", household_id: DEMO_HOUSEHOLD_ID, name: "Garbage Collection", name_rw: "Imodoka ya Poubelle",    icon: "🗑️", amount: 5_000,   frequency: "monthly", due_day: 1,  payment_method: "cash",          category_id: "demo-cat-05", active: true, last_paid_at: monthStart, created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-bill-02", household_id: DEMO_HOUSEHOLD_ID, name: "Security Fee",       name_rw: "Amafaranga ya Segirita", icon: "🔒", amount: 15_000,  frequency: "monthly", due_day: 1,  payment_method: "cash",          category_id: "demo-cat-01", active: true, last_paid_at: monthStart, created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-bill-03", household_id: DEMO_HOUSEHOLD_ID, name: "Water Bill",         name_rw: "Amazi",                  icon: "💧", amount: 8_000,   frequency: "monthly", due_day: 5,  payment_method: "mtn_momo",      category_id: "demo-cat-05", active: true, last_paid_at: day(5),     created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-bill-04", household_id: DEMO_HOUSEHOLD_ID, name: "Electricity",        name_rw: "Amashanyarazi",          icon: "⚡", amount: 20_000,  frequency: "monthly", due_day: 5,  payment_method: "mtn_momo",      category_id: "demo-cat-05", active: true, last_paid_at: day(5),     created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-bill-05", household_id: DEMO_HOUSEHOLD_ID, name: "Internet / WiFi",    name_rw: "Internet",               icon: "📶", amount: 25_000,  frequency: "monthly", due_day: 10, payment_method: "mtn_momo",      category_id: "demo-cat-07", active: true,                           created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-bill-06", household_id: DEMO_HOUSEHOLD_ID, name: "Church / Tithe",     name_rw: "Umusanzu w'Itorero",     icon: "🙏", amount: 10_000,  frequency: "monthly", due_day: 7,  payment_method: "cash",                       active: true,                           created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-bill-07", household_id: DEMO_HOUSEHOLD_ID, name: "Savings Club",       name_rw: "Ikimina",                icon: "💰", amount: 20_000,  frequency: "monthly", due_day: 25, payment_method: "cash",                       active: true,                           created_at: new Date(year, mon, 1).toISOString() },
  ];
  await db.recurring_payments.bulkPut(bills);

  // ── Trips ─────────────────────────────────────────────────────────────────
  const weddingStart = fmt(new Date(year, mon + 1, 15));
  const weddingEnd   = fmt(new Date(year, mon + 1, 17));
  const zanzibarStart = fmt(new Date(year, mon + 2, 10));
  const zanzibarEnd   = fmt(new Date(year, mon + 2, 17));

  const trips: Trip[] = [
    {
      id: "demo-trip-01",
      household_id: DEMO_HOUSEHOLD_ID,
      name: "Cousin Claire's Wedding",
      destination: "Musanze, Northern Province",
      start_date: weddingStart,
      end_date: weddingEnd,
      status: "upcoming",
      cover_emoji: "💍",
      event_type: "wedding",
      gift_budget: 50_000,
      savings_goal_id: DEMO_SAVINGS_ID,
      reminder_days_before: 7,
      notes: "Drive up Friday. Book guesthouse for 2 nights.",
      attendees: [DEMO_USER_ID, "demo-user-002"],
      created_by: DEMO_USER_ID,
      created_at: new Date(year, mon, 1).toISOString(),
    },
    {
      id: "demo-trip-02",
      household_id: DEMO_HOUSEHOLD_ID,
      name: "Family trip to Zanzibar",
      destination: "Zanzibar, Tanzania",
      start_date: zanzibarStart,
      end_date: zanzibarEnd,
      status: "planning",
      cover_emoji: "🏖️",
      event_type: "travel",
      savings_goal_id: DEMO_SAVINGS_ID,
      reminder_days_before: 14,
      notes: "Need passports, beach bag. Check flight prices.",
      attendees: [DEMO_USER_ID, "demo-user-002"],
      created_by: DEMO_USER_ID,
      created_at: new Date(year, mon, 1).toISOString(),
    },
  ];
  await db.trips.bulkPut(trips);

  // ── Itinerary items for trips (travel/[id] page) ─────────────────────────
  const itinerary: ItineraryItem[] = [
    // Wedding trip itinerary
    { id: "demo-itin-01", trip_id: "demo-trip-01", day: 1, time: "07:00", title: "Drive to Musanze",       type: "transport",      estimated_cost: 15_000, location: "Kigali → Musanze",      created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-02", trip_id: "demo-trip-01", day: 1, time: "13:00", title: "Check in — Guesthouse",  type: "accommodation",  estimated_cost: 40_000, location: "Musanze Guesthouse",    created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-03", trip_id: "demo-trip-01", day: 2, time: "10:00", title: "Wedding Ceremony",       type: "ceremony",       estimated_cost: 0,      location: "Musanze Community Hall",created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-04", trip_id: "demo-trip-01", day: 2, time: "14:00", title: "Wedding Gift / Ibice",   type: "gift",           estimated_cost: 50_000, description: "Envelope for Claire & David", created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-05", trip_id: "demo-trip-01", day: 2, time: "19:00", title: "Dinner & celebration",   type: "food",           estimated_cost: 20_000, location: "Reception venue",       created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-06", trip_id: "demo-trip-01", day: 3, time: "09:00", title: "Drive back to Kigali",   type: "transport",      estimated_cost: 15_000, created_at: new Date(year, mon, 1).toISOString() },
    // Zanzibar trip itinerary
    { id: "demo-itin-07", trip_id: "demo-trip-02", day: 1, time: "06:00", title: "Flight KGL → ZNZ",       type: "transport",      estimated_cost: 250_000, location: "Kigali International Airport", created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-08", trip_id: "demo-trip-02", day: 1, time: "14:00", title: "Hotel check-in",         type: "accommodation",  estimated_cost: 80_000,  location: "Stone Town, Zanzibar",  created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-09", trip_id: "demo-trip-02", day: 2, time: "09:00", title: "Snorkeling tour",        type: "activity",       estimated_cost: 30_000,  location: "Mnemba Atoll",          created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-10", trip_id: "demo-trip-02", day: 3, time: "10:00", title: "Spice farm tour",        type: "activity",       estimated_cost: 15_000,  description: "Kids will love it!", created_at: new Date(year, mon, 1).toISOString() },
    { id: "demo-itin-11", trip_id: "demo-trip-02", day: 7, time: "08:00", title: "Flight back to Kigali",  type: "transport",      estimated_cost: 250_000, location: "Zanzibar Airport",      created_at: new Date(year, mon, 1).toISOString() },
  ];
  await db.itinerary_items.bulkPut(itinerary);

  // ── Ikimina (store-only, returned for caller to set) ─────────────────────
  const ikiminas: Ikimina[] = [
    {
      id: "demo-iki-01",
      household_id: DEMO_HOUSEHOLD_ID,
      name: "Nyamirambo Ikimina",
      name_rw: "Ikimina rya Nyamirambo",
      total_members: 10,
      contribution_amount: 20_000,
      cycle: "monthly",
      start_date: fmt(new Date(year, 0, 1)),
      status: "active",
      created_by: DEMO_USER_ID,
      created_at: new Date(year, 0, 1).toISOString(),
    },
    {
      id: "demo-iki-02",
      household_id: DEMO_HOUSEHOLD_ID,
      name: "Kacyiru Women's Circle",
      total_members: 8,
      contribution_amount: 15_000,
      cycle: "monthly",
      start_date: fmt(new Date(year, mon - 2, 1)),
      status: "active",
      created_by: DEMO_USER_ID,
      created_at: new Date(year, mon - 2, 1).toISOString(),
    },
  ];

  const contributions: IkiminaContribution[] = [
    { id: "demo-ikc-01", ikimina_id: "demo-iki-01", member_name: "Agathe",      amount: 20_000, date: day(5),  cycle_number: mon + 1, payment_method: "mtn_momo",  created_at: new Date(year, mon, 5).toISOString() },
    { id: "demo-ikc-02", ikimina_id: "demo-iki-01", member_name: "Jean-Pierre", amount: 20_000, date: day(5),  cycle_number: mon + 1, payment_method: "mtn_momo",  created_at: new Date(year, mon, 5).toISOString() },
    { id: "demo-ikc-03", ikimina_id: "demo-iki-01", member_name: "Claudine",    amount: 20_000, date: day(6),  cycle_number: mon + 1, payment_method: "cash",      created_at: new Date(year, mon, 6).toISOString() },
    { id: "demo-ikc-04", ikimina_id: "demo-iki-01", member_name: "Esperance",   amount: 20_000, date: day(7),  cycle_number: mon + 1, payment_method: "mtn_momo",  created_at: new Date(year, mon, 7).toISOString() },
    { id: "demo-ikc-05", ikimina_id: "demo-iki-01", member_name: "Vestine",     amount: 20_000, date: day(8),  cycle_number: mon + 1, payment_method: "cash",      created_at: new Date(year, mon, 8).toISOString() },
    { id: "demo-ikc-06", ikimina_id: "demo-iki-02", member_name: "Agathe",      amount: 15_000, date: day(10), cycle_number: 3,       payment_method: "mtn_momo",  created_at: new Date(year, mon, 10).toISOString() },
    { id: "demo-ikc-07", ikimina_id: "demo-iki-02", member_name: "Marie",       amount: 15_000, date: day(10), cycle_number: 3,       payment_method: "cash",      created_at: new Date(year, mon, 10).toISOString() },
  ];

  // Custom budgets (store-only, returned for caller to set)
  const customBudgets: Budget[] = [schoolBudget, renovationBudget];

  return {
    user,
    household,
    budget,
    categories: cats,
    transactions: mainTxs,
    trips,
    ikiminas,
    contributions,
    customBudgets,
  };
}
