import { z } from "zod";
import { MyOrderSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { accounts } from "@/lib/account/service";
import { customerFromRequest } from "@/lib/account/session";

/** The customer's orders, newest date first, including guest orders placed with their email. */
export async function GET(request: Request) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to see your orders");
  await accounts().claimOrders(me.userId, me.email);
  return apiJson(z.object({ orders: z.array(MyOrderSchema) }), {
    orders: await accounts().orders(me.userId),
  });
}
