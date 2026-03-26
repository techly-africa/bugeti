"use client";
import { useState } from "react";
import { format } from "date-fns";
import { ImageIcon, ArrowRightLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatRWF } from "@/lib/constants";
import { Transaction, Category } from "@/lib/types";
import { useLang } from "@/store";
import { cn } from "@/lib/utils";
import { getReceiptSignedUrl } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
}

export function TransactionItem({ transaction, category }: TransactionItemProps) {
  const lang = useLang();
  const catName =
    lang === "rw" && category?.name_rw ? category.name_rw : category?.name ?? "—";

  const isExpense  = transaction.type === "expense";
  const isTransfer = transaction.type === "transfer";

  let amountColor: string;
  let amountPrefix: string;
  if (isTransfer)      { amountColor = "text-blue-500";  amountPrefix = "→"; }
  else if (isExpense)  { amountColor = "text-red-500";   amountPrefix = "-"; }
  else                 { amountColor = "text-green-600"; amountPrefix = "+"; }

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const handleReceiptClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!transaction.receipt_url) return;
    setReceiptOpen(true);
    if (!receiptUrl) {
      setReceiptLoading(true);
      const url = await getReceiptSignedUrl(transaction.receipt_url);
      setReceiptUrl(url);
      setReceiptLoading(false);
    }
  };

  return (
    <>
      <Link
        href={`/transactions/${transaction.id}/edit`}
        className="flex items-center gap-3 py-3 border-b last:border-0 hover:bg-muted/30 -mx-4 px-4 transition-colors"
      >
        {/* Category icon */}
        <div className={cn(
          "shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg",
          isTransfer ? "bg-blue-50" : "bg-muted"
        )}>
          {isTransfer
            ? <ArrowRightLeft size={16} className="text-blue-500" />
            : (category?.icon ?? "📦")}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {transaction.note || catName}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {isTransfer
              ? <span className="text-blue-500 font-medium">Transfer</span>
              : <span>{catName}</span>}
            <span>·</span>
            <span>{format(new Date(transaction.date), "d MMM")}</span>
            {transaction.receipt_url && (
              <>
                <span>·</span>
                <button
                  onClick={handleReceiptClick}
                  className="text-primary hover:text-primary/80 transition-colors"
                  title="View receipt"
                >
                  <ImageIcon size={10} />
                </button>
              </>
            )}
            {!transaction.synced && (
              <>
                <span>·</span>
                <span className="text-amber-500 font-medium">offline</span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <span className={cn("text-sm font-bold shrink-0", amountColor)}>
          {amountPrefix} {formatRWF(transaction.amount)}
        </span>
      </Link>

      {/* Receipt viewer */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receiptLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            </div>
          ) : receiptUrl ? (
            <img
              src={receiptUrl}
              alt="Receipt"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Could not load receipt. You may be offline.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
