"use client";

export const dynamic = "force-dynamic";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/layout/AppShell";
import { AmountInput } from "@/components/shared/AmountInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useT } from "@/hooks/useT";
import { useAppStore, useCategories, useLang, useUser } from "@/store";
import { db } from "@/db";
import { PaymentMethod, Transaction, TransactionType } from "@/lib/types";
import { learnMapping } from "@/lib/categorizer";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EditTransactionPage() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const user = useUser();
  const categories = useCategories();
  const { addTransaction, removeTransaction } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  // Load existing transaction
  useEffect(() => {
    db.transactions.get(id).then((tx) => {
      if (!tx) { setNotFound(true); return; }
      setType(tx.type);
      setAmount(tx.amount);
      setSelectedCatId(tx.category_id);
      setNote(tx.note ?? "");
      setDate(tx.date);
      setPaymentMethod(tx.payment_method);
    });
  }, [id]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    if (amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    if (!selectedCatId) { toast.error("Please select a category"); return; }

    if (note && selectedCatId) learnMapping(note, selectedCatId);
    setLoading(true);

    try {
      const updates: Partial<Transaction> = {
        type,
        amount,
        category_id: selectedCatId,
        note,
        date,
        payment_method: paymentMethod,
        synced: navigator.onLine && isSupabaseConfigured(),
        updated_at: new Date().toISOString(),
      };

      await db.transactions.update(id, updates);

      if (navigator.onLine && isSupabaseConfigured()) {
        await supabase.from("transactions").update(updates).eq("id", id);
      }

      const updated = await db.transactions.get(id);
      if (updated) {
        removeTransaction(id);
        addTransaction(updated);
      }

      toast.success("Transaction updated.");
      router.back();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, type, amount, selectedCatId, note, date, paymentMethod, user, router, addTransaction, removeTransaction]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await db.transactions.delete(id);
      if (navigator.onLine && isSupabaseConfigured()) {
        await supabase.from("transactions").delete().eq("id", id);
      }
      removeTransaction(id);
      toast.success("Transaction deleted.");
      router.back();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  if (notFound) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-4xl">🔍</p>
          <p className="text-muted-foreground text-sm">Transaction not found</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>Go back</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft size={20} />
            </Button>
            <h1 className="font-bold text-xl">Edit Transaction</h1>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={deleting}>
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={18} />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. The transaction will be permanently removed from your budget.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">💸 {t("expense")}</TabsTrigger>
              <TabsTrigger value="income"  className="flex-1">💵 {t("income")}</TabsTrigger>
              <TabsTrigger value="transfer" className="flex-1">🔄 {t("transfer")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <AmountInput value={amount} onChange={setAmount} className="w-full" />
          </div>

          <div className="space-y-1.5">
            <Label>{t("category")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const name = lang === "rw" && cat.name_rw ? cat.name_rw : cat.name;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCatId(cat.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all",
                      selectedCatId === cat.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted text-muted-foreground"
                    )}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="truncate w-full text-center">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("note")}</Label>
            <Textarea
              placeholder="What was this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("paymentMethod")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "mtn_momo",      label: "MTN MoMo",      icon: "📲" },
                  { key: "airtel_money",  label: "Airtel Money",  icon: "📱" },
                  { key: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
                  { key: "cash",          label: "Cash",          icon: "💵" },
                ] as { key: PaymentMethod; label: string; icon: string }[]
              ).map((pm) => (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => setPaymentMethod(pm.key)}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all",
                    paymentMethod === pm.key
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

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
            Save changes
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
