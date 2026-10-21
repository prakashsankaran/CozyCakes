import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";
import { business, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Say hello to CozyCakes: questions, custom cakes and help with an order.",
};

export default function ContactPage() {
  const phoneLink = business.phone.replace(/[^\d+]/g, "");
  return (
    <InfoPage
      emoji="💌"
      title="Say hello"
      current="/contact"
      intro={
        <p>
          Questions about a cake, a custom idea, or help with an order? I&rsquo;d love to hear from
          you, and I usually reply the same day.
        </p>
      }
    >
      <section aria-labelledby="reach-me">
        <h2 id="reach-me">Where to reach me</h2>
        <ul>
          <li>
            Instagram: <a href={site.instagramUrl}>{site.instagramHandle}</a> (send a message)
          </li>
          {business.phone && (
            <li>
              Phone or WhatsApp: <a href={`tel:${phoneLink}`}>{business.phone}</a>
            </li>
          )}
          {business.email && (
            <li>
              Email: <a href={`mailto:${business.email}`}>{business.email}</a>
            </li>
          )}
        </ul>
        <p>
          For an order, have your order number handy (like CC-24017). It&rsquo;s in your
          confirmation email and on your order page.
        </p>
      </section>

      <section aria-labelledby="kitchen">
        <h2 id="kitchen">The kitchen</h2>
        <p>
          {business.legalName} is a home bakery
          {business.city ? ` in ${business.city}` : ""}. Every cake is baked to order, so there is
          no shop to walk into.
        </p>
        {business.address && <p className="whitespace-pre-line">{business.address}</p>}
        <p>
          If you choose pickup, the exact pickup details are on your order page and in your
          confirmation email.
        </p>
        {business.fssai && <p>FSSAI registration: {business.fssai}</p>}
      </section>
    </InfoPage>
  );
}
