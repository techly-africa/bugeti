"use client";

export const dynamic = "force-dynamic";
import { useState } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/layout/AppShell";
import { TransactionItem } from "@/components/transactions/TransactionItem";
import { useT } from "@/hooks/useT";
import { useCategories, useTransactions } from "@/store";

export default function TransactionsPage() {
  const t = useT();
  const transactions = useTransactions();
  const categories = useCategories();
  const [search, setSearch] = useState("");

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const filtered = transactions.filter((tx) => {
    const cat = catMap[tx.category_id];
    const term = search.toLowerCase();
    return (
      tx.note.toLowerCase().includes(term) ||
      cat?.name.toLowerCase().includes(term) ||
      cat?.name_rw?.toLowerCase().includes(term) ||
      tx.amount.toString().includes(term)
    );
  });

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl">{t("transactions")}</h1>
          <Button asChild size="sm">
            <Link href="/transactions/new">
              <PlusCircle size={14} className="mr-1" />
              {t("add")}
            </Link>
          </Button>
        </div>

        <Input
          placeholder={`${t("search")} transactions…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <span className="text-5xl">🧾</span>
            <p className="text-muted-foreground text-sm">
              {t("noTransactions")}
            </p>
            <Button asChild>
              <Link href="/transactions/new">{t("addExpense")}</Link>
            </Button>
          </div>
        ) : (
          <div className="bg-card rounded-xl border px-4">
            {filtered.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                category={catMap[tx.category_id]}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
