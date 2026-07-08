import { handleAdminProductsCollection } from "../../../../lib/server/admin-products-crud";
import { getServerEnv } from "../../../../lib/server/api-core";

export async function GET(request: Request) {
  return handleAdminProductsCollection(request, getServerEnv());
}

export async function POST(request: Request) {
  return handleAdminProductsCollection(request, getServerEnv());
}
