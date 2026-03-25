# UmutungoApp — Sprint 1 Task Breakdown

> **Goal:** Ship a fully usable offline-first MVP that covers the Standard Monthly Budget, sub-budget drill-downs, Household/Personal account switching, Custom Budgets, and the Ikimina tracker.
>
> **Duration:** 2 weeks
> **Stack:** Next.js 15 · TypeScript · TailwindCSS · Supabase · Zustand · Dexie (IndexedDB) · PWA

---

## Epic 1 — Foundation & Auth

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 1.1 | Scaffold Next.js 15 + Tailwind + shadcn/ui project (`bugeti/`) | Dev | 2h | ✅ Done |
| 1.2 | Configure Supabase project (auth, RLS, storage bucket) | Dev | 1h | ✅ Done |
| 1.3 | Run `supabase/schema.sql` — all tables + views + RLS policies | Dev | 30m | ✅ Done |
| 1.4 | Implement email/phone sign-up + sign-in with OTP fallback | Dev | 3h | ✅ Done |
| 1.5 | Auto-create `profiles` row on first sign-in (DB trigger) | Dev | 30m | ✅ Done |
| 1.6 | Set up Zustand store with `persist` middleware | Dev | 1h | ✅ Done |
| 1.7 | Set up Dexie IndexedDB schema (offline-first cache) | Dev | 1h | ✅ Done |
| 1.8 | Configure PWA (next-pwa + service worker + manifest) | Dev | 1h | ✅ Done |

---

## Epic 2 — Onboarding

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 2.1 | Step 1 — Choose household type (new vs. join) | Dev | 2h | ✅ Done |
| 2.2 | Step 2 — Set monthly income (Revenue) | Dev | 1h | ✅ Done |
| 2.3 | Step 3 — Pre-fill Rwandan expense categories with amounts | Dev | 2h | ✅ Done |
| 2.4 | Step 4 — Optional: invite household member (generate invite code) | Dev | 2h | 🔲 Pending |
| 2.5 | Join household via 6-char invite code UI | Dev | 1h | 🔲 Pending |

---

## Epic 3 — Standard Monthly Budget (Home Screen)

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 3.1 | Dashboard: Revenue line at the top | Dev | 1h | ✅ Done |
| 3.2 | Dashboard: Expense lines (planned vs. actual per category) | Dev | 2h | ✅ Done |
| 3.3 | Dashboard: Grand Total auto-computed | Dev | 30m | ✅ Done |
| 3.4 | Dashboard: **Savings = Revenue − Grand Total** (green highlight) | Dev | 30m | ✅ Done |
| 3.5 | Dashboard: Month selector to navigate across months | Dev | 2h | 🔲 Pending |
| 3.6 | Dashboard: School term alert (Jan/May/Sep) | Dev | 30m | ✅ Done |
| 3.7 | Dashboard: Account switcher (Household 🏠 / Personal 🔒) | Dev | 1h | ✅ Done |
| 3.8 | Category card: expand/collapse sub-budgets inline | Dev | 2h | ✅ Done |
| 3.9 | Category detail: planned vs. actual + progress bar | Dev | 1h | ✅ Done |
| 3.10 | `useBudgetStats` hook: include revenue, savings, sub-category rollups | Dev | 1h | ✅ Done |

---

## Epic 4 — Sub-Budgets (Drill-Down)

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 4.1 | DB: `categories.parent_id` + `level` (max 3 levels) | Dev | 30m | ✅ Done |
| 4.2 | Category detail page: sub-category rows with expand/collapse | Dev | 2h | ✅ Done |
| 4.3 | Add sub-category UI (`/budget/category/new?parent=<id>`) | Dev | 2h | 🔲 Pending |
| 4.4 | Sub-total roll-up: parent planned_amount = sum of children | Dev | 1h | 🔲 Pending |
| 4.5 | Unallocated balance shown ("RWF 120,000 still unassigned") | Dev | 1h | ✅ Done |
| 4.6 | Level-3 sub-sub-categories support | Dev | 1h | 🔲 Pending |

---

## Epic 5 — Transactions

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 5.1 | Transaction log: list with search + filter | Dev | 2h | ✅ Done |
| 5.2 | New transaction form (expense + income) | Dev | 2h | ✅ Done |
| 5.3 | **Payment method field**: MTN MoMo / Airtel Money / Bank / Cash | Dev | 1h | ✅ Done |
| 5.4 | Tag display on transaction items + category detail | Dev | 1h | ✅ Done |
| 5.5 | Receipt OCR upload (Tesseract.js) | Dev | 3h | ✅ Done |
| 5.6 | Offline queue: mark `synced=false`, sync when online | Dev | 2h | ✅ Done |
| 5.7 | Budget threshold alert toast: "80% of Groceries used" | Dev | 1h | 🔲 Pending |

---

