import { z } from "zod";
import { AvailabilitySchema } from "@cozycakes/core";
import { apiError, apiJson, searchParamsObject } from "@/lib/api";
import { getAvailability } from "@/lib/checkout/service";

const Query = z.object({ lead_days: z.coerce.number().int().min(0).max(60).default(0) });

/** Calendar of orderable dates and time slots (FR-011). */
export async function GET(request: Request) {
  const query = Query.safeParse(searchParamsObject(request.url));
  if (!query.success) {
    return apiError(400, "INVALID_QUERY", "Invalid query", z.treeifyError(query.error));
  }
  return apiJson(AvailabilitySchema, await getAvailability(query.data.lead_days));
}
