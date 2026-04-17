import { activateLicense } from "@/lib/licenseApi";
import { errorResponse, jsonResponse, optionsResponse } from "../_shared/response";

export const runtime = "nodejs";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipAddress = forwardedFor.split(",")[0]?.trim();
    return jsonResponse(await activateLicense({ ...input, ipAddress }));
  } catch (error) {
    return errorResponse(error);
  }
}
