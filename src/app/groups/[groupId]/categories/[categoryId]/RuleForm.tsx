"use client";

/**
 * The sharing rule form of screen 4b (SPEC.md rule 11, story US3). Runs in the browser.
 *
 * Four ways to share a category, agreed with Maduabuchi on 9 Nov 2026:
 * - Everyone equal: split between all members;
 * - Whoever paid: the person who paid for the receipt carries it (each pays for their own);
 * - One person: always the same member, whoever paid;
 * - Custom: tick who shares and type each percentage; they must add up to 100%. "Split evenly"
 *   fills equal shares (approved design, RuleEditor2).
 * Saving applies the rule to every item in the category in the open period (rule 13a), logs it,
 * and returns to the screen the rule was opened from.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { bpToPercent, equalShares, percentToBp, type Rule, type RuleKind } from "@/domain/rules";
import { FULL_SHARE_BP } from "@/domain/money";

type Member = { id: string; name: string };
type Choice = "everyone" | "payer" | "one" | "custom";

/** Which option to show selected for an existing rule. A single 100% share is "One person". */
function choiceFor(rule: Rule | null): Choice | null {
  if (!rule) return null;
  if (rule.kind === "shares") return rule.shares.length === 1 ? "one" : "custom";
  return rule.kind;
}

