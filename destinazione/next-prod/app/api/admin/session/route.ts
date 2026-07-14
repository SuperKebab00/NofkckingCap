import { getServerEnv } from "../../../../lib/server/api-core";
import {
  handleAdminSessionCreate,
  handleAdminSessionDelete,
} from "../../../../lib/server/admin-session";

export async function POST(request: Request) {
  return handleAdminSessionCreate(request, getServerEnv());
}

export async function DELETE(request: Request) {
  return handleAdminSessionDelete(request, getServerEnv());
}
