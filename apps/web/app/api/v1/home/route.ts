import { HomeSchema } from "@cozycakes/core";
import { apiJson } from "@/lib/api";
import { getHome } from "@/lib/catalog";

export async function GET() {
  return apiJson(HomeSchema, await getHome());
}
