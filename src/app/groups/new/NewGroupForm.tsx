"use client";

/**
 * The New group form: group name, when accounts close (SPEC.md rule 18) and the currency amounts are
 * shown in (rule 2b, display only). The device's local date is sent in a hidden field (rule 2c), so
 * there is nothing extra to fill in. Runs in the browser.
 * The day picker changes with the close choice: none for last day of the month, 1 to 28 for a day
 * of the month, Monday to Sunday for weekly. Errors from the server appear under each field.
 * There is no invite button here: the invite link only exists once the group is saved, so it is
 * shown on the next screen (design change, docs/WORKLOG.md 2026-11-03).
 */

import { useActionState, useEffect, useState } from "react";
import { createGroupAction, type FormState } from "@/app/actions";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/domain/currencies";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const field = "h-13 w-full rounded-xl border-[1.5px] border-grey-200 bg-white px-3.5 text-base text-ink";

export function NewGroupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createGroupAction, {});
  const [rule, setRule] = useState("month_end");
  // The device's own date, read after the page loads because the server cannot know it (rule 2c).
  const [localDate, setLocalDate] = useState("");
  useEffect(() => {
    const d = new Date();
    setLocalDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }, []);
  return (
    <form action={action} className="flex flex-1 flex-col gap-5 px-4 pt-2">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-semibold">Group name</label>
        <input id="name" name="name" required maxLength={60} placeholder="For example, Rua das Flores 12" className={field}
          aria-invalid={Boolean(state.fields?.name)} aria-describedby="name-error" />
        {state.fields?.name && <p id="name-error" className="text-sm font-semibold text-red">{state.fields.name}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="closeRule" className="text-sm font-semibold">Accounts close</label>
        <select id="closeRule" name="closeRule" value={rule} onChange={(e) => setRule(e.target.value)} className={field}>
          <option value="month_end">Last day of the month</option>
          <option value="month_day">A day of the month</option>
          <option value="weekly">Every week</option>
        </select>
        {rule === "month_day" && (
          <select aria-label="Day of the month" name="closeDay" defaultValue="1" className={field}>
            {Array.from({ length: 28 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Day {i + 1}</option>
            ))}
          </select>
        )}
        {rule === "weekly" && (
          <select aria-label="Day of the week" name="closeDay" defaultValue="6" className={field}>
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        )}
        {state.fields?.close && <p className="text-sm font-semibold text-red">{state.fields.close}</p>}
        <p className="text-[13px] text-grey-600">The period freezes on this date and the next one opens. You can change it later.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="currency" className="text-sm font-semibold">Currency</label>
        <select id="currency" name="currency" defaultValue={DEFAULT_CURRENCY} className={field}
          aria-invalid={Boolean(state.fields?.currency)} aria-describedby="currency-error">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
          ))}
        </select>
        {state.fields?.currency && <p id="currency-error" className="text-sm font-semibold text-red">{state.fields.currency}</p>}
        <p className="text-[13px] text-grey-600">Amounts are shown in this currency. Nothing is converted.</p>
      </div>
      <input type="hidden" name="localDate" value={localDate} />

      <p className="rounded-xl bg-white p-3.5 text-sm text-grey-700">You will get an invite link for the others once the group is created.</p>

      {state.error && !state.fields && <p role="alert" className="text-sm font-semibold text-red">{state.error}</p>}
      <div className="mt-auto pb-6">
        <button type="submit" disabled={pending}
          className="min-h-13 w-full rounded-xl bg-orange text-base font-extrabold text-ink disabled:opacity-60">
          {pending ? "Creating..." : "Create group"}
        </button>
      </div>
    </form>
  );
}
