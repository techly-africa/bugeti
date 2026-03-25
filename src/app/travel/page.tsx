"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, MapPin, Calendar, Wallet, ChevronRight, Trash2 } from "lucide-react";
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
import { useAppStore, useTrips, useUser, useHousehold } from "@/store";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import type { Trip, TripStatus } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const COVER_EMOJIS = ["✈️","🏖️","🏔️","🏕️","🌍","🗺️","🚢","🚂","🏝️","🎒","🗽","🏯"];

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string }> = {
  planning:  { label: "Planning",   color: "bg-amber-100 text-amber-800 border-amber-200" },
  upcoming:  { label: "Upcoming",   color: "bg-blue-100 text-blue-800 border-blue-200" },
  active:    { label: "On the way", color: "bg-green-100 text-green-800 border-green-200" },
  completed: { label: "Completed",  color: "bg-gray-100 text-gray-600 border-gray-200" },
};

function tripDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: (id: string) => void }) {
  const days = tripDuration(trip.start_date, trip.end_date);
  const until = daysUntil(trip.start_date);
  const cfg = STATUS_CONFIG[trip.status];

  return (
    <div className="bg-card rounded-2xl border overflow-hidden">
      <Link href={`/travel/${trip.id}`} className="block p-4 hover:bg-muted/20 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{trip.cover_emoji}</span>
            <div>
              <p className="font-bold text-base leading-tight">{trip.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin size={10} />
                <span>{trip.destination}</span>
              </div>
            </div>
          </div>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", cfg.color)}>
            {cfg.label}
          </span>
        </div>

        {/* Dates + duration */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar size={11} />
            <span>
              {new Date(trip.start_date).toLocaleDateString("en-RW", { month: "short", day: "numeric" })}
              {" – "}
              {new Date(trip.end_date).toLocaleDateString("en-RW", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <span className="font-medium text-foreground">{days}d</span>
        </div>

        {/* Countdown or done label */}
        {trip.status !== "completed" && until > 0 && (
          <p className="text-xs text-primary font-medium mt-2">
            {until === 1 ? "Tomorrow!" : `${until} days away`}
          </p>
        )}
      </Link>

      {/* Footer actions */}
      <div className="border-t flex items-center justify-between px-4 py-2">
        <Link
          href={`/travel/${trip.id}`}
          className="flex items-center gap-1 text-xs text-primary font-medium"
        >
          View itinerary <ChevronRight size={12} />
        </Link>
        <button
          onClick={() => onDelete(trip.id)}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── New Trip Sheet ───────────────────────────────────────────────────────────

function NewTripSheet() {
  const t = useT();
  const user = useUser();
  const household = useHousehold();
  const upsertTrip = useAppStore((s) => s.upsertTrip);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<TripStatus>("planning");
  const [coverEmoji, setCoverEmoji] = useState("✈️");
  const [envelope, setEnvelope] = useState(0);
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!user || !household) return;
    if (!name.trim() || !destination.trim() || !startDate || !endDate) {
      toast.error("Fill in name, destination and dates.");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be after start date.");
      return;
    }

    setSaving(true);
    try {
      // Create a linked budget envelope if an amount was provided
      let budgetId: string | undefined;
      if (envelope > 0) {
        budgetId = generateId();
        const budget = {
          id: budgetId,
          household_id: household.id,
          name: `${name} — budget`,
          period: "monthly" as const,
          budget_type: "travel" as const,
          account_type: "common" as const,
          status: "active" as const,
          start_date: startDate,
          end_date: endDate,
          total_envelope: envelope,
          currency: "RWF" as const,
          created_by: user.id,
          created_at: new Date().toISOString(),
        };
        await db.budgets.add(budget);
      }

      const trip: Trip = {
        id: generateId(),
        household_id: household.id,
        name: name.trim(),
        destination: destination.trim(),
        start_date: startDate,
        end_date: endDate,
        status,
        cover_emoji: coverEmoji,
        budget_id: budgetId,
        notes: notes.trim() || undefined,
        created_by: user.id,
        created_at: new Date().toISOString(),
      };
      await db.trips.add(trip);
      upsertTrip(trip);

      toast.success("Trip created!");
      setOpen(false);
      // reset
      setName(""); setDestination(""); setStartDate(""); setEndDate("");
      setStatus("planning"); setCoverEmoji("✈️"); setEnvelope(0); setNotes("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save trip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <PlusCircle size={14} /> {t("newTrip")}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Plan a new trip ✈️</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Cover emoji picker */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">{t("coverEmoji")}</Label>
            <div className="flex flex-wrap gap-2">
              {COVER_EMOJIS.map((e) => (
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

          <div className="space-y-1.5">
            <Label>{t("tripName")}</Label>
            <Input placeholder="Zanzibar Getaway" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t("destination")}</Label>
            <Input placeholder="Zanzibar, Tanzania" value={destination} onChange={(e) => setDestination(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("startDate")}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("endDate")}</Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("tripStatus")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TripStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">{t("tripStatusPlanning")}</SelectItem>
                <SelectItem value="upcoming">{t("tripStatusUpcoming")}</SelectItem>
                <SelectItem value="active">{t("tripStatusActive")}</SelectItem>
                <SelectItem value="completed">{t("tripStatusCompleted")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Wallet size={13} /> {t("tripBudget")} <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <AmountInput value={envelope} onChange={setEnvelope} placeholder="e.g. 500,000" />
          </div>

          <div className="space-y-1.5">
            <Label>{t("tripNotes")}</Label>
            <Input placeholder="Passport, visa, hotel confirmations…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button className="w-full" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Create Trip"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TravelPage() {
  const t = useT();
  const user = useUser();
  const household = useHousehold();
  const trips = useTrips();
  const { setTrips, removeTrip } = useAppStore();

  // Load trips from IndexedDB on mount
  useEffect(() => {
    if (!household) return;
    db.trips.where("household_id").equals(household.id).toArray().then(setTrips);
  }, [household, setTrips]);

  const handleDelete = async (id: string) => {
    await db.trips.delete(id);
    await db.itinerary_items.where("trip_id").equals(id).delete();
    removeTrip(id);
    toast.success("Trip deleted.");
  };

  const active    = trips.filter((t) => t.status === "active");
  const upcoming  = trips.filter((t) => t.status === "upcoming");
  const planning  = trips.filter((t) => t.status === "planning");
  const completed = trips.filter((t) => t.status === "completed");

  const groups = [
    { label: "On the Way 🛫",  items: active },
    { label: "Upcoming",       items: upcoming },
    { label: "Planning",       items: planning },
    { label: "Completed",      items: completed },
  ].filter((g) => g.items.length > 0);

  return (
    <AppShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-black text-2xl">{t("travelTitle")}</h1>
          <p className="text-sm text-muted-foreground">{trips.length} trip{trips.length !== 1 ? "s" : ""}</p>
        </div>
        <NewTripSheet />
      </div>

      {/* Summary chips */}
      {trips.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { label: "Active",    count: active.length,    color: "bg-green-100 text-green-800" },
            { label: "Upcoming",  count: upcoming.length,  color: "bg-blue-100 text-blue-800" },
            { label: "Planning",  count: planning.length,  color: "bg-amber-100 text-amber-800" },
            { label: "Done",      count: completed.length, color: "bg-gray-100 text-gray-600" },
          ].map((chip) => (
            <span key={chip.label} className={cn("shrink-0 text-xs font-medium px-3 py-1 rounded-full", chip.color)}>
              {chip.count} {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {trips.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <span className="text-6xl">🗺️</span>
          <p className="text-muted-foreground text-sm text-center">
            No trips yet — plan your first adventure!
          </p>
          <NewTripSheet />
        </div>
      )}

      {/* Trip groups */}
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="font-semibold text-sm text-muted-foreground mb-3">{group.label}</h2>
            <div className="space-y-3">
              {group.items.map((trip) => (
                <TripCard key={trip.id} trip={trip} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
