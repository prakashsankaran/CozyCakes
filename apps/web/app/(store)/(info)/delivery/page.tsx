import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";
import { business } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delivery and pickup",
  description: "How CozyCakes delivers cakes, where, and how pickup works.",
};

export default function DeliveryPage() {
  return (
    <InfoPage
      emoji="🛵"
      title="Delivery and pickup"
      current="/delivery"
      intro={
        <p>
          Cakes are fresh and delicate, so they travel short distances only, on the day and time you
          choose.
        </p>
      }
    >
      <section aria-labelledby="when">
        <h2 id="when">When</h2>
        <ul>
          <li>
            Every cake is baked to order. Most need at least two days&rsquo; notice, and the
            calendar at checkout only shows days I can still bake for.
          </li>
          <li>You pick the date and a time window at checkout, for delivery or pickup.</li>
          <li>
            I&rsquo;ll email you when your cake is ready, when it&rsquo;s on its way, and when
            it&rsquo;s been delivered. Your order page shows each step too.
          </li>
        </ul>
      </section>

      <section aria-labelledby="where">
        <h2 id="where">Where I deliver</h2>
        <ul>
          <li>
            I deliver within {business.city || "my city"} only, to the PIN codes checkout accepts.
            Type yours in at checkout to see if I deliver there.
          </li>
          <li>
            The delivery fee depends on the PIN code and is shown before you pay. Pickup is always
            free.
          </li>
          <li>I don&rsquo;t ship cakes by courier or outside the city.</li>
        </ul>
      </section>

      <section aria-labelledby="receiving">
        <h2 id="receiving">Receiving your cake</h2>
        <ul>
          <li>
            Please make sure someone is there to receive it in your time window. Keep your phone
            handy in case the rider needs directions.
          </li>
          <li>
            If nobody is there, the rider will try to reach you. If the cake can&rsquo;t be handed
            over, it comes back to the kitchen for you to collect, and the delivery fee isn&rsquo;t
            refunded.
          </li>
          <li>
            Carry the box flat, keep it out of the sun, and refrigerate cream cakes within an hour.
            Most cakes are best eaten within two days.
          </li>
        </ul>
      </section>

      <section aria-labelledby="pickup">
        <h2 id="pickup">Pickup</h2>
        <p>
          Collect your cake from my kitchen in the time window you chose. The address and any
          instructions are on your order page and in your confirmation email.
        </p>
      </section>
    </InfoPage>
  );
}
