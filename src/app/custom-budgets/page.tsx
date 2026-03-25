"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { PlusCircle, Calendar, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
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
import { AmountInput } from "@/components/shared/AmountInput";
import { useT } from "@/hooks/useT";
import { useCustomBudgets, useAppStore, useUser } from "@/store";
import { formatRWF, generateId } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Budget, BudgetType, BudgetStatus } from "@/lib/types";

// ─── Budget type config ───────────────────────────────────────────────────────
const BUDGET_TYPE_CONFIG: Record<
  Exclude<BudgetType, "monthly">,
  { icon: string; color: string }
> = {
  travel:      { icon: "✈️", color: "bg-blue-50 border-blue-200 text-blue-800" },
  vacation:    { icon: "🏖️", color: "bg-cyan-50 border-cyan-200 text-cyan-800" },
  event:       { icon: "🎉", color: "bg-pink-50 border-pink-200 text-pink-800" },
  project:     { icon: "🏗️", color: "bg-amber-50 border-amber-200 text-amber-800" },
  school_year: { icon: "📚", color: "bg-purple-50 border-purple-200 text-purple-800" },
};

const STATUS_CONFIG: Record<BudgetStatus, { label: string; color: string }> = {
  planning: { label: "Planning", color: "bg-gray-100 text-gray-600" },
  active:   { label: "Active",   color: "bg-green-100 text-green-700" },
  closed:   { label: "Closed",   color: "bg-slate-100 text-slate-500" },
};

// ─── Card ─────────────────────────────────────────────────────────────────────
function CustomBudgetCard({
  budget,
  onDelete,
}: {
  budget: Budget;
  onDelete: () => void;
}) {
  const cfg =
    budget.budget_type !== "monthly"
      ? BUDGET_TYPE_CONFIG[budget.budget_type as Exclude<BudgetType, "monthly">]
      : { icon: "📊", color: "bg-gray-50 border-gray-200 text-gray-700" };

  const statusCfg = STATUS_CONFIG[budget.status];

  return (
    <div className={cn("rounded-2xl border p-4 space-y-3", cfg.color)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.icon}</span>
          <div>
            <p className="font-semibold text-base">{budget.name}</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar size={12} />
          <span>
            {new Date(budget.start_date).toLocaleDateString("en-RW", {
              month: "short",
              day: "numeric",
            })}
            {" → "}
            {new Date(budget.end_date).toLocaleDateString("en-RW", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {budget.total_envelope && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Envelope</span>
          <span className="font-bold">{formatRWF(budget.total_envelope)}</span>
        </div>
      )}
    </div>
  );
}

// ─── New budget sheet ─────────────────────────────────────────────────────────
function NewBudgetSheet({ onSave }: { onSave: (b: Omit<Budget, "id" | "created_at">) => void }) {
  const t = useT();
  const user = useUser();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Exclude<BudgetType, "monthly">>("travel");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [envelope, setEnvelope] = useState(0);

  const TYPES: { key: Exclude<BudgetType, "monthly">; label: string; icon: string }[] = [
    { key: "travel",      label: "Travel",      icon: "✈️" },
    { key: "vacation",    label: "Vacation",    icon: "🏖️" },
    { key: "event",       label: "Event",       icon: "🎉" },
    { key: "project",     label: "Project",     icon: "🏗️" },
    { key: "school_year", label: "School Year", icon: "📚" },
  ];

  function handleSave() {
    if (!name || !startDate || !endDate) return;
    onSave({
      household_id: "",
      name,
      period: "monthly",
      budget_type: type,
      account_type: "common",
      status: "planning",
      start_date: startDate,
      end_date: endDate,
      total_envelope: envelope > 0 ? envelope : undefined,
      currency: "RWF",
      created_by: user?.id ?? "",
    });
    setOpen(false);
    setName(""); setStartDate(""); setEndDate(""); setEnvelope(0);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <PlusCircle size={14} className="mr-1" />
          {t("add")}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>{t("newBudget")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-1">
          {/* Budget type picker */}
          <div className="space-y-2">
            <Label>{t("budgetType")}</Label>
            <div className="grid grid-cols-5 gap-2">
              {TYPES.map((bt) => (
                <button
                  key={bt.key}
                  onClick={() => setType(bt.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all",
                    type === bt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted hover:border-muted-foreground"
                  )}
                >
                  <span className="text-xl">{bt.icon}</span>
                  <span className="text-center leading-tight text-[10px]">{bt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("budgetName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kampala Trip — April 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("startDate")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("endDate")}</Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              {t("totalEnvelope")}{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <AmountInput value={envelope} onChange={setEnvelope} placeholder="500,000" />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={!name || !startDate || !endDate}>
            {t("save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomBudgetsPage() {
  const t = useT();
  const customBudgets = useCustomBudgets();
  const { upsertCustomBudget, removeCustomBudget } = useAppStore();

  const activeBudgets  = customBudgets.filter((b) => b.status === "active");
  const planningBudgets = customBudgets.filter((b) => b.status === "planning");
  const closedBudgets  = customBudgets.filter((b) => b.status === "closed");

  function handleSave(data: Omit<Budget, "id" | "created_at">) {
    upsertCustomBudget({ ...data, id: generateId(), created_at: new Date().toISOString() });
  }

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl">{t("customBudgets")}</h1>
            <p className="text-sm text-muted-foreground">Travel, events, projects</p>
          </div>
          <NewBudgetSheet onSave={handleSave} />
        </div>

        {customBudgets.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 bg-muted/20 rounded-2xl text-center">
            <span className="text-5xl">🗂️</span>
            <p className="font-semibold">{t("noData")}</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create budgets for travel, vacations, events, or projects
            </p>
            <NewBudgetSheet onSave={handleSave} />
          </div>
        )}

        {activeBudgets.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active</h2>
            {activeBudgets.map((b) => (
              <CustomBudgetCard key={b.id} budget={b} onDelete={() => removeCustomBudget(b.id)} />
            ))}
          </section>
        )}

        {planningBudgets.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Planning</h2>
            {planningBudgets.map((b) => (
              <CustomBudgetCard key={b.id} budget={b} onDelete={() => removeCustomBudget(b.id)} />
            ))}
          </section>
        )}

        {closedBudgets.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Closed</h2>
            {closedBudgets.map((b) => (
              <CustomBudgetCard key={b.id} budget={b} onDelete={() => removeCustomBudget(b.id)} />
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
