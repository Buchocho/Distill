// End to end tests for signed out flows: Sign in screen, redirect to sign in, sign in error (story US1),
// and the public Privacy and Terms pages (rule 1b).
// Signed in flows cannot run here yet because tests do not reach the real Google sign in.

import { expect, test } from "@playwright/test";

test("sign in screen shows the product and the Google button at phone width", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Shared shopping, sorted.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("signed out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/groups/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fgroups%2Fnew/);
});

test("a failed sign in shows an error", async ({ page }) => {
  await page.goto("/login?error=1");
  // Filter by text: Next.js adds its own role="alert" announcer, which sometimes exists at this moment.
  await expect(page.getByRole("alert").filter({ hasText: "Sign in failed" })).toBeVisible();
});

test("Privacy and Terms open from Sign in without signing in (rule 1b)", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();
  await expect(page.getByText("up202503423@up.pt").first()).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "No money moves in Distill" })).toBeVisible();
});

test("signed out visitors to Your groups are sent to sign in (rule 3b)", async ({ page }) => {
  await page.goto("/groups");
  await expect(page).toHaveURL(/\/login\?next=%2Fgroups$/);
});
