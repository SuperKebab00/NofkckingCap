import { getServerEnv } from "../../../../lib/server/api-core";
import { handleAdminStatus } from "../../../../lib/server/admin-status";

export async function GET(request: Request) {
  return handleAdminStatus(request, getServerEnv());
}
