/**
 * Receipt reading with Google Gemini.
 *
 * What it holds: one function that sends receipt photos to Gemini and returns its raw answer.
 *
 * Why it matters: reading replaces typing (story US2). The model is chosen by the GEMINI_MODEL
 * setting in Vercel, not in code, so it can be moved up to a stronger model if readings are poor
 * without a code change. Chosen on 7 Nov 2026: gemini-3.5-flash-lite (the 2.5 models refused
 * this API key; see docs/WORKLOG.md). The answer is not trusted here: src/domain/receipts.ts
 * (parseReading) checks it. Called only from the server, so the API key never reaches the browser
 * (architecture rule 7). Tests never call this; they use the sample answers in tests/fixtures.
 *
 * Business rules: SPEC.md rules 6 (what is read; an item's discount is attached to it and its
 * price is what was paid; tax lines are items only when tax is added on top, rule 6a), 8a (never make up a number: unsure values are
 * flagged and unreadable prices left empty, added 10 Nov 2026) and 7 (category at product type level, from the
 * group's list or a proposed new one).
 */

import "server-only";

/**
 * Gemini refused because the key's quota or spend cap was reached (HTTP 429). Kept apart from other
 * failures so the screen can say "busy, try again in a minute" instead of "couldn't read" (rule 10a).
 */
export class GeminiBusyError extends Error {}

/** The answer format Gemini must follow. Amounts are text so no rounding happens on the way. */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    store: { type: "STRING", nullable: true },
    receipt_number: { type: "STRING", nullable: true, description: "The receipt's own document or transaction number as printed" },
    date: { type: "STRING", nullable: true, description: "Purchase date as YYYY-MM-DD" },
    date_unclear: { type: "BOOLEAN", description: "True if any part of the date was faded, cut off or guessed" },
    total: { type: "STRING", nullable: true, description: "Final total paid, digits with a point, e.g. 12.90" },
    total_unclear: { type: "BOOLEAN", description: "True if any digit of the total was faded, cut off or guessed" },
    subtotal: { type: "STRING", nullable: true, description: "Amount before tax if printed (Bill Amount, Subtotal, Net), digits with a point" },
    tax_total: { type: "STRING", nullable: true, description: "Total tax printed on the receipt, digits with a point, or null" },
    tax_included: { type: "BOOLEAN", description: "True if the item prices already include the tax, so the items alone add up to the final total" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price: { type: "STRING", nullable: true, description: "Price paid for this item after its own discount, digits with a point; null if it cannot be read" },
          price_unclear: { type: "BOOLEAN", description: "True if any digit of this price was faded, cut off or guessed" },
          discount: { type: "STRING", nullable: true, description: "Discount on this item, digits with a point, or null" },
          category: { type: "STRING", nullable: true },
        },
        required: ["name"],
      },
    },
  },
  required: ["items"],
};

/**
 * The instructions sent with every photo. The group's own category names are added so they are
 * reused, and today's date so a date printed in an unusual order can be read correctly.
 */
