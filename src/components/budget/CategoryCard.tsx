"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRWF, BUDGET_THRESHOLDS } from "@/lib/constants";
import { CategoryWithStats } from "@/lib/types";
import { useT } from "@/hooks/useT";
import { useBudgetStats } from "@/hooks/useBudgetStats";
import { useLang, useAppStore, useCategories, useActiveBudget } from "@/store";
import { db } from "@/db";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getCategoryCoachTip } from "@/lib/coach";

const USSD_PAY = "tel:*182*1*1%23";

interface CategoryCardProps {
  category: CategoryWithStats;
  assigneeName?: string;
}

export function CategoryCard({ category, assigneeName }: CategoryCardProps) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const categories = useCategories();
  const activeBudget = useActiveBudget();
  const { setCategories } = useAppStore();

  const [deleting, setDeleting] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const stats = useBudgetStats();

  const coachTip = useMemo(() => {
    if (!activeBudget) return null;
    const start = new Date(activeBudget.start_date + "T12:00:00");
    const end   = new Date(activeBudget.end_date   + "T12:00:00");
    const now   = new Date();
    const totalDays   = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    const daysElapsed = Math.max(1, Math.round((now.getTime() - start.getTime()) / 86_400_000));
    return getCategoryCoachTip(category, {
      totalRevenue: stats.total_revenue,
      daysElapsed,
      totalDays,
    });
  }, [category, activeBudget, stats.total_revenue]);

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

  const handleDelete = async () => {
    const hasChildren = categories.some((c) => c.parent_id === category.id);
    if (hasChildren) {
      toast.error("Remove sub-categories first before deleting.");
      return;
    }

    setDeleting(true);
    try {
      await db.categories.delete(category.id);

      if (activeBudget) {
        const updated = await db.categories
          .where("budget_id")
          .equals(activeBudget.id)
          .sortBy("sort_order");
        setCategories(updated);
      }

      if (navigator.onLine && isSupabaseConfigured()) {
        try {
          await supabase.from("categories").delete().eq("id", category.id);
        } catch (syncErr) {
          console.warn("[CategoryCard] Cloud sync failed:", syncErr);
        }
      }

      toast.success("Category deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete.");
    } finally {
      // If deleted successfully, the card unmounts anyway.
      if (!navigator.onLine) setDeleting(false); 
    }
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden relative">
      <div
        onClick={() => router.push(`/budget/category/${category.id}`)}
        className="block p-4 hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 pr-8">
            <span className="text-xl">{category.icon}</span>
            <span className="font-semibold text-sm truncate">{name}</span>
            {coachTip && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowTip((v) => !v); }}
                className="shrink-0 text-base leading-none hover:scale-110 transition-transform"
                title="Financial coach tip"
              >
                🧑‍💼
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {assigneeName && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                👤 {assigneeName}
              </span>
            )}
            <Badge
              variant={isOver ? "destructive" : isWarning ? "outline" : "secondary"}
              className="text-xs"
            >
              {statusLabel}
            </Badge>
          </div>
        </div>

        {/* Dropdown Menu (absolute positioned to avoid stealing clicks from the card body gracefully) */}
        <div className="absolute top-3 right-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors outline-none disabled:opacity-50" disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => router.push(`/budget/category/${category.id}/edit`)}>
                <Pencil size={14} className="mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      </div>

      {/* Coach tip panel */}
      {coachTip && showTip && (
        <div className="border-t bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-xl shrink-0 mt-0.5">🧑‍💼</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-amber-900 mb-0.5">{coachTip.headline}</p>
              <p className="text-xs text-amber-800 leading-snug">{coachTip.detail}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowTip(false); }}
              className="text-amber-600 hover:text-amber-900 text-xs shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {category.icon} {category.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This category and its budget allocation will be permanently removed. Transactions linked to it will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
