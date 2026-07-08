import { handleAdminShopSectionItemsCollection } from "../../../../../../lib/server/admin-shop-structure-crud";
import { getServerEnv } from "../../../../../../lib/server/api-core";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminShopSectionItemsCollection(request, getServerEnv(), id);
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminShopSectionItemsCollection(request, getServerEnv(), id);
}
