"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import { PlusCircle, Users, X, ChevronDown, ChevronRight } from "lucide-react";
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
import { useIkiminas, useAppStore, useUser } from "@/store";
import { formatRWF, generateId } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Ikimina, IkiminaContribution, PaymentMethod } from "@/lib/types";
import { getIkiminaInsights } from "@/lib/ikimina-insights";

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: "mtn_momo",      label: "MTN MoMo",      icon: "📲" },
  { key: "airtel_money",  label: "Airtel Money",  icon: "📱" },
  { key: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
  { key: "cash",          label: "Cash",          icon: "💵" },
];

// ─── Ikimina card ─────────────────────────────────────────────────────────────
function IkiminaCard({
  ikimina,
  contributions,
  onAddContribution,
  onDelete,
}: {
  ikimina: Ikimina;
  contributions: IkiminaContribution[];
  onAddContribution: (c: IkiminaContribution) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [amount, setAmount] = useState(ikimina.contribution_amount.toString());
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");

  const myContributions = contributions.filter((c) => c.ikimina_id === ikimina.id);
  const totalCollected = myContributions.reduce((s, c) => s + c.amount, 0);
  const currentCycle = myContributions.length > 0
    ? Math.max(...myContributions.map((c) => c.cycle_number))
    : 0;
  const expectedTotal = ikimina.contribution_amount * ikimina.total_members;
  const progress = expectedTotal > 0 ? Math.min((totalCollected / expectedTotal) * 100, 100) : 0;

  const insights = getIkiminaInsights(ikimina, contributions);

  const statusColors: Record<Ikimina["status"], string> = {
    active:    "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    paused:    "bg-gray-100 text-gray-600",
  };
  const statusLabels: Record<Ikimina["status"], string> = {
    active:    t("ikiminaActive"),
    completed: t("ikiminaCompleted"),
    paused:    t("ikiminaPaused"),
  };

  function handleAddContribution() {
    if (!memberName || !amount) return;
    onAddContribution({
      id: generateId(),
      ikimina_id: ikimina.id,
      member_name: memberName,
      amount: parseInt(amount.replace(/\D/g, ""), 10),
      date: new Date().toISOString().split("T")[0],
      cycle_number: currentCycle + 1,
      payment_method: payMethod,
      created_at: new Date().toISOString(),
    });
    setMemberName("");
    setAmount(ikimina.contribution_amount.toString());
    setShowAdd(false);
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-base">{ikimina.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColors[ikimina.status])}>
                {statusLabels[ikimina.status]}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users size={11} />
                {ikimina.total_members} members
              </span>
              <span className="text-xs text-muted-foreground">
                {ikimina.cycle === "monthly" ? t("cycleMonthly") : t("cycleWeekly")}
              </span>
            </div>
          </div>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1"
          >
            <X size={14} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">{t("contributionAmount")}</p>
            <p className="font-bold text-sm">{formatRWF(ikimina.contribution_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("totalCollected")}</p>
            <p className="font-bold text-sm text-green-600">{formatRWF(totalCollected)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("cycleNumber")}</p>
            <p className="font-bold text-sm">{currentCycle}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Cycle {currentCycle} of {ikimina.total_members}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Smart insights panel */}
        {ikimina.status === "active" && (
          <div className="bg-muted/30 rounded-xl p-3 space-y-2">
            {/* Round header + pot size */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {t("ikiminaRound")} {insights.currentRound}
              </span>
              <span className="text-muted-foreground">
                {t("ikiminaTotalPot")}: <span className="font-semibold text-foreground">{formatRWF(insights.totalPot)}</span>
              </span>
            </div>

            {/* Paid this round vs expected */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    insights.isComplete ? "bg-green-500" : "bg-blue-400"
                  )}
                  style={{ width: `${insights.progressPercent}%` }}
                />
              </div>
              <span className={cn("font-medium shrink-0", insights.isComplete ? "text-green-600" : "text-foreground")}>
                {insights.paidCount}/{insights.expectedCount} {t("ikiminaPaidThisRound")}
              </span>
            </div>

            {/* Missing this round */}
            {insights.missingCount > 0 && (
              <p className="text-xs text-amber-600 font-medium">
                ⚠ {insights.missingCount} {t("ikiminaNotPaid")}
              </p>
            )}

            {/* Next payout date */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("ikiminaNextPayout")}: <span className="font-medium text-foreground">{new Date(insights.nextPayoutDate).toLocaleDateString("en-RW", { day: "numeric", month: "short" })}</span></span>
              {insights.nextRecipient && (
                <span>{t("ikiminaNextRecipient")}: <span className="font-medium text-foreground">{insights.nextRecipient}</span></span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown size={12} className="mr-1" /> : <ChevronRight size={12} className="mr-1" />}
            History ({myContributions.length})
          </Button>
          <Button size="sm" className="flex-1" onClick={() => setShowAdd(true)}>
            <PlusCircle size={12} className="mr-1" />
            {t("addContribution")}
          </Button>
        </div>
      </div>

      {/* Add contribution form */}
      {showAdd && (
        <div className="border-t p-4 bg-muted/20 space-y-3">
          <p className="font-semibold text-sm">{t("addContribution")}</p>
          <div className="space-y-1.5">
            <Label>{t("memberName")}</Label>
            <Input
              placeholder="e.g. Agathe"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <AmountInput
              value={parseInt(amount.replace(/\D/g, ""), 10) || 0}
              onChange={(v) => setAmount(String(v))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("paymentMethod")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.key}
                  onClick={() => setPayMethod(pm.key)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all",
                    payMethod === pm.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted hover:border-muted-foreground"
                  )}
                >
                  <span>{pm.icon}</span>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>
              {t("cancel")}
            </Button>
            <Button size="sm" className="flex-1" onClick={handleAddContribution} disabled={!memberName}>
              {t("save")}
            </Button>
          </div>
        </div>
      )}

      {/* Contribution history */}
      {expanded && myContributions.length > 0 && (
        <div className="border-t divide-y">
          {[...myContributions].reverse().map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{c.member_name}</p>
                <p className="text-xs text-muted-foreground">
                  Cycle {c.cycle_number} · {new Date(c.date).toLocaleDateString("en-RW")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">{formatRWF(c.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {PAYMENT_METHODS.find((p) => p.key === c.payment_method)?.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New Ikimina sheet ────────────────────────────────────────────────────────
function NewIkiminaSheet({ onSave }: { onSave: (ik: Ikimina) => void }) {
  const t = useT();
  const user = useUser();
  const household = useAppStore((s) => s.household);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [members, setMembers] = useState("10");
  const [amount, setAmount] = useState(0);
  const [cycle, setCycle] = useState<"monthly" | "weekly">("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  function handleSave() {
    if (!name || amount === 0) return;
    onSave({
      id: generateId(),
      household_id: household?.id ?? "",
      name,
      total_members: parseInt(members, 10) || 1,
      contribution_amount: amount,
      cycle,
      start_date: startDate,
      status: "active",
      created_by: user?.id ?? "",
      created_at: new Date().toISOString(),
    });
    setOpen(false);
    setName(""); setMembers("10"); setAmount(0); setCycle("monthly");
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
          <SheetTitle>{t("newIkimina")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-1">
          <div className="space-y-1.5">
            <Label>{t("ikiminaName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ikimina cy'Inzu"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("totalMembers")}</Label>
              <Input
                value={members}
                onChange={(e) => setMembers(e.target.value)}
                inputMode="numeric"
                placeholder="10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("contributionAmount")}</Label>
            <AmountInput value={amount} onChange={setAmount} placeholder="50,000" />
          </div>

          <div className="space-y-1.5">
            <Label>{t("cycle")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly", "weekly"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={cn(
                    "py-3 rounded-xl border-2 text-sm font-medium transition-all",
                    cycle === c
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted hover:border-muted-foreground"
                  )}
                >
                  {c === "monthly" ? t("cycleMonthly") : t("cycleWeekly")}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={!name || amount === 0}>
            {t("save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IkiminaPage() {
  const t = useT();
  const ikiminas = useIkiminas();
  const { upsertIkimina, removeIkimina, ikiminaContributions, addIkiminaContribution } =
    useAppStore();

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl flex items-center gap-2">
              🤝 {t("ikiminaTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("ikiminaSubtitle")}</p>
          </div>
          <NewIkiminaSheet onSave={upsertIkimina} />
        </div>

        {/* Summary stats */}
        {ikiminas.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Circles</p>
              <p className="font-bold text-lg">{ikiminas.length}</p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Active</p>
              <p className="font-bold text-lg text-green-600">
                {ikiminas.filter((i) => i.status === "active").length}
              </p>
            </div>
            <div className="bg-card border rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t("totalCollected")}</p>
              <p className="font-bold text-lg text-green-600">
                {formatRWF(
                  ikiminaContributions.reduce((s, c) => s + c.amount, 0)
                )}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {ikiminas.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 bg-muted/20 rounded-2xl text-center">
            <span className="text-5xl">🤝</span>
            <p className="font-semibold">{t("noData")}</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Track your group savings circles (Ikimina) — log contributions and monitor payouts
            </p>
            <NewIkiminaSheet onSave={upsertIkimina} />
          </div>
        )}

        {/* Ikimina cards */}
        {ikiminas.map((ik) => (
          <IkiminaCard
            key={ik.id}
            ikimina={ik}
            contributions={ikiminaContributions}
            onAddContribution={addIkiminaContribution}
            onDelete={() => removeIkimina(ik.id)}
          />
        ))}
      </div>

    </AppShell>
  );
}
