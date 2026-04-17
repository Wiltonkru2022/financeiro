import { LicenseApiError } from "@/lib/licenseApi";

export function assertAdminRequest(request: Request) {
  const adminToken = process.env.LICENSE_ADMIN_TOKEN;

  if (!adminToken) {
    throw new LicenseApiError("Token admin nao configurado.", 500);
  }

  const authorization = request.headers.get("authorization") || "";
  const headerToken = request.headers.get("x-admin-token") || "";
  const bearerToken = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";

  if (headerToken !== adminToken && bearerToken !== adminToken) {
    throw new LicenseApiError("Nao autorizado.", 401);
  }
}
