import { getServerEnv } from "../../../../../lib/server/api-core";
import { handleAdminUserItem } from "../../../../../lib/server/admin-super-crud";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await context.params;
  return handleAdminUserItem(request, getServerEnv(), userId);
}
