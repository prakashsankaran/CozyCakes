import { apiError } from "@/lib/api";
import { site } from "@/lib/site";
import { CheckoutError } from "./service";

/** Turns checkout errors into contract-shaped responses; anything else is a real failure. */
export function checkoutErrorResponse(error: unknown) {
  if (error instanceof CheckoutError) {
    return apiError(error.status, error.code, error.message, error.details);
  }
  throw error;
}

/** Base for links in emails: the configured site address, else wherever the request came in. */
export function siteOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL ? site.url : new URL(request.url).origin;
}
