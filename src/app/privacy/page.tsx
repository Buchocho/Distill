/**
 * Privacy page. Route: /privacy. Public, no sign in (SPEC.md rule 1b, build step 7).
 * Why it matters: Google requires a privacy page before the sign in can leave testing mode and be
 * used by anyone, including the teacher for the demo. It says in plain words what Distill keeps,
 * who else handles it (Supabase, Vercel, Google sign in, Google Gemini), and how to have it deleted.
 */

import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "Privacy · Distill" };

export default function Privacy() {
  // The return is the policy text, section by section.
  return (
    <LegalPage title="Privacy" updated="10 November 2026">
      <section>
        <h2>Who runs Distill</h2>
        <p>
          Distill is a student project built by Maduabuchi Ogugua Dibiaezue for the Information Systems Architecture course of the
          MSc in Service Engineering and Management at FEUP, University of Porto. It is free and has no adverts. Questions and
          requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
      <section>
        <h2>What Distill keeps</h2>
        <ul>
          <li>From your Google account: your name, your email address and Google&apos;s account number for you. Nothing else from Google, and never your password.</li>
          <li>The name you choose to be shown as in Distill.</li>
          <li>Your groups and their members, the invite link, and when accounts close.</li>
          <li>Receipt photos you take or choose, and what is read from them: store, date, receipt number, items and prices.</li>
          <li>Categories, sharing rules, balances, agreements and payments you record, with who did what and when.</li>
        </ul>
        <p className="mt-2">Your name and email, and everything you add, are seen by the other members of that group, and only by them.</p>
      </section>
      <section>
        <h2>Why</h2>
        <p>Only to run the app for you and your group: to sign you in, read receipts, split them by your group&apos;s rules and keep the balance. Distill does not sell data, show adverts, or track you across other sites.</p>
      </section>
      <section>
        <h2>Who else handles it</h2>
        <ul>
          <li><b>Supabase</b> stores the database and the receipt photos, in Ireland (EU). Photos are private and opened only through short lived links.</li>
          <li><b>Vercel</b> runs the app, in Ireland (EU).</li>
          <li><b>Google</b> signs you in, under <a href="https://policies.google.com/privacy">Google&apos;s privacy policy</a>.</li>
          <li>
            <b>Google Gemini</b> reads each receipt photo to list its items. The photo is sent to Google for that, under the{" "}
            <a href="https://ai.google.dev/gemini-api/terms">Gemini API terms</a>. Photograph only the receipt, not cards or other papers.
          </li>
        </ul>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>Two, both needed for the app to work: the sign in cookie, and one holding your device&apos;s date so periods close on your local date. No analytics or advertising cookies.</p>
      </section>
      <section>
        <h2>How long, and deleting it</h2>
        <p>
          Data is kept while the project runs. When the course project ends, the app and its data will be deleted. You can ask at any
          time to see your data, correct it, or have your account and what you added deleted: email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Payments and agreements involve other members, so deleting them
          also changes their records; we will tell you what that means before doing it. You can also complain to the Portuguese data
          protection authority, the <a href="https://www.cnpd.pt">CNPD</a>.
        </p>
      </section>
      <section>
        <h2>Signing out</h2>
        <p>Sign out at the bottom of the Invite people screen (tap your initial on Home). It ends your session on that device.</p>
      </section>
    </LegalPage>
  );
}
