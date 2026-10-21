import { z } from "zod";
import { SavedAddressInputSchema, SavedAddressSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { accounts } from "@/lib/account/service";
import { customerFromRequest } from "@/lib/account/session";

const AddressesSchema = z.object({ addresses: z.array(SavedAddressSchema) });

export async function GET(request: Request) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to see your addresses");
  return apiJson(AddressesSchema, { addresses: await accounts().addresses(me.userId) });
}

/** Saves an address (the same one twice is kept once). `400 INVALID_ADDRESS`. */
export async function POST(request: Request) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to save addresses");
  const body = SavedAddressInputSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return apiError(400, "INVALID_ADDRESS", body.error.issues[0]!.message, {
      issues: body.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  try {
    await accounts().saveAddress(me.userId, body.data);
  } catch (error) {
    return apiError(400, "INVALID_ADDRESS", (error as Error).message);
  }
  return apiJson(
    AddressesSchema,
    { addresses: await accounts().addresses(me.userId) },
    {
      status: 201,
    },
  );
}
