import { handleAdminCutItem } from "../../../../../lib/server/admin-cuts-crud";
import { getServerEnv } from "../../../../../lib/server/api-core";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminCutItem(request, getServerEnv(), id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminCutItem(request, getServerEnv(), id);
}
