import { handleAdminLeadsCollection } from "../../../../lib/server/admin-leads-crud";
import { getServerEnv } from "../../../../lib/server/api-core";

export async function GET(request: Request) {
  return handleAdminLeadsCollection(request, getServerEnv());
}
