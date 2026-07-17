import { getServerEnv } from "../../../../lib/server/api-core";
import { handleAdminUsersCollection } from "../../../../lib/server/admin-super-crud";

export async function GET(request: Request) {
  return handleAdminUsersCollection(request, getServerEnv());
}

export async function POST(request: Request) {
  return handleAdminUsersCollection(request, getServerEnv());
}