export function RuleForm({ returnTo, categoryId, categoryName, rule, members, me }: {
  returnTo: string;
  categoryId: string;
  categoryName: string;
  rule: Rule | null;
  members: Member[];
  me: string;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(choiceFor(rule));
  const [one, setOne] = useState(rule?.kind === "shares" && rule.shares.length === 1 ? rule.shares[0].userId : me);
  const [percent, setPercent] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.id, rule?.kind === "shares" ? bpToPercent(rule.shares.find((s) => s.userId === m.id)?.bp ?? 0) : ""])),
  );
  const [ticked, setTicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(members.map((m) => [m.id, rule?.kind === "shares" ? rule.shares.some((s) => s.userId === m.id) : true])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const first = (name: string) => name.split(" ")[0];
  const sharers = members.filter((m) => ticked[m.id]);
  const parsed = sharers.map((m) => ({ userId: m.id, bp: percentToBp(percent[m.id] ?? "") }));
  const totalBp = parsed.reduce((a, s) => a + (s.bp ?? 0), 0);
  const customOk = sharers.length > 0 && parsed.every((s) => s.bp !== null && s.bp > 0) && totalBp === FULL_SHARE_BP;

  /** Fills equal percentages for the ticked members, totalling exactly 100%. */
  function splitEvenly() {
    const shares = equalShares(sharers.map((m) => m.id));
    setPercent((p) => ({ ...p, ...Object.fromEntries(shares.map((s) => [s.userId, bpToPercent(s.bp)])) }));
  }

  // Builds the rule from the chosen option and sends it. The server checks it again.
  async function save() {
    if (!choice) return;
    let body: { kind: RuleKind; shares: { userId: string; bp: number }[] };
    if (choice === "everyone" || choice === "payer") body = { kind: choice, shares: [] };
    else if (choice === "one") body = { kind: "shares", shares: [{ userId: one, bp: FULL_SHARE_BP }] };
    else body = { kind: "shares", shares: parsed.map((s) => ({ userId: s.userId, bp: s.bp ?? 0 })) };
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/v1/categories/${categoryId}/rule`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res || !res.ok) {
      const b = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      setSaving(false);
      return setError(b.error ?? "Could not save. Try again.");
    }
    router.push(returnTo);
    router.refresh();
  }

  const option = (value: Choice, title: string, hint: string) => (
    <label className={`flex min-h-16 cursor-pointer items-center gap-3 border-t border-grey-100 py-2 first:border-0`}>
      <input type="radio" name="kind" value={value} checked={choice === value} onChange={() => setChoice(value)}
        className="size-[22px] accent-ink" />
      <span className="flex flex-1 flex-col">
        <span className="font-bold">{title}</span>
        <span className="text-[13px] text-grey-600">{hint}</span>
      </span>
    </label>
  );

  // The return draws the four options, the extra fields for One person and Custom, the note and Save.
  return (
    <>
      <fieldset className="rounded-2xl bg-white px-4 py-1 text-ink">
        <legend className="sr-only">How is {categoryName} shared?</legend>
        <h2 className="pb-1 pt-3 font-extrabold">How is {categoryName} shared?</h2>
        {option("everyone", "Everyone equal", "Split between all members")}
        {option("payer", "Whoever paid", "Each person pays for what they buy")}
        {option("one", "One person", "Always the same person, whoever paid")}
        {choice === "one" && (
          <div className="relative mb-3 ml-[34px]">
            <label htmlFor="onePerson" className="sr-only">Who pays for {categoryName}</label>
            <select id="onePerson" value={one} onChange={(e) => setOne(e.target.value)}
              className="min-h-11 w-full appearance-none rounded-xl border-[1.5px] border-grey-200 bg-white pl-3.5 pr-9 font-semibold text-ink">
              {members.map((m) => <option key={m.id} value={m.id}>{m.id === me ? `${first(m.name)} (you)` : first(m.name)}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><Icon name="chevron" size={14} strokeWidth={2.5} /></span>
          </div>
        )}
        {option("custom", "Custom", "Choose who shares and each percentage")}
        {choice === "custom" && (
          <div className="mb-2 ml-[34px] flex flex-col">
            <button type="button" onClick={splitEvenly} className="min-h-11 self-end text-sm font-bold text-orange-text underline">Split evenly</button>
            {members.map((m) => (
              <div key={m.id} className="flex min-h-14 items-center gap-3 border-t border-grey-100">
                <input id={`share-${m.id}`} type="checkbox" checked={ticked[m.id]} onChange={(e) => setTicked((t) => ({ ...t, [m.id]: e.target.checked }))}
                  className="size-[22px] accent-ink" />
                <label htmlFor={`share-${m.id}`} className={`flex-1 font-bold ${ticked[m.id] ? "" : "text-grey-600"}`}>{first(m.name)}</label>
                {ticked[m.id] ? (
                  <span className="flex items-center gap-1.5">
                    <input aria-label={`${first(m.name)} share in percent`} inputMode="decimal" value={percent[m.id] ?? ""}
                      onChange={(e) => setPercent((p) => ({ ...p, [m.id]: e.target.value }))}
                      className="h-11 w-16 rounded-[10px] border-[1.5px] border-grey-200 px-2.5 text-right font-bold tabular-nums text-ink" />
                    <span className="text-grey-700">%</span>
                  </span>
                ) : (
                  <span className="text-sm text-grey-600">Not sharing</span>
                )}
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {choice === "custom" && (
        <p aria-live="polite" className="flex items-center gap-2 px-1 text-sm font-bold">
          {customOk ? (
            <><span className="grid size-[22px] place-items-center rounded-full bg-ink text-orange"><Icon name="check" size={14} strokeWidth={3} /></span>Shares add up to 100%</>
          ) : (
            <>Shares add up to {bpToPercent(totalBp)}%. They must add up to 100%.</>
          )}
        </p>
      )}
      <p className="px-1 text-sm font-semibold">The rule applies to every {categoryName} item in the open period, old and new. Everyone can see this change in History.</p>
      {error && <p role="alert" className="rounded-xl bg-white p-3 text-sm font-semibold text-red">{error}</p>}
      <button type="button" onClick={() => void save()} disabled={!choice || saving || (choice === "custom" && !customOk)}
        className="mt-auto min-h-13 rounded-xl bg-ink font-extrabold text-paper disabled:opacity-40">
        {saving ? "Saving..." : "Save rule"}
      </button>
    </>
  );
}
