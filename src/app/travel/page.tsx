"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle, MapPin, Calendar, Wallet, ChevronRight,
  Trash2, Target, LayoutList, Grid3X3, ChevronLeft, Bell, BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AmountInput } from "@/components/shared/AmountInput";
import { db } from "@/db";
import { formatRWF, generateId } from "@/lib/constants";
import { useAppStore, useTrips, useUser, useHousehold } from "@/store";
import { cn } from "@/lib/utils";
import { SectionHelp } from "@/components/shared/SectionHelp";
import { EVENT_TYPE_CONFIG } from "@/lib/travel-config";
import type { Budget, EventType, Trip, TripStatus } from "@/lib/types";

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string }> = {
  planning:  { label: "Planning",   color: "bg-amber-100 text-amber-800 border-amber-200" },
  upcoming:  { label: "Upcoming",   color: "bg-blue-100 text-blue-800 border-blue-200" },
  active:    { label: "On the way", color: "bg-green-100 text-green-800 border-green-200" },
  completed: { label: "Completed",  color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const REMINDER_OPTIONS = [
  { value: 0,  label: "Day of" },
  { value: 1,  label: "1 day before" },
  { value: 3,  label: "3 days before" },
  { value: 7,  label: "1 week before" },
  { value: 14, label: "2 weeks before" },
];

// ─── Notification helpers ─────────────────────────────────────────────────────

async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function showLocalNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/icon-192.png" });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function eventDuration(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1);
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ trips }: { trips: Trip[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map ISO date → trips starting that day
  const tripsByDate = trips.reduce<Record<string, Trip[]>>((acc, t) => {
    const d = t.start_date.slice(0, 10);
    (acc[d] ??= []).push(t);
    return acc;
  }, {});

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));

  const monthLabel = cursor.toLocaleString("en-RW", { month: "long", year: "numeric" });

  const todayStr = today.toISOString().slice(0, 10);
  const selectedTrips = selected ? (tripsByDate[selected] ?? []) : [];

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft size={16} />
        </button>
        <p className="font-semibold text-sm">{monthLabel}</p>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <span key={d} className="text-[10px] font-medium text-muted-foreground py-1">{d}</span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {/* Blank cells before month start */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTrips = tripsByDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = selected === dateStr;

          return (
            <button
              key={day}
              onClick={() => setSelected(isSelected ? null : dateStr)}
              className={cn(
                "flex flex-col items-center py-1.5 rounded-lg transition-all text-sm",
                isToday && !isSelected && "font-bold text-primary",
                isSelected && "bg-primary text-primary-foreground",
                !isToday && !isSelected && "text-foreground hover:bg-muted"
              )}
            >
              <span className={cn("w-7 h-7 flex items-center justify-center rounded-full text-xs",
                isToday && !isSelected && "bg-primary/10"
              )}>
                {day}
              </span>
              {dayTrips.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayTrips.slice(0, 3).map((t, idx) => (
                    <span key={idx} className="text-[8px] leading-none">
                      {EVENT_TYPE_CONFIG[t.event_type ?? "travel"].emoji}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selected && selectedTrips.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {new Date(selected + "T00:00:00").toLocaleDateString("en-RW", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {selectedTrips.map((t) => (
            <Link
              key={t.id}
              href={`/travel/${t.id}`}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-lg">{t.cover_emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.destination}</p>
              </div>
              <ChevronRight size={14} className="shrink-0 text-muted-foreground ml-auto" />
            </Link>
          ))}
        </div>
      )}
      {selected && selectedTrips.length === 0 && (
        <p className="border-t pt-3 text-xs text-muted-foreground text-center">
          No events on this day
        </p>
      )}
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  trip, savingsGoal, onDelete,
}: {
  trip: Trip;
  savingsGoal?: Budget;
  onDelete: (id: string) => void;
}) {
  const days  = eventDuration(trip.start_date, trip.end_date);
  const until = daysUntil(trip.start_date);
  const statusCfg = STATUS_CONFIG[trip.status];
  const evtCfg    = EVENT_TYPE_CONFIG[trip.event_type ?? "travel"];

  const [savedAmount, setSavedAmount] = useState(0);
  useEffect(() => {
    if (!savingsGoal) return;
    db.transactions.where("budget_id").equals(savingsGoal.id).toArray().then((txs) => {
      const dep = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const wdw = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      setSavedAmount(dep - wdw);
    });
  }, [savingsGoal]);

  const savingsPct = savingsGoal?.total_envelope
    ? Math.min((savedAmount / savingsGoal.total_envelope) * 100, 100)
    : 0;

  const hasReminder = trip.reminder_days_before !== undefined && trip.reminder_days_before !== null;

  return (
    <div className="bg-card rounded-2xl border overflow-hidden">
      <Link href={`/travel/${trip.id}`} className="block p-4 hover:bg-muted/20 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{trip.cover_emoji}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-base leading-tight">{trip.name}</p>
                {hasReminder && <Bell size={11} className="text-primary shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={9} /> {trip.destination}
                </span>
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {evtCfg.emoji} {evtCfg.label}
                </span>
              </div>
            </div>
          </div>
          <span className={cn("shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border", statusCfg.color)}>
            {statusCfg.label}
          </span>
        </div>

        {/* Date row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            <span>
              {new Date(trip.start_date).toLocaleDateString("en-RW", { month: "short", day: "numeric" })}
              {days > 1 && ` – ${new Date(trip.end_date).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" })}`}
            </span>
          </div>
          {days > 1 && <span className="font-medium text-foreground">{days}d</span>}
        </div>

        {/* Savings progress */}
        {savingsGoal && savingsGoal.total_envelope && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Target size={10} /> Saved
              </span>
              <span className="font-semibold">
                {formatRWF(savedAmount)} <span className="text-muted-foreground font-normal">of {formatRWF(savingsGoal.total_envelope)}</span>
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${savingsPct}%` }} />
            </div>
          </div>
        )}

        {/* Countdown */}
        {trip.status !== "completed" && until > 0 && (
          <p className="text-xs text-primary font-medium mt-2">
            {until === 1 ? "Tomorrow!" : `${until} days away`}
          </p>
        )}
      </Link>

      {/* Footer */}
      <div className="border-t flex items-center justify-between px-4 py-2">
        <Link href={`/travel/${trip.id}`} className="flex items-center gap-1 text-xs text-primary font-medium">
          View plan <ChevronRight size={12} />
        </Link>
        <button
          onClick={() => onDelete(trip.id)}
          className="text-muted-foreground hover:text-destructive transition-colors p-1.5"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── New Event Sheet ──────────────────────────────────────────────────────────

function NewEventSheet() {
  const user      = useUser();
  const household = useHousehold();
  const upsertTrip = useAppStore((s) => s.upsertTrip);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [eventType, setEventType]   = useState<EventType>("travel");
  const [name, setName]             = useState("");
  const [destination, setDest]      = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [status, setStatus]         = useState<TripStatus>("planning");
  const [coverEmoji, setCoverEmoji] = useState("✈️");
  const [notes, setNotes]           = useState("");
  const [envelope, setEnvelope]     = useState(0);
  const [giftBudget, setGiftBudget] = useState(0);
  const [savingsGoals, setSavingsGoals]   = useState<Budget[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState("none");
  const [reminderDays, setReminderDays] = useState<number | null>(null);
  const [notifGranted, setNotifGranted] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  useEffect(() => {
    if (!open || !household) return;
    db.budgets
      .filter((b) => b.account_type === "savings" && b.household_id === household.id && b.status === "active")
      .toArray()
      .then(setSavingsGoals);
  }, [open, household]);

  const evtCfg = EVENT_TYPE_CONFIG[eventType];
  const showGiftBudget = eventType === "wedding" || eventType === "birthday" || eventType === "event";

  const handleEventTypeChange = (type: EventType) => {
    setEventType(type);
    setCoverEmoji(EVENT_TYPE_CONFIG[type].coverEmojis[0]);
  };

  const reset = () => {
    setEventType("travel"); setName(""); setDest(""); setStartDate(""); setEndDate("");
    setStatus("planning"); setCoverEmoji("✈️"); setNotes(""); setEnvelope(0);
    setGiftBudget(0); setSelectedGoalId("none"); setReminderDays(null);
  };

  const handleRequestNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
    if (!granted) toast.error("Notifications blocked. Enable them in your browser settings.");
  };

  const handleSave = async () => {
    if (!user || !household) return;
    if (!name.trim() || !startDate) {
      toast.error("Fill in a name and date.");
      return;
    }
    const effectiveEnd = endDate || startDate;
    if (effectiveEnd < startDate) {
      toast.error("End date must be after start date.");
      return;
    }

    setSaving(true);
    try {
      let budgetId: string | undefined;
      if (envelope > 0) {
        budgetId = generateId();
        await db.budgets.add({
          id: budgetId,
          household_id: household.id,
          name: `${name.trim()} — budget`,
          period: "monthly",
          budget_type: "travel",
          account_type: "common",
          status: "active",
          start_date: startDate,
          end_date: effectiveEnd,
          total_envelope: envelope,
          currency: "RWF",
          created_by: user.id,
          created_at: new Date().toISOString(),
        });
      }

      const trip: Trip = {
        id: generateId(),
        household_id: household.id,
        name: name.trim(),
        destination: destination.trim() || "—",
        start_date: startDate,
        end_date: effectiveEnd,
        status,
        cover_emoji: coverEmoji,
        event_type: eventType,
        budget_id: budgetId,
        savings_goal_id: selectedGoalId !== "none" ? selectedGoalId : undefined,
        gift_budget: showGiftBudget && giftBudget > 0 ? giftBudget : undefined,
        reminder_days_before: reminderDays !== null ? reminderDays : undefined,
        notes: notes.trim() || undefined,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };

      await db.trips.add(trip);
      upsertTrip(trip);

      // Fire an immediate test notification if permission granted and reminder set
      if (notifGranted && reminderDays !== null) {
        const label = reminderDays === 0 ? "the day of" : `${reminderDays} day${reminderDays > 1 ? "s" : ""} before`;
        showLocalNotification(
          `📅 Reminder set for "${trip.name}"`,
          `You'll be reminded ${label} the event.`
        );
      }

      toast.success(`${evtCfg.emoji} "${trip.name}" added to Our Plans!`);
      setOpen(false);
      reset();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusCircle size={14} /> New Plan
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-h-[95vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Add to Our Plans</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Event type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">What kind of plan?</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(([type, cfg]) => (
                <button
                  key={type}
                  onClick={() => handleEventTypeChange(type)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all",
                    eventType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  <span className="text-xl">{cfg.emoji}</span>
                  <span className="text-center leading-tight text-[10px]">{cfg.label.split(" / ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cover emoji */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Cover</Label>
            <div className="flex flex-wrap gap-2">
              {evtCfg.coverEmojis.map((e) => (
                <button
                  key={e}
                  onClick={() => setCoverEmoji(e)}
                  className={cn(
                    "text-2xl w-10 h-10 rounded-xl border-2 transition-all",
                    coverEmoji === e ? "border-primary bg-primary/10" : "border-muted"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder={
                eventType === "wedding" ? "Jean & Marie's Wedding" :
                eventType === "birthday" ? "Amani's 5th Birthday" :
                eventType === "visit" ? "Visit to Uncle's home" :
                eventType === "school" ? "Graduation Day" :
                "Family trip to Zanzibar"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label>{evtCfg.venue} <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder={
                eventType === "wedding" ? "Kigali Serena Hotel" :
                eventType === "visit"   ? "Musanze, Northern Province" :
                eventType === "travel"  ? "Zanzibar, Tanzania" :
                "Location or venue"
              }
              value={destination}
              onChange={(e) => setDest(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date <span className="text-muted-foreground text-xs">(opt.)</span></Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Bell size={13} /> Remind household
            </Label>

            {!notifGranted && (
              <button
                onClick={handleRequestNotif}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Bell size={14} />
                Allow notifications to enable reminders
              </button>
            )}

            {notifGranted && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setReminderDays(null)}
                  className={cn(
                    "py-2 px-1 rounded-lg border text-xs font-medium transition-all text-center",
                    reminderDays === null
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  <BellOff size={12} className="mx-auto mb-0.5" />
                  None
                </button>
                {REMINDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReminderDays(opt.value)}
                    className={cn(
                      "py-2 px-1 rounded-lg border text-xs font-medium transition-all text-center leading-tight",
                      reminderDays === opt.value
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-muted text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TripStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="upcoming">Confirmed / Upcoming</SelectItem>
                <SelectItem value="active">Happening now</SelectItem>
                <SelectItem value="completed">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Savings goal link */}
          {savingsGoals.length > 0 && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Target size={13} /> Link savings goal <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                <SelectTrigger><SelectValue placeholder="Select a savings goal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {savingsGoals.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      🏦 {g.name}{g.total_envelope ? ` (${formatRWF(g.total_envelope)})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Spending envelope */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Wallet size={13} /> Spending budget <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <AmountInput value={envelope} onChange={setEnvelope} placeholder="e.g. 500,000" />
          </div>

          {/* Gift budget */}
          {showGiftBudget && (
            <div className="space-y-1.5">
              <Label>
                {eventType === "birthday" ? "🎁 Gift budget" : "💍 Gift / contribution budget"}
                <span className="text-muted-foreground text-xs ml-1">(optional)</span>
              </Label>
              <AmountInput value={giftBudget} onChange={setGiftBudget} placeholder="e.g. 50,000" />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              placeholder="Guest list, what to bring, transport plans…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button className="w-full h-12 text-base font-semibold" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : `Add ${evtCfg.emoji} ${evtCfg.label}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "calendar";

export default function PlansPage() {
  const household = useHousehold();
  const trips = useTrips();
  const { setTrips, removeTrip } = useAppStore();
  const [savingsGoalMap, setSavingsGoalMap] = useState<Record<string, Budget>>({});
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    if (!household) return;
    db.trips.where("household_id").equals(household.id).toArray().then(async (loaded) => {
      setTrips(loaded);
      const goalIds = [...new Set(loaded.map((t) => t.savings_goal_id).filter(Boolean))] as string[];
      if (goalIds.length > 0) {
        const goals = await db.budgets.bulkGet(goalIds);
        const map: Record<string, Budget> = {};
        goals.forEach((g) => { if (g) map[g.id] = g; });
        setSavingsGoalMap(map);
      }
    });
  }, [household, setTrips]);

  // Fire reminders: check trips where reminder is due today
  useEffect(() => {
    if (trips.length === 0) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    for (const trip of trips) {
      if (trip.status === "completed") continue;
      if (trip.reminder_days_before === undefined || trip.reminder_days_before === null) continue;
      const until = daysUntil(trip.start_date);
      if (until === trip.reminder_days_before) {
        const msg = until === 0
          ? `"${trip.name}" is today!`
          : `"${trip.name}" is in ${until} day${until > 1 ? "s" : ""}.`;
        showLocalNotification(`📅 ${EVENT_TYPE_CONFIG[trip.event_type ?? "travel"].emoji} Reminder`, msg);
      }
    }
  // Run once on mount — eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    await db.trips.delete(id);
    await db.itinerary_items.where("trip_id").equals(id).delete();
    removeTrip(id);
    toast.success("Plan removed.");
  };

  const active    = trips.filter((t) => t.status === "active");
  const upcoming  = trips.filter((t) => t.status === "upcoming");
  const planning  = trips.filter((t) => t.status === "planning");
  const completed = trips.filter((t) => t.status === "completed");

  const groups = [
    { label: "🛫 Happening Now", items: active },
    { label: "📅 Upcoming",      items: upcoming },
    { label: "🗒️ Planning",      items: planning },
    { label: "✅ Done",          items: completed },
  ].filter((g) => g.items.length > 0);

  const typeCounts = trips.reduce<Partial<Record<EventType, number>>>((acc, t) => {
    const type = t.event_type ?? "travel";
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-black text-2xl">Our Plans</h1>
            <SectionHelp title="Our Plans">
              <p>This is where you track every family event — trips, weddings, visits, birthdays, school events, and more.</p>
              <p>Each plan can have a <strong>spending budget</strong> (linked to your expense tracking), a <strong>savings goal</strong> (to build up money before the event), and a <strong>reminder</strong> so the whole household gets notified in advance.</p>
              <p>Switch between <strong>list view</strong> and <strong>calendar view</strong> using the icons in the top right. Tap a plan to open its itinerary and details.</p>
            </SectionHelp>
          </div>
          <p className="text-sm text-muted-foreground">
            {trips.length === 0
              ? "Add your first family plan"
              : `${trips.length} plan${trips.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setView("list")}
              className={cn("p-1.5 rounded-md transition-all", view === "list" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn("p-1.5 rounded-md transition-all", view === "calendar" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <Grid3X3 size={15} />
            </button>
          </div>
          <NewEventSheet />
        </div>
      </div>

      {/* Event type overview chips */}
      {trips.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-4 px-4">
          {(Object.entries(typeCounts) as [EventType, number][]).map(([type, count]) => (
            <span
              key={type}
              className="shrink-0 text-xs font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground"
            >
              {EVENT_TYPE_CONFIG[type].emoji} {count} {EVENT_TYPE_CONFIG[type].label.split(" / ")[0]}
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {trips.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
          <span className="text-6xl">👨‍👩‍👧‍👦</span>
          <div>
            <p className="font-bold text-lg">No plans yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
              Add trips, visits, weddings, birthdays and any family occasion — with budgets, reminders, and plans everyone can see.
            </p>
          </div>
          <NewEventSheet />
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && trips.length > 0 && (
        <MiniCalendar trips={trips} />
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="font-semibold text-sm text-muted-foreground mb-3">{group.label}</h2>
              <div className="space-y-3">
                {group.items.map((trip) => (
                  <EventCard
                    key={trip.id}
                    trip={trip}
                    savingsGoal={trip.savings_goal_id ? savingsGoalMap[trip.savings_goal_id] : undefined}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}
