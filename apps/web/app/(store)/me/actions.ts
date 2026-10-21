"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ContactSchema,
  SavedAddressInputSchema,
  type Reorder,
  type SavedAddressInput,
} from "@cozycakes/core";
import { checkoutRepository, getDb } from "@cozycakes/db";
import { accounts, reorder as reorderLines } from "@/lib/account/service";
import { currentCustomer, maskEmail } from "@/lib/account/session";
import { codeRecentlySent, getAuth } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";

/**
 * Customer account actions (US6). Signing in is by a one-time code to the customer's email, so
 * there is no password to forget; the first sign-in creates the account.
 */

export type Result<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

/** Where to go after signing in: only paths on this site. */
function safeNext(next: string | undefined) {
  return next && /^\/(?!\/)[\w\-/?=&.%]*$/.test(next) ? next : "/me";
}

async function sendCode(email: string): Promise<Result> {
  if (!emailConfigured()) return fail("Signing in isn't switched on yet. Please try again later.");
  if (await codeRecentlySent(email)) {
    return fail("We just sent you a code. Check your inbox (and spam), or try again in a moment.");
  }
  try {
    await getAuth().api.sendVerificationOTP({
      body: { email, type: "sign-in" },
      headers: await headers(),
    });
  } catch (error) {
    console.error(error);
    return fail("We couldn't send the email. Try again in a minute.");
  }
  return { ok: true };
}

async function signIn(email: string, code: string) {
  try {
    const { user } = await getAuth().api.signInEmailOTP({
      body: { email, otp: code.trim() },
      headers: await headers(),
    });
    await accounts().claimOrders(user.id, user.email);
    return user;
  } catch {
    return null;
  }
}

export async function requestSignInCode(email: string): Promise<Result> {
  const parsed = z.email().safeParse(email.trim().toLowerCase());
  if (!parsed.success) return fail("That doesn't look like an email address");
  return sendCode(parsed.data);
}

export async function verifySignInCode(email: string, code: string, next?: string) {
  const user = await signIn(email.trim().toLowerCase(), code);
  if (!user) return fail("That code didn't work. Check it, or ask for a new one.");
  redirect(safeNext(next));
}

export async function signOutCustomer() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/me");
}

// ---- "Save my details" from an order page (US6 scenario 1) ----

async function orderEmail(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const order = await checkoutRepository(getDb()).orderByTrackingToken(token);
  return order ? { email: order.contactEmail, order } : null;
}

/** Sends a code to the email the order was placed with, without showing the address in full. */
export async function startSavingDetails(token: string): Promise<Result<{ sentTo: string }>> {
  const found = await orderEmail(token);
  if (!found) return fail("We couldn't find that order");
  const sent = await sendCode(found.email);
  return sent.ok ? { ok: true, data: { sentTo: maskEmail(found.email) } } : sent;
}

/** Signs in as the order's email, attaches its orders and keeps the name, phone and address. */
export async function finishSavingDetails(token: string, code: string) {
  const found = await orderEmail(token);
  if (!found) return fail("We couldn't find that order");
  const user = await signIn(found.email, code);
  if (!user) return fail("That code didn't work. Check it, or ask for a new one.");
  const { order } = found;
  await accounts().rememberContact(user.id, { name: order.contactName, phone: order.contactPhone });
  if (order.address) {
    await accounts()
      .saveAddress(user.id, {
        label: "",
        line1: order.address.line1,
        line2: order.address.line2 ?? "",
        landmark: order.address.landmark ?? "",
        city: order.address.city,
        postalCode: order.address.postalCode,
      })
      .catch(() => undefined);
  }
  redirect("/me?saved=1");
}

// ---- Signed-in customers ----

async function customer() {
  const me = await currentCustomer();
  if (!me) redirect("/me");
  return me;
}

export async function updateProfile(input: { name: string; phone: string }): Promise<Result> {
  const me = await customer();
  const parsed = ContactSchema.pick({ name: true, phone: true }).safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  await accounts().updateProfile(me.userId, parsed.data);
  return { ok: true };
}

export async function saveAddress(input: SavedAddressInput): Promise<Result> {
  const me = await customer();
  const parsed = SavedAddressInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]!.message);
  try {
    await accounts().saveAddress(me.userId, parsed.data);
  } catch (error) {
    return fail((error as Error).message);
  }
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<Result> {
  const me = await customer();
  await accounts().deleteAddress(me.userId, z.uuid().parse(id));
  return { ok: true };
}

export async function reorderAction(orderId: string): Promise<Result<Reorder>> {
  const me = await customer();
  const data = await reorderLines(me.userId, z.uuid().parse(orderId));
  return data ? { ok: true, data } : fail("We couldn't find that order");
}
