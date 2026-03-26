import { supabase, isSupabaseConfigured } from "./supabase";
import { db, getUnsynced, markSynced } from "@/db";
import type { Budget, Category, Household, HouseholdMember, Transaction } from "./types";

// ─── Merge helpers (remote wins when updated_at is newer) ─────────────────────

function isRemoteNewer(
  remoteUpdatedAt: string | undefined,
  localUpdatedAt: string | undefined
): boolean {
  if (!localUpdatedAt || !remoteUpdatedAt) return true;
  return remoteUpdatedAt >= localUpdatedAt;
}

async function mergeBudgets(remote: Budget[], ids: string[]) {
  if (!remote.length) return;
  const local = await db.budgets.bulkGet(ids);
  const toUpsert = remote.filter((r, i) => {
    const loc = local[i];
    return !loc || isRemoteNewer(r.updated_at, loc.updated_at);
  });
  if (toUpsert.length) await db.budgets.bulkPut(toUpsert);
}

async function mergeCategories(remote: Category[]) {
  if (!remote.length) return;
  const ids = remote.map((c) => c.id);
  const local = await db.categories.bulkGet(ids);
  // Categories have no updated_at yet — only add missing ones, don't overwrite
  const toUpsert = remote.filter((_, i) => !local[i]);
  if (toUpsert.length) await db.categories.bulkPut(toUpsert);
}

async function mergeTransactions(remote: Transaction[]) {
  if (!remote.length) return;
  const ids = remote.map((t) => t.id);
  const local = await db.transactions.bulkGet(ids);
  const toUpsert = remote.filter((r, i) => {
    const loc = local[i];
    if (!loc) return true;
    if (!loc.synced) return false; // offline edit — keep local
    return isRemoteNewer(r.updated_at, loc.updated_at);
  });
  if (toUpsert.length) {
    await db.transactions.bulkPut(toUpsert.map((t) => ({ ...t, synced: true })));
  }
}

// ─── syncDown ─────────────────────────────────────────────────────────────────

/**
 * Fetches household data from Supabase and merges it into IndexedDB.
 * Uses updated_at for conflict resolution: the newer record wins.
 * Returns true if a household was found and synced.
 */
export async function syncDown(userId: string): Promise<boolean> {
  if (!navigator.onLine || !isSupabaseConfigured()) return false;

  try {
    const { data: members, error: memberError } = await supabase
      .from("household_members")
      .select("*")
      .eq("user_id", userId);

    if (memberError || !members?.length) return false;

    const member = members[0] as HouseholdMember;
    const householdId = member.household_id;

    const [{ data: household }, { data: budgets }, { data: profile }] =
      await Promise.all([
        supabase.from("households").select("*").eq("id", householdId).single(),
        supabase.from("budgets").select("*").eq("household_id", householdId),
        supabase.from("profiles").select("*").eq("id", userId).single(),
      ]);

    if (!household || !budgets) return false;

    const budgetIds = budgets.map((b: Budget) => b.id);
    const [{ data: categories }, { data: transactions }] = await Promise.all([
      budgetIds.length
        ? supabase.from("categories").select("*").in("budget_id", budgetIds)
        : Promise.resolve({ data: [] }),
      budgetIds.length
        ? supabase.from("transactions").select("*").in("budget_id", budgetIds)
        : Promise.resolve({ data: [] }),
    ]);

    // ── Conflict resolution: updated_at wins ──────────────────────────────────
    // For each remote record, only overwrite local if remote is newer (or local
    // doesn't exist yet). This prevents a stale syncDown from clobbering edits
    // made offline since the last sync.

    if (profile) await db.profiles.put(profile);
    await db.households.put(household as Household);
    await db.members.put(member);

    await mergeBudgets(budgets as Budget[], budgetIds);
    await mergeCategories(categories as Category[]);
    await mergeTransactions(transactions as Transaction[]);

    return true;
  } catch (err) {
    console.error("[syncDown] Failed:", err);
    return false;
  }
}

// ─── syncUp ───────────────────────────────────────────────────────────────────

/**
 * Pushes all locally unsynced transactions to Supabase.
 * Called automatically when the app comes back online.
 * Returns the number of transactions successfully synced.
 */
export async function syncUp(): Promise<number> {
  if (!navigator.onLine || !isSupabaseConfigured()) return 0;

  const unsynced = await getUnsynced();
  if (unsynced.length === 0) return 0;

  let successCount = 0;

  // Process in batches of 50 to avoid request size limits
  const BATCH = 50;
  for (let i = 0; i < unsynced.length; i += BATCH) {
    const batch = unsynced.slice(i, i + BATCH);
    try {
      const { error } = await supabase
        .from("transactions")
        .upsert(batch.map((t) => ({ ...t, synced: true })), {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("[syncUp] Batch upsert failed:", error);
        continue;
      }

      await Promise.all(batch.map((t) => markSynced(t.id)));
      successCount += batch.length;
    } catch (err) {
      console.error("[syncUp] Batch exception:", err);
    }
  }

  if (successCount > 0) {
    console.log(`[syncUp] Synced ${successCount} transaction(s).`);
  }

  return successCount;
}
