import { z } from "zod";
import { apiError } from "@/lib/api";
import { accounts } from "@/lib/account/service";
import { customerFromRequest } from "@/lib/account/session";

export async function DELETE(request: Request, ctx: RouteContext<"/api/v1/me/addresses/[id]">) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to manage addresses");
  const { id } = await ctx.params;
  if (z.uuid().safeParse(id).success) await accounts().deleteAddress(me.userId, id);
  return new Response(null, { status: 204 });
}
