import {
  ORDER_STATUS_COPY,
  formatCalendarDate,
  formatMoney,
  notifiesCustomer,
  type CheckoutSnapshot,
  type OrderStatus,
} from "@cozycakes/core";
import { emailConfigured, sendEmail, type Email } from "@/lib/email";

/**
 * Order emails (FR-016, FR-019, FR-025): a confirmation and status updates for the customer, and a
 * heads-up for the owner. Sending never blocks or undoes an order; failures are logged.
 */

type Placed = { number: string; trackingToken: string; snapshot: CheckoutSnapshot };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function itemLines(snapshot: CheckoutSnapshot): string[] {
  return snapshot.lines.map((l) => {
    const choices = [l.sizeLabel, ...l.options.map((o) => o.name)].join(", ");
    const message = l.message ? `, message "${l.message}"` : "";
    return `${l.quantity} × ${l.cakeName} (${choices}${message}): ${formatMoney(l.lineTotal)}`;
  });
}

function when(snapshot: CheckoutSnapshot) {
  const how = snapshot.fulfilment === "delivery" ? "Delivery" : "Pickup";
  return `${how} on ${formatCalendarDate(snapshot.date)}, ${snapshot.slotLabel}`;
}

function totals(snapshot: CheckoutSnapshot): string[] {
  return [
    `Subtotal: ${formatMoney(snapshot.subtotal)}`,
    ...(snapshot.deliveryFee ? [`Delivery: ${formatMoney(snapshot.deliveryFee)}`] : []),
    ...(snapshot.discount
      ? [
          `Discount${snapshot.discountCode ? ` (${snapshot.discountCode})` : ""}: −${formatMoney(snapshot.discount)}`,
        ]
      : []),
    `Paid: ${formatMoney(snapshot.total)}`,
  ];
}

function html(heading: string, paragraphs: string[], link?: { href: string; label: string }) {
  const body = paragraphs
    .map(
      (p) => `<p style="margin:0 0 12px;line-height:1.5">${escape(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const button = link
    ? `<p style="margin:20px 0"><a href="${link.href}" style="background:#3b2420;color:#fff8f0;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">${escape(link.label)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;background:#fff8f0;padding:32px;color:#3b2420">
  <p style="font-size:22px;font-weight:700;margin:0 0 16px">${escape(heading)}</p>${body}${button}
</div>`;
}

export function customerConfirmationEmail(order: Placed, origin: string): Email {
  const { snapshot } = order;
  const link = `${origin}/orders/${order.trackingToken}`;
  const paragraphs = [
    `Hi ${snapshot.contact.name}, thank you! Your order ${order.number} is confirmed and on my baking list.`,
    when(snapshot),
    itemLines(snapshot).join("\n"),
    totals(snapshot).join("\n"),
    snapshot.fulfilment === "delivery" && snapshot.address
      ? `Delivering to: ${[snapshot.address.line1, snapshot.address.line2, snapshot.address.landmark, snapshot.address.city, snapshot.address.postalCode].filter(Boolean).join(", ")}`
      : "I'll send pickup directions before the day.",
  ];
  return {
    to: snapshot.contact.email,
    subject: `Your CozyCakes order ${order.number} is confirmed 🎂`,
    text: [...paragraphs, `See your order: ${link}`].join("\n\n"),
    html: html(`Order ${order.number} is confirmed`, paragraphs, {
      href: link,
      label: "See your order",
    }),
  };
}

export function ownerNewOrderEmail(order: Placed, to: string): Email {
  const { snapshot } = order;
  const paragraphs = [
    when(snapshot),
    itemLines(snapshot).join("\n"),
    totals(snapshot).join("\n"),
    `${snapshot.contact.name} · ${snapshot.contact.phone} · ${snapshot.contact.email}`,
    ...(snapshot.note ? [`Note: ${snapshot.note}`] : []),
  ];
  return {
    to,
    subject: `New order ${order.number}: ${formatCalendarDate(snapshot.date)}`,
    text: paragraphs.join("\n\n"),
    html: html(`New order ${order.number}`, paragraphs),
  };
}

export async function sendOrderEmails(order: Placed, origin: string) {
  if (!emailConfigured()) {
    console.warn(`Order ${order.number} placed, but email isn't set up (RESEND_API_KEY)`);
    return;
  }
  const owners = (process.env.OWNER_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const emails = [
    customerConfirmationEmail(order, origin),
    ...owners.map((to) => ownerNewOrderEmail(order, to)),
  ];
  const results = await Promise.allSettled(emails.map(sendEmail));
  for (const r of results) if (r.status === "rejected") console.error(r.reason);
}

type Moved = {
  number: string;
  trackingToken: string;
  contact: { name: string; email: string };
  fulfilment: "delivery" | "pickup";
  date: string;
  slotLabel: string;
  status: OrderStatus;
  cancelReason: string | null;
};

const STATUS_SUBJECTS: Partial<Record<OrderStatus, string>> = {
  ready: "is ready 🎂",
  out_for_delivery: "is on its way 🛵",
  ready_for_pickup: "is ready to collect 🏡",
  delivered: "has arrived 🎉",
  collected: "is in your hands 🎉",
  cancelled: "was cancelled",
};

/** Status updates for the customer (FR-019); `refunded` adds the refund line to cancellations. */
export function orderStatusEmail(order: Moved, origin: string, refunded: boolean): Email {
  const link = `${origin}/orders/${order.trackingToken}`;
  const copy = ORDER_STATUS_COPY[order.status];
  const when = `${order.fulfilment === "delivery" ? "Delivery" : "Pickup"} on ${formatCalendarDate(order.date)}, ${order.slotLabel}`;
  const paragraphs =
    order.status === "cancelled"
      ? [
          `Hi ${order.contact.name}, I'm so sorry: I've had to cancel order ${order.number}.`,
          ...(order.cancelReason ? [`Why: ${order.cancelReason}`] : []),
          refunded
            ? "Your payment is being refunded to the way you paid. Banks usually take 5 to 7 working days."
            : "I'll be in touch about your payment.",
        ]
      : [`Hi ${order.contact.name}, ${copy.customer}`, when];
  return {
    to: order.contact.email,
    subject: `Your CozyCakes order ${order.number} ${STATUS_SUBJECTS[order.status] ?? `is ${copy.label.toLowerCase()}`}`,
    text: [...paragraphs, `Follow your order: ${link}`].join("\n\n"),
    html: html(`Order ${order.number}: ${copy.label}`, paragraphs, {
      href: link,
      label: "Follow your order",
    }),
  };
}

export async function sendOrderStatusEmail(order: Moved, origin: string, refunded = false) {
  if (!notifiesCustomer(order.status)) return;
  if (!emailConfigured()) {
    console.warn(`Order ${order.number} is ${order.status}, but email isn't set up`);
    return;
  }
  try {
    await sendEmail(orderStatusEmail(order, origin, refunded));
  } catch (error) {
    console.error(error);
  }
}
