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
import { AmountInput } from "@/components/shared/AmountInput";
import { db } from "@/db";
import { formatRWF, generateId } from "@/lib/constants";
import { useTrips, useAppStore, useUser } from "@/store";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import type { ItineraryItem, ItineraryItemType, Trip, TripStatus } from "@/lib/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const ITEM_TYPE_CONFIG: Record<ItineraryItemType, { icon: string; color: string }> = {
  transport:     { icon: "🚌", color: "bg-blue-100 text-blue-800" },
  accommodation: { icon: "🏨", color: "bg-purple-100 text-purple-800" },
  activity:      { icon: "🎯", color: "bg-green-100 text-green-800" },
  food:          { icon: "🍽️", color: "bg-orange-100 text-orange-800" },
  other:         { icon: "📌", color: "bg-gray-100 text-gray-700" },
};

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: "planning",  label: "Planning" },
  { value: "upcoming",  label: "Upcoming" },
  { value: "active",    label: "On the Way" },
  { value: "completed", label: "Completed" },
];

function tripDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
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
  onAdded,
}: {
  tripId: string;
  totalDays: number;
  onAdded: (item: ItineraryItem) => void;
}) {
  const t = useT();
  const user = useUser();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItineraryItemType>("activity");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(0);

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
      toast.success("Added to itinerary!");
      setOpen(false);
      setTitle(""); setTime(""); setLocation(""); setDescription(""); setCost(0);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <PlusCircle size={14} /> {t("addItineraryItem")}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Add to Itinerary</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("itineraryDay")}</Label>
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
              <Label>{t("itineraryTime")}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("itineraryItemTitle")}</Label>
            <Input placeholder="Flight to Nairobi, Hotel check-in…" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("itineraryItemType")}</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.entries(ITEM_TYPE_CONFIG) as [ItineraryItemType, { icon: string }][]).map(([val, cfg]) => (
                <button
                  key={val}
                  onClick={() => setType(val)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all",
                    type === val ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground"
                  )}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  <span className="capitalize text-[10px]">{val}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("itineraryLocation")}</Label>
            <Input placeholder="Kigali International Airport" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input placeholder="Booking ref, confirmation number…" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("itineraryEstCost")}</Label>
            <AmountInput value={cost} onChange={setCost} />
          </div>

          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Add to Itinerary"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Itinerary Day Group ──────────────────────────────────────────────────────

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
            const cfg = ITEM_TYPE_CONFIG[item.type];
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
                      <span className="text-xs font-semibold text-foreground">
                        {formatRWF(item.estimated_cost)}
                      </span>
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
  const t = useT();
  const router = useRouter();
  const trips = useTrips();
  const { upsertTrip } = useAppStore();

  const trip = trips.find((tr) => tr.id === id);

  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [budget, setBudget] = useState<{ envelope: number; spent: number } | null>(null);

  // Load itinerary items + budget
  useEffect(() => {
    if (!trip) return;

    db.itinerary_items.where("trip_id").equals(id).toArray().then(setItems);

    if (trip.budget_id) {
      Promise.all([
        db.budgets.get(trip.budget_id),
        db.transactions.where("budget_id").equals(trip.budget_id).toArray(),
      ]).then(([bud, txs]) => {
        if (!bud) return;
        const spent = txs
          .filter((tx) => tx.type === "expense")
          .reduce((s, tx) => s + tx.amount, 0);
        setBudget({ envelope: bud.total_envelope ?? 0, spent });
      });
    }
  }, [id, trip]);

  if (!trip) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <span className="text-5xl">😕</span>
          <p className="text-muted-foreground">Trip not found</p>
          <Button onClick={() => router.push("/travel")}>Back to trips</Button>
        </div>
      </AppShell>
    );
  }

  const totalDays = tripDuration(trip.start_date, trip.end_date);
  const estimatedTotal = items.reduce((s, i) => s + i.estimated_cost, 0);

  const handleItemAdded = (item: ItineraryItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleDeleteItem = async (itemId: string) => {
    await db.itinerary_items.delete(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleStatusChange = async (newStatus: TripStatus) => {
    const updated: Trip = { ...trip, status: newStatus };
    await db.trips.put(updated);
    upsertTrip(updated);
  };

  // Group items by day
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={10} /> {trip.destination}
            </div>
          </div>
          {/* Status picker */}
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

        {/* Meta strip */}
        <div className="bg-card rounded-2xl border p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar size={14} />
              <span>
                {new Date(trip.start_date).toLocaleDateString("en-RW", { month: "long", day: "numeric" })}
                {" – "}
                {new Date(trip.end_date).toLocaleDateString("en-RW", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <span className="font-bold text-foreground">{totalDays} days</span>
          </div>

          {trip.notes && (
            <p className="text-xs text-muted-foreground border-t pt-3">{trip.notes}</p>
          )}
        </div>

        {/* Budget card */}
        {budget && (
          <div className="bg-card rounded-2xl border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={15} className="text-primary" />
              <span className="font-semibold text-sm">{t("tripBudget")}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("tripEnvelope")}</p>
                <p className="font-bold text-sm">{formatRWF(budget.envelope)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("tripSpent")}</p>
                <p className="font-bold text-sm text-red-500">{formatRWF(budget.spent)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t("remaining")}</p>
                <p className={cn("font-bold text-sm", budget.envelope - budget.spent < 0 ? "text-red-500" : "text-green-600")}>
                  {formatRWF(Math.abs(budget.envelope - budget.spent))}
                </p>
              </div>
            </div>
            {/* Progress bar */}
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

        {/* Estimated cost summary (if no budget) */}
        {!budget && estimatedTotal > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-amber-800 font-medium">Estimated total</span>
            <span className="font-bold text-amber-900">{formatRWF(estimatedTotal)}</span>
          </div>
        )}

        {/* Itinerary */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">{t("itinerary")}</h2>
            <AddItemSheet tripId={id} totalDays={totalDays} onAdded={handleItemAdded} />
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 bg-muted/20 rounded-2xl">
              <span className="text-4xl">🗓️</span>
              <p className="text-muted-foreground text-sm text-center">
                No itinerary yet — add your first activity
              </p>
              <AddItemSheet tripId={id} totalDays={totalDays} onAdded={handleItemAdded} />
            </div>
          ) : (
            <div className="space-y-6">
              {byDay.map(({ day, date, items: dayItems }) => (
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
