import { addDays, addMonths, addWeeks, differenceInCalendarDays, parseISO, format, isWithinInterval } from "date-fns";
import type { Ikimina, IkiminaContribution } from "./types";

export interface IkiminaRoundInsights {
  /** 1-indexed round number (e.g. "Round 3") */
  currentRound: number;
  roundStart: string;   // ISO date
  roundEnd: string;     // ISO date
  /** Unique member names who paid during the current round */
  paidMembers: string[];
  paidCount: number;
  expectedCount: number;
  missingCount: number;
  progressPercent: number;
  isComplete: boolean;
  /** ISO date when the current round closes / payout happens */
  nextPayoutDate: string;
  /** Total pot value: contribution_amount × total_members */
  totalPot: number;
  /**
   * Members sorted by first-ever contribution date — used as rotation order.
   * Index into this array (using round % length) gives the projected recipient.
   */
  rotationOrder: string[];
  /** Projected next payout recipient based on rotation */
  nextRecipient: string | null;
}

export function getIkiminaInsights(
  ikimina: Ikimina,
  contributions: IkiminaContribution[]
): IkiminaRoundInsights {
  const mine = contributions.filter((c) => c.ikimina_id === ikimina.id);
  const start = parseISO(ikimina.start_date);
  const today = new Date();

  // ── Determine current round ───────────────────────────────────────────────
  let currentRound = 0;
  let roundStart: Date = start;
  let roundEnd: Date;

  if (ikimina.cycle === "monthly") {
    const monthsElapsed = Math.max(
      0,
      (today.getFullYear() - start.getFullYear()) * 12 +
        today.getMonth() -
        start.getMonth()
    );
    currentRound = monthsElapsed;
    roundStart = addMonths(start, monthsElapsed);
    roundEnd = addDays(addMonths(start, monthsElapsed + 1), -1);
  } else {
    // weekly
    const weeksElapsed = Math.max(
      0,
      Math.floor(differenceInCalendarDays(today, start) / 7)
    );
    currentRound = weeksElapsed;
    roundStart = addWeeks(start, weeksElapsed);
    roundEnd = addDays(addWeeks(start, weeksElapsed + 1), -1);
  }

  // ── Contributions in this round ───────────────────────────────────────────
  const roundContribs = mine.filter((c) => {
    try {
      return isWithinInterval(parseISO(c.date), { start: roundStart, end: roundEnd });
    } catch {
      return false;
    }
  });

  const paidMembers = [...new Set(roundContribs.map((c) => c.member_name))];
  const paidCount = paidMembers.length;
  const expectedCount = ikimina.total_members;
  const missingCount = Math.max(0, expectedCount - paidCount);
  const progressPercent =
    expectedCount > 0
      ? Math.min(100, Math.round((paidCount / expectedCount) * 100))
      : 0;
  const isComplete = paidCount >= expectedCount;
  const totalPot = ikimina.contribution_amount * ikimina.total_members;

  // Payout date = last day of the current round
  const nextPayoutDate = format(roundEnd, "yyyy-MM-dd");

  // ── Infer rotation order from contribution history ────────────────────────
  // Sort all contributions by date and build a "first seen" index per member
  const firstSeen: Record<string, string> = {};
  for (const c of [...mine].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!firstSeen[c.member_name]) firstSeen[c.member_name] = c.date;
  }
  const rotationOrder = Object.keys(firstSeen).sort((a, b) =>
    firstSeen[a].localeCompare(firstSeen[b])
  );

  // Recipient rotates each round; only meaningful once we have enough history
  const nextRecipient =
    rotationOrder.length > 0
      ? rotationOrder[currentRound % rotationOrder.length]
      : null;

  return {
    currentRound: currentRound + 1,
    roundStart: format(roundStart, "yyyy-MM-dd"),
    roundEnd: format(roundEnd, "yyyy-MM-dd"),
    paidMembers,
    paidCount,
    expectedCount,
    missingCount,
    progressPercent,
    isComplete,
    nextPayoutDate,
    totalPot,
    rotationOrder,
    nextRecipient,
  };
}
