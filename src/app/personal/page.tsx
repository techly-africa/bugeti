"use client";

export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PlusCircle, TrendingDown, TrendingUp, Lock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppShell } from "@/components/layout/AppShell";
import { AmountInput } from "@/components/shared/AmountInput";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { useUser, useHousehold, useAppStore } from "@/store";
import { db } from "@/db";
import { generateId, formatRWF } from "@/lib/constants";
import type { Budget, Category, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const PERSONAL_CATS: Pick<Category, "name" | "icon" | "color">[] = [
  { name: "Food",          icon: "🍽️", color: "#16a34a" },
  { name: "Transport",     icon: "🚌", color: "#2563eb" },
  { name: "Entertainment", icon: "🎉", color: "#db2777" },
  { name: "Shopping",      icon: "🛍️", color: "#7c3aed" },
  { name: "Other",         icon: "📦", color: "#6b7280" },
];

export default function PersonalPage() {
  const user = useUser();
  const household = useHousehold();
  const setActiveAccountType = useAppStore((s) => s.setActiveAccountType);

  // Keep store in sync with the current page
  useEffect(() => { setActiveAccountType("private"); }, [setActiveAccountType]);

  const [budget, setBudget]           = useState<Budget | null>(null);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]         = useState(true);

  // Setup form
  const [budgetName, setBudgetName] = useState("");
  const [creating, setCreating]     = useState(false);

  // Add expense sheet
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [amount, setAmount]           = useState(0);
  const [note, setNote]               = useState("");
  const [date, setDate]               = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCat, setSelectedCat] = useState(PERSONAL_CATS[4].name); // "Other"
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const privateBudget = await db.budgets
      .filter((b) => b.account_type === "private" && b.created_by === user.id)
      .first();

    setBudget(privateBudget ?? null);

    if (privateBudget) {
      const [cats, txs] = await Promise.all([
        db.categories.where("budget_id").equals(privateBudget.id).toArray(),
        db.transactions
          .where("budget_id")
          .equals(privateBudget.id)
          .reverse()
          .sortBy("date"),
      ]);
      setCategories(cats);
      setTransactions(txs);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalSpent = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalSpent;

  // ── Create personal budget ────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !household) return;
    setCreating(true);

    const now = new Date();
    const newBudget: Budget = {
      id: generateId(),
      household_id: household.id,
      name: budgetName.trim() || `${user.display_name}'s Personal`,
      period: "monthly",
      budget_type: "monthly",
      account_type: "private",
      status: "active",
      start_date: new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0],
      end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0],
      currency: "RWF",
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    await db.budgets.add(newBudget);
    setBudget(newBudget);
    setCreating(false);
    toast.success("Personal account created!");
  };

  // ── Record expense ────────────────────────────────────────────────────────

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !budget || amount <= 0) return;
    setSaving(true);

    const catDef = PERSONAL_CATS.find((c) => c.name === selectedCat) ?? PERSONAL_CATS[4];

    // Find or create the category in this private budget
    let cat = categories.find((c) => c.name === catDef.name);
    if (!cat) {
      cat = {
        id: generateId(),
        budget_id: budget.id,
        name: catDef.name,
        icon: catDef.icon,
        color: catDef.color,
        planned_amount: 0,
        sort_order: 0,
        level: 0,
        parent_id: null,
      };
      await db.categories.add(cat);
      setCategories((prev) => [...prev, cat!]);
    }

    const tx: Transaction = {
      id: generateId(),
      category_id: cat.id,
      budget_id: budget.id,
      household_id: budget.household_id,
      added_by: user.id,
      type: "expense",
      amount,
      note,
      date,
      payment_method: "cash",
      synced: false,
      created_at: new Date().toISOString(),
    };

    await db.transactions.add(tx);
    setAmount(0);
    setNote("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setExpenseOpen(false);
    setSaving(false);
    toast.success("Expense recorded!");
    load();
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  // ── Setup screen ─────────────────────────────────────────────────────────

  if (!budget) {
    return (
      <AppShell>
        <div className="space-y-5">
          <AccountSwitcher />

          <div className="flex flex-col items-center gap-5 py-10 text-center">
            <span className="text-5xl">🔒</span>
            <div>
              <p className="font-semibold text-base">No personal account yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Track your personal spending — only you can see it.
              </p>
            </div>

            <Card className="w-full text-left">
              <CardContent className="pt-5">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Account name (optional)</Label>
                    <Input
                      placeholder={`${user?.display_name ?? "My"}'s Personal`}
                      value={budgetName}
                      onChange={(e) => setBudgetName(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating && (
                      <Loader2 size={14} className="animate-spin mr-1.5" />
                    )}
                    Set up personal account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    );
  }

  // ── Main personal view ────────────────────────────────────────────────────

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <AccountSwitcher />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock size={11} /> Only you
          </span>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <p className="text-xs text-muted-foreground">Received</p>
            </div>
            <p className="font-bold text-sm text-green-600">{formatRWF(totalIncome)}</p>
          </div>
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs text-muted-foreground">Spent</p>
            </div>
            <p className="font-bold text-sm text-red-500">{formatRWF(totalSpent)}</p>
          </div>
          <div
            className={cn(
              "rounded-2xl border p-3 text-center",
              balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p
              className={cn(
                "font-bold text-sm",
                balance >= 0 ? "text-green-700" : "text-red-600"
              )}
            >
              {formatRWF(Math.abs(balance))}
            </p>
          </div>
        </div>

        {/* Add expense */}
        <Sheet open={expenseOpen} onOpenChange={setExpenseOpen}>
          <SheetTrigger asChild>
            <Button className="w-full gap-2">
              <PlusCircle size={16} />
              Record Expense
            </Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle>Personal Expense</SheetTitle>
            </SheetHeader>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <AmountInput value={amount} onChange={setAmount} className="w-full" />
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="grid grid-cols-5 gap-2">
                  {PERSONAL_CATS.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCat(cat.name)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all",
                        selectedCat === cat.name
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted text-muted-foreground"
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="truncate w-full text-center">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input
                  placeholder="What was this for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={saving || amount <= 0}
              >
                {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Save Expense
              </Button>
            </form>
          </SheetContent>
        </Sheet>

        {/* Transactions */}
        <section>
          <h2 className="font-semibold text-sm mb-3">Transactions</h2>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 bg-muted/30 rounded-xl">
              <span className="text-4xl">🧾</span>
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border px-4">
              {transactions.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category_id);
                return (
                  <TransactionItem key={tx.id} transaction={tx} category={cat} />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
