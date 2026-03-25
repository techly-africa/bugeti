import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AccountType,
  Budget,
  Category,
  Household,
  Ikimina,
  IkiminaContribution,
  Lang,
  Transaction,
  Trip,
  UserProfile,
} from "@/lib/types";

// ─── App Store ────────────────────────────────────────────────────────────────

interface AppState {
  // ── Auth ──
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;

  // ── Household ──
  household: Household | null;
  setHousehold: (h: Household | null) => void;

  // ── Account type (Common = household shared / Private = personal) ──
  activeAccountType: AccountType;
  setActiveAccountType: (t: AccountType) => void;

  // ── Active Budget (standard monthly) ──
  activeBudget: Budget | null;
  setActiveBudget: (b: Budget | null) => void;

  // ── Custom Budgets (travel, event, vacation, etc.) ──
  customBudgets: Budget[];
  setCustomBudgets: (bs: Budget[]) => void;
  upsertCustomBudget: (b: Budget) => void;
  removeCustomBudget: (id: string) => void;

  // ── Categories ──
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  upsertCategory: (cat: Category) => void;
  removeCategory: (id: string) => void;

  // ── Transactions ──
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  removeTransaction: (id: string) => void;

  // ── Ikimina ──
  ikiminas: Ikimina[];
  setIkiminas: (iks: Ikimina[]) => void;
  upsertIkimina: (ik: Ikimina) => void;
  removeIkimina: (id: string) => void;

  ikiminaContributions: IkiminaContribution[];
  setIkiminaContributions: (cs: IkiminaContribution[]) => void;
  addIkiminaContribution: (c: IkiminaContribution) => void;
  removeIkiminaContribution: (id: string) => void;

  // ── Trips ──
  trips: Trip[];
  setTrips: (ts: Trip[]) => void;
  upsertTrip: (t: Trip) => void;
  removeTrip: (id: string) => void;

  // ── Language ──
  lang: Lang;
  setLang: (l: Lang) => void;

  // ── Online status ──
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;

  // ── UI state ──
  isSidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  // ── Logout ──
  /** Resets all in-memory state. Pair with clearAllData() from db/index.ts. */
  resetAppData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Household
      household: null,
      setHousehold: (household) => set({ household }),

      // Account type
      activeAccountType: "common",
      setActiveAccountType: (activeAccountType) => set({ activeAccountType }),

      // Budget
      activeBudget: null,
      setActiveBudget: (activeBudget) => set({ activeBudget }),

      // Custom budgets
      customBudgets: [],
      setCustomBudgets: (customBudgets) => set({ customBudgets }),
      upsertCustomBudget: (b) =>
        set((s) => ({
          customBudgets: s.customBudgets.some((x) => x.id === b.id)
            ? s.customBudgets.map((x) => (x.id === b.id ? b : x))
            : [...s.customBudgets, b],
        })),
      removeCustomBudget: (id) =>
        set((s) => ({ customBudgets: s.customBudgets.filter((b) => b.id !== id) })),

      // Categories
      categories: [],
      setCategories: (categories) => set({ categories }),
      upsertCategory: (cat) =>
        set((s) => ({
          categories: s.categories.some((c) => c.id === cat.id)
            ? s.categories.map((c) => (c.id === cat.id ? cat : c))
            : [...s.categories, cat],
        })),
      removeCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      // Transactions
      transactions: [],
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (tx) =>
        set((s) => ({ transactions: [tx, ...s.transactions] })),
      removeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      // Ikimina
      ikiminas: [],
      setIkiminas: (ikiminas) => set({ ikiminas }),
      upsertIkimina: (ik) =>
        set((s) => ({
          ikiminas: s.ikiminas.some((x) => x.id === ik.id)
            ? s.ikiminas.map((x) => (x.id === ik.id ? ik : x))
            : [...s.ikiminas, ik],
        })),
      removeIkimina: (id) =>
        set((s) => ({ ikiminas: s.ikiminas.filter((i) => i.id !== id) })),

      ikiminaContributions: [],
      setIkiminaContributions: (ikiminaContributions) => set({ ikiminaContributions }),
      addIkiminaContribution: (c) =>
        set((s) => ({ ikiminaContributions: [c, ...s.ikiminaContributions] })),
      removeIkiminaContribution: (id) =>
        set((s) => ({ ikiminaContributions: s.ikiminaContributions.filter((c) => c.id !== id) })),

      // Trips
      trips: [],
      setTrips: (trips) => set({ trips }),
      upsertTrip: (t) =>
        set((s) => ({
          trips: s.trips.some((x) => x.id === t.id)
            ? s.trips.map((x) => (x.id === t.id ? t : x))
            : [...s.trips, t],
        })),
      removeTrip: (id) =>
        set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),

      // Language
      lang: "en",
      setLang: (lang) => set({ lang }),

      // Online
      isOnline: true,
      setIsOnline: (isOnline) => set({ isOnline }),

      // UI
      isSidebarOpen: false,
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

      // Logout reset — clears all runtime data; lang preference is preserved
      resetAppData: () =>
        set({
          user: null,
          household: null,
          activeBudget: null,
          activeAccountType: "common",
          customBudgets: [],
          categories: [],
          transactions: [],
          ikiminas: [],
          ikiminaContributions: [],
          trips: [],
        }),
    }),
    {
      name: "umutungo-store",
      partialize: (s) => ({
        user: s.user,
        lang: s.lang,
        household: s.household,
        activeBudget: s.activeBudget,
        activeAccountType: s.activeAccountType,
      }),
    }
  )
);

// ─── Derived selectors ────────────────────────────────────────────────────────

export const useLang = () => useAppStore((s) => s.lang);
export const useUser = () => useAppStore((s) => s.user);
export const useHousehold = () => useAppStore((s) => s.household);
export const useActiveBudget = () => useAppStore((s) => s.activeBudget);
export const useActiveAccountType = () => useAppStore((s) => s.activeAccountType);
export const useCategories = () => useAppStore((s) => s.categories);
export const useTransactions = () => useAppStore((s) => s.transactions);
export const useIsOnline = () => useAppStore((s) => s.isOnline);
export const useIkiminas = () => useAppStore((s) => s.ikiminas);
export const useCustomBudgets = () => useAppStore((s) => s.customBudgets);
export const useTrips = () => useAppStore((s) => s.trips);