function instructions(categoryNames: readonly string[], today: string): string {
  const list = categoryNames.length > 0 ? categoryNames.map((n) => `- ${n}`).join("\n") : "(none yet)";
  return [
    "You read shop receipts for an app that splits shared shopping between people.",
    "Return the store name, the purchase date (YYYY-MM-DD), the final total paid, the receipt number, and every line item.",
    "",
    `Today is ${today}. A receipt is almost always from today or the last few weeks.`,
    "Shops print dates in different orders: day/month/year, month/day/year, and year/month/day",
    "(for example Intermarché prints 26/10/18 for 18 October 2026). When a date could be read more",
    "than one way, choose the reading that falls on or shortly before today.",
    "",
    "The receipt number is the receipt's own document or transaction number, as printed",
    "(for example FS 0123/456789, Fatura simplificada no., Trans #, Receipt #). Not a tax or VAT",
    "number, not the ATCUD code, not a phone number, not a card number. Null if there is none.",
    "Write each item name as printed. Write amounts with digits and a point, for example 12.90.",
    "",
    "Discounts on an item are never items of their own. Attach each one to the item it belongs to:",
    "- price is what was actually paid for that item after its discount;",
    "- discount is the amount taken off, as a positive number, or null if there was none.",
    "Shops print discounts in two ways; give the same result for both:",
    "- the item line already shows the reduced price and a discount line follows for information",
    "  (for example Snack Twix 1.08 then Desconto 0.37): price 1.08, discount 0.37;",
    "- the item line shows the full price and a discount line takes money off",
    "  (for example Snack Twix 1.45 then Discount -0.37): price 1.08, discount 0.37.",
    "Check which way the receipt works: the item prices must add up to the final total.",
    "A discount on the whole receipt that belongs to no item (a voucher, a coupon on the total)",
    "is its own item with a negative price.",
    "Tax: first work out how this receipt charges it.",
    "- Tax added on top (the items add up to the subtotal and the tax is added to reach the total):",
    "  list the tax as its own item with the category Tax, and set tax_included to false.",
    "- Tax already inside the item prices (the items alone add up to the final total, and the tax",
    "  lines only show how much of it was tax, as in many Nigerian and European receipts):",
    "  do NOT list the tax as an item, set tax_included to true and give the tax in tax_total.",
    "Always give subtotal (the amount before tax, if printed) and tax_total, so the app can check the sums.",
    "Amounts can use a comma or a point to group thousands (9,100.00 or 9.100,00 is nine thousand",
    "one hundred). Read the whole number; never drop the thousands.",
    "Do not list subtotals, payment lines, change or loyalty points as items.",
    "",
    "Give each item a category at the level of the product type: what the thing is, not where the",
    "shop puts it and not its brand. The people sharing decide who pays for each category, so",
    "products that one person might buy only for themselves must be in their own category.",
    "Good: Cola, Orange juice, Apple juice, Milk, Oat milk, Chocolate bars, Popcorn, Bread, Eggs.",
    "Too broad (never use shop aisles or sections): Soft drinks, Drinks, Dairy, Snacks, Bakery.",
    "Too narrow (never use brands or pack sizes): Coca-Cola 1.5L, Compal Laranja.",
    "Use one of the group's categories below when it is the same product type, written exactly as listed.",
    "If none is, propose a new category in English at the level above.",
    "If you cannot tell what an item is, set its category to null.",
    "If something cannot be read, set it to null rather than guessing.",
    "",
    "Never make up a number. Faded, smudged, folded or cut off digits are common on these receipts.",
    "For every price, the total and the date, say whether you are sure of every digit:",
    "- If you can read it but any digit is faded, cut off or uncertain, give your best reading",
    "  and set price_unclear (or total_unclear, date_unclear) to true.",
    "- If you cannot read a price at all, set price to null and price_unclear to true.",
    "  Do not fill it in from other numbers on the receipt; the person will check it.",
    "Still list the item by its name, even when its price is missing.",
    "",
    "The group's categories:",
    list,
  ].join("\n");
}

/**
 * Sends the photos of one receipt to Gemini and returns its JSON answer, unchecked. today is the
 * device's date as YYYY-MM-DD (SPEC.md rule 2c), used to read ambiguous dates.
 * Throws if Gemini cannot be reached, refuses, or does not answer in JSON within 50 seconds;
 * the caller then marks the receipt "failed" so the user can retry (SPEC.md rule 10).
 */
export async function readReceiptPhotos(
  photos: readonly { bytes: Buffer; mimeType: string }[],
  categoryNames: readonly string[],
  today: string,
): Promise<unknown> {
  const model = process.env.GEMINI_MODEL;
  const key = process.env.GEMINI_API_KEY;
  if (!model || !key) throw new Error("GEMINI_MODEL or GEMINI_API_KEY is not set");

  // Sends the request. If the model refuses the answer format (a 400), try once more without it:
  // parseReading checks the answer anyway, so the format is a help, not the safety check.
  const send = (withSchema: boolean) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: instructions(categoryNames, today) },
              ...photos.map((p) => ({ inline_data: { mime_type: p.mimeType, data: p.bytes.toString("base64") } })),
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          ...(withSchema ? { responseSchema: RESPONSE_SCHEMA } : {}),
        },
      }),
    });
  let response = await send(true);
  if (response.status === 400) response = await send(false);
  if (response.status === 429) throw new GeminiBusyError(`Gemini quota reached: ${(await response.text()).slice(0, 200)}`);
  if (!response.ok) throw new Error(`Gemini answered ${response.status}: ${(await response.text()).slice(0, 300)}`);

  const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  // Without the answer format, some models wrap the JSON in a ```json block; take what is inside.
  const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(json);
}
