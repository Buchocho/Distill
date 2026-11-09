/**
 * POST /api/v1/receipts/{receiptId}/save: save a reviewed receipt (SPEC.md rules 7 to 9, stories
 * US2 and US5). Body: { storeName, receiptNumber, purchaseDate, totalCents, paidBy, items: [{ name, priceCents,
 * discountCents, categoryId, proposedCategory }] }. discountCents is information only (rule 6).
 * Refused if the same store and receipt number is already saved in the group (rule 9c). Items may have no category. Members only. Documented in docs/API.md.
 */

import { readJson, withUser } from "@/server/api";
import { saveReceipt, type SaveReceiptInput } from "@/server/services/receipts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ receiptId: string }> };

/** Text or null. Anything else becomes null. */
const textOrNull = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/**
 * Turns the request body into the service's input. Wrong types become empty values, so the caller
 * gets the normal validation messages rather than a crash (same approach as POST /groups).
 */
function toSaveInput(body: Record<string, unknown>, callerId: string): SaveReceiptInput {
  const list = Array.isArray(body.items) ? body.items : [];
  return {
    storeName: typeof body.storeName === "string" ? body.storeName : "",
    receiptNumber: textOrNull(body.receiptNumber),
    purchaseDate: textOrNull(body.purchaseDate),
    totalCents: typeof body.totalCents === "number" ? body.totalCents : null,
    paidBy: typeof body.paidBy === "string" && body.paidBy ? body.paidBy : callerId,
    items: list.map((raw) => {
      const i = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      return {
        name: typeof i.name === "string" ? i.name : "",
        priceCents: typeof i.priceCents === "number" ? i.priceCents : Number.NaN,
        discountCents: typeof i.discountCents === "number" ? i.discountCents : null,
        categoryId: textOrNull(i.categoryId),
        proposedCategory: textOrNull(i.proposedCategory),
      };
    }),
  };
}

export const POST = withUser<Ctx>(async (user, request, { params }) => {
  const { receiptId } = await params;
  return saveReceipt(user.id, receiptId, toSaveInput(await readJson(request), user.id));
});
