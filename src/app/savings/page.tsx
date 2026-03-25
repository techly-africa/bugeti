"use client";

export const dynamic = "force-dynamic";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { PlusCircle, TrendingDown, TrendingUp, Coins, Loader2, X, Target } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/layout/AppShell";
import { AmountInput } from "@/components/shared/AmountInput";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { useUser, useHousehold, useAppStore } from "@/store";
import { db } from "@/db";
import { generateId, formatRWF } from "@/lib/constants";
import type { Budget, Category, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoalStats {
  budget: Budget;
  deposited: number;
  spent: number;
  balance: number;
  pct: number; // % of target reached
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns or creates the single default category for a savings budget */
async function getOrCreateSavingsCat(budgetId: string): Promise<Category> {
  const existing = await db.categories
    .filter((c) => c.budget_id === budgetId)
    .first();
  if (existing) return existing;

  const cat: Category = {
    id: generateId(),
    budget_id: budgetId,
    name: "Savings",
    icon: "🏦",
    color: "#16a34a",
    planned_amount: 0,
    sort_order: 0,
    level: 0,
    parent_id: null,
  };
  await db.categories.add(cat);
  return cat;
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({
  stats,
  onDeposit,
  onSpend,
  onDelete,
}: {
  stats: GoalStats;
  onDeposit: () => void;
  onSpend: () => void;
  onDelete: () => void;
}) {
  const { budget, deposited, spent, balance, pct } = stats;
  const hasTarget = !!budget.total_envelope;
  const over = hasTarget && spent > (budget.total_envelope ?? 0);

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏦</span>
          <div>
            <p className="font-semibold leading-tight">{budget.name}</p>
            {hasTarget && (
              <p className="text-xs text-muted-foreground">
                Target: {formatRWF(budget.total_envelope!)}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar (only when target is set) */}
      {hasTarget && (
        <div className="space-y-1">
          <Progress
            value={Math.min(pct, 100)}
            className={cn("h-2", over ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500")}
          />
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(pct)}% of target
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Deposited</p>
          <p className="text-sm font-bold text-green-600">{formatRWF(deposited)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-sm font-bold text-red-500">{formatRWF(spent)}</p>
        </div>
        <div className={cn("rounded-xl px-1 py-0.5", balance >= 0 ? "bg-green-50" : "bg-red-50")}>
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className={cn("text-sm font-bold", balance >= 0 ? "text-green-700" : "text-red-600")}>
            {formatRWF(Math.abs(balance))}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="gap-1" onClick={onDeposit}>
          <TrendingUp size={13} className="text-green-600" /> Deposit
        </Button>
        <Button variant="outline" size="sm" className="gap-1" onClick={onSpend}>
          <TrendingDown size={13} className="text-red-500" /> Spend
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SavingsPage() {
  const user = useUser();
  const household = useHousehold();
  const setActiveAccountType = useAppStore((s) => s.setActiveAccountType);

  useEffect(() => { setActiveAccountType("savings"); }, [setActiveAccountType]);

  const [goals, setGoals] = useState<GoalStats[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Create goal sheet ──
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState(0);
  const [goalStart, setGoalStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [goalEnd, setGoalEnd] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth() + 12, 0), "yyyy-MM-dd")
  );
  const [creatingGoal, setCreatingGoal] = useState(false);

  // ── Deposit / spend sheet ──
  const [txOpen, setTxOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txGoalId, setTxGoalId] = useState("");
  const [txAmount, setTxAmount] = useState(0);
  const [txNote, setTxNote] = useState("");
  const [txDate, setTxDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [savingTx, setSavingTx] = useState(false);

  const load = useCallback(async () => {
    if (!household) return;

    const budgets = await db.budgets
      .filter((b) => b.account_type === "savings" && b.household_id === household.id)
      .toArray();

    const stats: GoalStats[] = await Promise.all(
      budgets.map(async (b) => {
        const txs = await db.transactions.where("budget_id").equals(b.id).toArray();
        const deposited = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const spent = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        const balance = deposited - spent;
        const pct = b.total_envelope ? (deposited / b.total_envelope) * 100 : 0;
        return { budget: b, deposited, spent, balance, pct };
      })
    );

    setGoals(stats);
    setLoading(false);
  }, [household]);

  useEffect(() => { load(); }, [load]);

  const totalDeposited = goals.reduce((s, g) => s + g.deposited, 0);
  const totalSpent     = goals.reduce((s, g) => s + g.spent, 0);
  const totalBalance   = totalDeposited - totalSpent;

  // ── Open deposit/spend for a specific goal ──
  const openTx = (type: "income" | "expense", goalId: string) => {
    setTxType(type);
    setTxGoalId(goalId);
    setTxAmount(0);
    setTxNote("");
    setTxDate(format(new Date(), "yyyy-MM-dd"));
    setTxOpen(true);
  };

  // ── Create goal ──
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !household || !goalName.trim()) return;
    setCreatingGoal(true);

    const budget: Budget = {
      id: generateId(),
      household_id: household.id,
      name: goalName.trim(),
      period: "monthly",
      budget_type: "project",
      account_type: "savings",
      status: "active",
      start_date: goalStart,
      end_date: goalEnd,
      total_envelope: goalTarget > 0 ? goalTarget : undefined,
      currency: "RWF",
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    await db.budgets.add(budget);
    setGoalName("");
    setGoalTarget(0);
    setGoalOpen(false);
    setCreatingGoal(false);
    toast.success(`Goal "${budget.name}" created!`);
    load();
  };

  // ── Record transaction ──
  const handleTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !txGoalId || txAmount <= 0) return;
    setSavingTx(true);

    const cat = await getOrCreateSavingsCat(txGoalId);
    const goal = goals.find((g) => g.budget.id === txGoalId)!;

    const tx: Transaction = {
      id: generateId(),
      category_id: cat.id,
      budget_id: txGoalId,
      household_id: goal.budget.household_id,
      added_by: user.id,
      type: txType,
      amount: txAmount,
      note: txNote,
      date: txDate,
      payment_method: "cash",
      synced: false,
      created_at: new Date().toISOString(),
    };

    await db.transactions.add(tx);
    setTxOpen(false);
    setSavingTx(false);
    toast.success(txType === "income" ? "Deposit recorded!" : "Spend recorded!");
    load();
  };

  // ── Delete goal ──
  const handleDeleteGoal = async (budgetId: string) => {
    await db.transactions.filter((t) => t.budget_id === budgetId).delete();
    await db.categories.filter((c) => c.budget_id === budgetId).delete();
    await db.budgets.delete(budgetId);
    toast.success("Goal deleted.");
    load();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <AccountSwitcher />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Coins size={11} /> Savings
          </span>
        </div>

        {/* Overall balance */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
              <p className="text-xs text-muted-foreground">Deposited</p>
            </div>
            <p className="font-bold text-sm text-green-600">{formatRWF(totalDeposited)}</p>
          </div>
          <div className="bg-card rounded-2xl border p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              <p className="text-xs text-muted-foreground">Drawn</p>
            </div>
            <p className="font-bold text-sm text-red-500">{formatRWF(totalSpent)}</p>
          </div>
          <div className={cn(
            "rounded-2xl border p-3 text-center",
            totalBalance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          )}>
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p className={cn("font-bold text-sm", totalBalance >= 0 ? "text-green-700" : "text-red-600")}>
              {formatRWF(Math.abs(totalBalance))}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {goals.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 bg-muted/20 rounded-2xl text-center">
            <span className="text-5xl">🏦</span>
            <div>
              <p className="font-semibold">No savings goals yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Create a savings goal — an Emergency Fund, a Vacation, anything — then deposit money and track your progress.
              </p>
            </div>
            <Button onClick={() => setGoalOpen(true)}>
              <Target size={14} className="mr-1.5" /> Create first goal
            </Button>
          </div>
        )}

        {/* Goals list */}
        {goals.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Goals</h2>
              <Button variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
                <PlusCircle size={13} className="mr-1" /> New goal
              </Button>
            </div>
            {goals.map((g) => (
              <GoalCard
                key={g.budget.id}
                stats={g}
                onDeposit={() => openTx("income", g.budget.id)}
                onSpend={() => openTx("expense", g.budget.id)}
                onDelete={() => handleDeleteGoal(g.budget.id)}
              />
            ))}
          </section>
        )}

        {/* ── Create goal sheet ── */}
        <Sheet open={goalOpen} onOpenChange={setGoalOpen}>
          <SheetTrigger className="hidden" />
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <Target size={16} /> New Savings Goal
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Goal name</Label>
                <Input
                  placeholder="e.g. Emergency Fund, Vacation 2027"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target amount (optional)</Label>
                <AmountInput value={goalTarget} onChange={setGoalTarget} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start date</Label>
                  <Input type="date" value={goalStart} onChange={(e) => setGoalStart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Target date</Label>
                  <Input type="date" value={goalEnd} onChange={(e) => setGoalEnd(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={creatingGoal || !goalName.trim()}>
                {creatingGoal && <Loader2 size={14} className="animate-spin mr-1.5" />}
                Create Goal
              </Button>
            </form>
          </SheetContent>
        </Sheet>

        {/* ── Deposit / Spend sheet ── */}
        <Sheet open={txOpen} onOpenChange={setTxOpen}>
          <SheetTrigger className="hidden" />
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                {txType === "income"
                  ? <><TrendingUp size={16} className="text-green-600" /> Deposit to Savings</>
                  : <><TrendingDown size={16} className="text-red-500" /> Spend from Savings</>
                }
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleTx} className="space-y-4">
              {/* Goal selector — only shows when multiple goals */}
              {goals.length > 1 && (
                <div className="space-y-1.5">
                  <Label>Goal</Label>
                  <Select value={txGoalId} onValueChange={setTxGoalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((g) => (
                        <SelectItem key={g.budget.id} value={g.budget.id}>
                          {g.budget.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <AmountInput value={txAmount} onChange={setTxAmount} className="w-full" />
              </div>
              <div className="space-y-1.5">
                <Label>Note</Label>
                <Input
                  placeholder={txType === "income" ? "e.g. Salary deposit" : "e.g. Emergency expense"}
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <Button
                type="submit"
                className={cn("w-full", txType === "expense" && "bg-red-600 hover:bg-red-700")}
                disabled={savingTx || txAmount <= 0 || !txGoalId}
              >
                {savingTx && <Loader2 size={14} className="animate-spin mr-1.5" />}
                {txType === "income" ? "Confirm Deposit" : "Confirm Spend"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>

      </div>
    </AppShell>
  );
}
