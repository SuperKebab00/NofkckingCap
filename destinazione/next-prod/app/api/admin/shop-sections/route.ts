import { handleAdminShopSectionsCollection } from "../../../../lib/server/admin-shop-structure-crud";
import { getServerEnv } from "../../../../lib/server/api-core";

export async function GET(request: Request) {
  return handleAdminShopSectionsCollection(request, getServerEnv());
}

export async function POST(request: Request) {
  return handleAdminShopSectionsCollection(request, getServerEnv());
}
