"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AvailabilitySchema,
  CheckoutCreatedSchema,
  CheckoutStatusSchema,
  DeliveryCheckSchema,
  MeSchema,
  formatCalendarDate,
  formatMoney,
  NOTE_TO_BAKER_MAX,
  orderTotal,
  PaymentResultSchema,
  type Availability,
  type CheckoutCreated,
  type CheckoutRequest,
  type DeliveryCheck,
  type DiscountQuote,
  type Me,
  type Fulfilment,
  type PaymentResult,
} from "@cozycakes/core";
import { cart, useCart } from "@/lib/cart/store";
import { useCartQuote } from "@/lib/cart/use-quote";
import { useCheckoutConfig } from "@/lib/checkout/use-checkout-enabled";
import { loadRazorpay } from "@/lib/checkout/razorpay";
import { DatePicker } from "./date-picker";
import { DiscountField } from "./discount-field";

type FieldErrors = Record<string, string>;
type Details = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  note: string;
};

const EMPTY_DETAILS: Details = {
  name: "",
  phone: "",
  email: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  note: "",
};

const without =
  (key: string) =>
  (errors: FieldErrors): FieldErrors =>
    Object.fromEntries(Object.entries(errors).filter(([k]) => k !== key));

const field =
  "mt-1 w-full rounded-[var(--radius-md)] bg-white px-4 py-3 text-base ring-1 ring-cocoa-900/20 focus:ring-2 focus:ring-blush-700 focus:outline-none aria-invalid:ring-2 aria-invalid:ring-blush-700";

/**
 * Checkout (US3, tasks T064): how it reaches you, which day, your details, then pay. Everything
 * the customer typed stays on the page if payment fails, so a retry is one tap (scenario 4).
 */
