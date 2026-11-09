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
 * price is what was paid; tax lines are items) and 7 (category at product type level, from the
 * group's list or a proposed new one).
 */

import "server-only";

/** The answer format Gemini must follow. Amounts are text so no rounding happens on the way. */
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    store: { type: "STRING", nullable: true },
    date: { type: "STRING", nullable: true, description: "Purchase date as YYYY-MM-DD" },
    total: { type: "STRING", nullable: true, description: "Final total paid, digits with a point, e.g. 12.90" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          price: { type: "STRING", description: "Price paid for this item after its own discount, digits with a point" },
          discount: { type: "STRING", nullable: true, description: "Discount on this item, digits with a point, or null" },
          category: { type: "STRING", nullable: true },
        },
        required: ["name", "price"],
      },
    },
  },
  required: ["items"],
};

/** The instructions sent with every photo. The group's own category names are added so they are reused. */
function instructions(categoryNames: readonly string[]): string {
  const list = categoryNames.length > 0 ? categoryNames.map((n) => `- ${n}`).join("\n") : "(none yet)";
  return [
    "You read shop receipts for an app that splits shared shopping between people.",
    "Return the store name, the purchase date (YYYY-MM-DD), the final total paid, and every line item.",
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
    "Tax printed on its own line (for example sales tax or GST) is its own item with the category Tax.",
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
    "The group's categories:",
    list,
  ].join("\n");
}

/**
 * Sends the photos of one receipt to Gemini and returns its JSON answer, unchecked.
 * Throws if Gemini cannot be reached, refuses, or does not answer in JSON within 50 seconds;
 * the caller then marks the receipt "failed" so the user can retry (SPEC.md rule 10).
 */
export async function readReceiptPhotos(
  photos: readonly { bytes: Buffer; mimeType: string }[],
  categoryNames: readonly string[],
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
              { text: instructions(categoryNames) },
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
  if (!response.ok) throw new Error(`Gemini answered ${response.status}: ${(await response.text()).slice(0, 300)}`);

  const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  // Without the answer format, some models wrap the JSON in a ```json block; take what is inside.
  const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(json);
}
