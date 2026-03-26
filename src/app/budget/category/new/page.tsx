"use client";

export const dynamic = "force-dynamic";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/layout/AppShell";
import { AmountInput } from "@/components/shared/AmountInput";
import { db } from "@/db";
import { generateId } from "@/lib/constants";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore, useActiveBudget, useCategories, useHousehold, useUser } from "@/store";
import type { HouseholdMember } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Emoji / color presets ───────────────────────────────────────────────────

const EMOJI_PRESETS = [
  "🛒","🚌","📚","🏥","🏠","💡","📱","🧹","🧒","👛","🎉","👗",
  "🍔","☕","💊","🏋️","✈️","🎓","🏦","💻","📦","🎁","🌿","⚽",
];

const COLOR_PRESETS = [
  "#16a34a","#2563eb","#7c3aed","#dc2626","#b45309","#0891b2",
  "#059669","#0ea5e9","#f59e0b","#8b5cf6","#db2777","#9333ea","#6b7280",
];

// ─── Inner Form (needs useSearchParams) ──────────────────────────────────────

function NewCategoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("parent"); // null = top-level

  const user = useUser();
  const activeBudget = useActiveBudget();
  const categories = useCategories();
  const { setCategories } = useAppStore();
  const household = useHousehold();

  const parentCat = parentId ? categories.find((c) => c.id === parentId) : null;

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState("#6b7280");
  const [plannedAmount, setPlannedAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  useEffect(() => {
    if (!household?.id) return;
    db.members.where("household_id").equals(household.id).toArray().then(setMembers);
  }, [household?.id]);

  const handleSave = async () => {
    if (!activeBudget) {
      toast.error("No active budget found.");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    setSaving(true);

    try {
      const newCat = {
        id: generateId(),
        budget_id: activeBudget.id,
        parent_id: parentId ?? null,
        level: parentId ? (parentCat?.level ?? 0) + 1 : 0,
        name: name.trim(),
        planned_amount: plannedAmount,
        icon,
        color,
        sort_order: categories.filter(
          (c) => c.parent_id === (parentId ?? null)
        ).length,
        assigned_to: assignedTo,
      };

      // Save locally
      await db.categories.add(newCat);

      // Update store
      const updated = await db.categories
        .where("budget_id")
        .equals(activeBudget.id)
        .sortBy("sort_order");
      setCategories(updated);

      // Sync to Supabase if available
      if (navigator.onLine && isSupabaseConfigured()) {
        try {
          await supabase.from("categories").insert(newCat);
        } catch (syncErr) {
          console.warn("[NewCategory] Cloud sync failed:", syncErr);
        }
      }

      toast.success(`"${newCat.name}" added!`);
      router.back();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft size={20} />
          </Button>
          <h1 className="font-bold text-xl flex-1">
            {parentCat
              ? `Add sub-budget to ${parentCat.icon} ${parentCat.name}`
              : "Add Category"}
          </h1>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl border p-5 space-y-5">
          {/* Icon picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={cn(
                    "text-xl w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center",
                    icon === e
                      ? "border-primary bg-primary/10 scale-110"
                      : "border-transparent hover:border-muted"
                  )}
                >
                  {e}
                </button>
              ))}
              {/* Custom emoji input */}
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={2}
                className="w-10 h-10 rounded-xl border-2 text-center text-xl border-muted focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "w-8 h-8 rounded-full border-4 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={parentCat ? "e.g. Tuition, Books…" : "e.g. School Fees"}
              autoFocus
            />
          </div>

          {/* Planned amount */}
          <div className="space-y-1.5">
            <Label>Planned Amount (optional)</Label>
            <AmountInput
              value={plannedAmount}
              onChange={setPlannedAmount}
              className="w-full"
            />
          </div>

          {/* Assignee */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Assign to</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setAssignedTo(null)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border-2 transition-all",
                    assignedTo === null
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-transparent bg-muted hover:border-muted-foreground"
                  )}
                >
                  Shared
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setAssignedTo(m.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border-2 transition-all",
                      assignedTo === m.id
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-transparent bg-muted hover:border-muted-foreground"
                    )}
                  >
                    👤 {m.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Context / parent info */}
          {parentCat && (
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              This will be a sub-budget under{" "}
              <span className="font-semibold text-foreground">
                {parentCat.icon} {parentCat.name}
              </span>{" "}
              and count towards its allocation.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : null}
            {parentCat ? "Add Sub-Budget" : "Add Category"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Page export (wraps in Suspense for useSearchParams) ─────────────────────

export default function NewCategoryPage() {
  return (
    <Suspense>
      <NewCategoryForm />
    </Suspense>
  );
}
