import { handleAdminOrdersCollection } from "../../../../lib/server/admin-orders-crud";
import { getServerEnv } from "../../../../lib/server/api-core";

export async function GET(request: Request) {
  return handleAdminOrdersCollection(request, getServerEnv());
}