## Epic 6 — Custom Budget Types

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 6.1 | DB: `budgets.budget_type` + `status` + `total_envelope` | Dev | 30m | ✅ Done |
| 6.2 | Custom Budgets list page (`/custom-budgets`) | Dev | 2h | ✅ Done |
| 6.3 | New custom budget sheet (type picker + dates + envelope) | Dev | 2h | ✅ Done |
| 6.4 | Custom budget detail: own line items + sub-budgets | Dev | 3h | 🔲 Pending |
| 6.5 | Status transitions: Planning → Active → Closed | Dev | 1h | 🔲 Pending |
| 6.6 | Custom budget types: Travel ✈️ / Vacation 🏖️ / Event 🎉 / Project 🏗️ / School Year 📚 | Dev | 1h | ✅ Done |

---

## Epic 7 — Common & Private Accounts

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 7.1 | DB: `budgets.account_type` (common / private) + RLS | Dev | 30m | ✅ Done |
| 7.2 | Account switcher UI (pill toggle in header) | Dev | 1h | ✅ Done |
| 7.3 | Filter dashboard categories + budgets by active account type | Dev | 1h | 🔲 Pending |
| 7.4 | Private budget: only visible to creator (RLS enforced) | Dev | 1h | ✅ Done |
| 7.5 | Transfer amount between private → common account UI | Dev | 2h | 🔲 Pending |
| 7.6 | Household member management (invite, list, remove) | Dev | 3h | 🔲 Pending |

---

## Epic 8 — Ikimina Tracker

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 8.1 | DB: `ikimina` + `ikimina_contributions` tables + RLS | Dev | 30m | ✅ Done |
| 8.2 | Ikimina list page (`/ikimina`) | Dev | 2h | ✅ Done |
| 8.3 | New Ikimina form (name, members, amount/cycle, start date) | Dev | 2h | ✅ Done |
| 8.4 | Add contribution (member, amount, payment method) | Dev | 1h | ✅ Done |
| 8.5 | Cycle progress bar (collected / total members) | Dev | 1h | ✅ Done |
| 8.6 | Contribution history list | Dev | 1h | ✅ Done |
| 8.7 | Status: Active / Paused / Completed | Dev | 30m | ✅ Done |

---

## Epic 9 — Reports

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 9.1 | Reports page (`/reports`) | Dev | 2h | ✅ Done |
| 9.2 | Income vs. Expense CSS bar chart (last 6 months) | Dev | 2h | ✅ Done |
| 9.3 | Savings rate % | Dev | 30m | ✅ Done |
| 9.4 | Top 5 spending categories | Dev | 1h | ✅ Done |
| 9.5 | Payment method breakdown (MoMo / Airtel / Bank / Cash) | Dev | 1h | ✅ Done |
| 9.6 | Month-over-month table | Dev | 1h | ✅ Done |
| 9.7 | Export to PDF / CSV | Dev | 3h | 🔲 Sprint 2 |

---

## Epic 10 — Polish & PWA

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 10.1 | EN ↔ RW language toggle (all screens) | Dev | 2h | ✅ Done |
| 10.2 | RWF formatting with comma separators (800,000 RWF) | Dev | 30m | ✅ Done |
| 10.3 | Offline banner + sync-on-reconnect toast | Dev | 1h | ✅ Done |
| 10.4 | App name update: Bugeti → Umutungo | Dev | 30m | ✅ Done |
| 10.5 | PWA install prompt ("Add to Home Screen") | Dev | 1h | 🔲 Pending |
| 10.6 | Push notifications: budget threshold alerts | Dev | 3h | 🔲 Sprint 2 |
| 10.7 | Settings page: language, members, notifications | Dev | 2h | 🔲 Pending |
| 10.8 | Dark mode support | Dev | 1h | ✅ Done |

---

## Sprint 1 Acceptance Criteria

- [ ] User can sign up, complete onboarding, and see a populated dashboard
- [ ] Revenue, Total Expenses, and **Savings (green)** are visible on the home screen
- [ ] User can expand any category to see sub-budget breakdown
- [ ] User can log a transaction with payment method (MTN MoMo, etc.)
- [ ] User can switch between Household and Personal account views
- [ ] User can create a Travel / Event / Project custom budget
- [ ] User can create an Ikimina and log contributions
- [ ] Reports page shows income vs. expense chart + savings rate
- [ ] App works fully offline, syncs when reconnected
- [ ] All UI text available in English + Kinyarwanda

---

## Sprint 2 Preview (backlog)

- Month selector on dashboard (navigate past months)
- Sub-budget add form fully wired to DB
- Custom budget detail page (own line items)
- Account type filtering wired end-to-end
- Household member invite & management UI
- Push notifications for budget alerts
- PDF/CSV export
- Advanced Ikimina: payout order, reminders
- Ubudehe-aware category suggestions
- Supabase real-time sync for Common accounts

---

*Generated: 2026-03-24*
