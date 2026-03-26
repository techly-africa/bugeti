"use client";

export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHelp } from "@/components/shared/SectionHelp";
import { useT } from "@/hooks/useT";
import { useTransactions, useCategories, useLang } from "@/store";
import { formatRWF } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/i18n";
import { db } from "@/db";
import type { UserProfile, HouseholdMember } from "@/lib/types";
import { useHousehold } from "@/store";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupByMonth(transactions: ReturnType<typeof useTransactions>) {
  const map: Record<string, { income: number; expense: number }> = {};
  for (const tx of transactions) {
    if (tx.type === "transfer") continue; // transfers are redistributions, not income or expense
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

// ─── Learning Center ──────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: "budgeting-101",
    emoji: "📊",
    level: "Beginner",
    levelColor: "bg-green-100 text-green-700",
    title: "Budgeting 101",
    summary: "Learn the 50/30/20 rule — allocate 50% to needs, 30% to wants, and 20% to savings.",
    content: [
      "A budget is simply a plan for your money. It tells your money where to go instead of wondering where it went.",
      "**The 50/30/20 Rule**\n• 50% → Needs (rent, food, transport, utilities)\n• 30% → Wants (eating out, entertainment, clothes)\n• 20% → Savings & debt repayment",
      "**In Rwandan context**, adapt this to your reality. If you earn 300,000 RWF/month:\n• 150,000 for essentials\n• 90,000 for lifestyle\n• 60,000 saved or invested",
      "The key is consistency. Even saving 5,000 RWF/week = 260,000 RWF/year.",
    ],
    readMins: 3,
  },
  {
    id: "emergency-fund",
    emoji: "🛡️",
    level: "Beginner",
    levelColor: "bg-green-100 text-green-700",
    title: "Build Your Emergency Fund",
    summary: "Have 3–6 months of expenses saved before you invest. It's your financial immune system.",
    content: [
      "An emergency fund is money you set aside specifically for unexpected costs — job loss, medical bills, car repairs.",
      "**How much do you need?**\n• Minimum: 1 month of expenses\n• Target: 3–6 months of expenses\n• Freelancers/self-employed: 6–12 months",
      "**Where to keep it?** Not in a regular spending account. Use a separate savings account or a low-risk savings product. Keep it accessible (not locked up for 1 year).",
      "Start small: commit to saving 10,000 RWF/month until you hit your target. Automate the transfer if you can.",
    ],
    readMins: 4,
  },
  {
    id: "debt-management",
    emoji: "⛓️",
    level: "Intermediate",
    levelColor: "bg-yellow-100 text-yellow-700",
    title: "Beat Your Debt",
    summary: "Understand the avalanche vs. snowball method to pay off debt faster and save on interest.",
    content: [
      "Debt isn't inherently bad — a mortgage or student loan can be 'good debt' if it builds value. But high-interest consumer debt (credit cards, personal loans) erodes wealth.",
      "**Avalanche Method** — Pay minimums on all debts, then put extra money toward the highest-interest debt first. Saves the most money mathematically.",
      "**Snowball Method** — Pay minimums on all debts, then attack the smallest balance first. Builds momentum and motivation through quick wins.",
      "In Rwanda, mobile loan apps often charge 10–20% monthly interest. Treat these as emergencies, not normal financing. Pay them off before investing.",
    ],
    readMins: 5,
  },
  {
    id: "investing-basics",
    emoji: "📈",
    level: "Intermediate",
    levelColor: "bg-yellow-100 text-yellow-700",
    title: "How Investing Works",
    summary: "Understand compound interest — the 8th wonder of the world — and why starting early matters.",
    content: [
      "Investing means putting your money to work so it grows over time. The core engine is **compound interest** — earning returns on your returns.",
      "**Example**: 1,000,000 RWF invested at 10%/year:\n• After 10 years: ~2,600,000 RWF\n• After 20 years: ~6,700,000 RWF\n• After 30 years: ~17,400,000 RWF\n\nTime is the most powerful variable.",
      "**In Rwanda**, consider:\n• KCB/BPR savings products\n• RSE (Rwanda Stock Exchange) equities\n• Real estate (iwacu/land)\n• T-Bills and Government bonds through BNR",
      "Never invest money you can't afford to lock up. Build your emergency fund first, then invest."
    ],
    readMins: 5,
  },
  {
    id: "ikimina-power",
    emoji: "🤝",
    level: "Advanced",
    levelColor: "bg-blue-100 text-blue-700",
    title: "Maximizing Your Ikimina",
    summary: "Ikimina is a powerful savings vehicle. Learn how to leverage it for financial growth.",
    content: [
      "Ikimina (rotating savings and credit associations) are one of Rwanda's oldest financial tools. Each member contributes a set amount periodically, and one member takes the entire pot each cycle.",
      "**Why it works:** The social pressure of a group enforces discipline. You can't miss a contribution without affecting your community.",
      "**Strategy:** Time your Ikimina payout for a major planned expense (school fees, business investment, home improvement) instead of spending it on lifestyle costs.",
      "**Level up:** Use the Bugeti Ikimina tracker to monitor contributions, predict your payout date, and plan what you'll do with the lump sum before you receive it.",
    ],
    readMins: 4,
  },
  {
    id: "net-worth",
    emoji: "💎",
    level: "Advanced",
    levelColor: "bg-blue-100 text-blue-700",
    title: "Track Your Net Worth",
    summary: "Net worth = Assets - Liabilities. Growing this number is the real goal of personal finance.",
    content: [
      "Net worth is the most important number in personal finance — more meaningful than your salary or savings alone.",
      "**Formula:** Net Worth = Total Assets − Total Liabilities",
      "**Assets you own:** Cash, savings, investments, property value, business equity",
      "**Liabilities you owe:** Mortgage, car loan, personal loans, mobile loans, credit balances",
      "Track your net worth monthly. Even if it's negative (common when starting out), the direction of the trend matters most. A negative net worth increasing by 50,000 RWF/month is a win.",
    ],
    readMins: 4,
  },
];

