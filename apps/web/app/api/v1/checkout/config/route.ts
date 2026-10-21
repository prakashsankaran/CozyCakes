import { connection } from "next/server";
import { checkoutMethod } from "@/lib/checkout/payments";

/** Whether online checkout is switched on and how customers pay, so the cart shows the right button. */
export async function GET() {
  await connection();
  const method = await checkoutMethod();
  return Response.json({ enabled: method !== null, method });
}
