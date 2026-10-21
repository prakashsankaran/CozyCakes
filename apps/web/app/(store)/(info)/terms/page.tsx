import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info/info-page";
import { business } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for ordering cakes from CozyCakes.",
};

export default function TermsPage() {
  return (
    <InfoPage
      emoji="📜"
      title="Terms"
      current="/terms"
      intro={
        <p>
          The simple rules for ordering from {business.legalName}. By placing an order you agree to
          them.
        </p>
      }
    >
      <section aria-labelledby="who">
        <h2 id="who">Who you&rsquo;re buying from</h2>
        <p>
          {business.legalName} is a home bakery
          {business.city ? ` in ${business.city}, India` : " in India"}. You can reach me through
          the <Link href="/contact">contact page</Link>.
        </p>
      </section>

      <section aria-labelledby="orders">
        <h2 id="orders">Orders and prices</h2>
        <ul>
          <li>Prices are in Indian rupees and include everything except the delivery fee.</li>
          <li>
            The price you see at checkout is the price you pay. It&rsquo;s checked again when you
            pay, so if I&rsquo;ve changed a price in the meantime, checkout tells you first.
          </li>
          <li>
            Your order is confirmed once payment goes through. You&rsquo;ll get an email and a
            private link to follow your order.
          </li>
          <li>Payments are handled by Razorpay. I never see or store your card or bank details.</li>
        </ul>
      </section>

      <section aria-labelledby="cakes">
        <h2 id="cakes">Your cake</h2>
        <ul>
          <li>
            Every cake is handmade, so it may look a little different from the photos. A reference
            photo you share is inspiration, not a promise of an exact copy.
          </li>
          <li>
            Only share reference photos you&rsquo;re allowed to use. I use them only to make your
            cake.
          </li>
          <li>
            I don&rsquo;t write messages or designs that are hateful, offensive or use someone
            else&rsquo;s trademark without permission, and may cancel and refund such orders.
          </li>
        </ul>
      </section>

      <section aria-labelledby="allergens">
        <h2 id="allergens">Allergies</h2>
        <p>
          My kitchen uses wheat, eggs, milk, nuts and soy. Eggless cakes contain no egg, but I
          can&rsquo;t promise any cake is free from traces of these. If you have a serious allergy,
          please message me before ordering.
        </p>
      </section>

      <section aria-labelledby="cancel">
        <h2 id="cancel">Cancellations, refunds and delivery</h2>
        <p>
          See <Link href="/refunds">cancellations and refunds</Link> and{" "}
          <Link href="/delivery">delivery and pickup</Link>. They&rsquo;re part of these terms.
        </p>
      </section>

      <section aria-labelledby="liability">
        <h2 id="liability">If something goes wrong</h2>
        <p>
          If I can&rsquo;t deliver what you ordered, the most I owe you is a full refund of that
          order. Nothing in these terms limits your rights under Indian consumer law.
        </p>
        <p>
          These terms are governed by the laws of India
          {business.city ? `, and the courts of ${business.city} handle any dispute` : ""}.
        </p>
      </section>
    </InfoPage>
  );
}
