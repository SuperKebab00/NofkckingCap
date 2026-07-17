import { handleAdminProductUpload } from "../../../../../lib/server/admin-products-crud";
import { getServerEnv } from "../../../../../lib/server/api-core";

export async function POST(request: Request) {
  return handleAdminProductUpload(request, getServerEnv());
}
