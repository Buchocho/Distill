"use client";

import { useActionState, useState } from "react";
import { createGroupAction, type FormState } from "@/app/actions";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const field = "h-13 w-full rounded-xl border-[1.5px] border-grey-200 bg-white px-3.5 text-base text-ink";

export function NewGroupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createGroupAction, {});
  const [rule, setRule] = useState("month_end");
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
