const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const encoder = new TextEncoder();
const licenseSecret = Deno.env.get("LICENSE_SECRET") || "troque-este-segredo-em-producao";
const adminToken = Deno.env.get("LICENSE_ADMIN_TOKEN") || "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const defaultModules = ["finance", "reports", "backup", "health"];

class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: corsHeaders,
  });
}

function assertAdminRequest(request: Request) {
  if (!adminToken) {
    throw new ApiError("Token admin nao configurado.", 500);
  }

  const authorization = request.headers.get("authorization") || "";
  const headerToken = request.headers.get("x-admin-token") || "";
  const bearerToken = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";

  if (headerToken !== adminToken && bearerToken !== adminToken) {
    throw new ApiError("Nao autorizado.", 401);
  }
}

function base64Url(bytes: ArrayBuffer) {
  const raw = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(text: string) {
  return base64Url(encoder.encode(text));
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(licenseSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function createProductKey(payload: Record<string, unknown>) {
  const body = base64UrlText(JSON.stringify(payload));
  return `CC-${body}.${await sign(body)}`;
}

async function verifyProductKey(productKey?: string) {
  if (!productKey?.startsWith("CC-")) {
    return false;
  }

  const raw = productKey.slice(3);
  const [body, signature] = raw.split(".");

  if (!body || !signature) {
    return false;
  }

  return signature === (await sign(body));
}

async function createActivationToken(licenseId: string, deviceId: string) {
  const random = new Uint8Array(18);
  crypto.getRandomValues(random);
  const nonce = base64Url(random);
  const body = `${licenseId}.${deviceId}.${Date.now()}.${nonce}`;
  return `${base64UrlText(body)}.${await sign(body)}`;
}

async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new ApiError("Supabase nao configurado na function.", 500);
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(data?.message || data?.hint || "Erro no Supabase.", response.status);
  }

  return data;
}

function eq(value: string) {
  return encodeURIComponent(value);
}

function publicLicense(row: Record<string, unknown>, activationToken: string) {
  return {
    valid: true,
    status: row.status,
    activationToken,
    customerName: row.customer_name || row.customer_email,
    customerEmail: row.customer_email,
    documentNumber: row.document_number || "",
    plan: row.plan_name,
    expiresAt: row.expires_at,
    maxDevices: row.device_limit,
    maxUsers: row.max_users || 1,
    modules: row.modules_json || defaultModules,
    activatedAt: new Date().toISOString(),
  };
}

async function createLicense(input: Record<string, unknown>) {
  if (!input.customerName) throw new ApiError("Campo obrigatorio: customerName.");
  if (!input.email) throw new ApiError("Campo obrigatorio: email.");
  if (!input.validUntil) throw new ApiError("Campo obrigatorio: validUntil.");

  const modules = Array.isArray(input.modules) && input.modules.length ? input.modules : defaultModules;
  const productKey = await createProductKey({
    email: input.email,
    customerName: input.customerName,
    plan: input.plan || "profissional",
    validUntil: input.validUntil,
    maxDevices: Number(input.maxDevices || 1),
    maxUsers: Number(input.maxUsers || 1),
    modules,
    createdAt: new Date().toISOString(),
    nonce: crypto.randomUUID(),
  });

  await rest("license_keys", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      product_key: productKey,
      customer_name: input.customerName,
      document_number: input.documentNumber || null,
      customer_email: input.email,
      plan_name: input.plan || "profissional",
      status: "active",
      device_limit: Number(input.maxDevices || 1),
      max_users: Number(input.maxUsers || 1),
      modules_json: modules,
      expires_at: input.validUntil,
    }),
  });

  return { productKey };
}

async function activateLicense(input: Record<string, unknown>, request: Request) {
  const productKey = String(input.productKey || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const deviceId = String(input.deviceId || "").trim();

  if (!(await verifyProductKey(productKey))) throw new ApiError("Chave invalida.", 401);
  if (!deviceId) throw new ApiError("Dispositivo nao informado.");

  const licenses = await rest(`license_keys?product_key=eq.${eq(productKey)}&select=*`);
  const license = licenses?.[0];

  if (!license || !["active", "trial"].includes(license.status)) throw new ApiError("Licenca inativa.", 403);
  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) throw new ApiError("Licenca expirada.", 403);
  if (email && String(license.customer_email).toLowerCase() !== email) throw new ApiError("Email nao corresponde a licenca.", 403);

  const activations = await rest(`license_activations?license_key_id=eq.${eq(license.id)}&status=neq.revoked&select=*`);
  const existing = activations.find((item: Record<string, unknown>) => item.device_fingerprint === deviceId);

  if (!existing && activations.length >= Number(license.device_limit || 1)) {
    throw new ApiError("Limite de computadores atingido.", 403);
  }

  const activationToken = existing?.activation_token || (await createActivationToken(license.id, deviceId));
  const forwardedFor = request.headers.get("x-forwarded-for") || "";

  await rest("license_activations?on_conflict=license_key_id,device_fingerprint", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      license_key_id: license.id,
      device_fingerprint: deviceId,
      activation_token: activationToken,
      machine_name: input.machineName || null,
      app_version: input.appVersion || null,
      ip_address: forwardedFor.split(",")[0]?.trim() || null,
      status: "active",
      last_seen_at: new Date().toISOString(),
    }),
  });

  return publicLicense(license, activationToken);
}

async function validateLicense(input: Record<string, unknown>) {
  const activationToken = String(input.activationToken || "").trim();
  const deviceId = String(input.deviceId || "").trim();

  if (!activationToken || !deviceId) throw new ApiError("Ativacao nao informada.");

  const activations = await rest(
    `license_activations?activation_token=eq.${eq(activationToken)}&device_fingerprint=eq.${eq(deviceId)}&select=*`
  );
  const activation = activations?.[0];

  if (!activation || activation.status !== "active") throw new ApiError("Ativacao invalida.", 403);

  const licenses = await rest(`license_keys?id=eq.${eq(activation.license_key_id)}&select=*`);
  const license = licenses?.[0];

  if (!license || !["active", "trial"].includes(license.status)) throw new ApiError("Licenca inativa.", 403);
  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) throw new ApiError("Licenca expirada.", 403);

  await rest(`license_activations?id=eq.${eq(activation.id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
  });

  return publicLicense(license, activationToken);
}

Deno.serve(async (request) => {
  try {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    const path = new URL(request.url).pathname;

    if (request.method === "GET" && (path.endsWith("/health") || path.endsWith("/api/health"))) {
      await rest("license_keys?select=id&limit=1");
      return jsonResponse({
        status: "ok",
        database: "supabase",
        service: "financepro-license-api",
        checkedAt: new Date().toISOString(),
      });
    }

    const input = request.method === "POST" ? await request.json() : {};

    if (request.method === "POST" && (path.endsWith("/create") || path.endsWith("/api/licenses/create"))) {
      assertAdminRequest(request);
      return jsonResponse(await createLicense(input), 201);
    }

    if (request.method === "POST" && (path.endsWith("/activate") || path.endsWith("/api/licenses/activate"))) {
      return jsonResponse(await activateLicense(input, request));
    }

    if (request.method === "POST" && (path.endsWith("/validate") || path.endsWith("/api/licenses/validate"))) {
      return jsonResponse(await validateLicense(input));
    }

    return jsonResponse({ message: "Rota nao encontrada." }, 404);
  } catch (error) {
    const status = error instanceof ApiError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : "Erro interno.";
    return jsonResponse({ valid: false, message }, status);
  }
});
