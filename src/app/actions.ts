"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/session";
import { createGroup, joinByToken } from "@/server/services/groups";
import { ServiceError } from "@/server/services/errors";
import type { CloseRule } from "@/domain/ledgers";

export interface FormState {
  error?: string;
  fields?: Record<string, string>;
}

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

export async function joinGroupAction(token: string): Promise<void> {
  const user = await requireUser(`/join/${token}`);
  const group = await joinByToken(user.id, token);
  redirect(`/groups/${group.id}`);
}
