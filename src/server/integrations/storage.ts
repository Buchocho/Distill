/**
 * Receipt photo storage (Supabase Storage, private bucket "receipt-photos").
 *
 * What it holds: making a one time upload link, downloading a photo for reading, making a
 * short lived link so a member can look at a photo, and removing photos of a deleted receipt.
 *
 * Why it matters: photos go straight from the phone to storage, not through the app's server,
 * which limits request size (architecture rule 6). The bucket is private and has no policies, so
 * nobody can open a photo without a link made here, and links are only made after the service
 * has checked that the user is a member of the receipt's group (architecture rule 4).
 * Uses the Supabase service key, which never leaves the server (architecture rule 7).
 *
 * Business rules: SPEC.md rule 9a (receipts are photos kept with the receipt).
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
// The bucket was created by hand in the Supabase dashboard on 7 Nov 2026 (private, 10 MB, JPEG, PNG, WebP).
import { PHOTO_BUCKET } from "@/lib/photos";

/** Server side Supabase client with the service key. Storage only: tables are read through Drizzle. */
function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { persistSession: false },
  });
}

/** Where a receipt's photo is stored: one folder per group, then per receipt. */
export function photoPath(groupId: string, receiptId: string, position: number): string {
  return `${groupId}/${receiptId}/${position}.jpg`;
}

/**
 * A one time link the browser uses to upload one photo to exactly this path. The browser needs
 * the path and the token; it gets no other access to storage.
 */
export async function createUploadLink(path: string): Promise<{ path: string; token: string }> {
  const { data, error } = await admin().storage.from(PHOTO_BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(`Upload link failed: ${error?.message ?? "no data"}`);
  return { path: data.path, token: data.token };
}

/** Downloads a stored photo so it can be sent to Gemini. Returns its bytes and type. */
export async function downloadPhoto(path: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const { data, error } = await admin().storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) throw new Error(`Photo download failed: ${error?.message ?? "no data"}`);
  return { bytes: Buffer.from(await data.arrayBuffer()), mimeType: data.type || "image/jpeg" };
}

/** Removes stored photos, used when an unsaved receipt is deleted. */
export async function deletePhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin().storage.from(PHOTO_BUCKET).remove(paths);
  if (error) throw new Error(`Photo delete failed: ${error.message}`);
}

/** A link to view a photo, valid for 10 minutes. Made at the moment the photo is opened. */
export async function viewLink(path: string): Promise<string | null> {
  const { data } = await admin().storage.from(PHOTO_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
