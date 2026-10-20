"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import {
  BakerySettingsInputSchema,
  CakeInputSchema,
  CakeStatusSchema,
  DayAvailabilityInputSchema,
  OptionGroupInputSchema,
  type BakerySettingsInput,
  type CakeInput,
  type CakeStatus,
  type DayAvailabilityInput,
  type OptionGroupInput,
} from "@cozycakes/core";
import { AdminInputError, adminRepository, getDb } from "@cozycakes/db";
import { requireOwner } from "@/lib/admin/dal";
import { getAuth, mayRequestCode } from "@/lib/auth";
import { emailConfigured } from "@/lib/email";
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
