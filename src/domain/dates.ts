/**
 * Date display and checks shared by the server and the browser.
 *
 * What it holds: the app's date style ("28 Sep 2026") and the check that flags a receipt date
 * that is probably misread.
 *
 * Why it matters: shops print dates in different orders. Intermarché prints year first
 * (26/10/18 is 18 Oct 2026), which was read as 26 Oct in testing on 9 Nov 2026. The reading is
 * told today's date to choose well, and this check catches what it still gets wrong, so the
 * person reviewing is asked to look (SPEC.md rule 8). Pure code, usable on both sides.
 * Tests: tests/unit/dates.test.ts
 */

/** How far back a receipt date can be before the review screen asks to check it. */
export const OLD_RECEIPT_DAYS = 60;

/** "28 Sep 2026" from YYYY-MM-DD. Built by hand so every phone and the server show the same. */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}`;
}

/**
 * True when a receipt date looks wrong: after today, or more than 60 days before it.
 * Both dates are YYYY-MM-DD; today is the device's date (SPEC.md rule 2c).
 */
export function dateLooksWrong(receiptDate: string, today: string): boolean {
  const days = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${receiptDate}T00:00:00Z`)) / 86_400_000;
  return days < 0 || days > OLD_RECEIPT_DAYS;
}

/** Today's date on this device as YYYY-MM-DD (SPEC.md rule 2c). For browser code. */
export function deviceToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
