"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { db } from "@/db";
import { useHousehold } from "@/store";
import type { RecurringPayment } from "@/lib/types";

function isDueThisMonth(p: RecurringPayment): boolean {
  if (!p.active) return false;
  if (!p.last_paid_at) return true;
  const last = new Date(p.last_paid_at);
  const now = new Date();
  return last.getFullYear() < now.getFullYear() || last.getMonth() < now.getMonth();
}

export function RecurringReminder() {
  const household = useHousehold();
  const [due, setDue] = useState<RecurringPayment[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!household) return;
    db.recurring_payments
      .where("household_id")
      .equals(household.id)
      .toArray()
      .then((payments) => {
        const today = new Date().getDate();
        const pending = payments.filter(
          (p) => isDueThisMonth(p) && p.due_day <= today + 3
        );
        setDue(pending);
      });
  }, [household]);

  if (dismissed || due.length === 0) return null;

  const overdue = due.filter((p) => {
    const today = new Date().getDate();
    return p.due_day < today;
  });

  const isUrgent = overdue.length > 0;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isUrgent
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-amber-50 border-amber-200 text-amber-800"
      }`}
    >
      <Bell size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-snug">
          {overdue.length > 0
            ? `${overdue.length} bill${overdue.length > 1 ? "s" : ""} overdue`
            : `${due.length} bill${due.length > 1 ? "s" : ""} due soon`}
        </p>
        <p className="text-xs opacity-80 mt-0.5 truncate">
          {due
            .slice(0, 3)
            .map((p) => p.name)
            .join(", ")}
          {due.length > 3 ? ` +${due.length - 3} more` : ""}
        </p>
        <Link
          href="/recurring"
          className="text-xs font-semibold underline underline-offset-2 mt-1 inline-block"
        >
          View & mark as paid →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
