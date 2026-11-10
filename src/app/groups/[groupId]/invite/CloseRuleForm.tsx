"use client";

/**
 * "Accounts close" setting on the members screen (SPEC.md rule 18). Runs in the browser.
 * Any member can change when the group's accounts close. The change applies now: before saving,
 * the form shows the date the current period will end on with the new choice (the first close
 * date from the device's today, rule 2c). Below it, who last changed the setting and when, since
 * there is no admin (rule 3). Saved through PATCH /api/v1/groups/{id}.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { endAfterRuleChange, type CloseRule } from "@/domain/ledgers";
import { deviceToday, longDate } from "@/domain/dates";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function CloseRuleForm({ groupId, rule, day, currentEnd, currentStart, changedBy, changedOn }: {
  groupId: string;
  rule: string;
  day: number | null;
  currentEnd: string | null;
  currentStart: string | null;
  changedBy: string | null;
  changedOn: string | null;
}) {
  const router = useRouter();
  const [r, setR] = useState(rule);
  const [d, setD] = useState<number>(day ?? (rule === "weekly" ? 6 : 1));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const field = "min-h-12 rounded-xl border-[1.5px] border-grey-400 bg-white px-3 text-base text-ink";
  const changed = r !== rule || (r !== "month_end" && d !== day);
  // Where the current period would end with the choice on screen (same rule as the server).
  const newEnd = currentStart ? endAfterRuleChange({ rule: r as CloseRule, day: r === "month_end" ? null : d }, currentStart, deviceToday()) : null;

  // Saves the choice; the server checks it again.
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const res = await fetch(`/api/v1/groups/${groupId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ closeRule: r, closeDay: r === "month_end" ? null : d }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setState("idle");
      return setError("Could not save. Try again.");
    }
    setState("saved");
    router.refresh();
  }

  // The return draws the close choice, the day picker when needed, Save, and a note on when it applies.
  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <label htmlFor="closeRuleSetting" className="text-sm font-bold">Accounts close</label>
      <select id="closeRuleSetting" value={r} onChange={(e) => { setR(e.target.value); setD(e.target.value === "weekly" ? 6 : 1); setState("idle"); }} className={field}>
        <option value="month_end">Last day of the month</option>
        <option value="month_day">A day of the month</option>
        <option value="weekly">Every week</option>
      </select>
      {r === "month_day" && (
        <select aria-label="Day of the month" value={d} onChange={(e) => setD(Number(e.target.value))} className={field}>
          {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>Day {i + 1}</option>)}
        </select>
      )}
      {r === "weekly" && (
        <select aria-label="Day of the week" value={d} onChange={(e) => setD(Number(e.target.value))} className={field}>
          {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
        </select>
      )}
      <button type="submit" disabled={!changed || state === "saving"} className="min-h-12 rounded-xl bg-ink font-extrabold text-paper disabled:opacity-40">
        {state === "saving" ? "Saving..." : "Save"}
      </button>
      <p role={error ? "alert" : undefined} className={`text-[13px] ${error ? "font-semibold text-red" : "text-grey-600"}`}>
        {error ?? (state === "saved"
          ? `Saved.${currentEnd ? ` This period now ends on ${currentEnd}.` : ""}`
          : changed && newEnd
            ? `This period will now end on ${longDate(newEnd)}.`
            : currentEnd ? `This period ends on ${currentEnd}.` : "")}
      </p>
      {changedBy && changedOn && <p className="text-[13px] text-grey-600">Last changed by {changedBy} on {changedOn}.</p>}
    </form>
  );
}
