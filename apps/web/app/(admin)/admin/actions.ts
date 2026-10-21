"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import {
  BakerySettingsInputSchema,
  CancelOrderInputSchema,
  CakeInputSchema,
  CakeStatusSchema,
  DayAvailabilityInputSchema,
  DeliveryZoneInputSchema,
  TimeSlotInputSchema,
  DiscountCodeInputSchema,
  MoveOrderInputSchema,
  OptionGroupInputSchema,
  PostalCodeSchema,
  type BakerySettingsInput,
  type CakeInput,
  type CakeStatus,
  type DayAvailabilityInput,
  type CancelOrderInput,
  type DeliveryZoneInput,
  type TimeSlotInput,
  type DiscountCodeInput,
  type MoveOrderInput,
  type OptionGroupInput,
} from "@cozycakes/core";
import {
  AdminInputError,
  OrderMoveError,
  adminRepository,
  discountsRepository,
  getDb,
} from "@cozycakes/db";
import { requireOwner, requireStaff } from "@/lib/admin/dal";
import { getAuth, mayRequestCode } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
import {
  cancelOrder as cancelPaidOrder,
  moveOrder,
  type RefundOutcome,
} from "@/lib/orders/service";
import { signCakePhotoUpload } from "@/lib/uploads";

/**
 * Back-office mutations (US5). Each one checks the session itself, validates with the shared
 * zod schemas from @cozycakes/core, and refreshes the storefront catalog cache on success.
 */

export type ActionResult<T = undefined> =
  ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; errors: string[] };

const repo = () => adminRepository(getDb());

function failure(error: unknown): { ok: false; errors: string[] } {
  if (error instanceof z.ZodError) return { ok: false, errors: error.issues.map((i) => i.message) };
  if (error instanceof AdminInputError) return { ok: false, errors: [error.message] };
  if (error instanceof OrderMoveError) {
    return { ok: false, errors: ["Someone already moved this order. Refresh to see where it is."] };
  }
  throw error;
}

// ---- Sign in ----

export async function requestCode(email: string): Promise<ActionResult> {
  const parsed = z.email().safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { ok: false, errors: ["That doesn't look like an email address"] };
  if (!emailConfigured()) {
    return { ok: false, errors: ["Sign-in emails aren't set up yet (RESEND_API_KEY is missing)"] };
  }
  // Same answer either way, so the form doesn't reveal who has access.
  if (await mayRequestCode(parsed.data)) {
    try {
      await getAuth().api.sendVerificationOTP({
        body: { email: parsed.data, type: "sign-in" },
        headers: await headers(),
      });
    } catch (error) {
      console.error(error);
      return { ok: false, errors: ["We couldn't send the email. Try again in a minute."] };
    }
  }
  return { ok: true };
}

export async function verifyCode(email: string, code: string): Promise<ActionResult> {
  try {
    await getAuth().api.signInEmailOTP({
      body: { email: email.trim().toLowerCase(), otp: code.trim() },
      headers: await headers(),
    });
  } catch {
    return { ok: false, errors: ["That code didn't work. Check it, or ask for a new one."] };
  }
  redirect("/admin");
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/admin/sign-in");
}

// ---- Menu ----

export async function saveCake(id: string | null, input: CakeInput): Promise<ActionResult> {
  await requireOwner();
  let saved: string;
  try {
    const data = CakeInputSchema.parse(input);
    saved = id ? (await repo().updateCake(id, data), id) : await repo().createCake(data);
  } catch (error) {
    return failure(error);
  }
  updateTag("catalog");
  redirect(`/admin/menu?saved=${saved}`);
}

export async function setCakeStatus(id: string, status: CakeStatus): Promise<ActionResult> {
  await requireOwner();
  try {
    await repo().setCakeStatus(z.uuid().parse(id), CakeStatusSchema.parse(status));
  } catch (error) {
    return failure(error);
  }
  updateTag("catalog");
  return { ok: true };
}

export async function moveCake(id: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireOwner();
  await repo().moveCake(z.uuid().parse(id), direction === "up" ? "up" : "down");
  updateTag("catalog");
  return { ok: true };
}

