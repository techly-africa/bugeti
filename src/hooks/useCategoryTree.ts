import { useMemo } from "react";
import { useCategories } from "@/store";
export type { Category } from "@/lib/types";

/**
 * Returns a memoized map of parentId → descendant IDs and a flat list of
 * root categories. Both useBudgetStats and useBudgetAlerts use this to avoid
 * rebuilding the category tree independently on every render.
 */
export function useCategoryTree() {
  const categories = useCategories();

  return useMemo(() => {
    const descendantMap = new Map<string, Set<string>>();

    function getDescendants(parentId: string): Set<string> {
      const cached = descendantMap.get(parentId);
      if (cached) return cached;

      const result = new Set<string>();
      for (const cat of categories) {
        if (cat.parent_id === parentId) {
          result.add(cat.id);
          for (const id of getDescendants(cat.id)) result.add(id);
        }
      }
      descendantMap.set(parentId, result);
      return result;
    }

    const rootCategories = categories.filter((c) => !c.parent_id);
    for (const cat of rootCategories) getDescendants(cat.id);

    return { categories, rootCategories, descendantMap };
  }, [categories]);
}

/** Convenience helper — returns all descendant IDs for a given parent. */
export function getAllIds(
  catId: string,
  descendantMap: Map<string, Set<string>>
): Set<string> {
  const desc = descendantMap.get(catId) ?? new Set<string>();
  return new Set([catId, ...desc]);
}

