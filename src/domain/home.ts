/**
 * The Balance line on Home: one short notice saying the most pressing thing to do in Balance.
 *
 * Why it matters: members open Home first. They know when the month closes; what they need to see
 * is what is waiting for them (decided 10 Nov 2026, extends SPEC.md rule 26 and the Home screen 0c):
 * a payment to confirm, a payment of theirs that was declined, a closed period to agree, a payment
 * to record. Only when none of these applies does Home say when the open period closes. No amounts
 * are shown on Home (approved design). Pure function, no database.
 */

/** What is waiting for the reader in Balance, gathered by the payments service. */
export interface BalanceSituation {
  /** First names of people whose payments wait for the reader to confirm. */
  confirmFrom: readonly string[];
  /** The most recent payment of the reader's that was declined and not yet recorded again. */
  declined: { by: string; month: string } | null;
  /** The month of a closed period the reader has not agreed yet. */
  toAgree: string | null;
  /** A payment the reader still has to record in an agreed period. */
  toPay: { to: string; month: string } | null;
  /** The open period: its month and the days until it closes. */
  closes: { month: string; daysLeft: number } | null;
}

/** "Izu", "Izu and Sam", "Izu, Sam and Rui". */
function names(list: readonly string[]): string {
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * Picks the one line to show, most pressing first: confirm a payment, a declined payment, agree a
 * closed period, record a payment, then when the open period closes. Null when there is nothing.
 */
export function balanceLine(s: BalanceSituation): string | null {
  if (s.confirmFrom.length > 0) return `Confirm payment${s.confirmFrom.length > 1 ? "s" : ""} from ${names(s.confirmFrom)}`;
  if (s.declined) return `${s.declined.by} declined your payment for ${s.declined.month}`;
  if (s.toAgree) return `${s.toAgree} is closed · agree your amount`;
  if (s.toPay) return `Record your payment to ${s.toPay.to} for ${s.toPay.month}`;
  if (s.closes) return `${s.closes.month} closes ${s.closes.daysLeft === 0 ? "today" : `in ${s.closes.daysLeft} day${s.closes.daysLeft === 1 ? "" : "s"}`}`;
  return null;
}

/** True when the line asks the reader to do something, so Home can mark it. */
export function needsAction(s: BalanceSituation): boolean {
  return s.confirmFrom.length > 0 || s.declined !== null || s.toAgree !== null || s.toPay !== null;
}
