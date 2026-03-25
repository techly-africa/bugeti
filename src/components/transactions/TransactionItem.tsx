"use client";
import { format } from "date-fns";
import { ImageIcon, ArrowRightLeft } from "lucide-react";
import { formatRWF } from "@/lib/constants";
import { Transaction, Category } from "@/lib/types";
import { useLang } from "@/store";
import { cn } from "@/lib/utils";

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

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
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
              <ImageIcon size={10} />
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
    </div>
  );
}
