"use client";

/**
 * "Close date" setting on the Group screen settings card (SPEC.md rule 18). Runs in the browser.
 * Any member can change when the group's accounts close. Shows as a compact row (label + current
 * description + chevron) until tapped, then expands to the full rule/day picker with Save.
 * Before saving, the form shows the date the current period will end on with the new choice
 * (the first close date from the device's today, rule 2c). Below it, who last changed the
 * setting and when, since there is no admin (rule 3). Saved through PATCH /api/v1/groups/{id}.
 * Approved design: canvas "Group.dc.html" settings row, 16 Nov 2026.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { endAfterRuleChange, type CloseRule } from "@/domain/ledgers";
import { deviceToday, longDate } from "@/domain/dates";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Human-readable summary of the close rule, shown on the collapsed row. */
function ruleLabel(rule: string, day: number | null): string {
  if (rule === "month_end") return "Last day of the month";
  if (rule === "month_day" && day !== null) return `Day ${day} of the month`;
  if (rule === "weekly" && day !== null) return WEEKDAYS[day] ?? "Weekly";
  return "Not set";
}

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
  const [editing, setEditing] = useState(false);
  const [r, setR] = useState(rule);
  const [d, setD] = useState<number>(day ?? (rule === "weekly" ? 6 : 1));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const field = "min-h-11 rounded-[11px] border-[1.5px] border-grey-400 bg-white px-3 text-[15px] text-ink";
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
    setEditing(false);
    router.refresh();
  }

  // Collapsed: a settings row showing the label and current rule with a chevron.
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)}
        className="flex min-h-[60px] w-full items-center gap-[11px] text-left">
        <span className="flex flex-1 flex-col">
          <span className="text-xs text-grey-600">Close date</span>
          <span className="text-[15px] font-bold">{ruleLabel(rule, day)}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f48d3c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
      </button>
    );
  }

  // Expanded: the rule/day picker with Save.
  return (
    <form onSubmit={save} className="flex flex-col gap-2 py-3">
      <label htmlFor="closeRuleSetting" className="text-xs text-grey-600">Close date</label>
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
      <button type="submit" disabled={!changed || state === "saving"} className="min-h-11 rounded-[11px] bg-ink font-extrabold text-paper disabled:opacity-40">
        {state === "saving" ? "..." : "Save"}
      </button>
      <p role={error ? "alert" : undefined} className={`text-xs ${error ? "font-semibold text-red" : "text-grey-600"}`}>
        {error ?? (state === "saved"
          ? `Saved.${currentEnd ? ` This period now ends on ${currentEnd}.` : ""}`
          : changed && newEnd
            ? `This period will now end on ${longDate(newEnd)}.`
            : currentEnd ? `This period ends on ${currentEnd}.` : "")}
      </p>
      {changedBy && changedOn && <p className="text-xs text-grey-600">Last changed by {changedBy} on {changedOn}.</p>}
      <button type="button" onClick={() => { setEditing(false); setR(rule); setD(day ?? (rule === "weekly" ? 6 : 1)); setState("idle"); setError(null); }}
        className="self-start text-xs font-bold text-grey-600">Cancel</button>
    </form>
  );
}
