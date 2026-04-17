import { LicenseApiError } from "@/lib/licenseApi";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: corsHeaders,
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof LicenseApiError) {
    return jsonResponse({ valid: false, message: error.message }, error.statusCode);
  }

  const message = error instanceof Error ? error.message : "Erro interno.";
  return jsonResponse({ valid: false, message }, 500);
}
