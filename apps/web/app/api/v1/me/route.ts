import { MeSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { accounts } from "@/lib/account/service";
import { customerFromRequest } from "@/lib/account/session";

/** The signed-in customer, for pre-filling checkout. `401 SIGNED_OUT` for guests. */
export async function GET(request: Request) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to see your account");
  const [profile, addresses] = await Promise.all([
    accounts().profile(me.userId),
    accounts().addresses(me.userId),
  ]);
  return apiJson(MeSchema, { ...profile!, addresses });
}
