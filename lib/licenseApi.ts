import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LicenseInput = {
  customerName?: string;
  documentNumber?: string;
  email?: string;
  plan?: string;
  validUntil?: string;
  maxDevices?: number;
  maxUsers?: number;
  modules?: string[];
};

type ActivationInput = {
  productKey?: string;
  email?: string;
  deviceId?: string;
  machineName?: string;
  appVersion?: string;
  ipAddress?: string;
};

type LicenseRow = {
  id: string;
  product_key: string;
  customer_name: string | null;
  customer_email: string;
  document_number: string | null;
  plan_name: string;
  status: string;
  device_limit: number;
  max_users: number;
  modules_json: string[] | null;
  expires_at: string | null;
};

type ActivationRow = {
  id: string;
  license_key_id: string;
  device_fingerprint: string;
  activation_token: string | null;
  status: string;
};

export class LicenseApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const LICENSE_SECRET = process.env.LICENSE_SECRET || "troque-este-segredo-em-producao";
const DEFAULT_MODULES = ["finance", "reports", "backup", "health"];

function sign(value: string) {
  return crypto.createHmac("sha256", LICENSE_SECRET).update(value).digest("base64url");
}

function createProductKey(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `CC-${body}.${sign(body)}`;
}

function verifyProductKey(productKey?: string) {
  if (!productKey?.startsWith("CC-")) {
    return false;
  }

  const raw = productKey.slice(3);
  const [body, signature] = raw.split(".");
  const expected = sign(body || "");

  return Boolean(
    body &&
      signature &&
      Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

function createActivationToken(licenseId: string, deviceId: string) {
  const nonce = crypto.randomBytes(18).toString("base64url");
  const body = `${licenseId}.${deviceId}.${Date.now()}.${nonce}`;
  return `${Buffer.from(body).toString("base64url")}.${sign(body)}`;
}

function publicLicense(row: LicenseRow, activationToken: string) {
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
    modules: row.modules_json || DEFAULT_MODULES,
    activatedAt: new Date().toISOString(),
  };
}

export async function createLicense(input: LicenseInput) {
  if (!input.customerName) {
    throw new LicenseApiError("Campo obrigatorio: customerName.", 400);
  }

  if (!input.email) {
    throw new LicenseApiError("Campo obrigatorio: email.", 400);
  }

  if (!input.validUntil) {
    throw new LicenseApiError("Campo obrigatorio: validUntil.", 400);
  }

  const modules = input.modules?.length ? input.modules : DEFAULT_MODULES;
  const keyPayload = {
    email: input.email,
    customerName: input.customerName,
    plan: input.plan || "profissional",
    validUntil: input.validUntil,
    maxDevices: Number(input.maxDevices || 1),
    maxUsers: Number(input.maxUsers || 1),
    modules,
    createdAt: new Date().toISOString(),
    nonce: crypto.randomBytes(12).toString("hex"),
  };
  const productKey = createProductKey(keyPayload);
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("license_keys").insert({
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
  });

  if (error) {
    throw new LicenseApiError(error.message, 500);
  }

  return { productKey };
}

export async function activateLicense(input: ActivationInput) {
  const productKey = String(input.productKey || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const deviceId = String(input.deviceId || "").trim();

  if (!verifyProductKey(productKey)) {
    throw new LicenseApiError("Chave invalida.", 401);
  }

  if (!deviceId) {
    throw new LicenseApiError("Dispositivo nao informado.", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data: license, error: licenseError } = await supabase
    .from("license_keys")
    .select("*")
    .eq("product_key", productKey)
    .maybeSingle<LicenseRow>();

  if (licenseError) {
    throw new LicenseApiError(licenseError.message, 500);
  }

  if (!license || !["active", "trial"].includes(license.status)) {
    throw new LicenseApiError("Licenca inativa.", 403);
  }

  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
    throw new LicenseApiError("Licenca expirada.", 403);
  }

  if (email && license.customer_email.toLowerCase() !== email) {
    throw new LicenseApiError("Email nao corresponde a licenca.", 403);
  }

  const { data: activations, error: activationsError } = await supabase
    .from("license_activations")
    .select("*")
    .eq("license_key_id", license.id)
    .neq("status", "revoked")
    .returns<ActivationRow[]>();

  if (activationsError) {
    throw new LicenseApiError(activationsError.message, 500);
  }

  const existing = activations?.find((item) => item.device_fingerprint === deviceId);

  if (!existing && (activations?.length || 0) >= Number(license.device_limit || 1)) {
    throw new LicenseApiError("Limite de computadores atingido.", 403);
  }

  const activationToken = existing?.activation_token || createActivationToken(license.id, deviceId);
  const { error: upsertError } = await supabase.from("license_activations").upsert(
    {
      license_key_id: license.id,
      device_fingerprint: deviceId,
      activation_token: activationToken,
      machine_name: input.machineName || null,
      app_version: input.appVersion || null,
      ip_address: input.ipAddress || null,
      status: "active",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "license_key_id,device_fingerprint" }
  );

  if (upsertError) {
    throw new LicenseApiError(upsertError.message, 500);
  }

  return publicLicense(license, activationToken);
}

export async function validateLicense(input: ActivationInput & { activationToken?: string }) {
  const activationToken = String(input.activationToken || "").trim();
  const deviceId = String(input.deviceId || "").trim();

  if (!activationToken || !deviceId) {
    throw new LicenseApiError("Ativacao nao informada.", 400);
  }

  const supabase = createSupabaseAdminClient();
  const { data: activation, error: activationError } = await supabase
    .from("license_activations")
    .select("*")
    .eq("activation_token", activationToken)
    .eq("device_fingerprint", deviceId)
    .maybeSingle<ActivationRow>();

  if (activationError) {
    throw new LicenseApiError(activationError.message, 500);
  }

  if (!activation || activation.status !== "active") {
    throw new LicenseApiError("Ativacao invalida.", 403);
  }

  const { data: license, error: licenseError } = await supabase
    .from("license_keys")
    .select("*")
    .eq("id", activation.license_key_id)
    .maybeSingle<LicenseRow>();

  if (licenseError) {
    throw new LicenseApiError(licenseError.message, 500);
  }

  if (!license || !["active", "trial"].includes(license.status)) {
    throw new LicenseApiError("Licenca inativa.", 403);
  }

  if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
    throw new LicenseApiError("Licenca expirada.", 403);
  }

  await supabase
    .from("license_activations")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", activation.id);

  return publicLicense(license, activationToken);
}
