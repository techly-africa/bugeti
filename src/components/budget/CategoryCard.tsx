"use client";
import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRWF, BUDGET_THRESHOLDS } from "@/lib/constants";
import { CategoryWithStats } from "@/lib/types";
import { useT } from "@/hooks/useT";
import { useLang } from "@/store";
import { cn } from "@/lib/utils";

const USSD_PAY = "tel:*182*1*1%23";

interface CategoryCardProps {
  category: CategoryWithStats;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const t = useT();
  const lang = useLang();
  const name = lang === "rw" && category.name_rw ? category.name_rw : category.name;

  const isOver = category.percentage > 100;
  const isWarning = category.percentage >= BUDGET_THRESHOLDS.WARNING && !isOver;
  const isDanger = category.percentage >= BUDGET_THRESHOLDS.DANGER && !isOver;

  const statusLabel = isOver
    ? t("overBudget")
    : isDanger
    ? t("nearLimit")
    : t("onTrack");

  const progressColor = isOver
    ? "bg-red-500"
    : isDanger
    ? "bg-amber-500"
    : isWarning
    ? "bg-yellow-400"
    : "bg-green-500";

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <Link
        href={`/budget/category/${category.id}`}
        className="block p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{category.icon}</span>
            <span className="font-semibold text-sm">{name}</span>
          </div>
          <Badge
            variant={isOver ? "destructive" : isWarning ? "outline" : "secondary"}
            className="text-xs"
          >
            {statusLabel}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
          <div
            className={cn("absolute left-0 top-0 h-full rounded-full transition-all", progressColor)}
            style={{ width: `${Math.min(category.percentage, 100)}%` }}
          />
        </div>

        {/* Amount info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">
              {formatRWF(category.spent)}
            </span>{" "}
            {t("spent")}
          </span>
          <span>
            {category.percentage}% {t("percentUsed")}
          </span>
          <span>
            {t("planned")}: {formatRWF(category.planned_amount)}
          </span>
        </div>
      </Link>

      {/* Pay button */}
      <div className="border-t px-4 py-2">
        <a
          href={USSD_PAY}
          className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
        >
          <PhoneCall size={12} />
          Pay via MTN MoMo (*182*1*1#)
        </a>
      </div>
    </div>
  );
}
