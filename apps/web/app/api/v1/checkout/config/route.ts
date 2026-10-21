import { connection } from "next/server";
import { checkoutEnabled } from "@/lib/checkout/payments";

/** Whether online checkout is switched on, so the cart knows which button to show. */
export async function GET() {
  await connection();
  return Response.json({ enabled: checkoutEnabled() });
}
