import { supabase, isSupabaseConfigured } from "./supabase";
import { db } from "@/db";
import type { Budget, Category, Household, HouseholdMember } from "./types";

/**
 * Checks Supabase for existing household data and syncs it to IndexedDB.
 * Returns true if a household was found and synced.
 */
export async function syncDown(userId: string): Promise<boolean> {
  if (!navigator.onLine || !isSupabaseConfigured()) return false;

  console.log(`[syncDown] Starting sync for user ${userId}...`);

  try {
    // 1. Fetch household membership
    const { data: members, error: memberError } = await supabase
      .from("household_members")
      .select("*")
      .eq("user_id", userId);

    if (memberError) {
      console.error("[syncDown] Member fetch error:", memberError);
      return false;
    }
    if (!members || members.length === 0) {
      console.log("[syncDown] No household membership found.");
      return false;
    }

    // For now, we only sync the first household found
    const member = members[0] as HouseholdMember;
    const householdId = member.household_id;
    console.log(`[syncDown] Found household membership: ${householdId}`);

    // 2. Fetch Household details
    const { data: household, error: hError } = await supabase
      .from("households")
      .select("*")
      .eq("id", householdId)
      .single();

    if (hError || !household) {
      console.error("[syncDown] Household fetch error:", hError);
      return false;
    }

    // 3. Fetch Budgets
    const { data: budgets, error: bError } = await supabase
      .from("budgets")
      .select("*")
      .eq("household_id", householdId);

    if (bError || !budgets) {
      console.error("[syncDown] Budgets fetch error:", bError);
      return false;
    }
    console.log(`[syncDown] Found ${budgets.length} budgets.`);

    // 4. Fetch Categories for these budgets
    const budgetIds = budgets.map((b) => b.id);
    let categories: any[] = [];
    if (budgetIds.length > 0) {
      const { data: cats, error: cError } = await supabase
        .from("categories")
        .select("*")
        .in("budget_id", budgetIds);
      
      if (cError) {
        console.error("[syncDown] Categories fetch error:", cError);
        return false;
      }
      categories = cats || [];
    }
    console.log(`[syncDown] Found ${categories.length} categories.`);

    // ─── Save to IndexedDB ───
    
    // Profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (profile) await db.profiles.put(profile);

    // Household
    await db.households.put(household as Household);

    // Member
    await db.members.put(member);

    // Budgets
    if (budgets.length > 0) {
      await db.budgets.bulkPut(budgets as Budget[]);
    }

    // Categories
    if (categories.length > 0) {
      await db.categories.bulkPut(categories as Category[]);
    }

    console.log("[syncDown] Sync complete!");
    return true;
  } catch (err) {
    console.error("[syncDown] Failed with exception:", err);
    return false;
  }
}
