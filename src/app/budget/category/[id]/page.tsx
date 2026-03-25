"use client";

export const dynamic = "force-dynamic";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronRight, PlusCircle, PhoneCall } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { PocketMoneySplitSheet } from "@/components/budget/PocketMoneySplitSheet";
import { formatRWF, BUDGET_THRESHOLDS } from "@/lib/constants";
import { useCategories, useTransactions, useLang, useActiveBudget } from "@/store";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import type { CategoryWithStats } from "@/lib/types";

const USSD_PAY = "tel:*182*1*1%23";

// ─── Payment method badge ─────────────────────────────────────────────────────
const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  mtn_momo:      { label: "MTN MoMo",      color: "bg-yellow-100 text-yellow-800" },
  airtel_money:  { label: "Airtel Money",  color: "bg-red-100 text-red-800" },
  bank_transfer: { label: "Bank Transfer", color: "bg-blue-100 text-blue-800" },
  cash:          { label: "Cash",          color: "bg-gray-100 text-gray-700" },
};

// ─── Sub-budget row ───────────────────────────────────────────────────────────
function SubCategoryRow({ cat }: { cat: CategoryWithStats }) {
  const [open, setOpen] = useState(false);
  const hasChildren = (cat.children ?? []).length > 0;
  const isOver = cat.percentage > 100;
  const isDanger = cat.percentage >= BUDGET_THRESHOLDS.DANGER;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => hasChildren && setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="text-lg">{cat.icon}</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">{cat.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  isOver ? "bg-red-500" : isDanger ? "bg-amber-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRWF(cat.spent)} / {formatRWF(cat.planned_amount)}
            </span>
          </div>
        </div>
        {hasChildren && (
          <span className="text-muted-foreground">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </button>

      {open && hasChildren && (
        <div className="pl-6 border-t divide-y">
          {cat.children!.map((child) => (
            <SubCategoryRow key={child.id} cat={child} />
          ))}
        </div>
      )}

      {/* Transactions for this sub-category */}
      {open && cat.transactions.length > 0 && (
        <div className="bg-background px-3 py-2 border-t">
          {cat.transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-muted-foreground">{tx.note || "—"}</span>
              <div className="flex items-center gap-2">
                {tx.payment_method && PAYMENT_LABELS[tx.payment_method] && (
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", PAYMENT_LABELS[tx.payment_method].color)}>
                    {PAYMENT_LABELS[tx.payment_method].label}
                  </span>
                )}
                <span className="font-semibold text-red-500">-{formatRWF(tx.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay button */}
      <div className="border-t px-3 py-2">
        <a
          href={USSD_PAY}
          className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <PhoneCall size={12} />
          Pay via MTN MoMo (*182*1*1#)
        </a>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const categories = useCategories();
  const transactions = useTransactions();
  const activeBudget = useActiveBudget();

  const category = categories.find((c) => c.id === id);

  // Build children stats for sub-budgets
  const subCategories = categories.filter((c) => c.parent_id === id);

  const catTxs = transactions
    .filter((tx) => tx.category_id === id && tx.type === "expense")
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!category) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <span className="text-5xl">😕</span>
          <p className="text-muted-foreground">Category not found</p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </AppShell>
    );
  }

  // Include spend from sub-categories recursively
  function getDescendantSpend(parentId: string): number {
    const children = categories.filter((c) => c.parent_id === parentId);
    return children.reduce((sum, c) => {
      const childSpend = transactions
        .filter((tx) => tx.category_id === c.id && tx.type === "expense")
        .reduce((s, tx) => s + tx.amount, 0);
      return sum + childSpend + getDescendantSpend(c.id);
    }, 0);
  }

  const directSpend = catTxs.reduce((sum, t) => sum + t.amount, 0);
  const subSpend = getDescendantSpend(id);
  const spent = directSpend + subSpend;
  const remaining = category.planned_amount - spent;
  const percentage =
    category.planned_amount > 0
      ? Math.min(Math.round((spent / category.planned_amount) * 100), 999)
      : 0;

  const isOver = percentage > 100;
  const isDanger = percentage >= BUDGET_THRESHOLDS.DANGER;
  const isWarning = percentage >= BUDGET_THRESHOLDS.WARNING;

  const barColor = isOver
    ? "bg-red-500"
    : isDanger
    ? "bg-amber-500"
    : isWarning
    ? "bg-yellow-400"
    : "bg-green-500";

  const name =
    lang === "rw" && category.name_rw ? category.name_rw : category.name;

  // Unallocated for sub-budgets
  const subAllocated = subCategories.reduce((s, c) => s + c.planned_amount, 0);
  const unallocated = category.planned_amount - subAllocated;

  // Build children with stats for display
  const childrenWithStats: CategoryWithStats[] = subCategories.map((sc) => {
    const scTxs = transactions.filter(
      (tx) => tx.category_id === sc.id && tx.type === "expense"
    );
    const scSpent = scTxs.reduce((s, tx) => s + tx.amount, 0);
    return {
      ...sc,
      spent: scSpent,
      remaining: sc.planned_amount - scSpent,
      percentage:
        sc.planned_amount > 0
          ? Math.min(Math.round((scSpent / sc.planned_amount) * 100), 999)
          : 0,
      transactions: scTxs,
      children: [],
    };
  });

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </Button>
          <span className="text-2xl">{category.icon}</span>
          <h1 className="font-bold text-xl flex-1">{name}</h1>
          {(category.name === "Pocket Money" || category.name_rw === "Amafaranga yo mu nkono") &&
            activeBudget && (
              <PocketMoneySplitSheet
                categoryId={id}
                budgetId={category.budget_id}
                householdId={activeBudget.household_id}
                remaining={remaining}
                activeBudget={activeBudget}
              />
            )}
        </div>

        {/* Stats card */}
        <div className="bg-card rounded-2xl border p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("planned")}</p>
              <p className="font-bold text-sm">
                {formatRWF(category.planned_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("spent")}</p>
              <p className={cn("font-bold text-sm", isOver ? "text-red-500" : "")}>
                {formatRWF(spent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("remaining")}</p>
              <p
                className={cn(
                  "font-bold text-sm",
                  remaining < 0 ? "text-red-500" : "text-green-600"
                )}
              >
                {formatRWF(Math.abs(remaining))}
                {remaining < 0 ? " over" : ""}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{percentage}% {t("percentUsed")}</span>
              <span
                className={cn(
                  isOver ? "text-red-500" : isDanger ? "text-amber-500" : "text-green-600",
                  "font-medium"
                )}
              >
                {isOver ? t("overBudget") : isDanger ? t("nearLimit") : t("onTrack")}
              </span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Pay button */}
          <a
            href={USSD_PAY}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary/10 text-primary hover:bg-primary/15 transition-colors py-2.5 text-sm font-semibold"
          >
            <PhoneCall size={15} />
            Pay via MTN MoMo (*182*1*1#)
          </a>
        </div>

        {/* Sub-budgets section */}
        {(subCategories.length > 0 || category.planned_amount > 0) && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">{t("subCategories")}</h2>
              <div className="flex items-center gap-2">
                {subCategories.length > 0 && unallocated > 0 && (
                  <span className="text-xs text-amber-600 font-medium">
                    {formatRWF(unallocated)} {t("unallocated")}
                  </span>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link href={`/budget/category/new?parent=${id}`}>
                    <PlusCircle size={12} className="mr-1" />
                    {t("addSubCategory")}
                  </Link>
                </Button>
              </div>
            </div>

            {childrenWithStats.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-xl">
                {t("drillDown")} — add sub-items to break this category down further
              </div>
            ) : (
              <div className="space-y-2">
                {childrenWithStats.map((child) => (
                  <SubCategoryRow key={child.id} cat={child} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Direct transaction list */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{t("transactions")}</h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/transactions/new">
              <PlusCircle size={14} className="mr-1" />
              {t("add")}
            </Link>
          </Button>
        </div>

        {catTxs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 bg-muted/30 rounded-xl">
            <span className="text-4xl">🧾</span>
            <p className="text-muted-foreground text-sm">No direct transactions</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border px-4">
            {catTxs.map((tx) => (
              <div key={tx.id}>
                <TransactionItem transaction={tx} category={category} />
                {tx.payment_method && PAYMENT_LABELS[tx.payment_method] && (
                  <div className="pb-2 -mt-1">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PAYMENT_LABELS[tx.payment_method].color)}>
                      {PAYMENT_LABELS[tx.payment_method].label}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