export function CheckoutFlow() {
  const router = useRouter();
  const items = useCart();
  const { quote, status: quoteStatus } = useCartQuote(items);
  const config = useCheckoutConfig();
  const enabled = config?.enabled ?? null;
  const byUpi = config?.method === "upi";

  const [fulfilment, setFulfilment] = useState<Fulfilment | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [delivery, setDelivery] = useState<DeliveryCheck | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<ReactNode>(null);
  const [paying, setPaying] = useState(false);
  const [testCheckout, setTestCheckout] = useState<CheckoutCreated | null>(null);
  const [discount, setDiscount] = useState<DiscountQuote | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);

  // Signed-in customers get their details filled in (US6); guests see empty fields.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/me", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const account = MeSchema.parse(await res.json());
        setMe(account);
        setDetails((d) => ({
          ...d,
          name: d.name || account.name,
          email: d.email || account.email,
          phone: d.phone || account.phone.replace(/^\+91/, ""),
        }));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const current = useRef<{ key: string; created: CheckoutCreated } | null>(null);

  const leadTimeDays = quote?.leadTimeDays ?? null;
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  useEffect(() => {
    if (leadTimeDays === null) return;
    const controller = new AbortController();
    fetch(`/api/v1/availability?lead_days=${leadTimeDays}`, { signal: controller.signal })
      .then(async (res) => setAvailability(AvailabilitySchema.parse(await res.json())))
      .catch(() => undefined);
    return () => controller.abort();
  }, [leadTimeDays, availabilityVersion]);

  if (items.length === 0) {
    return (
      <Notice emoji="🥣" title="Your cart is empty">
        <Link href="/cakes" className="font-bold underline">
          Pick a cake
        </Link>{" "}
        and make it yours first.
      </Notice>
    );
  }
  if (enabled === false) {
    return (
      <Notice emoji="📮" title="Online checkout opens soon">
        For now I confirm orders personally.{" "}
        <Link href="/cart" className="font-bold underline">
          Go back to your cart
        </Link>{" "}
        to send me your order on Instagram.
      </Notice>
    );
  }

  const lines = quote?.lines ?? [];
  const blocked = lines.some((l) => l.status !== "ok");
  const deliveryFee = fulfilment === "delivery" && delivery?.available ? (delivery.fee ?? 0) : 0;
  const subtotal = quote?.subtotal ?? 0;
  const total = orderTotal(subtotal, deliveryFee, discount?.amount ?? 0);
  const slots = (availability?.slots ?? []).filter(
    (s) => fulfilment && (s.fulfilment === "both" || s.fulfilment === fulfilment),
  );
  const setDetail = (key: keyof Details) => (value: string) =>
    setDetails((d) => ({ ...d, [key]: value }));

  async function checkPin(code = postalCode) {
    if (!/^[1-9]\d{5}$/.test(code)) {
      setErrors((e) => ({ ...e, postalCode: "Enter a 6-digit PIN code" }));
      return;
    }
    setCheckingPin(true);
    setErrors(without("postalCode"));
    try {
      const res = await fetch(`/api/v1/delivery/check?postal_code=${code}`);
      setDelivery(DeliveryCheckSchema.parse(await res.json()));
    } catch {
      setErrors((e) => ({ ...e, postalCode: "We couldn't check that. Try again." }));
    } finally {
      setCheckingPin(false);
    }
  }

  const cartItems = items.map(
    ({ id, cakeId, sizeId, optionIds, message, referencePhoto, quantity }) => ({
      id,
      cakeId,
      sizeId,
      optionIds,
      message,
      referencePhoto,
      quantity,
    }),
  );

  function request(): CheckoutRequest | null {
    const next: FieldErrors = {};
    if (!fulfilment) next.fulfilment = "Choose delivery or pickup";
    if (fulfilment === "delivery" && !delivery?.available) {
      next.postalCode = delivery ? "Delivery isn't available there" : "Check your PIN code";
    }
    if (!date) next.date = "Pick a day";
    if (!slotId) next.slot = "Pick a time";
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError("A few things are missing. They're marked above.");
      return null;
    }
    return {
      items: cartItems,
      fulfilment: fulfilment!,
      date: date!,
      slotId: slotId!,
      contact: { name: details.name, email: details.email, phone: details.phone },
      address:
        fulfilment === "delivery"
          ? {
              line1: details.line1,
              line2: details.line2,
              landmark: details.landmark,
              city: details.city,
              postalCode: delivery!.postalCode,
            }
          : null,
      note: details.note,
      discountCode: discount?.code ?? null,
    };
  }

  /** Opens (or reuses) a checkout for exactly these details, holding the date. */
  async function openCheckout(body: CheckoutRequest): Promise<CheckoutCreated | null> {
    const key = JSON.stringify(body);
    const reuse = current.current;
    if (reuse?.key === key && new Date(reuse.created.expiresAt).getTime() > Date.now() + 60_000) {
      return reuse.created;
    }
    const res = await fetch("/api/v1/checkouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: key,
    });
    const json = await res.json().catch(() => null);
    if (res.ok) {
      const created = CheckoutCreatedSchema.parse(json);
      current.current = { key, created };
      return created;
    }
    const error = json?.error as
      | {
          code: string;
          message: string;
          details?: { issues?: { path: string; message: string }[] };
        }
      | undefined;
    if (error?.code === "INVALID_CHECKOUT") {
      const next: FieldErrors = {};
      for (const issue of error.details?.issues ?? []) {
        next[issue.path.replace(/^(contact|address)\./, "")] ??= issue.message;
      }
      setErrors(next);
      setFormError("Please check the details marked above.");
    } else if (error?.code === "DATE_FULL") {
      setDate(null);
      setErrors({ date: error.message });
      setFormError(error.message);
      setAvailabilityVersion((v) => v + 1);
    } else if (error?.code === "DISCOUNT_INVALID") {
      setDiscount(null);
      setDiscountError(error.message);
      setFormError(`${error.message} Your total is updated without it.`);
    } else if (error?.code === "NOT_DELIVERABLE") {
      setDelivery((d) => (d ? { ...d, available: false, fee: null } : d));
      setFormError(error.message);
    } else if (error?.code === "CART_CHANGED") {
      setFormError(
        <>
          {error.message}.{" "}
          <Link href="/cart" className="underline">
            Open your cart
          </Link>
        </>,
      );
    } else {
      setFormError(error?.message ?? "Something went wrong. Please try again.");
    }
    return null;
  }

  async function confirm(created: CheckoutCreated, result: PaymentResult) {
    const res = await fetch(`/api/v1/checkouts/${created.checkoutId}/payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result),
    });
    const status = res.ok ? CheckoutStatusSchema.parse(await res.json()) : null;
    if (!status?.trackingToken) {
      setPaying(false);
      setFormError(
        "Your payment went through but we couldn't confirm it here. Your confirmation email is on its way; message me on Instagram if it doesn't arrive.",
      );
      return;
    }
    cart.clear();
    router.push(`/orders/${status.trackingToken}?placed=1`);
  }

  function paymentFailed(message: string) {
    setPaying(false);
    setFormError(
      `${message} Nothing was charged, and your details are saved: tap Pay to try again.`,
    );
  }

  async function pay() {
    setFormError(null);
    const body = request();
    if (!body) return;
    setPaying(true);
    if (me && saveAddress && body.address) {
      // Best effort: a saved address is a convenience, never a reason to stop someone paying.
      void fetch("/api/v1/me/addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "", ...body.address }),
      }).catch(() => {});
    }
    const created = await openCheckout(body);
    if (!created) {
      setPaying(false);
      return;
    }
    if (created.payment.provider === "test") {
      setTestCheckout(created);
      return;
    }
    if (created.payment.provider === "upi") {
      // The order exists, awaiting payment; its page shows the QR code and UPI ID.
      cart.clear();
      router.push(`/orders/${created.payment.trackingToken}?placed=1`);
      return;
    }
    try {
      const Razorpay = await loadRazorpay();
      const rzp = new Razorpay({
        key: created.payment.keyId,
        order_id: created.payment.orderId,
        amount: created.amount,
        currency: created.currency,
        name: "CozyCakes",
        description: `Cakes for ${formatCalendarDate(body.date)}`,
        prefill: { name: details.name, email: details.email, contact: details.phone },
        theme: { color: "#3b2420" },
        handler: (r) =>
          confirm(created, {
            providerOrderId: r.razorpay_order_id,
            providerPaymentId: r.razorpay_payment_id,
            signature: r.razorpay_signature,
          }),
        modal: { ondismiss: () => paymentFailed("Payment cancelled.") },
      });
      rzp.on("payment.failed", () => paymentFailed("The payment didn't go through."));
      rzp.open();
    } catch {
      paymentFailed("We couldn't open the payment window.");
    }
  }

  async function testPay(outcome: "success" | "failure") {
    const created = testCheckout!;
    setTestCheckout(null);
    const res = await fetch(`/api/v1/checkouts/${created.checkoutId}/test-payment`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    if (!res.ok) return paymentFailed("Your bank declined the payment.");
    await confirm(created, PaymentResultSchema.parse(await res.json()));
  }

  return (
    <div className="grid gap-5 pb-32 lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
      <div className="grid min-w-0 gap-5">
        <Step n={1} title="How should it reach you?" error={errors.fulfilment}>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Delivery or pickup">
            <Choice
              name="fulfilment"
              checked={fulfilment === "pickup"}
              onChange={() => {
                setFulfilment("pickup");
                setSlotId(null);
              }}
              emoji="🏡"
              title="Pickup"
              detail="Collect it from my kitchen, free"
            />
            <Choice
              name="fulfilment"
              checked={fulfilment === "delivery"}
              onChange={() => {
                setFulfilment("delivery");
                setSlotId(null);
              }}
              emoji="🛵"
              title="Delivery"
              detail="To your door, fee by PIN code"
            />
          </div>
          {fulfilment === "delivery" && (
            <div className="animate-rise mt-4">
              <label htmlFor="pin" className="font-bold">
                Delivery PIN code
              </label>
              <div className="flex gap-2">
                <input
                  id="pin"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  value={postalCode}
                  aria-invalid={Boolean(errors.postalCode) || undefined}
                  aria-describedby="pin-result"
                  onChange={(e) => {
                    setPostalCode(e.target.value.replace(/\D/g, ""));
                    setDelivery(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void checkPin();
                    }
                  }}
                  className={`${field} max-w-40 tracking-widest`}
                />
                <button
                  type="button"
                  onClick={() => checkPin()}
                  disabled={checkingPin}
                  className="mt-1 rounded-[var(--radius-pill)] bg-cream-200 px-5 font-bold hover:bg-cream-300 disabled:opacity-60"
                >
                  {checkingPin ? "Checking…" : "Check"}
                </button>
              </div>
              {me && me.addresses.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-bold">Your saved addresses</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {me.addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setPostalCode(a.postalCode);
                          setDetails((d) => ({
                            ...d,
                            line1: a.line1,
                            line2: a.line2,
                            landmark: a.landmark,
                            city: a.city,
                          }));
                          void checkPin(a.postalCode);
                        }}
                        className="rounded-[var(--radius-pill)] bg-white px-4 py-2 text-sm font-bold ring-1 ring-cocoa-900/15 hover:bg-blush-100"
                      >
                        📍 {a.label || a.line1}, {a.postalCode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div id="pin-result" aria-live="polite" className="mt-2 text-sm">
                {errors.postalCode ? (
                  <p className="font-bold text-blush-700">{errors.postalCode}</p>
                ) : delivery?.available ? (
                  <p className="font-bold text-pistachio-700">
                    Yes! I deliver to {delivery.postalCode} for {formatMoney(delivery.fee ?? 0)}.
                  </p>
                ) : delivery ? (
                  <p className="font-bold text-blush-700">
                    I don&rsquo;t deliver to {delivery.postalCode} yet.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setFulfilment("pickup");
                        setSlotId(null);
                      }}
                      className="underline"
                    >
                      Pick it up instead
                    </button>
                  </p>
                ) : null}
              </div>
            </div>
          )}
          {fulfilment === "pickup" && (
            <p className="animate-rise mt-4 rounded-[var(--radius-md)] bg-cream-100 p-3 text-sm">
              {availability?.pickup.address
                ? `📍 ${availability.pickup.address}${availability.pickup.instructions ? `. ${availability.pickup.instructions}` : ""}`
                : "📍 I'll send the pickup address with your confirmation."}
            </p>
          )}
        </Step>

        <Step n={2} title="Pick a day" error={errors.date}>
          {quote?.leadTimeDays ? (
            <p className="-mt-1 mb-3 text-sm text-cocoa-700">
              Your cakes need {quote.leadTimeDays} {quote.leadTimeDays === 1 ? "day" : "days"} of
              baking time, so the first open day is{" "}
              {quote.earliestDate ? formatCalendarDate(quote.earliestDate) : "soon"}.
            </p>
          ) : null}
          {availability ? (
            <DatePicker
              days={availability.days}
              value={date}
              onChange={(d) => {
                setDate(d);
                setErrors(without("date"));
              }}
            />
          ) : (
            <div
              role="status"
              aria-label="Loading dates"
              className="h-64 animate-pulse rounded-[var(--radius-md)] bg-cream-200"
            />
          )}
          {date && (
            <fieldset className="animate-rise mt-5">
              <legend className="font-bold">What time on {formatCalendarDate(date)}?</legend>
              {fulfilment ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <label
                      key={s.id}
                      className="cursor-pointer rounded-[var(--radius-pill)] bg-cream-50 px-4 py-2 font-bold ring-1 ring-cocoa-900/15 transition-colors has-checked:bg-cocoa-900 has-checked:text-cream-50 has-focus-visible:outline-3 has-focus-visible:outline-blush-700"
                    >
                      <input
                        type="radio"
                        name="slot"
                        checked={slotId === s.id}
                        onChange={() => {
                          setSlotId(s.id);
                          setErrors(without("slot"));
                        }}
                        className="sr-only"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-cocoa-700">Choose delivery or pickup first.</p>
              )}
              {errors.slot && (
                <p className="mt-2 text-sm font-bold text-blush-700">{errors.slot}</p>
              )}
            </fieldset>
          )}
        </Step>

        <Step n={3} title="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Your name" error={errors.name} className="sm:col-span-2">
              {(props) => (
                <input
                  {...props}
                  autoComplete="name"
                  value={details.name}
                  onChange={(e) => setDetail("name")(e.target.value)}
                />
              )}
            </Field>
            <Field
              id="phone"
              label="Mobile number"
              hint="For the day of delivery"
              error={errors.phone}
            >
              {(props) => (
                <input
                  {...props}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={details.phone}
                  onChange={(e) => setDetail("phone")(e.target.value)}
                />
              )}
            </Field>
            <Field id="email" label="Email" hint="For your confirmation" error={errors.email}>
              {(props) => (
                <input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={details.email}
                  onChange={(e) => setDetail("email")(e.target.value)}
                />
              )}
            </Field>
            {fulfilment === "delivery" && (
              <>
                <Field
                  id="line1"
                  label="House and street"
                  error={errors.line1}
                  className="sm:col-span-2"
                >
                  {(props) => (
                    <input
                      {...props}
                      autoComplete="address-line1"
                      value={details.line1}
                      onChange={(e) => setDetail("line1")(e.target.value)}
                    />
                  )}
                </Field>
                <Field id="line2" label="Area" optional error={errors.line2}>
                  {(props) => (
                    <input
                      {...props}
                      autoComplete="address-line2"
                      value={details.line2}
                      onChange={(e) => setDetail("line2")(e.target.value)}
                    />
                  )}
                </Field>
                <Field id="landmark" label="Landmark" optional error={errors.landmark}>
                  {(props) => (
                    <input
                      {...props}
                      value={details.landmark}
                      onChange={(e) => setDetail("landmark")(e.target.value)}
                    />
                  )}
                </Field>
                <Field id="city" label="City" error={errors.city}>
                  {(props) => (
                    <input
                      {...props}
                      autoComplete="address-level2"
                      value={details.city}
                      onChange={(e) => setDetail("city")(e.target.value)}
                    />
                  )}
                </Field>
                <div>
                  <p className="font-bold">PIN code</p>
                  <p className="mt-1 py-3 tracking-widest">
                    {delivery?.postalCode ?? "Check it in step 1"}
                  </p>
                </div>
                {me && (
                  <label className="flex items-center gap-2 font-bold sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="h-5 w-5 accent-cocoa-900"
                    />
                    Save this address for next time
                  </label>
                )}
              </>
            )}
            <Field
              id="note"
              label="A note for the baker"
              optional
              error={errors.note}
              className="sm:col-span-2"
            >
              {(props) => (
                <textarea
                  {...props}
                  rows={3}
                  maxLength={NOTE_TO_BAKER_MAX}
                  placeholder="Allergies, a surprise to keep, the gate code…"
                  value={details.note}
                  onChange={(e) => setDetail("note")(e.target.value)}
                />
              )}
            </Field>
          </div>
        </Step>
      </div>

      <aside
        aria-label="Order summary"
        className="rounded-[var(--radius-lg)] bg-white/70 p-5 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5 lg:sticky lg:top-24"
      >
        <h2 className="font-display text-xl font-semibold">Your order</h2>
        {quoteStatus === "loading" && !quote ? (
          <div
            role="status"
            aria-label="Loading prices"
            className="mt-3 h-24 animate-pulse rounded-[var(--radius-md)] bg-cream-200"
          />
        ) : (
          <ul className="mt-3 grid gap-3">
            {lines.map((l) => (
              <li key={l.itemId} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-bold">
                    {l.quantity} × {l.cakeName ?? "A cake"}
                  </span>
                  <span className="block text-cocoa-700">
                    {[l.sizeLabel, ...l.choices].filter(Boolean).join(", ")}
                    {l.message ? ` · “${l.message}”` : ""}
                  </span>
                  {l.status !== "ok" && (
                    <span className="block font-bold text-blush-700">{l.issues[0]}</span>
                  )}
                </span>
                <span className="shrink-0 font-bold">{formatMoney(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
        )}
        {blocked && (
          <p className="mt-3 text-sm font-bold text-blush-700">
            Some cakes changed.{" "}
            <Link href="/cart" className="underline">
              Fix them in your cart
            </Link>
            .
          </p>
        )}
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1 border-t border-cocoa-900/10 pt-3 text-sm">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatMoney(subtotal)}</dd>
          <dt>{fulfilment === "pickup" ? "Pickup" : "Delivery"}</dt>
          <dd className="text-right">
            {fulfilment === "pickup"
              ? "Free"
              : delivery?.available
                ? formatMoney(deliveryFee)
                : "—"}
          </dd>
          {discount && discount.amount > 0 && (
            <>
              <dt>Discount ({discount.code})</dt>
              <dd className="text-right font-bold text-blush-700">
                −{formatMoney(discount.amount)}
              </dd>
            </>
          )}
          <dt className="mt-2 font-display text-lg font-semibold">Total</dt>
          <dd
            className="mt-2 text-right font-display text-lg font-semibold"
            data-testid="checkout-total"
          >
            {formatMoney(total)}
          </dd>
        </dl>
        {quote && !blocked && (
          <DiscountField
            items={cartItems}
            subtotal={subtotal}
            applied={discount}
            onChange={setDiscount}
            error={discountError}
            onError={setDiscountError}
          />
        )}
        {date && slotId && fulfilment && (
          <p className="mt-3 rounded-[var(--radius-md)] bg-pistachio-200 p-3 text-sm font-bold">
            {fulfilment === "pickup" ? "Pickup" : "Delivery"} on {formatCalendarDate(date)},{" "}
            {slots.find((s) => s.id === slotId)?.label}
          </p>
        )}
      </aside>

      <div className="sticky bottom-[calc(var(--bottom-nav-height)+1.25rem)] z-20 -mx-2 rounded-[var(--radius-lg)] bg-cocoa-900 p-3 text-cream-50 shadow-[var(--shadow-lifted)] sm:bottom-4 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="min-w-0 flex-1 pl-2 text-sm text-cream-200">
            {byUpi
              ? "Next you pay by UPI with any app. By placing your order you agree to the "
              : "Secure payment by UPI, card or netbanking. By paying you agree to the "}
            <Link href="/terms" className="underline underline-offset-2">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/refunds" className="underline underline-offset-2">
              refund policy
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={pay}
            disabled={paying || blocked || enabled === null || !quote}
            className="rounded-[var(--radius-pill)] bg-blush-400 px-6 py-3 font-bold text-cocoa-900 transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
          >
            {paying
              ? byUpi
                ? "Placing your order…"
                : "Opening payment…"
              : `${byUpi ? "Place order" : "Pay"} ${formatMoney(total)}`}
          </button>
        </div>
        {formError && (
          <p role="alert" className="mt-2 pl-2 text-sm font-bold text-blush-200">
            {formError}
          </p>
        )}
      </div>

      {testCheckout && (
        <TestPaymentDialog
          amount={testCheckout.amount}
          onPay={() => testPay("success")}
          onDecline={() => testPay("failure")}
        />
      )}
    </div>
  );
}

function Step({
  n,
  title,
  error,
  children,
}: {
  n: number;
  title: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`step-${n}`}
      className="rounded-[var(--radius-lg)] bg-white/70 p-4 shadow-[var(--shadow-soft)] ring-1 ring-cocoa-900/5 sm:p-6"
    >
      <h2 id={`step-${n}`} className="flex items-center gap-3 font-display text-2xl font-semibold">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blush-400 font-sans text-base font-bold"
        >
          {n}
        </span>
        {title}
      </h2>
      {error && <p className="mt-2 text-sm font-bold text-blush-700">{error}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Choice({
  name,
  checked,
  onChange,
  emoji,
  title,
  detail,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  emoji: string;
  title: string;
  detail: string;
}) {
  return (
    <label className="flex cursor-pointer flex-col gap-1 rounded-[var(--radius-md)] bg-cream-50 p-4 ring-1 ring-cocoa-900/10 transition-all has-checked:-translate-y-0.5 has-checked:bg-blush-100 has-checked:shadow-[var(--shadow-soft)] has-checked:ring-2 has-checked:ring-blush-700 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-blush-700">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span aria-hidden="true" className="text-3xl">
        {emoji}
      </span>
      <span className="font-bold">{title}</span>
      <span className="text-sm text-cocoa-700">{detail}</span>
    </label>
  );
}

type FieldProps = {
  id: string;
  className: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

function Field({
  id,
  label,
  hint,
  optional,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  className?: string;
  children: (props: FieldProps & { id: string }) => ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="font-bold">
        {label}
        {optional && <span className="font-normal text-cocoa-700"> (optional)</span>}
        {hint && <span className="font-normal text-cocoa-700"> · {hint}</span>}
      </label>
      {children({
        id,
        className: field,
        ...(error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {}),
      })}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-bold text-blush-700">
          {error}
        </p>
      )}
    </div>
  );
}

function Notice({ emoji, title, children }: { emoji: string; title: string; children: ReactNode }) {
  return (
    <div className="px-2 py-10 text-center">
      <p aria-hidden="true" className="animate-float text-6xl">
        {emoji}
      </p>
      <p className="mt-4 font-display text-2xl font-semibold">{title}</p>
      <p className="mt-2 text-cocoa-700">{children}</p>
    </div>
  );
}

/** Stands in for Razorpay's window in automated tests (`PAYMENT_PROVIDER=test`). */
function TestPaymentDialog({
  amount,
  onPay,
  onDecline,
}: {
  amount: number;
  onPay: () => void;
  onDecline: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="test-payment-title"
      className="m-auto rounded-[var(--radius-lg)] bg-cream-50 p-6 text-cocoa-900 shadow-[var(--shadow-lifted)] backdrop:bg-cocoa-900/40"
    >
      <h2 id="test-payment-title" className="font-display text-xl font-semibold">
        Test payment
      </h2>
      <p className="mt-2 text-sm">No real money moves. This only appears in automated tests.</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onPay}
          className="rounded-[var(--radius-pill)] bg-cocoa-900 px-5 py-2 font-bold text-cream-50"
        >
          Pay {formatMoney(amount)}
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="rounded-[var(--radius-pill)] bg-cream-200 px-5 py-2 font-bold"
        >
          Decline
        </button>
      </div>
    </dialog>
  );
}
