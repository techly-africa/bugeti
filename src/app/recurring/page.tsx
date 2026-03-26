"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusCircle, Check, Pencil, Trash2, Loader2, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AmountInput } from "@/components/shared/AmountInput";
import { db } from "@/db";
import { generateId, formatRWF } from "@/lib/constants";
import { useHousehold, useCategories, useActiveBudget, useUser, useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type { RecurringPayment, RecurringFrequency, PaymentMethod, Category } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  monthly:   "Monthly",
  weekly:    "Weekly",
  quarterly: "Quarterly",
  yearly:    "Yearly",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mtn_momo:      "MTN MoMo",
  airtel_money:  "Airtel Money",
  bank_transfer: "Bank Transfer",
  cash:          "Cash",
};

const PRESET_BILLS = [
  { name: "Garbage Collection", name_rw: "Imodoka ya Poubelle", icon: "🗑️", amount: 5000,  due_day: 1  },
  { name: "Security Fee",       name_rw: "Amafaranga ya Segirita", icon: "🔒", amount: 15000, due_day: 1  },
  { name: "Water Bill",         name_rw: "Amazi",               icon: "💧", amount: 8000,  due_day: 5  },
  { name: "Electricity",        name_rw: "Amashanyarazi",       icon: "⚡", amount: 20000, due_day: 5  },
  { name: "Internet / WiFi",    name_rw: "Internet",            icon: "📶", amount: 25000, due_day: 10 },
  { name: "School Fees",        name_rw: "Amafaranga y'ishuri", icon: "🏫", amount: 50000, due_day: 5  },
  { name: "Rent",               name_rw: "Ubukode",             icon: "🏠", amount: 100000,due_day: 1  },
  { name: "Phone Bill",         name_rw: "Telefoni",            icon: "📱", amount: 5000,  due_day: 15 },
  { name: "Church / Tithe",     name_rw: "Umusanzu w'Itorero",  icon: "🙏", amount: 10000, due_day: 7  },
  { name: "Umuganda",           name_rw: "Umuganda",            icon: "🤝", amount: 0,     due_day: 28 },
  { name: "Savings Club",       name_rw: "Ikimina",             icon: "💰", amount: 20000, due_day: 25 },
  { name: "Gym / Sport",        name_rw: "Siporo",              icon: "🏋️", amount: 10000, due_day: 1  },
];

/** True when the payment has NOT been paid in the current month (or ever). */
function isDueThisMonth(p: RecurringPayment): boolean {
  if (!p.active) return false;
  if (p.frequency !== "monthly") return true; // simplified; always show non-monthly
  if (!p.last_paid_at) return true;
  const paid = new Date(p.last_paid_at);
  const now  = new Date();
  return paid.getFullYear() !== now.getFullYear() || paid.getMonth() !== now.getMonth();
}

/** True when due_day has already passed this month and still unpaid. */
function isOverdue(p: RecurringPayment): boolean {
  if (!isDueThisMonth(p)) return false;
  return new Date().getDate() > p.due_day;
}

function daysUntilDue(p: RecurringPayment): number {
  return p.due_day - new Date().getDate();
}

// ─── Payment Card ─────────────────────────────────────────────────────────────

