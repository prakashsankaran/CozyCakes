import { headers } from "next/headers";
import { connection } from "next/server";
import { getAuth } from "@/lib/auth";

/** Whoever is signed in on the shop side (US6), or null. Staff and the owner count too. */
export async function currentCustomer(): Promise<{ userId: string; email: string } | null> {
  // Reading the request first keeps prerendering from creating the auth client at build time.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  return session ? { userId: session.user.id, email: session.user.email } : null;
}

/** "ananya@example.com" → "an•••@example.com", to say where a code went without revealing it. */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

/** The signed-in user for an API request (session cookie), or null. */
export async function customerFromRequest(request: Request) {
  // GET handlers are prerendered at build time unless they wait for a real request.
  await connection();
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session ? { userId: session.user.id, email: session.user.email } : null;
}
