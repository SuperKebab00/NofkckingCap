import { getServerEnv } from "../../../../../lib/server/api-core";
import { handleAdminAuthCheck } from "../../../../../lib/server/admin-auth";

export async function GET(request: Request) {
  return handleAdminAuthCheck(request, getServerEnv());
}
