"use client";

/**
 * Remove a member, and Leave the group, on Invite people (SPEC.md rule 2e, approved designs
 * Members, LeaveConfirm and RemoveConfirm, 10 Nov 2026). Runs in the browser.
 * Each opens a panel from the bottom saying what happens before anything changes: out of new
 * splits from today, still paying or paid for what was bought before, still agreeing and settling.
 * Any current member can do either; there is no admin (rule 3).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

/** The Remove button next to another member, with its confirmation panel. */
export function RemoveMember({ groupId, userId, name, groupName }: { groupId: string; userId: string; name: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-xl border-[1.5px] border-grey-200 bg-white px-3 text-sm font-bold">
        Remove
      </button>
      {open && (
        <ConfirmSheet
          groupId={groupId}
          userId={userId}
          title={`Remove ${name} from ${groupName}?`}
          lines={[
            `From today ${name} is not in new splits.`,
            `${name} still pays or gets paid their share of what was bought before today. Removing never cancels money owed.`,
            `Everyone sees that you removed ${name}, and when.`,
          ]}
          note={`${name} can join again with the invite link.`}
          confirm={`Remove ${name}`}
          after="stay"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** The Leave button at the bottom of Invite people, with its confirmation panel. */
export function LeaveGroup({ groupId, userId, groupName }: { groupId: string; userId: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-12 rounded-xl border-[1.5px] border-red bg-white font-extrabold text-red">
        Leave {groupName}
      </button>
      {open && (
        <ConfirmSheet
          groupId={groupId}
          userId={userId}
          title={`Leave ${groupName}?`}
          lines={[
            "From today you are not in new splits.",
            "You still pay or get paid your share of what was bought before today, this period and earlier ones.",
            `You can still see ${groupName}, agree your amounts and confirm payments, but not add receipts or change categories. Once all is settled, it leaves your list.`,
            "Categories set to you alone or with custom shares will need a new rule.",
          ]}
          note="You can be invited back with the link."
          confirm={`Leave ${groupName}`}
          after="balance"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** The panel from the bottom: what happens, the red confirm button, and a way out. */
function ConfirmSheet(props: {
  groupId: string;
  userId: string;
  title: string;
  lines: string[];
  note: string;
  confirm: string;
  after: "stay" | "balance";
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sends the request; a leaver goes to the group's Balance, which is what they still use.
  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/groups/${props.groupId}/members/${props.userId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const b = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : {};
      return setError(b.error ?? "That did not work. Try again.");
    }
    props.onClose();
    if (props.after === "balance") router.push(`/groups/${props.groupId}/balance`);
    router.refresh();
  }

  // The return draws the dimmed background and the panel.
  return (
    <div role="dialog" aria-modal="true" aria-label={props.title} className="fixed inset-0 z-50 flex items-end bg-ink/55" onClick={props.onClose}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-t-3xl bg-white px-5 pb-7 pt-5 text-ink" onClick={(e) => e.stopPropagation()}>
        <span aria-hidden="true" className="h-1 w-10 self-center rounded-full bg-grey-200" />
        <h2 className="text-xl font-extrabold">{props.title}</h2>
        <ul className="ml-5 flex list-disc flex-col gap-1.5 text-[15px] leading-snug text-grey-700">
          {props.lines.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <p className="text-[13px] text-grey-600">{props.note}</p>
        {error && <p role="alert" className="text-sm font-semibold text-red">{error}</p>}
        <button type="button" disabled={busy} onClick={() => void go()} className="min-h-13 rounded-xl bg-red font-extrabold text-white disabled:opacity-50">
          {busy ? "One moment..." : props.confirm}
        </button>
        <button type="button" disabled={busy} onClick={props.onClose} className="min-h-12 rounded-xl border-[1.5px] border-grey-200 font-bold">
          Stay in the group
        </button>
      </div>
    </div>
  );
}
