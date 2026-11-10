"use client";

/**
 * Tells the server the device's date (SPEC.md rule 2c). Runs in the browser on every page.
 * Stores today's date in the distill_today cookie, which the server reads to decide whether a
 * period's last day has passed (src/server/services/periodClock.ts). Draws nothing.
 */

import { useEffect } from "react";
import { deviceToday } from "@/domain/dates";

export function DeviceDate() {
  useEffect(() => {
    // One day is enough: the cookie is refreshed on every visit.
    document.cookie = `distill_today=${deviceToday()}; path=/; max-age=86400; samesite=lax`;
  }, []);
  return null;
}
