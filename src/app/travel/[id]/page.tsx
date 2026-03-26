"use client";

export const dynamic = "force-dynamic";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Calendar,
  Wallet,
  PlusCircle,
  Trash2,
  Clock,
  Navigation,
  FileText,
  Target,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { AmountInput } from "@/components/shared/AmountInput";
import { db } from "@/db";
import { formatRWF, generateId } from "@/lib/constants";
import { useTrips, useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import type { Budget, ItineraryItem, ItineraryItemType, Trip, TripStatus } from "@/lib/types";
import { EVENT_TYPE_CONFIG } from "@/lib/travel-config";

// ─── Config ───────────────────────────────────────────────────────────────────

const ITEM_TYPE_CONFIG: Record<ItineraryItemType, { icon: string; label: string; color: string }> = {
  transport:     { icon: "🚌", label: "Transport",     color: "bg-blue-100 text-blue-800" },
  accommodation: { icon: "🏨", label: "Stay",          color: "bg-purple-100 text-purple-800" },
  activity:      { icon: "🎯", label: "Activity",      color: "bg-green-100 text-green-800" },
  food:          { icon: "🍽️", label: "Food & Drink",  color: "bg-orange-100 text-orange-800" },
  gift:          { icon: "🎁", label: "Gift / Contribution", color: "bg-pink-100 text-pink-800" },
  ceremony:      { icon: "💒", label: "Ceremony",      color: "bg-rose-100 text-rose-800" },
  other:         { icon: "📌", label: "Other",         color: "bg-gray-100 text-gray-700" },
};

// Context-aware item type presets per event type
const EVENT_ITEM_PRESETS: Record<string, ItineraryItemType[]> = {
  travel:   ["transport", "accommodation", "activity", "food", "other"],
  visit:    ["transport", "activity", "food", "gift", "other"],
  wedding:  ["transport", "ceremony", "food", "gift", "accommodation", "activity"],
  event:    ["transport", "ceremony", "food", "gift", "activity", "other"],
  birthday: ["transport", "activity", "food", "gift", "other"],
  school:   ["transport", "ceremony", "activity", "food", "other"],
  religious:["transport", "ceremony", "activity", "food", "other"],
  other:    ["transport", "accommodation", "activity", "food", "gift", "ceremony", "other"],
};

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "planning",  label: "Planning" },
  { value: "upcoming",  label: "Upcoming" },
  { value: "active",    label: "Happening now" },
  { value: "completed", label: "Done" },
];

function eventDuration(start: string, end: string) {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1);
}

