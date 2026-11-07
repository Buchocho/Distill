/**
 * Receipt photo preparation in the browser.
 *
 * What it holds: the storage bucket name shared by browser and server, and the function that
 * shrinks a camera photo before upload.
 *
 * Why it matters: phone cameras make photos of 8 to 20 MB. Receipt text stays readable at about
 * 2500 pixels on the long side, so the photo is resized and saved as JPEG first, which usually
 * gives 300 KB to 1 MB. That keeps uploads fast on a phone connection and well under the bucket's
 * 10 MB limit (decided with Maduabuchi on 7 Nov 2026). If the browser cannot open the photo
 * (for example an iPhone HEIC file on some browsers), the original is used only when it is a type
 * and size the bucket accepts; otherwise the user is told to take the photo again.
 *
 * Business rules: SPEC.md story US2 (adding a shop takes one photo). Architecture rule 6
 * (photos go straight from the browser to storage).
 */

/** The private Supabase Storage bucket for receipt photos. Must match the bucket made in the dashboard. */
export const PHOTO_BUCKET = "receipt-photos";
/** The bucket's size limit, set in the Supabase dashboard. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
/** Longest side after resizing. Raise this if long receipts read badly (see docs/WORKLOG.md 2026-11-07). */
const LONG_SIDE_PX = 2500;
/** Types the bucket accepts as they are. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** A photo that cannot be uploaded. The message is shown to the user as it is. */
export class PhotoError extends Error {}

/**
 * Shrinks a photo to at most 2500 pixels on its long side and saves it as JPEG. Small photos are
 * re-saved without enlarging. Throws PhotoError with a plain message when the photo cannot be used.
 */
export async function preparePhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // from-image keeps the photo the right way up when the phone was turned.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (ACCEPTED.includes(file.type) && file.size <= PHOTO_MAX_BYTES) return file;
    throw new PhotoError("This photo can't be opened here. Take the photo in the app, or choose a JPEG or PNG.");
  }
  const scale = Math.min(1, LONG_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoError("This photo can't be prepared on this device. Try another browser.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new PhotoError("This photo can't be prepared on this device. Try another browser.");
  if (blob.size > PHOTO_MAX_BYTES) throw new PhotoError("This photo is too large. Try taking it again.");
  return blob;
}
