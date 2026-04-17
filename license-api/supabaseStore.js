const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_MODULES = ['finance', 'reports', 'backup', 'health'];

function createSupabaseLicenseStore({ supabaseUrl, serviceRoleKey, licenseSecret }) {
  if (!supabaseUrl || !serviceRoleKey) {
    return { enabled: false };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  function sign(value) {
    return crypto.createHmac('sha256', licenseSecret).update(value).digest('base64url');
  }

  function createProductKey(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `CC-${body}.${sign(body)}`;
  }

  function verifyProductKey(productKey) {
    if (!productKey?.startsWith('CC-')) {
      return false;
    }

    const raw = productKey.slice(3);
    const [body, signature] = raw.split('.');
    const expected = sign(body || '');

    return Boolean(
      body &&
        signature &&
        Buffer.byteLength(signature) === Buffer.byteLength(expected) &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    );
  }

  function createActivationToken(licenseId, deviceId) {
    const nonce = crypto.randomBytes(18).toString('base64url');
    const body = `${licenseId}.${deviceId}.${Date.now()}.${nonce}`;
    return `${Buffer.from(body).toString('base64url')}.${sign(body)}`;
  }

  function publicLicense(row, activationToken) {
    return {
      valid: true,
      status: row.status,
      activationToken,
      customerName: row.customer_name || row.customer_email,
      customerEmail: row.customer_email,
      documentNumber: row.document_number || '',
      plan: row.plan_name,
      expiresAt: row.expires_at,
      maxDevices: row.device_limit,
      maxUsers: row.max_users || 1,
      modules: row.modules_json || DEFAULT_MODULES,
      activatedAt: new Date().toISOString()
    };
  }

  async function createLicense(input) {
    const required = ['customerName', 'email', 'validUntil'];

    for (const field of required) {
      if (!input[field]) {
        const error = new Error(`Campo obrigatorio: ${field}`);
        error.statusCode = 400;
        throw error;
      }
    }

    const modules = input.modules?.length ? input.modules : DEFAULT_MODULES;
    const keyPayload = {
      email: input.email,
      customerName: input.customerName,
      plan: input.plan || 'profissional',
      validUntil: input.validUntil,
      maxDevices: Number(input.maxDevices || 1),
      maxUsers: Number(input.maxUsers || 1),
      modules,
      createdAt: new Date().toISOString(),
      nonce: crypto.randomBytes(12).toString('hex')
    };
    const productKey = createProductKey(keyPayload);

    const { error } = await supabase.from('license_keys').insert({
      product_key: productKey,
      customer_name: input.customerName,
      document_number: input.documentNumber || null,
      customer_email: input.email,
      plan_name: input.plan || 'profissional',
      status: 'active',
      device_limit: Number(input.maxDevices || 1),
      max_users: Number(input.maxUsers || 1),
      modules_json: modules,
      expires_at: input.validUntil
    });

    if (error) {
      error.statusCode = 500;
      throw error;
    }

    return { productKey };
  }

  async function activateLicense(input) {
    if (!verifyProductKey(input.productKey)) {
      const error = new Error('Chave invalida.');
      error.statusCode = 401;
      throw error;
    }

    if (!input.deviceId) {
      const error = new Error('Dispositivo nao informado.');
      error.statusCode = 400;
      throw error;
    }

    const { data: license, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('product_key', input.productKey)
      .maybeSingle();

    if (licenseError) {
      licenseError.statusCode = 500;
      throw licenseError;
    }

    if (!license || !['active', 'trial'].includes(license.status)) {
      const error = new Error('Licenca inativa.');
      error.statusCode = 403;
      throw error;
    }

    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      const error = new Error('Licenca expirada.');
      error.statusCode = 403;
      throw error;
    }

    const activationEmail = String(input.email || license.customer_email || '').toLowerCase();

    if (String(license.customer_email).toLowerCase() !== activationEmail) {
      const error = new Error('Email nao corresponde a licenca.');
      error.statusCode = 403;
      throw error;
    }

    const { data: activations, error: activationsError } = await supabase
      .from('license_activations')
      .select('*')
      .eq('license_key_id', license.id)
      .neq('status', 'revoked');

    if (activationsError) {
      activationsError.statusCode = 500;
      throw activationsError;
    }

    const existing = activations.find((item) => item.device_fingerprint === input.deviceId);

    if (!existing && activations.length >= Number(license.device_limit || 1)) {
      const error = new Error('Limite de computadores atingido.');
      error.statusCode = 403;
      throw error;
    }

    const activationToken = existing?.activation_token || createActivationToken(license.id, input.deviceId);
    const { error: upsertError } = await supabase.from('license_activations').upsert(
      {
        license_key_id: license.id,
        device_fingerprint: input.deviceId,
        activation_token: activationToken,
        machine_name: input.machineName || null,
        app_version: input.appVersion || null,
        ip_address: input.ipAddress || null,
        status: 'active',
        last_seen_at: new Date().toISOString()
      },
      { onConflict: 'license_key_id,device_fingerprint' }
    );

    if (upsertError) {
      upsertError.statusCode = 500;
      throw upsertError;
    }

    return publicLicense(license, activationToken);
  }

  async function validateLicense(input) {
    const { data: activation, error: activationError } = await supabase
      .from('license_activations')
      .select('*')
      .eq('activation_token', input.activationToken)
      .eq('device_fingerprint', input.deviceId)
      .maybeSingle();

    if (activationError) {
      activationError.statusCode = 500;
      throw activationError;
    }

    if (!activation || activation.status !== 'active') {
      const error = new Error('Ativacao invalida.');
      error.statusCode = 403;
      throw error;
    }

    const { data: license, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('id', activation.license_key_id)
      .maybeSingle();

    if (licenseError) {
      licenseError.statusCode = 500;
      throw licenseError;
    }

    if (!license || !['active', 'trial'].includes(license.status)) {
      const error = new Error('Licenca inativa.');
      error.statusCode = 403;
      throw error;
    }

    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      const error = new Error('Licenca expirada.');
      error.statusCode = 403;
      throw error;
    }

    await supabase.from('license_activations').update({ last_seen_at: new Date().toISOString() }).eq('id', activation.id);
    return publicLicense(license, input.activationToken);
  }

  async function health() {
    const { error } = await supabase.from('license_keys').select('id', { head: true, count: 'exact' });

    if (error) {
      error.statusCode = 500;
      throw error;
    }

    return true;
  }

  return {
    activateLicense,
    createLicense,
    enabled: true,
    health,
    validateLicense
  };
}

module.exports = {
  createSupabaseLicenseStore
};
