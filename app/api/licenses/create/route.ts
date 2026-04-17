import { createLicense } from "@/lib/licenseApi";
import { assertAdminRequest } from "../_shared/admin";
import { errorResponse, jsonResponse, optionsResponse } from "../_shared/response";

export const runtime = "nodejs";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    assertAdminRequest(request);
    const input = await request.json();
    return jsonResponse(await createLicense(input), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
