import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate for the back office (tasks T048): visitors without a session cookie go to the
 * sign-in page. The real role check happens in `lib/admin/dal.ts` on every page and action.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL("/admin/sign-in", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/((?!sign-in).*)"],
};
