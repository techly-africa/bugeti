"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Split } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AmountInput } from "@/components/shared/AmountInput";
import { db } from "@/db";
import { generateId, formatRWF } from "@/lib/constants";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore, useUser } from "@/store";
import type { Budget, Category } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Encodes the destination: budget-only or a specific category within a budget */
type TargetKey = `budget:${string}` | `cat:${string}:${string}`;

interface TargetItem {
  key: TargetKey;
  icon: string;
  label: string;
  budgetId: string;
  categoryId?: string;
}

interface Allocation {
  id: string;
  targetKey: TargetKey | "";
  amount: number;
}

interface BudgetGroup {
  budget: Budget;
  categories: Category[];
  memberName: string; // display name of the budget owner
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  categoryId: string;
  budgetId: string;
  householdId: string;
  remaining: number;
  activeBudget: Budget;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PocketMoneySplitSheet({
  categoryId,
  budgetId,
  householdId,
  remaining,
  activeBudget,
}: Props) {
  const user = useUser();
  const addTransaction = useAppStore((s) => s.addTransaction);

  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<BudgetGroup[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([
    { id: generateId(), targetKey: "", amount: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  // Load private budgets + their categories + member names when the sheet opens
  useEffect(() => {
    if (!open) return;
    async function load() {
      // ── 1. Local data (always available) ──────────────────────────────────
      const localBudgets = (
        await db.budgets.where("household_id").equals(householdId).toArray()
      ).filter((b) => b.account_type === "private");

      const localMembers = await db.members
        .where("household_id")
        .equals(householdId)
        .toArray();

      // ── 2. Remote data (if Supabase is reachable) ─────────────────────────
      let remoteBudgets: any[] = [];
      let remoteMembers: any[] = [];

      if (navigator.onLine && isSupabaseConfigured()) {
        try {
          const [{ data: rb }, { data: rm }] = await Promise.all([
            supabase
              .from("budgets")
              .select("*")
              .eq("household_id", householdId)
              .eq("account_type", "private"),
            supabase
              .from("household_members")
              .select("*")
              .eq("household_id", householdId),
          ]);
          remoteBudgets = rb ?? [];
          remoteMembers = rm ?? [];

          // Persist remote data locally so future opens work offline
          if (remoteBudgets.length > 0)
            await db.budgets.bulkPut(remoteBudgets);
          if (remoteMembers.length > 0)
            await db.members.bulkPut(remoteMembers);
        } catch (e) {
          console.warn("[PocketMoneySplit] Remote fetch failed, using local:", e);
        }
      }

      // ── 3. Merge + deduplicate ─────────────────────────────────────────────
      const budgetMap = new Map<string, any>();
      [...localBudgets, ...remoteBudgets].forEach((b) => budgetMap.set(b.id, b));
      const privateBudgets = Array.from(budgetMap.values());

      const memberMap = new Map<string, any>();
      [...localMembers, ...remoteMembers].forEach((m) => memberMap.set(m.id, m));
      const members = Array.from(memberMap.values());

      // ── 3.5. Ensure every member has a private budget ─────────────────────
      const budgetOwnerIds = new Set(privateBudgets.map((b: any) => b.created_by));
      const membersWithoutBudget = members.filter((m: any) => !budgetOwnerIds.has(m.user_id));

      for (const member of membersWithoutBudget) {
        const now = new Date();
        const newBudget = {
          id: generateId(),
          household_id: householdId,
          name: `${member.display_name}'s Budget`,
          period: "monthly" as const,
          budget_type: "monthly" as const,
          account_type: "private" as const,
          status: "active" as const,
          start_date: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
          end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0],
          currency: "RWF" as const,
          created_by: member.user_id,
          created_at: now.toISOString(),
        };
        await db.budgets.add(newBudget);
        privateBudgets.push(newBudget);
        if (navigator.onLine && isSupabaseConfigured()) {
          supabase.from("budgets").upsert(newBudget).then(null, () => {});
        }
      }

      // ── 4. Build groups ────────────────────────────────────────────────────
      const result: BudgetGroup[] = await Promise.all(
        privateBudgets.map(async (b) => {
          const member = members.find((m) => m.user_id === b.created_by);
          return {
            budget: b,
            memberName: member?.display_name ?? b.name,
            categories: await db.categories
              .where("budget_id")
              .equals(b.id)
              .sortBy("sort_order"),
          };
        })
      );
      setGroups(result);
    }
    load();
  }, [open, householdId]);

  // Build flat list of selectable targets — private budgets only, labelled by member name
  const targets: TargetItem[] = groups.flatMap(({ budget, categories, memberName }) => {
    const budgetItem: TargetItem = {
      key: `budget:${budget.id}`,
      icon: "👤",
      label: memberName,
      budgetId: budget.id,
    };
    const catItems: TargetItem[] = categories.map((c) => ({
      key: `cat:${c.id}:${budget.id}`,
      icon: c.icon,
      label: c.name,
      budgetId: budget.id,
      categoryId: c.id,
    }));
    return [budgetItem, ...catItems];
  });

  const labelFor = (key: TargetKey | "") => {
    if (!key) return "";
    return targets.find((t) => t.key === key)?.label ?? key;
  };

  const total = allocations.reduce((sum, a) => sum + a.amount, 0);
  const isOver = total > remaining;

  const addRow = () =>
    setAllocations((prev) => [
      ...prev,
      { id: generateId(), targetKey: "", amount: 0 },
    ]);

  const removeRow = (id: string) =>
    setAllocations((prev) => prev.filter((a) => a.id !== id));

  const updateRow = (id: string, patch: Partial<Allocation>) =>
    setAllocations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );

  const handleConfirm = async () => {
    if (!user) return;

    const valid = allocations.filter((a) => a.targetKey && a.amount > 0);
    if (valid.length === 0) {
      toast.error("Add at least one allocation with a destination and amount.");
      return;
    }
    if (isOver) {
      toast.error("Total exceeds remaining pocket money budget.");
      return;
    }

    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    try {
      for (const alloc of valid) {
        const target = targets.find((t) => t.key === alloc.targetKey)!;

        // 1. Transfer out of the common Pocket Money category (not an expense)
        const expenseTx = {
          id: generateId(),
          category_id: categoryId,
          budget_id: budgetId,
          household_id: householdId,
          added_by: user.id,
          type: "transfer" as const,
          amount: alloc.amount,
          note: `→ ${target.label}`,
          date: today,
          payment_method: "cash" as const,
          synced: false,
          created_at: new Date().toISOString(),
        };
        await db.transactions.add(expenseTx);
        addTransaction(expenseTx);

        // 2. Income in the target budget, optionally under a specific category
        const incomeTx = {
          id: generateId(),
          category_id: target.categoryId ?? "",
          budget_id: target.budgetId,
          household_id: householdId,
          added_by: user.id,
          type: "income" as const,
          amount: alloc.amount,
          note: `Pocket money from household`,
          date: today,
          payment_method: "cash" as const,
          synced: false,
          created_at: new Date().toISOString(),
        };
        await db.transactions.add(incomeTx);
      }

      toast.success(
        `Split across ${valid.length} destination${valid.length > 1 ? "s" : ""}`
      );
      setOpen(false);
      setAllocations([{ id: generateId(), targetKey: "", amount: 0 }]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save split. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Split size={14} />
          Split & Send
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <span>👛</span> Split Pocket Money
          </SheetTitle>
        </SheetHeader>

        {/* Remaining indicator */}
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 mb-5 text-sm font-medium ${isOver
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-green-50 border border-green-200 text-green-700"
            }`}
        >
          <span>Available</span>
          <span className="font-bold">{formatRWF(remaining)}</span>
        </div>

        {/* Allocation rows */}
        <div className="space-y-3 mb-4">
          {allocations.map((alloc) => (
            <div key={alloc.id} className="flex items-center gap-2">
              {/* Budget / sub-budget picker */}
              <div className="flex-1 min-w-0">
                <Select
                  value={alloc.targetKey}
                  onValueChange={(v) =>
                    updateRow(alloc.id, { targetKey: v as TargetKey })
                  }
                >
                  <SelectTrigger className="truncate">
                    <SelectValue placeholder="Select budget or category">
                      {alloc.targetKey && (
                        <span className="flex items-center gap-1.5 truncate">
                          <span>
                            {targets.find((t) => t.key === alloc.targetKey)
                              ?.icon ?? "📦"}
                          </span>
                          <span className="truncate">{labelFor(alloc.targetKey)}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {groups.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        No personal budgets found — members need a private budget
                      </SelectItem>
                    ) : (
                      groups.map(({ budget, categories, memberName }) => (
                        <SelectGroup key={budget.id}>
                          {/* Member name as group label */}
                          <SelectLabel className="flex items-center gap-1.5 font-semibold text-foreground">
                            👤 {memberName}
                          </SelectLabel>
                          <SelectItem value={`budget:${budget.id}`}>
                            <span className="flex items-center gap-1.5 pl-2 text-muted-foreground text-xs">
                              Personal budget (top-level)
                            </span>
                          </SelectItem>

                          {/* Categories within that private budget */}
                          {categories.map((c) => (
                            <SelectItem
                              key={c.id}
                              value={`cat:${c.id}:${budget.id}`}
                            >
                              <span className="flex items-center gap-1.5 pl-2">
                                <span>{c.icon}</span>
                                <span>{c.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <AmountInput
                value={alloc.amount}
                onChange={(v) => updateRow(alloc.id, { amount: v })}
                className="w-36"
              />

              {allocations.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(alloc.id)}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Add row */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-5 gap-1"
          onClick={addRow}
        >
          <Plus size={14} /> Add destination
        </Button>

        {/* Total */}
        <div className="flex items-center justify-between py-3 border-t border-b mb-5 text-sm">
          <span className="text-muted-foreground">Total to split</span>
          <span
            className={`font-bold text-base ${isOver ? "text-red-600" : "text-foreground"}`}
          >
            {formatRWF(total)}
            {isOver && (
              <span className="text-xs ml-1">
                ({formatRWF(total - remaining)} over)
              </span>
            )}
          </span>
        </div>

        <Button
          className="w-full"
          disabled={saving || total === 0 || isOver}
          onClick={handleConfirm}
        >
          {saving ? "Saving…" : `Confirm Split — ${formatRWF(total)}`}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
