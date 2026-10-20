import { z } from "zod";
import { DeliveryCheckSchema, PostalCodeSchema } from "@cozycakes/core";
import { apiError, apiJson, searchParamsObject } from "@/lib/api";
import { checkDelivery } from "@/lib/checkout/service";

const Query = z.object({ postal_code: PostalCodeSchema });

/** Is delivery available to this PIN code, and for what fee (FR-012). */
export async function GET(request: Request) {
  const query = Query.safeParse(searchParamsObject(request.url));
  if (!query.success) {
    return apiError(400, "INVALID_POSTAL_CODE", "Enter a 6-digit PIN code");
  }
  return apiJson(DeliveryCheckSchema, await checkDelivery(query.data.postal_code));
}
