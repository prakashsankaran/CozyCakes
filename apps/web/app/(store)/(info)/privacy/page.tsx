import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info/info-page";
import { business } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What CozyCakes collects about you, why, and who helps handle it.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      emoji="🔒"
      title="Privacy"
      current="/privacy"
      intro={
        <p>
          I only ask for what I need to bake and deliver your cake, and I never sell it or use it
          for ads.
        </p>
      }
    >
      <section aria-labelledby="collect">
        <h2 id="collect">What I collect</h2>
        <ul>
          <li>Your name, email and mobile number, to confirm your order and reach you about it.</li>
          <li>Your delivery address, if you choose delivery.</li>
          <li>Cake messages, notes and any reference photos you share.</li>
          <li>
            If you make an account: your saved addresses and favourite cakes. There&rsquo;s no
            password; you sign in with a code sent to your email.
          </li>
          <li>
            Payment details go straight to Razorpay. I only see whether a payment worked, never your
            card or bank details.
          </li>
        </ul>
      </section>

      <section aria-labelledby="helpers">
        <h2 id="helpers">Who helps run the shop</h2>
        <p>These services handle some of your details for me, only to do their job:</p>
        <ul>
          <li>Razorpay, for payments and refunds</li>
          <li>Resend, to send order and sign-in emails</li>
          <li>Cloudinary, to store reference photos</li>
          <li>Vercel and Neon, to host the website and its database</li>
        </ul>
      </section>

      <section aria-labelledby="cookies">
        <h2 id="cookies">Cookies</h2>
        <p>
          Cookies are only used to keep you signed in. Your cart is kept on your own device. There
          are no advertising or tracking cookies.
        </p>
      </section>

      <section aria-labelledby="keep">
        <h2 id="keep">How long I keep it</h2>
        <p>
          Order records are kept for as long as Indian tax and accounting rules require. Account
          details stay until you ask me to delete your account.
        </p>
      </section>

      <section aria-labelledby="rights">
        <h2 id="rights">Your choices</h2>
        <p>
          You can see your orders and update your saved details on your account page. To get a copy
          of your data, correct it, or delete your account, message me on the{" "}
          <Link href="/contact">contact page</Link>
          {business.email ? (
            <>
              {" "}
              or email <a href={`mailto:${business.email}`}>{business.email}</a>
            </>
          ) : null}
          .
        </p>
      </section>
    </InfoPage>
  );
}
