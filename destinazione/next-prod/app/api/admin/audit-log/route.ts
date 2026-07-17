import { getServerEnv } from "../../../../lib/server/api-core";
import { handleAdminAuditLog } from "../../../../lib/server/admin-super-crud";

export async function GET(request: Request) {
  return handleAdminAuditLog(request, getServerEnv());
}
