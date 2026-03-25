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

  // Load all budgets + their categories when the sheet opens
  useEffect(() => {
    if (!open) return;
    async function load() {
      const budgets = await db.budgets
        .where("household_id")
        .equals(householdId)
        .toArray();

      const result: BudgetGroup[] = await Promise.all(
        budgets.map(async (b) => ({
          budget: b,
          categories: await db.categories
            .where("budget_id")
            .equals(b.id)
            .sortBy("sort_order"),
        }))
      );
      setGroups(result);
    }
    load();
  }, [open, householdId]);

  // Build flat list of selectable targets for rendering
  const targets: TargetItem[] = groups.flatMap(({ budget, categories }) => {
    const budgetItem: TargetItem = {
      key: `budget:${budget.id}`,
      icon: budget.account_type === "private" ? "🔒" : "🏠",
      label: budget.name,
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
          className={`flex items-center justify-between rounded-xl px-4 py-3 mb-5 text-sm font-medium ${
            isOver
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
                        No budgets found
                      </SelectItem>
                    ) : (
                      groups.map(({ budget, categories }) => (
                        <SelectGroup key={budget.id}>
                          {/* Budget itself as a target */}
                          <SelectLabel className="flex items-center gap-1.5 font-semibold text-foreground">
                            {budget.account_type === "private" ? "🔒" : "🏠"}{" "}
                            {budget.name}
                          </SelectLabel>
                          <SelectItem value={`budget:${budget.id}`}>
                            <span className="flex items-center gap-1.5 pl-2 text-muted-foreground text-xs">
                              Entire budget (no category)
                            </span>
                          </SelectItem>

                          {/* Categories within that budget */}
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
