import { handleAdminShopCategoriesCollection } from "../../../../lib/server/admin-shop-structure-crud";
import { getServerEnv } from "../../../../lib/server/api-core";

export async function GET(request: Request) {
  return handleAdminShopCategoriesCollection(request, getServerEnv());
}

export async function POST(request: Request) {
  return handleAdminShopCategoriesCollection(request, getServerEnv());
}
