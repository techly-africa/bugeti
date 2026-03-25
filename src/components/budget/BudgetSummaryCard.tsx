"use client";
import { formatRWF, BUDGET_THRESHOLDS } from "@/lib/constants";
import { BudgetSummary } from "@/lib/types";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
  budgetName: string;
  period: string;
}

export function BudgetSummaryCard({
  summary,
  budgetName,
  period,
}: BudgetSummaryCardProps) {
  const t = useT();

  const isOver = summary.percentage_used > 100;
  const isDanger = summary.percentage_used >= BUDGET_THRESHOLDS.DANGER;
  const isWarning = summary.percentage_used >= BUDGET_THRESHOLDS.WARNING;

  const ringColor = isOver
    ? "text-red-500"
    : isDanger
    ? "text-amber-500"
    : isWarning
    ? "text-yellow-400"
    : "text-green-500";

  const trackColor = isOver
    ? "stroke-red-200"
    : isDanger
    ? "stroke-amber-200"
    : "stroke-green-200";

  const progressColor = isOver
    ? "stroke-red-500"
    : isDanger
    ? "stroke-amber-500"
    : isWarning
    ? "stroke-yellow-400"
    : "stroke-green-500";

  // SVG donut
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(summary.percentage_used, 100);
  const dashOffset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className="bg-card rounded-2xl border p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="font-bold text-lg leading-tight">{budgetName}</h2>
          <p className="text-xs text-muted-foreground capitalize">{period}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4">
        {/* Donut ring */}
        <div className="relative flex-shrink-0 w-32 h-32">
          <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              strokeWidth="12"
              className={trackColor}
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className={cn("transition-all duration-700", progressColor)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-black", ringColor)}>
              {summary.percentage_used}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              {t("percentUsed")}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <StatRow
            label={t("planned")}
            value={formatRWF(summary.total_planned)}
            className="text-muted-foreground"
          />
          <StatRow
            label={t("spent")}
            value={formatRWF(summary.total_spent)}
            className="text-foreground font-semibold"
          />
          <StatRow
            label={t("remaining")}
            value={formatRWF(Math.max(summary.total_remaining, 0))}
            className={
              summary.total_remaining < 0
                ? "text-red-500 font-bold"
                : "text-green-600 font-semibold"
            }
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}
