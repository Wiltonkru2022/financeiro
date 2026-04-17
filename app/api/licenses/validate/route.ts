import { validateLicense } from "@/lib/licenseApi";
import { errorResponse, jsonResponse, optionsResponse } from "../_shared/response";

export const runtime = "nodejs";

export function OPTIONS() {
  return optionsResponse();
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    return jsonResponse(await validateLicense(input));
  } catch (error) {
    return errorResponse(error);
  }
}
