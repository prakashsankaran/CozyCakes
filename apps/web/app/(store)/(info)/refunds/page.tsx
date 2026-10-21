import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = {
  title: "Cancellations and refunds",
  description: "How to cancel a CozyCakes order and how refunds work.",
};

export default function RefundsPage() {
  return (
    <InfoPage
      emoji="🤝"
      title="Cancellations and refunds"
      current="/refunds"
      intro={
        <p>
          Plans change, I understand. Because every cake is baked just for you, here&rsquo;s how
          cancelling works.
        </p>
      }
    >
      <section aria-labelledby="you-cancel">
        <h2 id="you-cancel">If you need to cancel</h2>
        <ul>
          <li>
            <strong>More than 48 hours before your date:</strong> message me with your order number
            and I&rsquo;ll cancel it and refund you in full.
          </li>
          <li>
            <strong>Within 48 hours of your date:</strong> I&rsquo;ve usually bought ingredients and
            started baking by then, so I can&rsquo;t offer a refund. Message me anyway and
            I&rsquo;ll try to move your order to another free day.
          </li>
          <li>
            To change the date, message, or design, get in touch as early as you can and I&rsquo;ll
            do my best.
          </li>
        </ul>
        <p>
          The quickest way to reach me is on the <Link href="/contact">contact page</Link>.
        </p>
      </section>

      <section aria-labelledby="i-cancel">
        <h2 id="i-cancel">If I have to cancel</h2>
        <p>
          It&rsquo;s rare, but if I can&rsquo;t bake your cake (say I&rsquo;m unwell), I&rsquo;ll
          cancel it, tell you why by email, and refund you in full straight away.
        </p>
      </section>

      <section aria-labelledby="not-right">
        <h2 id="not-right">If something isn&rsquo;t right</h2>
        <p>
          If your cake arrives damaged or isn&rsquo;t what you ordered, please message me within 2
          hours of delivery or pickup, with a photo. I&rsquo;ll make it right with a full or partial
          refund, or a fresh cake, depending on what happened.
        </p>
        <p>
          Handmade cakes vary a little from the photos, and a reference photo is inspiration rather
          than an exact copy, so small differences in colour or decoration aren&rsquo;t grounds for
          a refund.
        </p>
      </section>

      <section aria-labelledby="how-refunds">
        <h2 id="how-refunds">How refunds reach you</h2>
        <ul>
          <li>Refunds go back to the card, UPI or bank account you paid with.</li>
          <li>
            I start a refund the same day I agree to it. Banks usually take 5 to 7 working days to
            show it in your account.
          </li>
          <li>The delivery fee is refunded too, unless the cake was delivered or attempted.</li>
        </ul>
      </section>
    </InfoPage>
  );
}
