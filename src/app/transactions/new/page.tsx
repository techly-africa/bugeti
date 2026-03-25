"use client";

export const dynamic = "force-dynamic";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/layout/AppShell";
import { AmountInput } from "@/components/shared/AmountInput";
import { ReceiptUploader } from "@/components/transactions/ReceiptUploader";
import { useT } from "@/hooks/useT";
import {
  useActiveBudget,
  useAppStore,
  useCategories,
  useLang,
  useUser,
} from "@/store";
import { db } from "@/db";
import { generateId } from "@/lib/constants";
import { OcrResult, Transaction, TransactionType } from "@/lib/types";
import { suggestCategory, learnMapping } from "@/lib/categorizer";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewTransactionPage() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const user = useUser();
  const activeBudget = useActiveBudget();
  const categories = useCategories();
  const addTransaction = useAppStore((s) => s.addTransaction);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receipt, setReceipt] = useState<File | null>(null);
  const [ocrRaw, setOcrRaw] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [suggestedCatId, setSuggestedCatId] = useState<string | null>(null);

  // Suggest a category as the user types the note (debounced 400 ms)
  useEffect(() => {
    if (type !== "expense") { setSuggestedCatId(null); return; }
    const timer = setTimeout(() => {
      const suggestion = suggestCategory(note, categories);
      setSuggestedCatId(suggestion ? suggestion.id : null);
    }, 400);
    return () => clearTimeout(timer);
  }, [note, type, categories]);

  const handleOcrExtracted = useCallback(
    (result: OcrResult, file: File) => {
      if (result.amount) setAmount(result.amount);
      if (result.date) setDate(result.date);
      if (result.raw_text) setOcrRaw(result.raw_text);
      setReceipt(file);
      toast.success(t("scanComplete"));
    },
    [t]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeBudget) return;
    if (amount <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }
    if (!selectedCatId) {
      toast.error("Please select a category");
      return;
    }

    // Learn the note→category mapping for future suggestions
    if (note && selectedCatId) learnMapping(note, selectedCatId);

    setLoading(true);

    try {
      let receipt_url: string | undefined;

      // Upload receipt to Supabase storage if present and online
      if (receipt && navigator.onLine) {
        const path = `receipts/${user.id}/${generateId()}-${receipt.name}`;
        const { data: uploadData } = await supabase.storage
          .from("bugeti-receipts")
          .upload(path, receipt);
        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("bugeti-receipts")
            .getPublicUrl(uploadData.path);
          receipt_url = urlData.publicUrl;
        }
      }

      const tx: Transaction = {
        id: generateId(),
        category_id: selectedCatId,
        budget_id: activeBudget.id,
        household_id: activeBudget.household_id,
        added_by: user.id,
        type,
        amount,
        note,
        date,
        receipt_url,
        ocr_raw: ocrRaw || undefined,
        payment_method: "cash" as const,
        synced: navigator.onLine,
        created_at: new Date().toISOString(),
      };

      // Save to local DB
      await db.transactions.add(tx);

      // Update store
      addTransaction(tx);

      toast.success("Transaction added!");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </Button>
          <h1 className="font-bold text-xl">{t("newTransaction")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type toggle */}
          <Tabs
            value={type}
            onValueChange={(v) => setType(v as TransactionType)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="expense" className="flex-1">
                💸 {t("expense")}
              </TabsTrigger>
              <TabsTrigger value="income" className="flex-1">
                💵 {t("income")}
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex-1">
                🔄 {t("transfer")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>{t("amount")}</Label>
            <AmountInput
              value={amount}
              onChange={setAmount}
              className="w-full"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t("category")}</Label>
              {suggestedCatId && suggestedCatId !== selectedCatId && (
                <button
                  type="button"
                  onClick={() => setSelectedCatId(suggestedCatId)}
                  className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full"
                >
                  <span>✨</span>
                  {t("suggestedCategory")}: {categories.find((c) => c.id === suggestedCatId)?.icon}{" "}
                  {categories.find((c) => c.id === suggestedCatId)?.name}
                </button>
              )}
            </div>
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

          {/* Date */}
          <div className="space-y-1.5">
            <Label>{t("date")}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>{t("note")}</Label>
            <Textarea
              placeholder="What was this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Receipt upload */}
          <div className="space-y-1.5">
            <Label>{t("receipt")}</Label>
            <ReceiptUploader onExtracted={handleOcrExtracted} />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : null}
            {t("save")}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
