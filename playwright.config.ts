/**
 * End to end test settings: tests run in a phone sized browser (iPhone 13), as CLAUDE.md requires.
 * Run with `npm run test:e2e`. Tests live in tests/e2e.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    ...devices["iPhone 13"],
    browserName: "chromium",
    // Optional: point to a preinstalled Chromium when Playwright's own download is not available.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: "npm run dev",
    // Tests run signed out against a fake Supabase address; nothing reaches a real service.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://test:test@127.0.0.1:6543/test",
    },
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
