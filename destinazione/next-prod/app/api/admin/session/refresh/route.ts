import { getServerEnv } from "../../../../../lib/server/api-core";
import { handleAdminSessionRefresh } from "../../../../../lib/server/admin-session";

export async function POST(request: Request) {
  return handleAdminSessionRefresh(request, getServerEnv());
}