export async function signPhotoUpload(): Promise<
  ActionResult<{ uploadUrl: string; fields: Record<string, string>; url: string }>
> {
  await requireOwner();
  const signed = signCakePhotoUpload();
  if (!signed) {
    return {
      ok: false,
      errors: ["Photo uploads need a Cloudinary account (CLOUDINARY_URL) set in Vercel"],
    };
  }
  return {
    ok: true,
    data: { uploadUrl: signed.uploadUrl, fields: signed.fields, url: signed.url },
  };
}

// ---- Choices ----

export async function saveOptionGroup(input: OptionGroupInput): Promise<ActionResult> {
  await requireOwner();
  try {
    await repo().saveOptionGroup(OptionGroupInputSchema.parse(input));
  } catch (error) {
    return failure(error);
  }
  updateTag("catalog");
  return { ok: true };
}

// ---- Dates ----

export async function saveSettings(input: BakerySettingsInput): Promise<ActionResult> {
  await requireOwner();
  try {
    await repo().saveSettings(BakerySettingsInputSchema.parse(input));
  } catch (error) {
    return failure(error);
  }
  updateTag("catalog");
  return { ok: true };
}

export async function saveDay(input: DayAvailabilityInput): Promise<ActionResult> {
  await requireOwner();
  try {
    await repo().saveDay(DayAvailabilityInputSchema.parse(input));
  } catch (error) {
    return failure(error);
  }
  return { ok: true };
}

export async function clearDay(date: string): Promise<ActionResult> {
  await requireOwner();
  await repo().clearDays([DayAvailabilityInputSchema.shape.date.parse(date)]);
  return { ok: true };
}

export async function saveZone(input: DeliveryZoneInput): Promise<ActionResult> {
  await requireOwner();
  try {
    await repo().saveZone(DeliveryZoneInputSchema.parse(input));
  } catch (error) {
    return failure(error);
  }
  return { ok: true };
}

export async function deleteZone(postalCode: string): Promise<ActionResult> {
  await requireOwner();
  await repo().deleteZone(PostalCodeSchema.parse(postalCode));
  return { ok: true };
}

export async function addSlot(input: TimeSlotInput): Promise<ActionResult> {
  await requireOwner();
  try {
    await repo().addSlot(TimeSlotInputSchema.parse(input));
  } catch (error) {
    return failure(error);
  }
  return { ok: true };
}

export async function setSlotActive(id: string, active: boolean): Promise<ActionResult> {
  await requireOwner();
  try {
    await repo().setSlotActive(z.uuid().parse(id), active);
  } catch (error) {
    return failure(error);
  }
  return { ok: true };
}

// ---- Orders ----

export async function advanceOrder(input: MoveOrderInput): Promise<ActionResult> {
  const staff = await requireStaff();
  try {
    const { orderId, to } = MoveOrderInputSchema.parse(input);
    await moveOrder({ orderId, to, actorUserId: staff.userId });
  } catch (error) {
    return failure(error);
  }
  return { ok: true };
}

/** Cancelling refunds the customer, so only the owner can do it (FR-020, FR-024). */
export async function cancelOrder(
  input: CancelOrderInput,
): Promise<ActionResult<{ refund: RefundOutcome }>> {
  const owner = await requireOwner();
  try {
    const { orderId, reason } = CancelOrderInputSchema.parse(input);
    const { refund } = await cancelPaidOrder({ orderId, reason, actorUserId: owner.userId });
    return { ok: true, data: { refund } };
  } catch (error) {
    return failure(error);
  }
}

// ---- Discount codes ----

export async function saveDiscount(
  id: string | null,
  input: DiscountCodeInput,
): Promise<ActionResult> {
  await requireOwner();
  try {
    await discountsRepository(getDb()).save(
      id === null ? null : z.uuid().parse(id),
      DiscountCodeInputSchema.parse(input),
    );
  } catch (error) {
    return failure(error);
  }
  return { ok: true };
}

export async function setDiscountActive(id: string, active: boolean): Promise<ActionResult> {
  await requireOwner();
  await discountsRepository(getDb()).setActive(z.uuid().parse(id), active);
  return { ok: true };
}
