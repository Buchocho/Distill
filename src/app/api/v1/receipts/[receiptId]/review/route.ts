/**
 * PATCH /api/v1/receipts/{receiptId}/review: keep the corrections made so far on a receipt that is
 * still being reviewed (SPEC.md rule 8b, story US2), so nobody has to start again after leaving the
 * screen. Body: { storeName, receiptNumber, purchaseDate, totalCents, totalUnclear, dateUnclear,
 * items: [{ id, name, priceCents, discountCents, categoryId, proposedCategory, unclear }] }.
 * A null priceCents is a price the person has not filled in yet. Nothing here reaches the group's
 * balance: that counts only saved receipts. The payer only, and only before the receipt is saved.
 * Documented in docs/API.md.
 */

import { readJson, withUser } from "@/server/api";
import { keepCorrections, type CorrectionsInput } from "@/server/services/receipts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ receiptId: string }> };

/** Text or null. Anything else becomes null. */
const textOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/**
 * Turns the request body into the service's input. Wrong types become empty values, so the caller
 * gets the normal validation messages rather than a crash (same approach as the save route).
 */
function toCorrections(body: Record<string, unknown>): CorrectionsInput {
  const list = Array.isArray(body.items) ? body.items : [];
  return {
    storeName: typeof body.storeName === "string" ? body.storeName : "",
    receiptNumber: textOrNull(body.receiptNumber),
    purchaseDate: textOrNull(body.purchaseDate),
    totalCents: typeof body.totalCents === "number" ? body.totalCents : null,
    totalUnclear: body.totalUnclear === true,
    dateUnclear: body.dateUnclear === true,
    items: list.map((raw) => {
      const i = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      return {
        id: typeof i.id === "string" ? i.id : "",
        name: typeof i.name === "string" ? i.name : "",
        priceCents: typeof i.priceCents === "number" ? i.priceCents : null,
        discountCents: typeof i.discountCents === "number" ? i.discountCents : null,
        categoryId: textOrNull(i.categoryId),
        proposedCategory: textOrNull(i.proposedCategory),
        unclear: i.unclear === true,
      };
    }),
  };
}

export const PATCH = withUser<Ctx>(async (user, request, { params }) => {
  const { receiptId } = await params;
  return keepCorrections(user.id, receiptId, toCorrections(await readJson(request)));
});
