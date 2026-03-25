"use client";

export const dynamic = "force-dynamic";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useT } from "@/hooks/useT";
import { useTransactions, useCategories, useLang } from "@/store";
import { formatRWF } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupByMonth(transactions: ReturnType<typeof useTransactions>) {
  const map: Record<string, { income: number; expense: number }> = {};
  for (const tx of transactions) {
    const key = tx.date.slice(0, 7); // YYYY-MM
    if (!map[key]) map[key] = { income: 0, expense: 0 };
    if (tx.type === "income") map[key].income += tx.amount;
    else map[key].expense += tx.amount;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6); // last 6 months
}

function monthLabel(yyyyMM: string, lang: "en" | "rw"): string {
  const [year, month] = yyyyMM.split("-");
  const monthKeys = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ] as const;
  const key = monthKeys[parseInt(month, 10) - 1];
  return `${translations[lang][key].slice(0, 3)} ${year.slice(2)}`;
}

// ─── Bar chart (pure CSS) ─────────────────────────────────────────────────────
function BarChart({
  data,
}: {
  data: Array<{ label: string; income: number; expense: number }>;
}) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  return (
    <div className="flex items-end gap-2 h-36 w-full">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 w-full h-28">
            {/* income bar */}
            <div
              className="flex-1 rounded-t bg-green-400 min-h-[2px] transition-all"
              style={{ height: `${(d.income / max) * 100}%` }}
              title={`Income: ${formatRWF(d.income)}`}
            />
            {/* expense bar */}
            <div
              className="flex-1 rounded-t bg-red-400 min-h-[2px] transition-all"
              style={{ height: `${(d.expense / max) * 100}%` }}
              title={`Expense: ${formatRWF(d.expense)}`}
            />
          </div>
          <span className="text-xs text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const t = useT();
  const lang = useLang();
  const transactions = useTransactions();
  const categories = useCategories();

  const monthly = useMemo(() => groupByMonth(transactions), [transactions]);

  // Savings rate
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + tx.amount, 0);
  const totalSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

  // Top spending categories
  const topCategories = useMemo(() => {
    return categories
      .filter((c) => !c.parent_id)
      .map((cat) => {
        const spent = transactions
          .filter((tx) => tx.category_id === cat.id && tx.type === "expense")
          .reduce((s, tx) => s + tx.amount, 0);
        return { ...cat, spent };
      })
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }, [categories, transactions]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions.filter((t) => t.type === "expense")) {
      const pm = tx.payment_method ?? "cash";
      map[pm] = (map[pm] ?? 0) + tx.amount;
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [transactions]);

  const PAYMENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    mtn_momo:      { label: "MTN MoMo",      icon: "📲", color: "bg-yellow-100 text-yellow-800" },
    airtel_money:  { label: "Airtel Money",  icon: "📱", color: "bg-red-100 text-red-800" },
    bank_transfer: { label: "Bank Transfer", icon: "🏦", color: "bg-blue-100 text-blue-800" },
    cash:          { label: "Cash",          icon: "💵", color: "bg-gray-100 text-gray-700" },
  };

  const chartData = monthly.map(([key, val]) => ({
    label: monthLabel(key, lang),
    ...val,
  }));

  // Monthly averages (last 6 months)
  const avgIncome = monthly.length > 0
    ? Math.round(monthly.reduce((s, [, v]) => s + v.income, 0) / monthly.length)
    : 0;
  const avgExpense = monthly.length > 0
    ? Math.round(monthly.reduce((s, [, v]) => s + v.expense, 0) / monthly.length)
    : 0;

  if (transactions.length === 0) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <span className="text-5xl">📈</span>
          <p className="font-semibold text-lg">{t("reportsTitle")}</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Add transactions to see your spending trends and reports
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <h1 className="font-bold text-xl">📈 {t("reportsTitle")}</h1>

        {/* Savings rate + averages */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className={cn(
              "rounded-2xl border p-4 text-center",
              savingsRate >= 20
                ? "bg-green-50 border-green-200"
                : savingsRate >= 0
                ? "bg-amber-50 border-amber-200"
                : "bg-red-50 border-red-200"
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">{t("savingsRate")}</p>
            <p
              className={cn(
                "font-bold text-xl",
                savingsRate >= 20 ? "text-green-700" : savingsRate >= 0 ? "text-amber-700" : "text-red-600"
              )}
            >
              {savingsRate}%
            </p>
          </div>
          <div className="bg-card border rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Income</p>
            <p className="font-bold text-sm text-green-600">{formatRWF(avgIncome)}</p>
          </div>
          <div className="bg-card border rounded-2xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Expense</p>
            <p className="font-bold text-sm text-red-500">{formatRWF(avgExpense)}</p>
          </div>
        </div>

        {/* Income vs Expense chart */}
        {chartData.length > 0 && (
          <section className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold text-sm mb-4">{t("incomeVsExpense")}</h2>
            <BarChart data={chartData} />
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-400 inline-block" />
                {t("income")}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-400 inline-block" />
                {t("expense")}
              </div>
            </div>
          </section>
        )}

        {/* Top spending categories */}
        {topCategories.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm mb-3">{t("topCategories")}</h2>
            <div className="bg-card border rounded-2xl overflow-hidden divide-y">
              {topCategories.map((cat, i) => {
                const pct = totalExpense > 0 ? Math.round((cat.spent / totalExpense) * 100) : 0;
                return (
                  <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg w-6 text-center">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-sm font-semibold">{formatRWF(cat.spent)}</p>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Payment method breakdown */}
        {paymentBreakdown.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm mb-3">{t("paymentMethod")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {paymentBreakdown.map(([method, amount]) => {
                const cfg = PAYMENT_LABELS[method] ?? {
                  label: method,
                  icon: "💳",
                  color: "bg-gray-100 text-gray-700",
                };
                const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
                return (
                  <div key={method} className={cn("rounded-xl border p-3", cfg.color)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{cfg.icon}</span>
                      <span className="text-sm font-semibold">{cfg.label}</span>
                    </div>
                    <p className="font-bold">{formatRWF(amount)}</p>
                    <p className="text-xs opacity-70">{pct}% of expenses</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Month-over-month table */}
        {monthly.length > 1 && (
          <section>
            <h2 className="font-semibold text-sm mb-3">{t("monthOverMonth")}</h2>
            <div className="bg-card border rounded-2xl overflow-hidden">
              <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground px-4 py-2 border-b bg-muted/30">
                <span>Month</span>
                <span className="text-right">Income</span>
                <span className="text-right">Expenses</span>
                <span className="text-right">Savings</span>
              </div>
              {monthly.map(([key, val]) => {
                const sav = val.income - val.expense;
                return (
                  <div
                    key={key}
                    className="grid grid-cols-4 text-xs px-4 py-3 border-b last:border-b-0"
                  >
                    <span className="font-medium">{monthLabel(key, lang)}</span>
                    <span className="text-right text-green-600">{formatRWF(val.income)}</span>
                    <span className="text-right text-red-500">{formatRWF(val.expense)}</span>
                    <span className={cn("text-right font-semibold", sav >= 0 ? "text-green-600" : "text-red-500")}>
                      {formatRWF(Math.abs(sav))}
                      {sav < 0 ? " -" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
