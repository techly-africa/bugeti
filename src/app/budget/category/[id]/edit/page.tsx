"use client";

export const dynamic = "force-dynamic";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/layout/AppShell";
import { AmountInput } from "@/components/shared/AmountInput";
import { db } from "@/db";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore, useActiveBudget, useCategories } from "@/store";
import { cn } from "@/lib/utils";

// ─── Presets ─────────────────────────────────────────────────────────────────

const EMOJI_PRESETS = [
  "🛒","🚌","📚","🏥","🏠","💡","📱","🧹","🧒","👛","🎉","👗",
  "🍔","☕","💊","🏋️","✈️","🎓","🏦","💻","📦","🎁","🌿","⚽",
];

const COLOR_PRESETS = [
  "#16a34a","#2563eb","#7c3aed","#dc2626","#b45309","#0891b2",
  "#059669","#0ea5e9","#f59e0b","#8b5cf6","#db2777","#9333ea","#6b7280",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const activeBudget = useActiveBudget();
  const categories = useCategories();
  const { setCategories } = useAppStore();

  const category = categories.find((c) => c.id === id);
  const parentCat = category?.parent_id
    ? categories.find((c) => c.id === category.parent_id)
    : null;

  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "📦");
  const [color, setColor] = useState(category?.color ?? "#6b7280");
  const [plannedAmount, setPlannedAmount] = useState(category?.planned_amount ?? 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state if category loads after mount
  useEffect(() => {
    if (category) {
      setName(category.name);
      setIcon(category.icon);
      setColor(category.color);
      setPlannedAmount(category.planned_amount);
    }
  }, [category?.id]);

  if (!category) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <span className="text-5xl">😕</span>
          <p className="text-muted-foreground">Category not found</p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </AppShell>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a category name.");
      return;
    }

    setSaving(true);
    try {
      const updates = {
        name: name.trim(),
        icon,
        color,
        planned_amount: plannedAmount,
      };

      await db.categories.update(id, updates);

      // Refresh store
      if (activeBudget) {
        const updated = await db.categories
          .where("budget_id")
          .equals(activeBudget.id)
          .sortBy("sort_order");
        setCategories(updated);
      }

      // Sync to Supabase
      if (navigator.onLine && isSupabaseConfigured()) {
        try {
          await supabase.from("categories").update(updates).eq("id", id);
        } catch (syncErr) {
          console.warn("[EditCategory] Cloud sync failed:", syncErr);
        }
      }

      toast.success("Category updated!");
      router.back();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const hasChildren = categories.some((c) => c.parent_id === id);
    if (hasChildren) {
      toast.error("Remove sub-budgets first before deleting this category.");
      return;
    }

    setDeleting(true);
    try {
      await db.categories.delete(id);

      if (activeBudget) {
        const updated = await db.categories
          .where("budget_id")
          .equals(activeBudget.id)
          .sortBy("sort_order");
        setCategories(updated);
      }

      if (navigator.onLine && isSupabaseConfigured()) {
        try {
          await supabase.from("categories").delete().eq("id", id);
        } catch (syncErr) {
          console.warn("[EditCategory] Cloud sync failed:", syncErr);
        }
      }

      toast.success("Category deleted.");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete.");
    } finally {
      setDeleting(false);
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
            Edit {category.icon} {category.name}
          </h1>
        </div>

        {/* Parent context */}
        {parentCat && (
          <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Sub-budget of{" "}
            <span className="font-semibold text-foreground">
              {parentCat.icon} {parentCat.name}
            </span>
          </div>
        )}

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
              autoFocus
            />
          </div>

          {/* Planned amount */}
          <div className="space-y-1.5">
            <Label>Planned Amount</Label>
            <AmountInput
              value={plannedAmount}
              onChange={setPlannedAmount}
              className="w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:bg-destructive/10 shrink-0"
            onClick={handleDelete}
            disabled={deleting || saving}
            title="Delete category"
          >
            {deleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
