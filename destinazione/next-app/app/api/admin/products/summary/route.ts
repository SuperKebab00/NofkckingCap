import { getServerEnv } from "../../../../../lib/server/api-core";
import { handleAdminProductsSummary } from "../../../../../lib/server/admin-products-summary";

export async function GET(request: Request) {
  return handleAdminProductsSummary(request, getServerEnv());
}
