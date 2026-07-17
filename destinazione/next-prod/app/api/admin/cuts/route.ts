import { handleAdminCutsCollection } from "../../../../lib/server/admin-cuts-crud";
import { getServerEnv } from "../../../../lib/server/api-core";

export async function GET(request: Request) {
  return handleAdminCutsCollection(request, getServerEnv());
}

export async function POST(request: Request) {
  return handleAdminCutsCollection(request, getServerEnv());
}
