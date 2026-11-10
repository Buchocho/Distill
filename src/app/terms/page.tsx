/**
 * Terms page. Route: /terms. Public, no sign in (SPEC.md rule 1b, build step 7).
 * Why it matters: Google's sign in setup asks for terms alongside the privacy page, and the terms
 * make clear what Distill is (a student project that records who owes whom) and what it is not
 * (a way to pay, or a guarantee that a reading is right).
 */

import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "Terms · Distill" };

export default function Terms() {
  // The return is the terms text, section by section.
  return (
    <LegalPage title="Terms" updated="10 November 2026">
      <section>
        <h2>What Distill is</h2>
        <p>
          A free student project for splitting shared grocery receipts in a small group. It is a course assignment, not a commercial
          service, and it may change or stop at any time. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
      <section>
        <h2>No money moves in Distill</h2>
        <p>Distill only records what your group agrees and the payments you tell it about. You pay each other however you like. A payment counts in Distill once the person paid confirms it.</p>
      </section>
      <section>
        <h2>Check what is read</h2>
        <p>Receipts are read by an AI model and can be wrong. Check the items and prices before saving. The amounts Distill shows come from what your group saved and the rules you set; each member agrees to their own amount.</p>
      </section>
      <section>
        <h2>Using it fairly</h2>
        <ul>
          <li>Add only receipts you paid for, and only photos of receipts.</li>
          <li>Do not try to read or change another group&apos;s data, or to get around how the app works.</li>
          <li>Invite only people who share the shopping.</li>
        </ul>
      </section>
      <section>
        <h2>No guarantee</h2>
        <p>Distill is provided as it is, without any guarantee that it works without errors or keeps running. Do not rely on it as your only record of money owed.</p>
      </section>
      <section>
        <h2>Your data</h2>
        <p>See the <a href="/privacy">Privacy</a> page.</p>
      </section>
    </LegalPage>
  );
}
