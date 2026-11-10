// End to end tests for the receipt, category and balance screens and API that can run without
// signing in (stories US2 to US4, US7 to US9).
// The signed in scan, read and save flow is checked by hand on the deployed app, because tests
// cannot reach the real Google sign in or the real Gemini API (CLAUDE.md).

import { expect, test } from "@playwright/test";

const GROUP = "00000000-0000-0000-0000-000000000001";
const RECEIPT = "00000000-0000-0000-0000-000000000002";

test("signed out visitors to a receipt are sent to sign in and brought back", async ({ page }) => {
  await page.goto(`/groups/${GROUP}/receipts/${RECEIPT}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/groups/${GROUP}/receipts/${RECEIPT}`)}`));
});

test("signed out visitors to Payments are sent to sign in and brought back (US9)", async ({ page }) => {
  for (const path of [`/groups/${GROUP}/balance/payments`]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  }
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
    ["GET", `/api/v1/groups/${GROUP}/categories`],
    ["POST", `/api/v1/groups/${GROUP}/categories`],
    ["GET", `/api/v1/groups/${GROUP}/categories/history`],
    ["GET", `/api/v1/groups/${GROUP}/to-sort`],
    ["GET", `/api/v1/groups/${GROUP}/balance`],
    ["GET", `/api/v1/categories/${RECEIPT}`],
    ["PUT", `/api/v1/categories/${RECEIPT}/rule`],
    ["PATCH", `/api/v1/items/${RECEIPT}`],
    ["DELETE", `/api/v1/items/${RECEIPT}`],
    ["PATCH", `/api/v1/groups/${GROUP}`],
    ["GET", `/api/v1/groups/${GROUP}/periods`],
    ["GET", `/api/v1/periods/${RECEIPT}`],
    ["POST", `/api/v1/periods/${RECEIPT}/agree`],
    ["GET", `/api/v1/groups/${GROUP}/payments`],
    ["GET", `/api/v1/periods/${RECEIPT}/payments`],
    ["POST", `/api/v1/periods/${RECEIPT}/payments`],
    ["POST", `/api/v1/payments/${RECEIPT}/confirm`],
    ["DELETE", `/api/v1/payments/${RECEIPT}`],
  ] as const) {
    const res = await request.fetch(url, { method, data: method === "GET" || method === "DELETE" ? undefined : {}, maxRedirects: 0 });
    expect(res.status(), `${method} ${url}`).toBe(401);
  }
});
