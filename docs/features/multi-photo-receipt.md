# Distill: feature spec, multi photo receipt capture

Author: Maduabuchi Ogugua Dibiaezue
Status: draft, 25 Oct 2026. Change to the approved Assignment 1 spec, to be listed as such in the build report.

## Problem

A long receipt in one photo is shot from far away. The text is small and blurred, and the extraction misreads or drops lines. The user needs to photograph the receipt in sections, each close enough to read, and still end up with one receipt.

## Rule

One receipt can be made of one or more photos, with no upper limit. Once the receipt is saved into the ledger, photos cannot be added or removed. The photos are parts of the same receipt, in order from top to bottom. They are read together and produce one list of items, one store, one date and one total.

## What changes on the screens

**Screen 2: Scan a receipt** (changed)
- "Take a photo" now opens the capture screen (2a) instead of going straight to review.
- "or choose a file" allows selecting several images at once. They go to screen 2a in the order selected.

**Screen 2a: Capture receipt** (new)
- Top bar: back arrow, title "Receipt photos", counter "2 photos".
- Helper text: "Start at the top. Let each photo overlap the last by a line or two."
- Thumbnail strip of the photos taken so far, numbered 1, 2, 3. Each can be deleted, retaken or dragged to a new position.
- Buttons: "Add next section" (camera icon) and primary "Done, read receipt".
- With one photo taken, "Done" works as before, so a short receipt is still a single photo plus one tap.
- On web: the same screen, with "Add next section" opening the file picker.

**Screen 3: Review receipt** (small change)
- Under the receipt header: "Read from 3 photos" with a link "View photos", which opens the photos in order.
- The footer sum check stays and does more work here (see Risks).

## How the photos are read

- All photos of a receipt go to the model in one request, in order, with an instruction that they are consecutive sections of one receipt that may overlap.
- The model returns one result: store, date, items, total. It does not return one result per photo.
- Lines that appear in two photos because of the overlap are counted once.
- Store and date are expected near the top (first photo), the total near the bottom (last photo).

## Stored data

- Table receipt_photos: id, receipt_id, position (1 and up), storage_path, created_at.
- A receipt keeps its photos so any member can check an item against the original.

## Acceptance criteria (extends must have story 2, "Scan a receipt into items")

1. A user can add one or more photos to one receipt before it is read.
1a. After the receipt is saved, no photos can be added or removed.
2. Photos can be reordered, retaken or deleted before "Done".
3. The photos produce one receipt with one item list, store, date and total.
4. A line that appears in two overlapping photos appears once in the item list.
5. If items do not add up to the total, the footer shows the difference and the user can correct it before saving.
6. The original photos can be opened from the review screen.

## Risks

- Duplicate lines from overlap. This is the main risk of the feature. A real repeat purchase (two identical yoghurts on separate lines) looks the same as an overlap duplicate. The sum check against the printed total is the guard: a duplicate makes the items exceed the total. This only works if the last photo includes the total, so the helper text should tell the user to finish on the total.
- Wrong order. Mitigated by numbering, drag to reorder, and the instruction to start at the top.
- Missed section between two photos. Caught by the sum check as items below the total.
- Cost and time: more images per request means a slower and more expensive read. There is no cap by decision.

## Out of scope

- Stitching the photos into one image.
- Live guidance in the camera (edge detection, auto capture).
- Adding or removing photos after the receipt has been saved (by rule, not only for this version).

## Open decisions

- Whether the helper text should explicitly say "finish with the total in the last photo".
