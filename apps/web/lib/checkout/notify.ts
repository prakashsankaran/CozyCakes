import { formatCalendarDate, formatMoney, type CheckoutSnapshot } from "@cozycakes/core";
import { emailConfigured, sendEmail, type Email } from "@/lib/email";

/**
 * Order emails (FR-016, FR-025): a confirmation for the customer and a heads-up for the owner.
 * Sending never blocks or undoes an order; failures are logged.
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
