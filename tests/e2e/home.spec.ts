import { expect, test } from "@playwright/test";

test("home page loads at phone width", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Distill" })).toBeVisible();
});