function LessonCard({
  lesson,
  onOpen,
}: {
  lesson: typeof LESSONS[0];
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(lesson.id)}
      className="text-left w-full bg-card border rounded-2xl p-4 hover:border-primary/50 hover:shadow-sm transition-all active:scale-[0.98] group"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl shrink-0">{lesson.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", lesson.levelColor)}>
              {lesson.level}
            </span>
            <span className="text-[10px] text-muted-foreground">{lesson.readMins} min read</span>
          </div>
          <p className="font-semibold text-sm">{lesson.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lesson.summary}</p>
        </div>
        <span className="text-muted-foreground group-hover:text-primary transition-colors self-center">›</span>
      </div>
    </button>
  );
}

function LessonDetail({
  lesson,
  onBack,
}: {
  lesson: typeof LESSONS[0];
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to lessons
      </button>
      <div className="flex items-center gap-3">
        <span className="text-4xl">{lesson.emoji}</span>
        <div>
          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", lesson.levelColor)}>
            {lesson.level}
          </span>
          <h2 className="font-bold text-xl mt-1">{lesson.title}</h2>
        </div>
      </div>
      <p className="text-muted-foreground text-sm italic border-l-4 border-primary/30 pl-4">{lesson.summary}</p>
      <div className="space-y-4">
        {lesson.content.map((block, i) => (
          <div key={i} className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
            {block.split(/\*\*(.*?)\*\*/g).map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="font-semibold text-foreground">{part}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const t = useT();
  const lang = useLang();
  const transactions = useTransactions();
  const categories = useCategories();

  const household = useHousehold();

  const [activeTab, setActiveTab] = useState<"reports" | "learn">("reports");
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  useEffect(() => {
    db.profiles.toArray().then(setProfiles);
  }, []);

  useEffect(() => {
    if (!household?.id) return;
    db.members.where("household_id").equals(household.id).toArray().then(setMembers);
  }, [household?.id]);

  const monthly = useMemo(() => groupByMonth(transactions), [transactions]);

  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + tx.amount, 0);
  const totalSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;

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

  const avgIncome = monthly.length > 0
    ? Math.round(monthly.reduce((s, [, v]) => s + v.income, 0) / monthly.length)
    : 0;
  const avgExpense = monthly.length > 0
    ? Math.round(monthly.reduce((s, [, v]) => s + v.expense, 0) / monthly.length)
    : 0;

  const memberBreakdown = useMemo(() => {
    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const map: Record<string, { profile: UserProfile | null; expense: number; income: number }> = {};
    for (const tx of transactions) {
      if (tx.type === "transfer") continue;
      const uid = tx.added_by;
      if (!map[uid]) map[uid] = { profile: profileMap[uid] ?? null, expense: 0, income: 0 };
      if (tx.type === "expense") map[uid].expense += tx.amount;
      else map[uid].income += tx.amount;
    }
    return Object.values(map).sort((a, b) => b.expense - a.expense);
  }, [transactions, profiles]);

  const assigneeBreakdown = useMemo(() => {
    const catMap: Record<string, string | null> = {};
    for (const c of categories) catMap[c.id] = c.assigned_to ?? null;

    const map: Record<string, { name: string; expense: number }> = {};
    for (const tx of transactions) {
      if (tx.type !== "expense") continue;
      const memberId = tx.category_id ? catMap[tx.category_id] : null;
      if (!memberId) continue;
      if (!map[memberId]) {
        const m = members.find((m) => m.id === memberId);
        map[memberId] = { name: m?.display_name ?? "Unknown", expense: 0 };
      }
      map[memberId].expense += tx.amount;
    }
    return Object.values(map).sort((a, b) => b.expense - a.expense);
  }, [transactions, categories, members]);

  const currentLesson = openLesson ? LESSONS.find((l) => l.id === openLesson) : null;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-xl">
            {activeTab === "reports" ? `📈 ${t("reportsTitle")}` : "🎓 Learning Center"}
          </h1>
          {activeTab === "reports" && (
            <SectionHelp title="Reports">
              <p>Reports show how your household has spent and saved over time, pulled from all recorded transactions.</p>
              <p><strong>Monthly trend</strong> — compares income vs. expenses over the last 6 months so you can spot patterns.</p>
              <p><strong>Top categories</strong> — shows where most of your money goes each month.</p>
              <p><strong>Savings rate</strong> — the percentage of your income you kept. A healthy target is 20% or more.</p>
            </SectionHelp>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          <button
            onClick={() => { setActiveTab("reports"); setOpenLesson(null); }}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
              activeTab === "reports"
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            📈 Reports
          </button>
          <button
            onClick={() => { setActiveTab("learn"); setOpenLesson(null); }}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
              activeTab === "learn"
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            🎓 Learn
          </button>
        </div>

        {/* ── REPORTS TAB ── */}
        {activeTab === "reports" && (
          <>
            {transactions.length === 0 || (totalIncome === 0 && totalExpense === 0) ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <span className="text-5xl">📈</span>
                <p className="font-semibold text-lg">{t("reportsTitle")}</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Add income and expense transactions to see your spending trends and reports
                </p>
              </div>
            ) : (
              <>
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

                {topCategories.length > 0 && (
                  <section>
                    <h2 className="font-semibold text-sm mb-3">{t("topCategories")}</h2>
                    <div className="bg-card border rounded-2xl overflow-hidden divide-y">
                      {topCategories.map((cat) => {
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
                                  style={{ width: `${pct}%`, backgroundColor: cat.color }}
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

                {paymentBreakdown.length > 0 && (
                  <section>
                    <h2 className="font-semibold text-sm mb-3">{t("paymentMethod")}</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentBreakdown.map(([method, amount]) => {
                        const cfg = PAYMENT_LABELS[method] ?? { label: method, icon: "💳", color: "bg-gray-100 text-gray-700" };
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

                {memberBreakdown.length > 1 && (
                  <section>
                    <h2 className="font-semibold text-sm mb-3">👥 Spending by Member</h2>
                    <div className="bg-card border rounded-2xl overflow-hidden divide-y">
                      {memberBreakdown.map((row, i) => {
                        const name = row.profile?.display_name ?? row.profile?.email ?? `Member ${i + 1}`;
                        const pct = totalExpense > 0 ? Math.round((row.expense / totalExpense) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-3">
                            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium truncate">{name}</p>
                                <p className="text-sm font-semibold text-red-500">{formatRWF(row.expense)}</p>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {assigneeBreakdown.length > 0 && (
                  <section className="bg-card rounded-2xl border overflow-hidden">
                    <div className="px-4 pt-4 pb-2">
                      <h2 className="font-semibold text-sm">📋 Spending by Responsibility</h2>
                    </div>
                    <div className="divide-y">
                      {assigneeBreakdown.map((row) => {
                        const pct = totalExpense > 0 ? Math.round((row.expense / totalExpense) * 100) : 0;
                        return (
                          <div key={row.name} className="flex items-center gap-3 px-4 py-3">
                            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {row.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium truncate">{row.name}</p>
                                <p className="text-sm font-semibold text-red-500">{formatRWF(row.expense)}</p>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

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
                          <div key={key} className="grid grid-cols-4 text-xs px-4 py-3 border-b last:border-b-0">
                            <span className="font-medium">{monthLabel(key, lang)}</span>
                            <span className="text-right text-green-600">{formatRWF(val.income)}</span>
                            <span className="text-right text-red-500">{formatRWF(val.expense)}</span>
                            <span className={cn("text-right font-semibold", sav >= 0 ? "text-green-600" : "text-red-500")}>
                              {formatRWF(Math.abs(sav))}{sav < 0 ? " -" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ── LEARN TAB ── */}
        {activeTab === "learn" && (
          <>
            {currentLesson ? (
              <LessonDetail lesson={currentLesson} onBack={() => setOpenLesson(null)} />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Grow your financial knowledge — from budgeting basics to building wealth.
                </p>

                {/* Levels */}
                {(["Beginner", "Intermediate", "Advanced"] as const).map((level) => {
                  const levelLessons = LESSONS.filter((l) => l.level === level);
                  return (
                    <section key={level} className="space-y-3">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{level}</h2>
                      {levelLessons.map((lesson) => (
                        <LessonCard key={lesson.id} lesson={lesson} onOpen={setOpenLesson} />
                      ))}
                    </section>
                  );
                })}

                {/* Tip of the day */}
                <section className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-2">💡 Tip of the Day</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    The best time to start saving was yesterday. The second best time is now. Even 5,000 RWF a week adds up to over 260,000 RWF a year — without investing a single franc.
                  </p>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
