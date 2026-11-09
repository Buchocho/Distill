// End to end tests for the receipt screens and API that can run without signing in (story US2).
// The signed in scan, read and save flow is checked by hand on the deployed app, because tests
// cannot reach the real Google sign in or the real Gemini API (CLAUDE.md).

import { expect, test } from "@playwright/test";

const GROUP = "00000000-0000-0000-0000-000000000001";
const RECEIPT = "00000000-0000-0000-0000-000000000002";

test("signed out visitors to a receipt are sent to sign in and brought back", async ({ page }) => {
  await page.goto(`/groups/${GROUP}/receipts/${RECEIPT}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/groups/${GROUP}/receipts/${RECEIPT}`)}`));
});

test("the receipt API refuses callers who are not signed in", async ({ request }) => {
  for (const [method, url] of [
    ["GET", `/api/v1/groups/${GROUP}/receipts`],
    ["POST", `/api/v1/groups/${GROUP}/receipts`],
    ["POST", `/api/v1/receipts/${RECEIPT}/read`],
    ["POST", `/api/v1/receipts/${RECEIPT}/save`],
    ["DELETE", `/api/v1/receipts/${RECEIPT}`],
    ["GET", `/api/v1/receipts/${RECEIPT}/photos/1`],
    ["PATCH", `/api/v1/me`],
  ] as const) {
    const res = await request.fetch(url, { method, data: method === "POST" || method === "PATCH" ? {} : undefined, maxRedirects: 0 });
    expect(res.status(), `${method} ${url}`).toBe(401);
  }
});
