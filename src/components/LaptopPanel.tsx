/**
 * The panel shown beside the app on a laptop or desktop screen (1024 px wide and up).
 * Distill is designed for phones (SPEC.md section 5): on a large screen every screen keeps its
 * phone layout inside a phone-sized frame (src/app/layout.tsx), and this panel fills the space
 * beside it. It says what Distill does, that it is made for a phone, and how to add a receipt
 * from a computer, where there is no camera: "choose a file" with a saved photo (story US2).
 * Hidden on phones and tablets. Added 21 Nov 2026 so a first visit from a laptop does not look
 * unfinished.
 */

import { PhoneAddress } from "./PhoneAddress";

const STEPS = ["Photograph the receipt", "Your group's rules split each item", "Settle up on the date you choose"];

/** The laptop side panel: what Distill does, the three steps, and how to open it on a phone. */
export function LaptopPanel() {
  return (
    <aside aria-label="About Distill" className="hidden w-[340px] shrink-0 flex-col gap-7 text-paper lg:flex">
      <div className="flex items-start gap-1.5">
        <span className="text-[44px] font-extrabold leading-[0.9] tracking-[-0.045em]">Distill</span>
        <span className="mt-1 size-2.5 shrink-0 rounded-full bg-orange" />
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em]">
          Split the shopping by what each person shares.
        </h2>
        <p className="text-[15px] leading-[1.45] text-sand">
          Scan a grocery receipt. Each item gets a category, and your group&apos;s rules decide who pays for it.
        </p>
      </div>

      <ol className="flex flex-col gap-2.5">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm font-bold">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange text-[13px] font-extrabold text-ink">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 rounded-[18px] bg-dark-card p-5">
        <p className="text-[15px] font-extrabold">Made for your phone</p>
        <p className="text-sm leading-[1.45] text-sand">
          Open <PhoneAddress /> on your phone to scan receipts with the camera.
        </p>
        <p className="text-sm leading-[1.45] text-sand">
          On this computer, use &quot;choose a file&quot; to add a saved photo of a receipt.
        </p>
      </div>
    </aside>
  );
}
