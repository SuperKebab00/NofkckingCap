import { handleAdminCutUpload } from "../../../../../lib/server/admin-cuts-crud";
import { getServerEnv } from "../../../../../lib/server/api-core";

export async function POST(request: Request) {
  return handleAdminCutUpload(request, getServerEnv());
}
