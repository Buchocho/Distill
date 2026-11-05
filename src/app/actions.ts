"use server";

/**
 * Server actions: what happens when a form on a page is submitted.
 *
 * Why it matters: these are the page side of the same actions the API offers (architecture rule 3).
 * Both call the same service functions, so a group made from the screen and one made through the
 * API follow the same rules. Actions only read the form, call a service and choose the next page.
 */

import { redirect } from "next/navigation";
import { requireUser } from "@/server/session";
import { createGroup, joinByToken } from "@/server/services/groups";
import { ServiceError } from "@/server/services/errors";
import type { CloseRule } from "@/domain/ledgers";

/** What a form gets back when saving fails: a general message and one message per field. */
export interface FormState {
  error?: string;
  fields?: Record<string, string>;
}

/**
 * New group form (screen 1, story US1). Reads the form, creates the group, then opens the invite
 * screen with ?new=1 so it says "Group created" and shows the link to send to the others.
 * On a form error the user stays on the form and sees the message next to the field.
 */
export async function createGroupAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/groups/new");
  const rule = String(form.get("closeRule") ?? "") as CloseRule;
  const dayRaw = form.get("closeDay");
  const day = rule === "month_end" || dayRaw === null || dayRaw === "" ? null : Number(dayRaw);
  let groupId: string;
  try {
    const group = await createGroup(user.id, { name: String(form.get("name") ?? ""), close: { rule, day } });
    groupId = group.id;
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message, fields: e.fields };
    throw e;
  }
  redirect(`/groups/${groupId}/invite?new=1`);
}

/** Join button on the invite screen (screen 0b, SPEC.md rule 2). Joins the group, then opens its Home. */
export async function joinGroupAction(token: string): Promise<void> {
  const user = await requireUser(`/join/${token}`);
  const group = await joinByToken(user.id, token);
  redirect(`/groups/${group.id}`);
}
