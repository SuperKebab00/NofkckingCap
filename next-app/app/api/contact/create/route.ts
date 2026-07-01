import { handleContactCreate } from "../../../../lib/server/contact-create";
import { getServerEnv } from "../../../../lib/server/api-core";

export async function POST(request: Request) {
  return handleContactCreate(request, getServerEnv());
}
