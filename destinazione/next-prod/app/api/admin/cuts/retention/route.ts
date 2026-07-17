import { handleAdminCutsRetention } from "../../../../../lib/server/admin-cuts-crud";
import { getServerEnv } from "../../../../../lib/server/api-core";

export async function GET(request: Request) {
  return handleAdminCutsRetention(request, getServerEnv());
}

export async function POST(request: Request) {
  return handleAdminCutsRetention(request, getServerEnv());
}
