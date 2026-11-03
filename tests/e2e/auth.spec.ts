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
  await expect(page.getByRole("alert")).toContainText("Sign in failed");
});