function dateForDay(startDate: string, day: number) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + day - 1);
  return d.toLocaleDateString("en-RW", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Add Itinerary Item Sheet ─────────────────────────────────────────────────

function AddItemSheet({
  tripId,
  totalDays,
  eventType,
  onAdded,
}: {
  tripId: string;
  totalDays: number;
  eventType: string;
  onAdded: (item: ItineraryItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItineraryItemType>("activity");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(0);

  const presets = EVENT_ITEM_PRESETS[eventType] ?? (Object.keys(ITEM_TYPE_CONFIG) as ItineraryItemType[]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Add a title."); return; }
    setSaving(true);
    try {
      const item: ItineraryItem = {
        id: generateId(),
        trip_id: tripId,
        day,
        time: time || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        type,
        estimated_cost: cost,
        created_at: new Date().toISOString(),
      };
      await db.itinerary_items.add(item);
      onAdded(item);
      toast.success("Added!");
      setOpen(false);
      setTitle(""); setTime(""); setLocation(""); setDescription(""); setCost(0);
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
        <Button size="sm" variant="outline" className="gap-1.5">
          <PlusCircle size={14} /> Add item
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Add to Plan</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Day + time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalDays }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Day {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Time <span className="text-muted-foreground text-xs">(opt.)</span></Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              placeholder="Ceremony, flight, lunch, gift…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Type — filtered by event context */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {presets.map((val) => {
                const cfg = ITEM_TYPE_CONFIG[val];
                return (
                  <button
                    key={val}
                    onClick={() => setType(val)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all",
                      type === val ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground"
                    )}
                  >
                    <span className="text-lg">{cfg.icon}</span>
                    <span className="text-[9px] leading-tight text-center">{cfg.label.split(" / ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label>Location <span className="text-muted-foreground text-xs">(opt.)</span></Label>
            <Input placeholder="Kigali Convention Centre…" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground text-xs">(opt.)</span></Label>
            <Input placeholder="Booking ref, confirmation, who's responsible…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Cost */}
          <div className="space-y-1.5">
            <Label>Estimated cost <span className="text-muted-foreground text-xs">(opt.)</span></Label>
            <AmountInput value={cost} onChange={setCost} />
          </div>

          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Add to Plan"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Day / Moment Group ───────────────────────────────────────────────────────

function DayGroup({
  day,
  date,
  items,
  onDelete,
}: {
  day: number;
  date: string;
  items: ItineraryItem[];
  onDelete: (id: string) => void;
}) {
  const dayTotal = items.reduce((s, i) => s + i.estimated_cost, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center">
            {day}
          </span>
          <span className="text-sm font-semibold">{date}</span>
        </div>
        {dayTotal > 0 && (
          <span className="text-xs text-muted-foreground">{formatRWF(dayTotal)}</span>
        )}
      </div>

      <div className="ml-3 border-l-2 border-muted pl-4 space-y-2">
        {items
          .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
          .map((item) => {
            const cfg = ITEM_TYPE_CONFIG[item.type] ?? ITEM_TYPE_CONFIG.other;
            return (
              <div key={item.id} className="bg-card rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-lg mt-0.5 shrink-0">{cfg.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm leading-tight">{item.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        {item.time && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Clock size={10} /> {item.time}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground truncate">
                            <Navigation size={10} /> {item.location}
                          </span>
                        )}
                        {item.description && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <FileText size={10} /> {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.estimated_cost > 0 && (
                      <span className="text-xs font-semibold">{formatRWF(item.estimated_cost)}</span>
                    )}
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const trips = useTrips();
  const { upsertTrip } = useAppStore();

  const trip = trips.find((tr) => tr.id === id);

  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [budget, setBudget] = useState<{ envelope: number; spent: number } | null>(null);
  const [savingsGoal, setSavingsGoal] = useState<Budget | null>(null);
  const [savedAmount, setSavedAmount] = useState(0);

  useEffect(() => {
    if (!trip) return;

    db.itinerary_items.where("trip_id").equals(id).toArray().then(setItems);

    // Load spending envelope
    if (trip.budget_id) {
      Promise.all([
        db.budgets.get(trip.budget_id),
        db.transactions.where("budget_id").equals(trip.budget_id).toArray(),
      ]).then(([bud, txs]) => {
        if (!bud) return;
        const spent = txs.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);
        setBudget({ envelope: bud.total_envelope ?? 0, spent });
      });
    }

    // Load savings goal
    if (trip.savings_goal_id) {
      Promise.all([
        db.budgets.get(trip.savings_goal_id),
        db.transactions.where("budget_id").equals(trip.savings_goal_id).toArray(),
      ]).then(([goal, txs]) => {
        if (!goal) return;
        setSavingsGoal(goal);
        const deposited = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const withdrawn = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        setSavedAmount(deposited - withdrawn);
      });
    }
  }, [id, trip]);

  if (!trip) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <span className="text-5xl">😕</span>
          <p className="text-muted-foreground">Event not found</p>
          <Button onClick={() => router.push("/travel")}>Back to events</Button>
        </div>
      </AppShell>
    );
  }

  const evtCfg = EVENT_TYPE_CONFIG[trip.event_type ?? "travel"];
  const totalDays = eventDuration(trip.start_date, trip.end_date);
  const estimatedTotal = items.reduce((s, i) => s + i.estimated_cost, 0);

  const savingsPct = savingsGoal?.total_envelope
    ? Math.min((savedAmount / savingsGoal.total_envelope) * 100, 100)
    : 0;

  const daysUntil = Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / 86_400_000);

  const handleItemAdded = (item: ItineraryItem) => setItems((prev) => [...prev, item]);
  const handleDeleteItem = async (itemId: string) => {
    await db.itinerary_items.delete(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };
  const handleStatusChange = async (newStatus: TripStatus) => {
    const updated: Trip = { ...trip, status: newStatus };
    await db.trips.put(updated);
    upsertTrip(updated);
  };

  const byDay = Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => ({
    day,
    date: dateForDay(trip.start_date, day),
    items: items.filter((it) => it.day === day),
  }));

  return (
    <AppShell>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/travel")}>
            <ChevronLeft size={20} />
          </Button>
          <span className="text-3xl">{trip.cover_emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-xl leading-tight truncate">{trip.name}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{evtCfg.emoji} {evtCfg.label}</span>
              {trip.destination !== "—" && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><MapPin size={9} />{trip.destination}</span>
                </>
              )}
            </div>
          </div>
          <Select value={trip.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date meta */}
        <div className="bg-card rounded-2xl border p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar size={14} />
              <span>
                {new Date(trip.start_date).toLocaleDateString("en-RW", { month: "long", day: "numeric" })}
                {totalDays > 1 && ` – ${new Date(trip.end_date).toLocaleDateString("en-RW", { month: "long", day: "numeric", year: "numeric" })}`}
              </span>
            </div>
            {totalDays > 1 && <span className="font-bold">{totalDays} days</span>}
          </div>

          {trip.status !== "completed" && daysUntil > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-primary font-semibold">
              <span>⏳</span>
              <span>{daysUntil === 1 ? "Tomorrow!" : `${daysUntil} days to go`}</span>
            </div>
          )}

          {trip.notes && (
            <p className="text-xs text-muted-foreground border-t pt-2">{trip.notes}</p>
          )}
        </div>

        {/* ── Savings goal progress ── */}
        {savingsGoal && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-green-700" />
              <span className="font-semibold text-sm text-green-900">Savings Goal</span>
              <span className="ml-auto text-xs text-green-700 font-medium">{savingsGoal.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-green-700/70 mb-0.5">Saved</p>
                <p className="font-bold text-sm text-green-700">{formatRWF(savedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-green-700/70 mb-0.5">Target</p>
                <p className="font-bold text-sm text-green-900">{savingsGoal.total_envelope ? formatRWF(savingsGoal.total_envelope) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-green-700/70 mb-0.5">Remaining</p>
                <p className="font-bold text-sm text-green-900">
                  {savingsGoal.total_envelope
                    ? formatRWF(Math.max(0, savingsGoal.total_envelope - savedAmount))
                    : "—"}
                </p>
              </div>
            </div>
            {savingsGoal.total_envelope && (
              <div className="space-y-1">
                <Progress value={savingsPct} className="h-2.5 [&>div]:bg-green-500" />
                <p className="text-xs text-green-700 text-right font-medium">{Math.round(savingsPct)}% saved</p>
              </div>
            )}
          </div>
        )}

        {/* ── Gift budget (weddings / birthdays / events) ── */}
        {trip.gift_budget && trip.gift_budget > 0 && (
          <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={15} className="text-pink-600" />
                <span className="font-semibold text-sm text-pink-900">
                  {trip.event_type === "wedding" ? "Gift / Contribution Budget" : "Gift Budget"}
                </span>
              </div>
              <span className="font-bold text-pink-700">{formatRWF(trip.gift_budget)}</span>
            </div>
            {/* Show how much of the itinerary is allocated to gifts */}
            {(() => {
              const giftItems = items.filter((i) => i.type === "gift");
              const allocated = giftItems.reduce((s, i) => s + i.estimated_cost, 0);
              if (allocated > 0) {
                return (
                  <p className="text-xs text-pink-700/80 mt-2">
                    {formatRWF(allocated)} planned in gift items · {formatRWF(Math.max(0, trip.gift_budget - allocated))} unallocated
                  </p>
                );
              }
              return (
                <p className="text-xs text-pink-700/60 mt-2">
                  Add gift items to the plan below to track allocation
                </p>
              );
            })()}
          </div>
        )}

        {/* ── Spending envelope ── */}
        {budget && (
          <div className="bg-card rounded-2xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={15} className="text-primary" />
              <span className="font-semibold text-sm">Spending Budget</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Envelope</p>
                <p className="font-bold text-sm">{formatRWF(budget.envelope)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Spent</p>
                <p className="font-bold text-sm text-red-500">{formatRWF(budget.spent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Left</p>
                <p className={cn("font-bold text-sm", budget.envelope - budget.spent < 0 ? "text-red-500" : "text-green-600")}>
                  {formatRWF(Math.abs(budget.envelope - budget.spent))}
                </p>
              </div>
            </div>
            {budget.envelope > 0 && (
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", budget.spent > budget.envelope ? "bg-red-500" : "bg-primary")}
                  style={{ width: `${Math.min((budget.spent / budget.envelope) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Estimated total (no budget linked) */}
        {!budget && estimatedTotal > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-amber-800 font-medium">Estimated total</span>
            <span className="font-bold text-amber-900">{formatRWF(estimatedTotal)}</span>
          </div>
        )}

        {/* ── Itinerary / Plan ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">
              {trip.event_type === "travel" ? "Itinerary" : "Event Plan"}
            </h2>
            <AddItemSheet
              tripId={id}
              totalDays={totalDays}
              eventType={trip.event_type ?? "travel"}
              onAdded={handleItemAdded}
            />
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 bg-muted/20 rounded-2xl text-center px-4">
              <span className="text-4xl">🗓️</span>
              <p className="text-muted-foreground text-sm">
                {trip.event_type === "travel"
                  ? "No itinerary yet — add flights, hotels, activities…"
                  : trip.event_type === "wedding"
                  ? "Add ceremony, catering, transport, and gifts to your plan"
                  : trip.event_type === "birthday"
                  ? "Add party activities, food, and gifts to your plan"
                  : "Start building your event plan"}
              </p>
              <AddItemSheet
                tripId={id}
                totalDays={totalDays}
                eventType={trip.event_type ?? "travel"}
                onAdded={handleItemAdded}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {byDay
                .filter(({ items: dayItems }) => dayItems.length > 0 || totalDays <= 3)
                .map(({ day, date, items: dayItems }) => (
                  <DayGroup
                    key={day}
                    day={day}
                    date={date}
                    items={dayItems}
                    onDelete={handleDeleteItem}
                  />
                ))}
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}
