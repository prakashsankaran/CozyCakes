import { z } from "zod";
import { FavouriteInputSchema } from "@cozycakes/core";
import { apiError, apiJson } from "@/lib/api";
import { accounts } from "@/lib/account/service";
import { customerFromRequest } from "@/lib/account/session";

const FavouritesSchema = z.object({ cakeIds: z.array(z.string()) });

/** Favourite cakes (US6 scenario 2): `GET` lists ids, `POST`/`DELETE` `{ cakeId }` add or remove. */
export async function GET(request: Request) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to save favourites");
  return apiJson(FavouritesSchema, { cakeIds: await accounts().favouriteCakeIds(me.userId) });
}

async function change(request: Request, on: boolean) {
  const me = await customerFromRequest(request);
  if (!me) return apiError(401, "SIGNED_OUT", "Sign in to save favourites");
  const body = FavouriteInputSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError(400, "INVALID_REQUEST", "Which cake?");
  try {
    await accounts().setFavourite(me.userId, body.data.cakeId, on);
  } catch {
    return apiError(404, "CAKE_NOT_FOUND", "We couldn't find that cake");
  }
  return apiJson(FavouritesSchema, { cakeIds: await accounts().favouriteCakeIds(me.userId) });
}

export const POST = (request: Request) => change(request, true);
export const DELETE = (request: Request) => change(request, false);
