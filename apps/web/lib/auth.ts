import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { getDb, schema } from "@cozycakes/db";
import { sendEmail, signInCodeEmail } from "./email";

/**
 * Better Auth with email one-time codes (research.md §8, tasks T047). The owner is whoever's
 * address is in `OWNER_EMAIL` (comma-separated); staff are users the owner marks as `staff`.
 * Until customer accounts arrive (US6), codes are only emailed to the owner and staff.
 */

export type StaffRole = "owner" | "staff";

function ownerEmails(): string[] {
  return (process.env.OWNER_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function staffRoleOf(user: { email: string; role?: string | null }): StaffRole | null {
  if (ownerEmails().includes(user.email.toLowerCase())) return "owner";
  return user.role === "owner" || user.role === "staff" ? user.role : null;
}

/** Whether `email` may receive a sign-in code (an owner address or an existing staff user). */
export async function mayRequestCode(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (ownerEmails().includes(normalized)) return true;
  const user = await getDb().query.users.findFirst({
    where: (u, { eq }) => eq(u.email, normalized),
    columns: { email: true, role: true },
  });
  return user ? staffRoleOf(user) !== null : false;
}

/**
 * Sessions are signed with `BETTER_AUTH_SECRET`. When it isn't set, a secret is derived from the
 * database URL, which is already a server-only secret on every deployment, so the owner has one
 * less setting to manage. Rotating the database password then signs everyone out.
 */
function secret(): string | undefined {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const url = process.env.DATABASE_URL;
  return url ? createHash("sha256").update(`cozycakes-auth:${url}`).digest("base64url") : undefined;
}

function allowedHosts(): string[] {
  const urls = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];
  const hosts = urls.flatMap((u) => {
    if (!u) return [];
    try {
      return [new URL(u.includes("://") ? u : `https://${u}`).host];
    } catch {
      return [];
    }
  });
  return [...new Set([...hosts, "localhost:*", "127.0.0.1:*"])];
}

function createAuth() {
  return betterAuth({
    appName: "CozyCakes",
    secret: secret(),
    baseURL: {
      allowedHosts: allowedHosts(),
      fallback: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    },
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "customer", input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp }) {
          // Strangers get no email: until US6 only the owner and staff can sign in.
          if (!(await mayRequestCode(email))) return;
          await sendEmail(signInCodeEmail(email, otp));
        },
      }),
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Created on first use, so building the app needs no database. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
