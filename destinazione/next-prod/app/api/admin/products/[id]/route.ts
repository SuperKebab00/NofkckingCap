import { handleAdminProductItem } from "../../../../../lib/server/admin-products-crud";
import { getServerEnv } from "../../../../../lib/server/api-core";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminProductItem(request, getServerEnv(), id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminProductItem(request, getServerEnv(), id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAdminProductItem(request, getServerEnv(), id);
}