function PaymentCard({
  payment,
  categories,
  onMarkPaid,
  onEdit,
  onDelete,
}: {
  payment: RecurringPayment;
  categories: Category[];
  onMarkPaid: (id: string) => void;
  onEdit: (p: RecurringPayment) => void;
  onDelete: (id: string) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const due = isDueThisMonth(payment);
  const overdue = isOverdue(payment);
  const daysLeft = daysUntilDue(payment);
  const cat = categories.find((c) => c.id === payment.category_id);

  const handlePay = async () => {
    setPaying(true);
    await onMarkPaid(payment.id);
    setPaying(false);
  };

  return (
    <div className={cn(
      "bg-card rounded-2xl border overflow-hidden",
      overdue && "border-red-300",
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-2xl",
            overdue ? "bg-red-50" : due ? "bg-amber-50" : "bg-green-50"
          )}>
            {payment.icon}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm truncate">{payment.name}</p>
              <p className="font-bold text-sm shrink-0">{formatRWF(payment.amount)}</p>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span>{FREQ_LABELS[payment.frequency]}</span>
              {payment.frequency === "monthly" && (
                <>
                  <span>·</span>
                  <span>Due on {payment.due_day}{["st","nd","rd"][payment.due_day - 1] ?? "th"}</span>
                </>
              )}
              {cat && (
                <>
                  <span>·</span>
                  <span>{cat.icon} {cat.name}</span>
                </>
              )}
            </div>

            {/* Status pill */}
            <div className="mt-1.5">
              {!due ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <Check size={10} /> Paid {payment.last_paid_at ? format(new Date(payment.last_paid_at), "d MMM") : ""}
                </span>
              ) : overdue ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                  ⚠️ {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? "s" : ""} overdue
                </span>
              ) : daysLeft === 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  📅 Due today
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  📅 In {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {payment.notes && (
          <p className="text-xs text-muted-foreground mt-2 pl-14">{payment.notes}</p>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t flex items-center justify-between px-4 py-2 bg-muted/20">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(payment)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-muted"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {due ? (
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Mark as paid
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {PAYMENT_METHOD_LABELS[payment.payment_method]}
          </span>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {payment.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop tracking this bill. Past payments are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(payment.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Add / Edit Sheet ─────────────────────────────────────────────────────────

function PaymentSheet({
  open,
  onOpenChange,
  editing,
  categories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RecurringPayment | null;
  categories: Category[];
  onSave: () => void;
}) {
  const household = useHousehold();
  const [saving, setSaving] = useState(false);

  const [name, setName]         = useState("");
  const [nameRw, setNameRw]     = useState("");
  const [icon, setIcon]         = useState("💳");
  const [amount, setAmount]     = useState(0);
  const [frequency, setFreq]    = useState<RecurringFrequency>("monthly");
  const [dueDay, setDueDay]     = useState(1);
  const [catId, setCatId]       = useState("none");
  const [method, setMethod]     = useState<PaymentMethod>("cash");
  const [notes, setNotes]       = useState("");
  const [showPresets, setShowPresets] = useState(!editing);

  // Populate fields when editing
  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setNameRw(editing.name_rw ?? "");
      setIcon(editing.icon);
      setAmount(editing.amount);
      setFreq(editing.frequency);
      setDueDay(editing.due_day);
      setCatId(editing.category_id ?? "none");
      setMethod(editing.payment_method);
      setNotes(editing.notes ?? "");
      setShowPresets(false);
    } else {
      setName(""); setNameRw(""); setIcon("💳"); setAmount(0);
      setFreq("monthly"); setDueDay(1); setCatId("none");
      setMethod("cash"); setNotes("");
      setShowPresets(true);
    }
  }, [editing, open]);

  const applyPreset = (p: typeof PRESET_BILLS[0]) => {
    setName(p.name);
    setNameRw(p.name_rw);
    setIcon(p.icon);
    setAmount(p.amount);
    setDueDay(p.due_day);
    setShowPresets(false);
  };

  const handleSave = async () => {
    if (!household || !name.trim()) { toast.error("Enter a name."); return; }
    if (amount <= 0 && frequency !== "monthly") { toast.error("Enter an amount."); return; }
    setSaving(true);
    try {
      const record: RecurringPayment = {
        id: editing?.id ?? generateId(),
        household_id: household.id,
        name: name.trim(),
        name_rw: nameRw.trim() || undefined,
        amount,
        frequency,
        due_day: dueDay,
        icon,
        category_id: catId !== "none" ? catId : undefined,
        payment_method: method,
        notes: notes.trim() || undefined,
        active: true,
        last_paid_at: editing?.last_paid_at,
        created_at: editing?.created_at ?? new Date().toISOString(),
      };
      await db.recurring_payments.put(record);
      toast.success(editing ? "Bill updated." : "Bill added!");
      onOpenChange(false);
      onSave();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[95vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{editing ? "Edit Bill" : "Add Recurring Bill"}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Quick presets */}
          {showPresets && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick add</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_BILLS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-muted hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-[10px] font-medium leading-tight">{p.name.split(" / ")[0]}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPresets(false)}
                className="text-xs text-primary font-medium w-full text-center py-1"
              >
                Or enter custom bill <ChevronRight size={11} className="inline" />
              </button>
            </div>
          )}

          {!showPresets && (
            <>
              {/* Icon + Name */}
              <div className="flex gap-2">
                <div className="space-y-1.5 w-20">
                  <Label className="text-xs">Icon</Label>
                  <Input
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    maxLength={2}
                    className="text-center text-xl h-10"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="Garbage Collection"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* Kinyarwanda name */}
              <div className="space-y-1.5">
                <Label className="text-xs">Kinyarwanda name <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  placeholder="Imodoka ya Poubelle"
                  value={nameRw}
                  onChange={(e) => setNameRw(e.target.value)}
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (RWF)</Label>
                <AmountInput value={amount} onChange={setAmount} className="w-full" />
              </div>

              {/* Frequency + Due day */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFreq(v as RecurringFrequency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(FREQ_LABELS) as [RecurringFrequency, string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {frequency !== "weekly" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Due on day</Label>
                    <Select value={String(dueDay)} onValueChange={(v) => setDueDay(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>{d}{["st","nd","rd"][d-1] ?? "th"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Category link */}
              {categories.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Budget category <span className="text-muted-foreground">(optional)</span></Label>
                  <Select value={catId} onValueChange={setCatId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.filter((c) => !c.parent_id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label className="text-xs">Usually paid via</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setMethod(v)}
                      className={cn(
                        "text-xs font-medium py-2 px-3 rounded-xl border-2 transition-all text-left",
                        method === v ? "border-primary bg-primary/5 text-primary" : "border-muted text-muted-foreground"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs">Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  placeholder="Account number, who to pay, extra info…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button className="w-full h-11 font-semibold" disabled={saving} onClick={handleSave}>
                {saving && <Loader2 size={14} className="animate-spin mr-1.5" />}
                {editing ? "Save changes" : "Add bill"}
              </Button>

              {!editing && (
                <button
                  onClick={() => setShowPresets(true)}
                  className="text-xs text-muted-foreground w-full text-center"
                >
                  ← Back to quick add
                </button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const household = useHousehold();
  const user = useUser();
  const categories = useCategories();
  const activeBudget = useActiveBudget();
  const { addTransaction } = useAppStore();

  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPayment | null>(null);

  const load = useCallback(async () => {
    if (!household) return;
    const rows = await db.recurring_payments
      .where("household_id").equals(household.id)
      .toArray();
    setPayments(rows.filter((p) => p.active));
  }, [household]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (id: string) => {
    const payment = payments.find((p) => p.id === id);
    if (!payment || !user || !activeBudget) return;

    const today = new Date().toISOString().split("T")[0];
    await db.recurring_payments.update(id, { last_paid_at: today });

    // Log a transaction in the linked category if available
    if (payment.category_id && payment.amount > 0) {
      const tx = {
        id: generateId(),
        category_id: payment.category_id,
        budget_id: activeBudget.id,
        household_id: household!.id,
        added_by: user.id,
        type: "expense" as const,
        amount: payment.amount,
        note: payment.name,
        date: today,
        payment_method: payment.payment_method,
        synced: false,
        created_at: new Date().toISOString(),
      };
      await db.transactions.add(tx);
      addTransaction(tx);
    }

    toast.success(`${payment.icon} ${payment.name} marked as paid!`);
    load();
  };

  const handleDelete = async (id: string) => {
    await db.recurring_payments.update(id, { active: false });
    load();
    toast.success("Bill removed.");
  };

  const openEdit = (p: RecurringPayment) => {
    setEditing(p);
    setSheetOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  // Group payments
  const overdue  = payments.filter(isOverdue);
  const dueSoon  = payments.filter((p) => isDueThisMonth(p) && !isOverdue(p));
  const paidThisMonth = payments.filter((p) => !isDueThisMonth(p));

  const totalDue = [...overdue, ...dueSoon].reduce((s, p) => s + p.amount, 0);
  const totalPaid = paidThisMonth.reduce((s, p) => s + p.amount, 0);

  const groups = [
    { label: "⚠️ Overdue",       items: overdue,       cls: "text-red-700" },
    { label: "📅 Due this month", items: dueSoon,       cls: "text-amber-700" },
    { label: "✅ Paid this month",items: paidThisMonth, cls: "text-green-700" },
  ].filter((g) => g.items.length > 0);

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-2xl">Bills & Payments</h1>
            <p className="text-sm text-muted-foreground">
              {payments.length === 0
                ? "Track your recurring bills"
                : `${payments.length} bill${payments.length !== 1 ? "s" : ""} tracked`}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openAdd}>
            <PlusCircle size={14} /> Add bill
          </Button>
        </div>

        {/* Summary */}
        {payments.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className={cn(
              "rounded-2xl border p-4 text-center",
              overdue.length > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
            )}>
              <p className="text-xs text-muted-foreground mb-1">Still due</p>
              <p className={cn("font-bold text-lg", overdue.length > 0 ? "text-red-700" : "text-amber-700")}>
                {formatRWF(totalDue)}
              </p>
              <p className="text-xs text-muted-foreground">{overdue.length + dueSoon.length} bill{overdue.length + dueSoon.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Paid this month</p>
              <p className="font-bold text-lg text-green-700">{formatRWF(totalPaid)}</p>
              <p className="text-xs text-muted-foreground">{paidThisMonth.length} bill{paidThisMonth.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {payments.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="text-6xl">🧾</span>
            <div>
              <p className="font-bold text-lg">No bills tracked yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                Add your recurring bills — garbage collection, security, water, electricity — and get reminded at end of month.
              </p>
            </div>
            <Button onClick={openAdd} className="gap-1.5">
              <PlusCircle size={14} /> Add first bill
            </Button>
          </div>
        )}

        {/* Groups */}
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className={cn("font-semibold text-sm mb-3", group.cls)}>{group.label}</h2>
            <div className="space-y-3">
              {group.items.map((p) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  categories={categories}
                  onMarkPaid={handleMarkPaid}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Add / Edit Sheet */}
      <PaymentSheet
        open={sheetOpen}
        onOpenChange={(v) => { setSheetOpen(v); if (!v) setEditing(null); }}
        editing={editing}
        categories={categories}
        onSave={load}
      />
    </AppShell>
  );
}
