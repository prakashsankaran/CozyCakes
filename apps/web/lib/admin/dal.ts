import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, staffRoleOf, type StaffRole } from "@/lib/auth";

/**
 * Data access layer for the back office (FR-020). Every admin page and Server Action calls one
 * of these before touching data; `proxy.ts` only does an optimistic cookie check.
 */

export type StaffSession = { userId: string; email: string; role: StaffRole };

export async function currentStaff(): Promise<StaffSession | null> {
  // Read the request first: it marks the caller as dynamic, so prerendering stops here instead of
  // creating the auth client (and its database connection) at build time.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const role = staffRoleOf({ email: session.user.email, role: session.user.role });
  return role ? { userId: session.user.id, email: session.user.email, role } : null;
}

/** Menu, choices and dates are the owner's to manage. */
export async function requireOwner(): Promise<StaffSession> {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/sign-in");
  if (staff.role !== "owner") redirect("/admin/sign-in?denied=1");
  return staff;
}

/** Orders are for everyone in the kitchen: the owner and, later, staff (FR-020). */
export async function requireStaff(): Promise<StaffSession> {
  const staff = await currentStaff();
  if (!staff) redirect("/admin/sign-in");
  return staff;
}
