import Dexie, { type EntityTable } from "dexie";
import type {
  Budget,
  Category,
  Household,
  HouseholdMember,
  ItineraryItem,
  RecurringPayment,
  Transaction,
  Trip,
  UserProfile,
} from "@/lib/types";

// ─── Offline-first IndexedDB via Dexie ───────────────────────────────────────

class BugetiDB extends Dexie {
  profiles!: EntityTable<UserProfile, "id">;
  households!: EntityTable<Household, "id">;
  members!: EntityTable<HouseholdMember, "id">;
  budgets!: EntityTable<Budget, "id">;
  categories!: EntityTable<Category, "id">;
  transactions!: EntityTable<Transaction, "id">;
  trips!: EntityTable<Trip, "id">;
  itinerary_items!: EntityTable<ItineraryItem, "id">;
  recurring_payments!: EntityTable<RecurringPayment, "id">;

  constructor() {
    super("bugeti");
    this.version(1).stores({
      profiles: "id, email",
      households: "id, created_by",
      members: "id, household_id, user_id",
      budgets: "id, household_id, start_date, end_date",
      categories: "id, budget_id, sort_order",
      transactions: "id, category_id, budget_id, household_id, date, synced",
    });
    this.version(2).stores({
      profiles: "id, email",
      households: "id, created_by",
      members: "id, household_id, user_id",
      budgets: "id, household_id, start_date, end_date",
      categories: "id, budget_id, sort_order",
      transactions: "id, category_id, budget_id, household_id, date, synced",
      trips: "id, household_id, status, start_date",
      itinerary_items: "id, trip_id, day",
    });
    this.version(3).stores({
      profiles: "id, email",
      households: "id, created_by",
      members: "id, household_id, user_id",
      budgets: "id, household_id, start_date, end_date",
      categories: "id, budget_id, sort_order",
      transactions: "id, category_id, budget_id, household_id, date, synced, updated_at",
      trips: "id, household_id, status, start_date",
      itinerary_items: "id, trip_id, day",
    });
    // v4: index assigned_to on categories for member-based filtering
    this.version(4).stores({
      categories: "id, budget_id, sort_order, assigned_to",
    });
    // v5: index reminder_days_before on trips for reminder queries
    this.version(5).stores({
      trips: "id, household_id, status, start_date, reminder_days_before",
    });
    // v6: recurring payments (bills, fees, contributions)
    this.version(6).stores({
      recurring_payments: "id, household_id, active, due_day, frequency",
    });
  }
}

export const db = new BugetiDB();

// ─── Sync helpers ─────────────────────────────────────────────────────────────

/** Returns all transactions that haven't been pushed to Supabase yet */
export async function getUnsynced(): Promise<Transaction[]> {
  // Dexie serializes boolean index values as 0/1 — equals(0) matches false.
  return db.transactions.where("synced").equals(0).toArray();
}

/** Mark a transaction as synced */
export async function markSynced(id: string) {
  await db.transactions.update(id, { synced: true });
}

/**
 * Wipes all user data from IndexedDB.
 * Call this on logout so the next user on the same device
 * cannot see the previous user's budgets and transactions.
 */
export async function clearAllData() {
  await Promise.all([
    db.profiles.clear(),
    db.households.clear(),
    db.members.clear(),
    db.budgets.clear(),
    db.categories.clear(),
    db.transactions.clear(),
    db.trips.clear(),
    db.itinerary_items.clear(),
    db.recurring_payments.clear(),
  ]);
}
