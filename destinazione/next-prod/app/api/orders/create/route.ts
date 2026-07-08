import { getServerEnv } from "../../../../lib/server/api-core";
import { handleOrderCreate } from "../../../../lib/server/orders-create";

export async function POST(request: Request) {
  return handleOrderCreate(request, getServerEnv());
}
